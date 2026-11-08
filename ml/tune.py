"""
ค้นหาค่า hyperparameter ของ LightGBM แบบไม่ใช้ข้อมูลอนาคต

    python tune.py              # ~40 นาที บนเครื่อง 4 คอร์

ใช้ feature และผู้สมัครชุดเดียวกับ train_best.py (ราคาตลาดเดือนเดียวกัน)
  รอบคัด     สุ่มค่า 20 ชุด + ค่าเดิม ทดสอบเร็วกับจุดเริ่ม 9 จุด (ทุก 9 เดือน 2562–2568)
  รอบตัดสิน   5 ชุดที่ดีที่สุดจากรอบคัด ทดสอบเต็ม 27 จุด (ทุก 3 เดือน ม.ค. 2562 – ก.ค. 2568)
  เลือก       ชุดค่า × ผู้สมัคร ที่ MAE (%) เฉลี่ยใน CV ต่ำสุด แยกตามระยะ h
  วัดผลจริง   ชุดที่เลือก ทดสอบที่ 12 เดือนล่าสุด (ก.ย. 2568 – ส.ค. 2569) ไม่ได้ใช้เลือกอะไร

ผลลัพธ์: out/tune_report.md, out/tune_results.csv
"""
from __future__ import annotations

import json
import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from global_model import CATALOG, FACTORS, H, PARAMS, build_panel, feature_cols, md
from train_best import CANDS, EPS, EXTRA_FACTORS, add_features

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
SPACE = {
    "num_leaves": [7, 15, 31, 63],
    "learning_rate": [0.01, 0.03, 0.1],
    "n_estimators": [100, 300, 600],
    "min_child_samples": [20, 40, 100, 200],
    "subsample": [0.7, 0.9],
    "colsample_bytree": [0.5, 0.8, 1.0],
    "reg_lambda": [0.0, 1.0, 10.0],
}


def load():
    cat = pd.DataFrame(json.loads(CATALOG.read_text(encoding="utf-8"))["materials"]).set_index("id")
    prices = pd.read_csv(HERE / "data" / "prices_clean.csv", parse_dates=["date"])
    prices = prices[~prices["material_id"].isin(set(cat.index[cat["replacedBy"].notna()]))]
    latest = prices["date"].max()
    last = prices.groupby("material_id")["date"].max()
    active = set(last[last >= latest - pd.DateOffset(months=3)].index)
    F = pd.read_csv(HERE / "data" / "factors_monthly.csv", parse_dates=["month_date"]).rename(columns={"month_date": "date"})
    F = F[["date", *FACTORS, *[c for c in EXTRA_FACTORS if c in F]]]
    market = [c for c in F.columns if c not in ("date", "scrap_metal_ppi_index")]
    F = F[["date", *market]].assign(date=lambda d: d["date"] - pd.DateOffset(months=1)).merge(
        F[["date", "scrap_metal_ppi_index"]], on="date", how="outer").sort_values("date")
    P = add_features(build_panel(prices, cat, F[["date", *FACTORS]]), F)
    return P, latest, active


def fit_all(train, test, h, cols, params):
    import lightgbm as lgb
    y = train[f"y{h}"]
    direct = lgb.LGBMRegressor(**params, objective="l1", random_state=7).fit(train[cols], y).predict(test[cols])
    moved = (y.abs() > EPS).astype(int)
    p = lgb.LGBMClassifier(**params, random_state=7).fit(train[cols], moved).predict_proba(test[cols])[:, 1]
    tm = train[moved == 1]
    size = lgb.LGBMRegressor(**params, objective="l1", random_state=7).fit(tm[cols], tm[f"y{h}"]).predict(test[cols])
    t85 = np.where(p > 0.85, size, 0.0)
    return {"naive": np.zeros(len(test)), "direct": direct, "direct_half": direct / 2, "ts_ev": p * size,
            "ts_t70": np.where(p > 0.7, size, 0.0), "ts_t85": t85, "ts_t85_half": t85 / 2}


def evaluate(P, origins, active, cols, params) -> pd.DataFrame:
    """MAE (%) เฉลี่ยของผู้สมัครทุกตัว แยก h"""
    rows = []
    for o in origins:
        for h in range(1, H + 1):
            train = P[(P["date"] + pd.DateOffset(months=h) <= o) & P[f"y{h}"].notna()]
            test = P[(P["date"] == o) & P[f"y{h}"].notna() & P["material_id"].isin(active)]
            if test.empty or train.empty:
                continue
            a = np.exp(test[f"y{h}"].values)
            for k, d in fit_all(train, test, h, cols, params).items():
                rows.append((h, k, np.abs(np.exp(d) - a) / a * 100))
    out = {}
    for h, k, e in rows:
        out.setdefault((h, k), []).append(e)
    return pd.Series({key: np.concatenate(v).mean() for key, v in out.items()}).unstack()


