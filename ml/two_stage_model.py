"""
โมเดล 2 ขั้น: ขยับจาก naive เฉพาะตอนที่โมเดลมั่นใจว่าราคาจะเปลี่ยน

    python two_stage_model.py

ขั้นที่ 1 (classifier)  ทายความน่าจะเป็น p ว่าราคาเดือน t+h จะต่างจากเดือน t
ขั้นที่ 2 (regressor)   ฝึกเฉพาะแถวที่ราคาเปลี่ยนจริง ทายว่าเปลี่ยนกี่ % (log ratio)
รวมผล 4 แบบ แล้วเลือกแบบที่ดีที่สุดจาก validation เท่านั้น
  ev    p × ขนาดที่ทาย  (ค่าคาดหวัง: ขยับมากเมื่อมั่นใจมาก)
  t50   ขยับเต็มขนาดเมื่อ p > 0.5 ไม่อย่างนั้นใช้ naive
  t70   เหมือน t50 แต่ต้อง p > 0.7
  t85   เหมือน t50 แต่ต้อง p > 0.85

ช่วง low–high ใช้ช่วงของ baseline.py (ครอบราคาจริง 83% ใน backtest แต่วัดบนข้อมูลชุดเดียวกับที่ตั้งช่วง วัดแบบแยกชุดได้ 54–76% ดู DATA_REVIEW.md) เลื่อนตามการเปลี่ยนแปลงที่ทาย
feature, ข้อมูล, ช่วง validation/test เหมือน global_model.py ทุกอย่าง เพื่อให้เทียบกันได้

ผลลัพธ์
  out/two_stage_backtest.md
  out/forecast_two_stage.csv   (ถ้าแบบที่เลือกไม่ชนะ naive ใน validation ไฟล์นี้จะเท่ากับ naive)
"""
from __future__ import annotations

import argparse
import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from global_model import CATALOG, FACTORS, H, PARAMS, build_panel, feature_cols, md

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
EPS = 1e-6  # ต่างกันเกินนี้ (ใน log) ถือว่าราคาเปลี่ยน
VARIANTS = ("ev", "t50", "t70", "t85")


def fit_two_stage(train: pd.DataFrame, test: pd.DataFrame, h: int, cols: list[str]):
    import lightgbm as lgb
    y = train[f"y{h}"]
    changed = (y.abs() > EPS).astype(int)
    clf = lgb.LGBMClassifier(**PARAMS, random_state=7)
    clf.fit(train[cols], changed)
    p = clf.predict_proba(test[cols])[:, 1]
    moved = train[changed == 1]
    reg = lgb.LGBMRegressor(**PARAMS, objective="l1", random_state=7)
    reg.fit(moved[cols], moved[f"y{h}"])
    size = reg.predict(test[cols])
    return p, size


def combine(p: np.ndarray, size: np.ndarray, variant: str) -> np.ndarray:
    if variant == "ev":
        return p * size
    t = {"t50": 0.5, "t70": 0.7, "t85": 0.85}[variant]
    return np.where(p > t, size, 0.0)


def backtest(P, origins, active, cols) -> pd.DataFrame:
    res = []
    for o in origins:
        for h in range(1, H + 1):
            train = P[(P["date"] + pd.DateOffset(months=h) <= o) & P[f"y{h}"].notna()]
            test = P[(P["date"] == o) & P[f"y{h}"].notna() & P["material_id"].isin(active)]
            if test.empty:
                continue
            p, size = fit_two_stage(train, test, h, cols)
            r = test[["material_id", "categoryCode", f"y{h}"]].rename(columns={f"y{h}": "y"}).copy()
            r["origin"], r["h"], r["p"], r["size"] = o, h, p, size
            res.append(r)
    R = pd.concat(res, ignore_index=True)
    actual = np.exp(R["y"])
    R["ape_naive"] = (1 - actual).abs() / actual * 100
    for v in VARIANTS:
        R[f"ape_{v}"] = (np.exp(combine(R["p"].values, R["size"].values, v)) - actual).abs() / actual * 100
    return R


