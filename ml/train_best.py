"""
หาโมเดลที่แม่นที่สุดแบบไม่โกงตัวเอง แล้วทำไฟล์พยากรณ์

    python train_best.py                 # ~5 นาที

ขั้นตอน
  1. feature: ทุกตัวใน global_model.py + เหล็กฟิวเจอร์ส + ดัชนีเศษเหล็ก (ข้อมูลเดือน t-1)
     + ราคาตอนนี้สูง/ต่ำกว่าค่าเฉลี่ย 12 เดือนแค่ไหน (ของวัสดุ ของกลุ่ม และของปัจจัยภายนอก) ช่วยโมเดลรู้ว่าราคาน่าจะกลับตัว
  2. ผู้สมัคร 7 แบบ ทุกแบบทาย log(ราคา t+h / ราคา t) แล้วคูณกลับเป็นราคา
       naive        ไม่ขยับ
       direct       LightGBM L1 ทายการเปลี่ยนแปลงตรง ๆ
       direct_half  ครึ่งหนึ่งของ direct (หดเข้าหา naive)
       ts_ev        โมเดล 2 ขั้น: p(เปลี่ยน) × ขนาด
       ts_t70       โมเดล 2 ขั้น: ขยับเต็มขนาดเมื่อ p > 0.7
       ts_t85       โมเดล 2 ขั้น: ขยับเต็มขนาดเมื่อ p > 0.85
       ts_t85_half  ครึ่งหนึ่งของ ts_t85
  3. เลือก (cross-validation): จุดเริ่มทุก 3 เดือน ม.ค. 2562 – ก.ค. 2568 (27 จุด ครอบช่วงเหล็กพุ่งปี 2564–2565)
     ฝึกใหม่ทุกจุดด้วยข้อมูลที่รู้แล้ว ณ จุดนั้น เลือกผู้สมัครแยกหมวด × h
     ผู้สมัครต้องดีกว่า naive อย่างน้อย 1% ของค่าความผิดพลาด ไม่อย่างนั้นใช้ naive
  4. วัดผลจริง (test): จุดเริ่มทุกเดือน ก.ย. 2568 – ส.ค. 2569 ช่วงเดียวกับ baseline.py ไม่ได้ใช้เลือกอะไร
  5. พยากรณ์: ฝึกด้วยข้อมูลทั้งหมด ใช้ผู้สมัครที่เลือก ช่วง low/high จาก baseline.py เลื่อนตามการเปลี่ยนแปลงที่ทาย
     ระยะ h ไหนที่ test แพ้ naive จะใช้ naive แทนทั้งระยะ

ผลลัพธ์: out/best_report_lag{0,1}.md, out/forecast_best_lag{0,1}.csv
"""
from __future__ import annotations

import argparse
import json
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from global_model import CATALOG, FACTORS, H, PARAMS, build_panel, feature_cols, md

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
EXTRA_FACTORS = ["steel_futures_unverified", "scrap_metal_ppi_index"]
EPS = 1e-6
CANDS = ["naive", "direct", "direct_half", "ts_ev", "ts_t70", "ts_t85", "ts_t85_half"]
MARGIN = 0.01


def add_features(P: pd.DataFrame, factors: pd.DataFrame | None) -> pd.DataFrame:
    P = P.sort_values(["material_id", "date"]).copy()
    lp = np.log(P["price"])
    g = lp.groupby(P["material_id"])
    P["dev_mean12"] = lp - g.transform(lambda s: s.rolling(12, min_periods=6).mean())
    P["dev_max12"] = lp - g.transform(lambda s: s.rolling(12, min_periods=6).max())
    P["dev_min12"] = lp - g.transform(lambda s: s.rolling(12, min_periods=6).min())
    P["fam_dev_mean12"] = P.groupby(["familyCode", "date"], observed=True)["dev_mean12"].transform("mean")
    if factors is not None:
        F = np.log(factors.set_index("date").sort_index())
        if {"iron_ore_62fe_usd_ton", "fx_usd_thb"} <= set(F.columns):
            F["iron_thb"] = F["iron_ore_62fe_usd_ton"] + F["fx_usd_thb"]
        feat = pd.DataFrame(index=F.index)
        for c in F.columns:
            lag1 = F[c].shift(1)
            feat[f"{c}_dev12"] = lag1 - lag1.rolling(12, min_periods=6).mean()
            if c in EXTRA_FACTORS + ["iron_thb"]:
                feat[f"{c}_r1"] = lag1 - F[c].shift(2)
                feat[f"{c}_r3"] = lag1 - F[c].shift(4)
        P = P.join(feat, on="date")
    return P


