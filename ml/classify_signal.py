"""
วัดผลป้าย "ราคามีโอกาสเปลี่ยน" แบบ Classification: เทียบ LightGBM กับ Logistic Regression และกฎตามหมวด

    python classify_signal.py         # ~10 นาที

target: ราคาเดือน t+h ต่างจากเดือน t หรือไม่ (1 = เปลี่ยน, 0 = เท่าเดิม)
โมเดล
  rule      กฎง่าย ๆ: โอกาสเปลี่ยน = สัดส่วนเดือนที่หมวดนั้นเคยเปลี่ยนใน train (baseline)
  logistic  Logistic Regression (เติมค่าว่างด้วยมัธยฐาน + StandardScaler จาก train + one-hot หมวด)
  lightgbm  LightGBM Classifier ค่าตั้งเดียวกับที่ใช้บนเว็บ (change_signal.py)
walk-forward แบบเดียวกับ compare_models.py: Validation 27 จุด, Test 12 จุด
วัดที่ threshold 0.5 (มาตรฐาน) และ 0.7 (เกณฑ์ที่เว็บขึ้นป้าย) + ROC AUC + Confusion Matrix

ผลลัพธ์: out/classify_report.md, out/classify_preds.csv
"""
from __future__ import annotations

import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from global_model import H, PARAMS, feature_cols, md
from train_best import EPS
from tune import load

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
OUT = HERE / "out"


def fit_models(train, test, h, cols):
    import lightgbm as lgb
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    y = (train[f"y{h}"].abs() > EPS).astype(int)
    rate = y.groupby(train["categoryCode"].astype(str)).mean()
    p_rule = test["categoryCode"].astype(str).map(rate).fillna(y.mean()).to_numpy()
    num = [c for c in cols if c not in ("categoryCode", "familyCode")]
    oh = lambda d: pd.concat([d[num], pd.get_dummies(d["categoryCode"].astype(str), prefix="cat", dtype=float)], axis=1)
    Xtr, Xte = oh(train), oh(test)
    Xte = Xte.reindex(columns=Xtr.columns, fill_value=0.0)
    logit = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=2000, C=1.0))
    p_log = logit.fit(Xtr, y).predict_proba(Xte)[:, 1]
    p_lgb = lgb.LGBMClassifier(**PARAMS, random_state=7).fit(train[cols], y).predict_proba(test[cols])[:, 1]
    return {"rule": p_rule, "logistic": p_log, "lightgbm": p_lgb}


def run(P, origins, active, cols, label):
    rows, t0 = [], time.time()
    for i, o in enumerate(origins):
        for h in range(1, H + 1):
            train = P[(P["date"] + pd.DateOffset(months=h) <= o) & P[f"y{h}"].notna()]
            test = P[(P["date"] == o) & P[f"y{h}"].notna() & P["material_id"].isin(active)]
            if test.empty:
                continue
            r = test[["material_id", "categoryCode"]].copy()
            r["origin"], r["h"], r["moved"] = o, h, (test[f"y{h}"].abs() > EPS).astype(int).values
            for k, p in fit_models(train, test, h, cols).items():
                r[f"p_{k}"] = p
            rows.append(r)
        print(f"  {label} {i + 1}/{len(origins)} ({time.time() - t0:.0f}s)", flush=True)
    return pd.concat(rows, ignore_index=True)


def metrics(R, models=("rule", "logistic", "lightgbm"), thresholds=(0.5, 0.7)):
    from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score, roc_auc_score
    out = []
    for h, g in R.groupby("h"):
        for m in models:
            for t in thresholds:
                pred = (g[f"p_{m}"] >= t).astype(int)
                out.append({"h": h, "model": m, "threshold": t, "AUC": roc_auc_score(g.moved, g[f"p_{m}"]),
                            "Accuracy": accuracy_score(g.moved, pred), "Precision": precision_score(g.moved, pred, zero_division=0),
                            "Recall": recall_score(g.moved, pred), "F1": f1_score(g.moved, pred), "ขึ้นป้าย (%)": pred.mean() * 100})
    return pd.DataFrame(out)


def confusion(R, model, h, t):
    g = R[R.h == h]
    pred = g[f"p_{model}"] >= t
    return pd.DataFrame({"ทายว่าไม่เปลี่ยน": [int((~pred & (g.moved == 0)).sum()), int((~pred & (g.moved == 1)).sum())],
                         "ทายว่าเปลี่ยน": [int((pred & (g.moved == 0)).sum()), int((pred & (g.moved == 1)).sum())]},
                        index=["จริง: ไม่เปลี่ยน", "จริง: เปลี่ยน"])


def main():
    t0 = time.time()
    P, latest, active = load()
    cols = feature_cols(P)
    cv_origins = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS"))
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    CV = run(P, cv_origins, active, cols, "cv")
    TE = run(P, test_origins, active, cols, "test")
    pd.concat([CV.assign(split="validation"), TE.assign(split="test")]).to_csv(OUT / "classify_preds.csv", index=False)
    mcv, mte = metrics(CV), metrics(TE)
    names = {"rule": "กฎตามหมวด (baseline)", "logistic": "Logistic Regression", "lightgbm": "LightGBM"}
    tab = lambda m, t: m[m.threshold == t].drop(columns="threshold").assign(model=lambda d: d.model.map(names)).set_index(["h", "model"])
    report = [
        "# วัดผลป้าย \"ราคามีโอกาสเปลี่ยน\" แบบ Classification (classify_signal.py)", "",
        f"- target: ราคาเดือน t+h ต่างจากเดือน t หรือไม่ | Validation {len(CV):,} จุด, Test {len(TE):,} จุด",
        f"- ราคาเปลี่ยนจริง (Test): ทาย 1 เดือน {TE[TE.h == 1].moved.mean():.0%}, 2 เดือน {TE[TE.h == 2].moved.mean():.0%}, 3 เดือน {TE[TE.h == 3].moved.mean():.0%}",
        "", "## Test, threshold 0.5", "", md(tab(mte, 0.5)),
        "", "## Test, threshold 0.7 (เกณฑ์ที่เว็บขึ้นป้าย)", "", md(tab(mte, 0.7)),
        "", "## Validation, threshold 0.5", "", md(tab(mcv, 0.5)),
        "", "## Confusion Matrix: LightGBM, ทาย 1 เดือน, Test, threshold 0.7", "", md(confusion(TE, "lightgbm", 1, 0.7)),
        "", "## Confusion Matrix: Logistic Regression, ทาย 1 เดือน, Test, threshold 0.7", "", md(confusion(TE, "logistic", 1, 0.7)),
        "", f"ใช้เวลา {time.time() - t0:.0f} วินาที",
    ]
    (OUT / "classify_report.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
