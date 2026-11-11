"""
โมเดลรวมทุกวัสดุ (LightGBM) ที่ทาย "ราคาจะเปลี่ยนกี่ %" แล้วคูณกลับเป็นราคารายวัสดุ

    python global_model.py                    # backtest + พยากรณ์
    python global_model.py --no-factors       # ไม่ใช้ปัจจัยภายนอก

แนวคิด
  - target = log(ราคาเดือน t+h / ราคาเดือน t)  ทาย 0 = เท่ากับ naive  โมเดลเรียนแค่ว่าเมื่อไหร่ควรต่างจาก naive
  - 1 โมเดลต่อระยะ h (1, 2, 3 เดือน) ฝึกจากทุกวัสดุพร้อมกัน แต่ 1 แถว = วัสดุ 1 ตัว × 1 เดือน ผลจึงเป็นราคารายวัสดุ
  - objective L1 (ค่ามัธยฐาน): ราคาส่วนใหญ่ไม่ขยับ โมเดลจะทาย 0 เมื่อไม่มีสัญญาณชัด
  - ช่วง low/high จาก quantile 10% / 90%

การวัดผล (ไม่ให้ข้อมูลอนาคตรั่ว)
  - ทุกจุดเริ่ม o ฝึกใหม่ด้วยแถวที่รู้คำตอบแล้ว ณ เดือน o เท่านั้น (t + h <= o)
  - validation: จุดเริ่ม 24–13 เดือนก่อนเดือนล่าสุด  ใช้เลือกว่าหมวดไหนใช้โมเดล หมวดไหนใช้ naive
  - test: จุดเริ่ม 12–1 เดือนก่อนเดือนล่าสุด (ชุดเดียวกับ baseline.py)  รายงานผลอย่างเดียว ไม่ใช้เลือกอะไร

ผลลัพธ์
  out/global_backtest.md       MAPE เทียบ naive แยกช่วงและหมวด
  out/forecast_global.csv      รูปแบบเดียวกับ out/forecast.csv (หมวดที่ไม่ชนะใน validation ใช้ naive จาก baseline)
"""
from __future__ import annotations

import argparse
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from baseline import monthly

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent / "frontend" / "src" / "data" / "structural-materials.json"
H = 3
FACTORS = ["brent_crude_usd_barrel", "fx_usd_thb", "fx_cny_thb", "iron_ore_62fe_usd_ton",
           "newcastle_coal_usd_ton", "fuel_Hi_Diesel_thb_litre"]  # 6 ปัจจัยที่ notebook เลือกไว้
PARAMS = dict(n_estimators=300, learning_rate=0.03, num_leaves=15, min_child_samples=40,
              subsample=0.8, subsample_freq=1, colsample_bytree=0.8, reg_lambda=1.0, verbose=-1)


# ---------------------------------------------------------------- features
def build_panel(prices: pd.DataFrame, meta: pd.DataFrame, factors: pd.DataFrame | None) -> pd.DataFrame:
    rows = []
    for mid, g in prices.groupby("material_id"):
        s = monthly(g.set_index("date")["price"].sort_index())
        if len(s) < 2:
            continue
        lp = np.log(s)
        r1 = lp.diff()
        changed = r1.fillna(0).abs() > 1e-9
        idx = np.arange(len(s))
        last_idx = pd.Series(np.where(changed, idx, np.nan), index=s.index).ffill()
        last_size = r1.where(changed).ffill()
        f = pd.DataFrame({
            "material_id": mid, "date": s.index, "price": s.values,
            **{f"ret{k}": (lp - lp.shift(k)).values for k in (1, 2, 3, 6, 12)},
            "vol6": r1.rolling(6, min_periods=3).std().values,
            "vol12": r1.rolling(12, min_periods=6).std().values,
            "since_change": np.minimum(idx - last_idx.values, 36),
            "last_change": last_size.values,
            "changes12": changed.rolling(12, min_periods=1).sum().values,
        })
        for h in range(1, H + 1):
            f[f"y{h}"] = (lp.shift(-h) - lp).values
        rows.append(f)
    P = pd.concat(rows, ignore_index=True)
    P = P.join(meta[["categoryCode", "familyCode"]], on="material_id")
    P["month"] = P["date"].dt.month
    # สัญญาณจากวัสดุกลุ่มเดียวกันในเดือนเดียวกัน (สนค. มักปรับราคาทั้งกลุ่มพร้อมกัน)
    for key, name in (("familyCode", "fam"), ("categoryCode", "cat")):
        grp = P.groupby([key, "date"])
        P[f"{name}_ret1"] = grp["ret1"].transform("mean")
        P[f"{name}_ret3"] = grp["ret3"].transform("mean")
        P[f"{name}_up"] = grp["ret1"].transform(lambda x: (x > 1e-9).mean())
        P[f"{name}_down"] = grp["ret1"].transform(lambda x: (x < -1e-9).mean())
    if factors is not None:
        F = factors.set_index("date").sort_index()
        lf = np.log(F)
        feat = pd.DataFrame(index=F.index)
        for c in F.columns:  # ปัจจัยของเดือน t-1 (ประกาศช้า 1 เดือน) การเปลี่ยนแปลง 1 และ 3 เดือน
            feat[f"{c}_r1"] = (lf[c].shift(1) - lf[c].shift(2))
            feat[f"{c}_r3"] = (lf[c].shift(1) - lf[c].shift(4))
        P = P.join(feat, on="date")
    for c in ("categoryCode", "familyCode"):
        P[c] = P[c].astype("category")
    return P