def fit_all(train: pd.DataFrame, test: pd.DataFrame, h: int, cols: list[str]) -> dict[str, np.ndarray]:
    import lightgbm as lgb
    y = train[f"y{h}"]
    direct = lgb.LGBMRegressor(**PARAMS, objective="l1", random_state=7).fit(train[cols], y).predict(test[cols])
    moved = (y.abs() > EPS).astype(int)
    p = lgb.LGBMClassifier(**PARAMS, random_state=7).fit(train[cols], moved).predict_proba(test[cols])[:, 1]
    tm = train[moved == 1]
    size = lgb.LGBMRegressor(**PARAMS, objective="l1", random_state=7).fit(tm[cols], tm[f"y{h}"]).predict(test[cols])
    t85 = np.where(p > 0.85, size, 0.0)
    return {"naive": np.zeros(len(test)), "direct": direct, "direct_half": direct / 2, "ts_ev": p * size,
            "ts_t70": np.where(p > 0.7, size, 0.0), "ts_t85": t85, "ts_t85_half": t85 / 2}


def run(P, origins, active, cols, label) -> pd.DataFrame:
    res, t0 = [], time.time()
    for i, o in enumerate(origins):
        for h in range(1, H + 1):
            train = P[(P["date"] + pd.DateOffset(months=h) <= o) & P[f"y{h}"].notna()]
            test = P[(P["date"] == o) & P[f"y{h}"].notna() & P["material_id"].isin(active)]
            if test.empty or train.empty:
                continue
            preds = fit_all(train, test, h, cols)
            r = test[["material_id", "categoryCode", f"y{h}"]].rename(columns={f"y{h}": "y"}).copy()
            r["origin"], r["h"] = o, h
            actual = np.exp(r["y"].values)
            for k, v in preds.items():
                r[k] = np.abs(np.exp(v) - actual) / actual * 100
            res.append(r)
        print(f"  {label} {i + 1}/{len(origins)} ({time.time() - t0:.0f}s)", flush=True)
    return pd.concat(res, ignore_index=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, default=HERE / "data" / "prices_clean.csv")
    ap.add_argument("--factors", type=Path, default=HERE / "data" / "factors_monthly.csv", help="จาก build_factors.py")
    ap.add_argument("--market-lag", type=int, choices=[0, 1], default=0,
                    help="0 = ใช้ราคาตลาดเดือนเดียวกับราคา สนค. ล่าสุด (รู้ครบแล้วตอน สนค. ประกาศต้นเดือนถัดไป), 1 = หน่วง 1 เดือนแบบ notebook")
    ap.add_argument("--baseline-forecast", type=Path, default=HERE / "out" / "forecast.csv")
    ap.add_argument("--stale", type=int, default=3)
    ap.add_argument("--out", type=Path, default=HERE / "out")
    args = ap.parse_args()

    cat = pd.DataFrame(json.loads(CATALOG.read_text(encoding="utf-8"))["materials"]).set_index("id")
    prices = pd.read_csv(args.data, parse_dates=["date"])
    replaced = set(cat.index[cat["replacedBy"].notna()]) if "replacedBy" in cat else set()
    prices = prices[~prices["material_id"].isin(replaced)]
    latest = prices["date"].max()
    last = prices.groupby("material_id")["date"].max()
    active = set(last[last >= latest - pd.DateOffset(months=args.stale)].index)

    factors = None
    if args.factors.exists():
        factors = pd.read_csv(args.factors, encoding="utf-8-sig", parse_dates=["month_date"]).rename(columns={"month_date": "date"})
        factors = factors[["date", *FACTORS, *[c for c in EXTRA_FACTORS if c in factors]]]
        if args.market_lag == 0:
            # โค้ดสร้าง feature อ่านปัจจัยของเดือน t-1 เสมอ เลื่อนวันที่ของราคาตลาดถอยหลัง 1 เดือน ให้แถวเดือน t ได้ค่าของเดือน t
            # ดัชนีเศษเหล็ก (PPI) ประกาศช้า จึงยังหน่วง 1 เดือน
            market = [c for c in factors.columns if c not in ("date", "scrap_metal_ppi_index")]
            moved = factors[["date", *market]].assign(date=lambda d: d["date"] - pd.DateOffset(months=1))
            keep = factors[["date", *[c for c in factors.columns if c not in market and c != "date"]]]
            factors = moved.merge(keep, on="date", how="outer").sort_values("date")
    P = build_panel(prices, cat, factors[["date", *FACTORS]] if factors is not None else None)
    P = add_features(P, factors)
    cols = feature_cols(P)
    print(f"แถว {len(P):,}, feature {len(cols)}")

    cv_origins = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS"))
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    CV = run(P, cv_origins, active, cols, "cv")
    TE = run(P, test_origins, active, cols, "test")
    TE.to_csv(args.out / f"best_test_errors_lag{args.market_lag}.csv", index=False)

    # เลือกต่อหมวด × h จาก CV
    cvm = CV.groupby(["categoryCode", "h"], observed=True)[CANDS].mean()
    choice = {}
    for key, row in cvm.iterrows():
        best = row.drop("naive").idxmin()
        choice[key] = best if row[best] < row["naive"] * (1 - MARGIN) else "naive"
    # เลือกแบบเดียวทุกหมวด (ไว้เทียบ)
    glob = CV.groupby("h")[CANDS].mean()
    gchoice = {h: (glob.loc[h].drop("naive").idxmin() if glob.loc[h].drop("naive").min() < glob.loc[h, "naive"] * (1 - MARGIN) else "naive") for h in glob.index}

    TE["selected"] = [getattr(r, choice.get((r.categoryCode, r.h), "naive")) for r in TE.itertuples()]
    TE["selected_global"] = [getattr(r, gchoice[r.h]) for r in TE.itertuples()]
    CV["selected"] = [getattr(r, choice.get((r.categoryCode, r.h), "naive")) for r in CV.itertuples()]
    test_sum = TE.groupby("h")[[*CANDS, "selected_global", "selected"]].mean()
    cv_sum = CV.groupby("h")[[*CANDS, "selected"]].mean()
    deploy_h = [h for h in test_sum.index if test_sum.loc[h, "selected"] < test_sum.loc[h, "naive"]]

    names = cat.drop_duplicates("categoryCode").set_index("categoryCode")["category"]
    sel_tab = pd.DataFrame([(names.get(c, c), h, m) for (c, h), m in sorted(choice.items())], columns=["หมวด", "h", "แบบที่เลือก"]).pivot(index="หมวด", columns="h", values="แบบที่เลือก")
    by_cat = TE.groupby(["categoryCode", "h"], observed=True)[["naive", "selected"]].mean().reset_index()
    by_cat.insert(0, "หมวด", by_cat.pop("categoryCode").astype(str).map(names))
    by_cat["ดีกว่า naive"] = np.where(by_cat["selected"] < by_cat["naive"] - 1e-9, "✅", np.where(by_cat["selected"] > by_cat["naive"] + 1e-9, "❌", "="))

    report = [
        "# หาโมเดลที่แม่นที่สุด (train_best.py)", "",
        f"- ข้อมูลถึง {latest:%Y-%m}, feature {len(cols)} ตัว (รวมเหล็กฟิวเจอร์ส เศษเหล็ก และราคาเทียบค่าเฉลี่ย 12 เดือน)",
        f"- ราคาตลาด: {'เดือนเดียวกับราคา สนค. ล่าสุด' if args.market_lag == 0 else 'หน่วง 1 เดือน'}",
        f"- CV ใช้เลือก: {len(cv_origins)} จุดเริ่ม {cv_origins[0]:%Y-%m} ถึง {cv_origins[-1]:%Y-%m} ({len(CV):,} จุด)",
        f"- Test วัดผลอย่างเดียว: {test_origins[0]:%Y-%m} ถึง {test_origins[-1]:%Y-%m} ({len(TE):,} จุด)",
        "- ตัวเลขคือ MAPE (%) ยิ่งต่ำยิ่งแม่น", "",
        "## Test (ผลจริง)", "", md(test_sum), "",
        "`selected` = เลือกแบบแยกหมวดจาก CV, `selected_global` = แบบเดียวทุกหมวดจาก CV", "",
        "## CV", "", md(cv_sum), "",
        "## แบบที่ CV เลือกให้แต่ละหมวด", "", md(sel_tab), "",
        "## Test แยกหมวด (selected)", "", md(by_cat.set_index(["หมวด", "h"])), "",
    ]

    # พยากรณ์จริง
    base = pd.read_csv(args.baseline_forecast)
    out = base.copy()
    now = P[(P["date"] == latest) & P["material_id"].isin(active)]
    moved = 0
    for h in deploy_h:
        preds = fit_all(P[P[f"y{h}"].notna()], now, h, cols)
        for j, (m, c) in enumerate(zip(now["material_id"], now["categoryCode"])):
            k = choice.get((c, h), "naive")
            d = preds[k][j]
            if k == "naive" or abs(d) <= EPS:
                continue
            i = out.index[(out.material_id == m) & (out.month == h)]
            f = float(np.exp(d))
            out.loc[i, ["price", "low", "high"]] = (out.loc[i, ["price", "low", "high"]] * f).round(2).values
            out.loc[i, "model"] = k
            moved += 1
    out.to_csv(args.out / f"forecast_best_lag{args.market_lag}.csv", index=False)
    report += ["## ไฟล์พยากรณ์", "",
               f"- ระยะที่ใช้โมเดล (test ชนะ naive): {deploy_h or 'ไม่มี'}",
               f"- `out/forecast_best_lag{args.market_lag}.csv`: โมเดลขยับราคา {moved} จุด จาก {len(out)} จุด ที่เหลือเป็น naive"]
    (args.out / f"best_report_lag{args.market_lag}.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
