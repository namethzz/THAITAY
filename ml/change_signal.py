"""
โอกาสที่ราคาจะเปลี่ยน ภายใน 1, 2, 3 เดือน (ไม่บอกทิศ) สำหรับป้าย "ราคามีโอกาสเปลี่ยน" บนเว็บ

    python change_signal.py      # ~2 นาที  ต้องมี data/prices_clean.csv และ data/factors_monthly.csv

1. classifier (LightGBM) feature เดียวกับ train_best.py ใช้ราคาตลาดเดือนเดียวกัน
2. ทดสอบย้อนหลังแบบไม่ใช้ข้อมูลอนาคต: จุดเริ่มทุก 3 เดือนตั้งแต่ ม.ค. 2562 + ทุกเดือนใน 12 เดือนล่าสุด
3. ปรับเทียบ (calibrate): แบ่งค่าที่โมเดลให้เป็นช่วง แล้วดูว่าในช่วงนั้นราคาเปลี่ยนจริงกี่ %
   ตัวเลขที่ส่งให้เว็บคือ % ที่เกิดจริงนี้ ไม่ใช่ค่าดิบของโมเดล
4. ฝึกด้วยข้อมูลทั้งหมด ทายที่เดือนล่าสุด แล้วเติมคอลัมน์ change_prob ลง api_data/forecast.csv

ผลลัพธ์: out/change_signal.md, api_data/forecast.csv (เพิ่ม/อัปเดตคอลัมน์ change_prob)
"""
from __future__ import annotations

import json
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from global_model import CATALOG, FACTORS, H, PARAMS, build_panel, feature_cols, md
from train_best import EPS, EXTRA_FACTORS, add_features

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
BINS = [0, 0.3, 0.5, 0.7, 0.85, 1.0001]
SHOW_AT = 0.7  # เว็บแสดงป้ายเมื่อโอกาสที่เกิดจริงตั้งแต่ 70%


def load():
    cat = pd.DataFrame(json.loads(CATALOG.read_text(encoding="utf-8"))["materials"]).set_index("id")
    prices = pd.read_csv(HERE / "data" / "prices_clean.csv", parse_dates=["date"])
    replaced = set(cat.index[cat["replacedBy"].notna()]) if "replacedBy" in cat else set()
    prices = prices[~prices["material_id"].isin(replaced)]
    latest = prices["date"].max()
    last = prices.groupby("material_id")["date"].max()
    active = set(last[last >= latest - pd.DateOffset(months=3)].index)
    F = pd.read_csv(HERE / "data" / "factors_monthly.csv", parse_dates=["month_date"]).rename(columns={"month_date": "date"})
    F = F[["date", *FACTORS, *[c for c in EXTRA_FACTORS if c in F]]]
    market = [c for c in F.columns if c not in ("date", "scrap_metal_ppi_index")]
    F = F[["date", *market]].assign(date=lambda d: d["date"] - pd.DateOffset(months=1)).merge(
        F[["date", "scrap_metal_ppi_index"]], on="date", how="outer").sort_values("date")
    P = add_features(build_panel(prices, cat, F[["date", *FACTORS]]), F)
    return cat, P, latest, active


def fit_p(train, test, h, cols):
    import lightgbm as lgb
    y = (train[f"y{h}"].abs() > EPS).astype(int)
    return lgb.LGBMClassifier(**PARAMS, random_state=7).fit(train[cols], y).predict_proba(test[cols])[:, 1]