def feature_cols(P: pd.DataFrame) -> list[str]:
    drop = {"material_id", "date", "price"} | {f"y{h}" for h in range(1, H + 1)}
    return [c for c in P.columns if c not in drop]


# ---------------------------------------------------------------- model
def fit_predict(train: pd.DataFrame, test: pd.DataFrame, h: int, cols: list[str]):
    import lightgbm as lgb
    y = train[f"y{h}"]
    out = {}
    for name, obj in (("mid", dict(objective="l1")), ("lo", dict(objective="quantile", alpha=0.1)), ("hi", dict(objective="quantile", alpha=0.9))):
        m = lgb.LGBMRegressor(**PARAMS, **obj, random_state=7)
        m.fit(train[cols], y)
        out[name] = m.predict(test[cols])
    mid = out["mid"]
    lo = np.minimum(out["lo"], mid)
    hi = np.maximum(out["hi"], mid)
    return mid, lo, hi


def backtest(P: pd.DataFrame, origins: list[pd.Timestamp], active: set[str], cols: list[str]) -> pd.DataFrame:
    res = []
    for o in origins:
        for h in range(1, H + 1):
            train = P[(P["date"] + pd.DateOffset(months=h) <= o) & P[f"y{h}"].notna()]
            test = P[(P["date"] == o) & P[f"y{h}"].notna() & P["material_id"].isin(active)]
            if test.empty:
                continue
            mid, lo, hi = fit_predict(train, test, h, cols)
            r = test[["material_id", "categoryCode", "price", f"y{h}"]].rename(columns={f"y{h}": "y"}).copy()
            r["origin"], r["h"], r["pred"], r["lo"], r["hi"] = o, h, mid, lo, hi
            res.append(r)
    R = pd.concat(res, ignore_index=True)
    actual = np.exp(R["y"])
    R["ape_model"] = (np.exp(R["pred"]) - actual).abs() / actual * 100
    R["ape_naive"] = (1 - actual).abs() / actual * 100
    R["inside"] = (R["y"] >= R["lo"]) & (R["y"] <= R["hi"])
    return R


def table(R: pd.DataFrame, by: list[str]) -> pd.DataFrame:
    t = R.groupby(by)[["ape_naive", "ape_model"]].mean()
    t["ชนะ naive"] = np.where(t["ape_model"] < t["ape_naive"], "✅", "—")
    return t.rename(columns={"ape_naive": "naive", "ape_model": "LightGBM"})


def md(t: pd.DataFrame) -> str:
    t = t.copy()
    for c in t.columns:
        if t[c].dtype.kind == "f":
            t[c] = t[c].map(lambda v: f"{v:.2f}")
    t = t.reset_index()
    head = "| " + " | ".join(map(str, t.columns)) + " |"
    return "\n".join([head, "|" + "---|" * len(t.columns)] + ["| " + " | ".join(map(str, r)) + " |" for r in t.itertuples(index=False)])