def main() -> None:
    t0 = time.time()
    P, latest, active = load()
    cols = feature_cols(P)
    rng = np.random.default_rng(7)
    base = {k: v for k, v in PARAMS.items() if k not in ("verbose", "subsample_freq")}
    configs = [base] + [{k: rng.choice(v).item() for k, v in SPACE.items()} for _ in range(20)]
    fixed = {"subsample_freq": 1, "verbose": -1, "n_jobs": 4}
    all_cv = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS"))
    quick = all_cv[::3]
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]

    # รอบคัด
    screen = []
    for i, c in enumerate(configs):
        r = evaluate(P, quick, active, cols, {**c, **fixed})
        best = r.drop(columns="naive").mean().min()
        screen.append({"config": i, **c, "quick_best": best, "quick_naive": r["naive"].mean()})
        print(f"คัด {i + 1}/{len(configs)} best={best:.3f} naive={r['naive'].mean():.3f} ({time.time() - t0:.0f}s)", flush=True)
    S = pd.DataFrame(screen).sort_values("quick_best")
    top = S.head(5)["config"].tolist()
    if 0 not in top:
        top.append(0)  # ค่าเดิมไว้เทียบเสมอ

    # รอบตัดสิน
    full = {}
    for i in top:
        full[i] = evaluate(P, all_cv, active, cols, {**configs[i], **fixed})
        print(f"ตัดสิน config {i} ({time.time() - t0:.0f}s)", flush=True)
    rows = []
    for i, r in full.items():
        for h in r.index:
            for k in r.columns:
                rows.append({"config": i, "h": h, "candidate": k, "cv_mae": r.loc[h, k]})
    CV = pd.DataFrame(rows)
    naive_cv = CV[CV.candidate == "naive"].groupby("h")["cv_mae"].first()
    model_cv = CV[CV.candidate != "naive"]
    pick = model_cv.loc[model_cv.groupby("h")["cv_mae"].idxmin()].set_index("h")

    # วัดผลจริง
    tests = {}
    for i in sorted(set(pick["config"])):
        tests[i] = evaluate(P, test_origins, active, cols, {**configs[i], **fixed})
        print(f"test config {i} ({time.time() - t0:.0f}s)", flush=True)
    res = []
    for h, r in pick.iterrows():
        t = tests[int(r["config"])]
        res.append({"h": h, "config": int(r["config"]), "แบบ": r["candidate"],
                    "CV baseline": naive_cv[h], "CV โมเดล": r["cv_mae"],
                    "Test baseline": t.loc[h, "naive"], "Test โมเดล": t.loc[h, r["candidate"]]})
    Rz = pd.DataFrame(res).set_index("h")
    CV.to_csv(HERE / "out" / "tune_results.csv", index=False)
    S.to_csv(HERE / "out" / "tune_screen.csv", index=False)

    cfg_tab = pd.DataFrame([{"config": i, **configs[i]} for i in top]).set_index("config")
    report = [
        "# ค้นหาค่า hyperparameter (tune.py)", "",
        f"- ข้อมูลถึง {latest:%Y-%m}, feature {len(cols)} ตัว, ราคาตลาดเดือนเดียวกัน",
        f"- รอบคัด: {len(configs)} ชุด (ค่าเดิม = config 0) × {len(quick)} จุดเริ่ม",
        f"- รอบตัดสิน: {len(top)} ชุด × {len(all_cv)} จุดเริ่ม ({all_cv[0]:%Y-%m} ถึง {all_cv[-1]:%Y-%m})",
        f"- วัดผลจริง: {test_origins[0]:%Y-%m} ถึง {test_origins[-1]:%Y-%m}",
        "- ตัวเลขคือ MAE (%) ยิ่งต่ำยิ่งแม่น", "",
        "## ผล", "", md(Rz), "",
        "## ชุดค่าที่เข้ารอบตัดสิน", "", md(cfg_tab), "",
        f"ใช้เวลา {time.time() - t0:.0f} วินาที",
    ]
    (HERE / "out" / "tune_report.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