def summary(R: pd.DataFrame) -> pd.DataFrame:
    return R.groupby("h")[["ape_naive", *[f"ape_{v}" for v in VARIANTS]]].mean().rename(columns=lambda c: c.replace("ape_", ""))


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
    replaced = set(cat.index[cat["replacedBy"].notna()]) if "replacedBy" in cat else set()
    prices = prices[~prices["material_id"].isin(replaced)]
    latest = prices["date"].max()
    last = prices.groupby("material_id")["date"].max()
    active = set(last[last >= latest - pd.DateOffset(months=args.stale)].index)
    factors = None
    if not args.no_factors and args.factors.exists():
        factors = pd.read_csv(args.factors, encoding="utf-8-sig", parse_dates=["month_date"]).rename(columns={"month_date": "date"})[["date", *FACTORS]]
    P = build_panel(prices, cat, factors)
    cols = feature_cols(P)

    val_origins = [latest - pd.DateOffset(months=k) for k in range(24, 12, -1)]
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    print("backtest validation ...")
    V = backtest(P, val_origins, active, cols)
    print("backtest test ...")
    T = backtest(P, test_origins, active, cols)
    T.to_csv(args.out / "two_stage_backtest_test.csv", index=False)

    # เลือกแบบจาก validation (เฉลี่ยทุก h) ใช้กับ test และการพยากรณ์จริง
    vmean = summary(V).mean()
    best = min(VARIANTS, key=lambda v: vmean[v])
    use = vmean[best] < vmean["naive"]

    # ความแม่นของขั้นที่ 1 ใน test: ทายว่า "เปลี่ยน" แล้วเปลี่ยนจริงกี่ %
    T["moved"] = T["y"].abs() > EPS
    clf_lines = []
    for t in (0.5, 0.7, 0.85):
        pick = T["p"] > t
        hit = T.loc[pick, "moved"].mean() if pick.any() else float("nan")
        same_dir = (np.sign(T.loc[pick & T.moved, "size"]) == np.sign(T.loc[pick & T.moved, "y"])).mean() if (pick & T.moved).any() else float("nan")
        clf_lines.append(f"| p > {t} | {pick.mean():.0%} | {hit:.0%} | {same_dir:.0%} |")

    names = cat.drop_duplicates("categoryCode").set_index("categoryCode")["category"]
    bc = T.groupby(["categoryCode", "h"])[["ape_naive", f"ape_{best}"]].mean().reset_index()
    bc.insert(1, "หมวด", bc["categoryCode"].astype(str).map(names))
    bc["ชนะ naive"] = np.where(bc[f"ape_{best}"] < bc["ape_naive"], "✅", "—")
    bc = bc.drop(columns="categoryCode").rename(columns={"ape_naive": "naive", f"ape_{best}": best}).set_index(["หมวด", "h"])

    report = [
        "# ผล backtest โมเดล 2 ขั้น (เปลี่ยนไหม → เปลี่ยนเท่าไร)", "",
        f"- ข้อมูลถึง {latest:%Y-%m}, feature และช่วงทดสอบเดียวกับ global_model.py",
        "- ตัวเลขคือ MAPE (%) ยิ่งต่ำยิ่งแม่น", "",
        f"## Validation: จุดเริ่ม {val_origins[0]:%Y-%m} ถึง {val_origins[-1]:%Y-%m} (ใช้เลือกแบบ)", "", md(summary(V)), "",
        f"แบบที่เลือก: **{best}**" + ("" if use else " (แต่ยังไม่ชนะ naive ใน validation จึงใช้ naive)"), "",
        f"## Test: จุดเริ่ม {test_origins[0]:%Y-%m} ถึง {test_origins[-1]:%Y-%m} ({len(T):,} จุด)", "", md(summary(T)), "",
        "## ขั้นที่ 1 ทายถูกแค่ไหน (test)", "",
        f"ราคาเปลี่ยนจริง {T['moved'].mean():.0%} ของจุดทั้งหมด", "",
        "| เกณฑ์ | สัดส่วนที่โมเดลบอกว่าเปลี่ยน | ในนั้นเปลี่ยนจริง | ทิศขึ้น/ลงถูก (เฉพาะที่เปลี่ยนจริง) |", "|---|---|---|---|", *clf_lines, "",
        f"## Test แยกหมวด (แบบ {best})", "", md(bc), "",
    ]

    # พยากรณ์จริง
    base = pd.read_csv(args.baseline_forecast)
    out = base.copy()
    if use:
        now = P[(P["date"] == latest) & P["material_id"].isin(active)]
        for h in range(1, H + 1):
            p, size = fit_two_stage(P[P[f"y{h}"].notna()], now, h, cols)
            delta = combine(p, size, best)
            for m, d in zip(now["material_id"], delta):
                if abs(d) <= EPS:
                    continue
                i = out.index[(out.material_id == m) & (out.month == h)]
                f = float(np.exp(d))
                out.loc[i, "price"] = (out.loc[i, "price"] * f).round(2)
                out.loc[i, "low"] = (out.loc[i, "low"] * f).round(2)
                out.loc[i, "high"] = (out.loc[i, "high"] * f).round(2)
                out.loc[i, "model"] = f"two_stage_{best}"
    out.to_csv(args.out / "forecast_two_stage.csv", index=False)
    report += ["## ไฟล์พยากรณ์", "", f"`out/forecast_two_stage.csv`: โมเดลขยับจาก naive {int(out.model.str.startswith('two_stage').sum())} จุด จาก {len(out)} จุด"]
    (args.out / "two_stage_backtest.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