# ---------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, default=HERE / "data" / "prices_clean.csv")
    ap.add_argument("--factors", type=Path, default=HERE / "data" / "macro_monthly_clean.csv")
    ap.add_argument("--no-factors", action="store_true")
    ap.add_argument("--baseline-forecast", type=Path, default=HERE / "out" / "forecast.csv")
    ap.add_argument("--stale", type=int, default=3)
    ap.add_argument("--out", type=Path, default=HERE / "out")
    args = ap.parse_args()

    cat = pd.DataFrame(json.loads(CATALOG.read_text(encoding="utf-8"))["materials"]).set_index("id")
    prices = pd.read_csv(args.data, parse_dates=["date"])
    # รหัสเก่าที่ต่อประวัติให้รหัสใหม่แล้ว: ตัดออก ไม่ให้ประวัติเดียวกันซ้ำ 2 ชุดตอนฝึก
    replaced = set(cat.index[cat.get("replacedBy", pd.Series(dtype=str)).notna()]) if "replacedBy" in cat else set()
    prices = prices[~prices["material_id"].isin(replaced)]
    latest = prices["date"].max()
    last = prices.groupby("material_id")["date"].max()
    active = set(last[last >= latest - pd.DateOffset(months=args.stale)].index)

    factors = None
    if not args.no_factors and args.factors.exists():
        factors = pd.read_csv(args.factors, encoding="utf-8-sig", parse_dates=["month_date"]).rename(columns={"month_date": "date"})
        factors = factors[["date", *FACTORS]]
    P = build_panel(prices, cat, factors)
    cols = feature_cols(P)

    val_origins = [latest - pd.DateOffset(months=k) for k in range(24, 12, -1)]
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    print(f"แถว {len(P):,} วัสดุ {P.material_id.nunique()} feature {len(cols)} — backtest validation ...")
    V = backtest(P, val_origins, active, cols)
    print("backtest test ...")
    T = backtest(P, test_origins, active, cols)

    # เลือกหมวด × h ที่ใช้โมเดล จาก validation เท่านั้น
    gate = V.groupby(["categoryCode", "h"])[["ape_model", "ape_naive"]].mean()
    use_model = set(gate.index[gate["ape_model"] < gate["ape_naive"]])
    T["ape_hybrid"] = np.where([(c, h) in use_model for c, h in zip(T.categoryCode, T.h)], T.ape_model, T.ape_naive)
    V["ape_hybrid"] = np.where([(c, h) in use_model for c, h in zip(V.categoryCode, V.h)], V.ape_model, V.ape_naive)

    def summary(R):
        s = R.groupby("h")[["ape_naive", "ape_model", "ape_hybrid"]].mean()
        s.columns = ["naive", "LightGBM ทุกหมวด", "ผสม (ใช้ LightGBM เฉพาะหมวดที่ชนะใน validation)"]
        return s

    names = cat.drop_duplicates("categoryCode").set_index("categoryCode")["category"]
    by_cat = table(T, ["categoryCode", "h"]).reset_index()
    by_cat.insert(1, "หมวด", by_cat["categoryCode"].astype(str).map(names))
    by_cat["ใช้โมเดล"] = ["✅" if (c, h) in use_model else "—" for c, h in zip(by_cat.categoryCode, by_cat.h)]
    report = [
        "# ผล backtest โมเดลรวม (LightGBM, ทาย % การเปลี่ยนแปลง)", "",
        f"- ข้อมูลถึง {latest:%Y-%m}, วัสดุที่ใช้ฝึก {P.material_id.nunique()} รายการ, วัดผล {len(active)} รายการที่ยังเก็บราคา",
        f"- ปัจจัยภายนอก: {'ไม่ใช้' if factors is None else ', '.join(FACTORS) + ' (ข้อมูลเดือน t-1)'}",
        f"- feature {len(cols)} ตัว, ฝึกใหม่ทุกจุดเริ่มด้วยข้อมูลที่รู้แล้ว ณ จุดนั้น",
        "- ตัวเลขคือ MAPE (%) ยิ่งต่ำยิ่งแม่น เทียบบนแถวเดียวกันทุกโมเดล", "",
        f"## Test: จุดเริ่ม {test_origins[0]:%Y-%m} ถึง {test_origins[-1]:%Y-%m} ({len(T):,} จุด)", "",
        md(summary(T)), "",
        f"ช่วง low–high (10–90%) ครอบราคาจริง {T['inside'].mean():.0%} (เป้า 80%)", "",
        f"## Validation: จุดเริ่ม {val_origins[0]:%Y-%m} ถึง {val_origins[-1]:%Y-%m} ({len(V):,} จุด, ใช้เลือกหมวด)", "",
        md(summary(V)), "",
        "## Test แยกหมวด", "", md(by_cat.drop(columns=["categoryCode"]).set_index(["หมวด", "h"])), "",
    ]
    args.out.mkdir(parents=True, exist_ok=True)
    T.to_csv(args.out / "global_backtest_test.csv", index=False)

    # พยากรณ์จริง: ฝึกด้วยทุกแถวที่รู้คำตอบ ทายที่เดือนล่าสุด
    base = pd.read_csv(args.baseline_forecast)
    now = P[(P["date"] == latest) & P["material_id"].isin(active)]
    out = base.copy()
    for h in range(1, H + 1):
        train = P[P[f"y{h}"].notna()]
        mid, lo, hi = fit_predict(train, now, h, cols)
        for (m, c, p), a, b, d in zip(now[["material_id", "categoryCode", "price"]].itertuples(index=False), mid, lo, hi):
            if (c, h) not in use_model:
                continue
            i = out.index[(out.material_id == m) & (out.month == h)]
            out.loc[i, ["price", "low", "high", "model"]] = [round(p * np.exp(a), 2), round(p * np.exp(b), 2), round(p * np.exp(d), 2), "lgbm_global"]
    out.to_csv(args.out / "forecast_global.csv", index=False)
    report += [f"## ไฟล์พยากรณ์", "", f"`out/forecast_global.csv`: ใช้ LightGBM {int((out.model == 'lgbm_global').sum())} จุด, naive {int((out.model != 'lgbm_global').sum())} จุด"]
    (args.out / "global_backtest.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