def main() -> None:
    cat, P, latest, active = load()
    cols = feature_cols(P)
    origins = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS")) + \
        [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    rows, t0 = [], time.time()
    for o in origins:
        for h in range(1, H + 1):
            train = P[(P["date"] + pd.DateOffset(months=h) <= o) & P[f"y{h}"].notna()]
            test = P[(P["date"] == o) & P[f"y{h}"].notna() & P["material_id"].isin(active)]
            if test.empty:
                continue
            r = test[["material_id", "categoryCode"]].copy()
            r["origin"], r["h"], r["p"] = o, h, fit_p(train, test, h, cols)
            r["moved"] = test[f"y{h}"].abs().values > EPS
            rows.append(r)
    R = pd.concat(rows, ignore_index=True)
    print(f"backtest {len(R):,} จุด ({time.time() - t0:.0f}s)")

    R["bin"] = pd.cut(R["p"], BINS, right=False)
    calib = R.groupby(["h", "bin"], observed=True)["moved"].agg(["mean", "size"]).reset_index()
    rate = {(r.h, r.bin.left): r["mean"] for _, r in calib.iterrows()}
    # ฐานเทียบ: ใช้แค่ "หมวดนี้เปลี่ยนบ่อยแค่ไหน" โดยไม่มีโมเดล
    R["cat_rate"] = R.groupby(["h", "categoryCode"], observed=True)["moved"].transform("mean")
    R["calibrated"] = [rate[(h, b.left)] for h, b in zip(R["h"], R["bin"])]
    lines = []
    for h in range(1, H + 1):
        x = R[R.h == h]
        flag = x["calibrated"] >= SHOW_AT
        flag_cat = x["cat_rate"] >= SHOW_AT
        lines.append(f"| {h} | {x.moved.mean():.0%} | {flag.mean():.0%} | {x.loc[flag, 'moved'].mean():.0%} | {flag_cat.mean():.0%} | {x.loc[flag_cat, 'moved'].mean() if flag_cat.any() else float('nan'):.0%} |")
    calib_tab = calib.assign(ช่วงค่าโมเดล=calib["bin"].astype(str), เปลี่ยนจริง=calib["mean"].map("{:.0%}".format)).rename(columns={"size": "จุด"})[["h", "ช่วงค่าโมเดล", "จุด", "เปลี่ยนจริง"]]

    # ทายจริงที่เดือนล่าสุด
    now = P[(P["date"] == latest) & P["material_id"].isin(active)]
    fc_path = HERE / "api_data" / "forecast.csv"
    fc = pd.read_csv(fc_path)
    fc["change_prob"] = np.nan
    for h in range(1, H + 1):
        p = fit_p(P[P[f"y{h}"].notna()], now, h, cols)
        b = pd.cut(pd.Series(p), BINS, right=False)
        base = R.loc[R.h == h, "moved"].mean()  # ช่วงที่ไม่เคยมีจุดในการทดสอบ ใช้อัตราเฉลี่ย
        prob = dict(zip(now["material_id"], [round(float(rate.get((h, x.left), base)), 2) for x in b]))
        m = fc["month"] == h
        fc.loc[m, "change_prob"] = fc.loc[m, "material_id"].map(prob)
    fc.to_csv(fc_path, index=False)
    shown = fc[(fc.month == 1) & (fc.change_prob >= SHOW_AT)]
    names = cat["name"]

    report = [
        "# โอกาสที่ราคาจะเปลี่ยน (change_signal.py)", "",
        f"- ข้อมูลถึง {latest:%Y-%m}, ทดสอบย้อนหลัง {len(origins)} จุดเริ่ม ({len(R):,} จุด) ไม่ใช้ข้อมูลอนาคต",
        f"- เว็บแสดงป้ายเมื่อโอกาสเปลี่ยน (ที่เกิดจริงในการทดสอบ) ≥ {SHOW_AT:.0%}", "",
        "## ปรับเทียบ: ค่าที่โมเดลให้ → ราคาเปลี่ยนจริง", "", md(calib_tab.set_index(["h", "ช่วงค่าโมเดล"])), "",
        "## ป้ายนี้ช่วยได้จริงไหม", "",
        "เทียบกับการขึ้นป้ายจากหมวดอย่างเดียว (หมวดที่ราคาเปลี่ยนบ่อย ≥ 70%)", "",
        "| h | ราคาเปลี่ยนจริง (ทั้งหมด) | โมเดล: ขึ้นป้าย | โมเดล: ขึ้นป้ายแล้วเปลี่ยนจริง | หมวด: ขึ้นป้าย | หมวด: ขึ้นป้ายแล้วเปลี่ยนจริง |",
        "|---|---|---|---|---|---|", *lines, "",
        f"## ป้ายเดือนหน้า (จากราคา {latest:%Y-%m})", "",
        f"ขึ้นป้าย {len(shown)} จาก {int((fc.month == 1).sum())} วัสดุ", "",
        *[f"- {names.get(r.material_id, r.material_id)[:70]}: {r.change_prob:.0%}" for r in shown.sort_values('change_prob', ascending=False).head(20).itertuples()],
    ]
    (HERE / "out" / "change_signal.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
