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

ผลลัพธ์: out/classify_report.md, out/classify_preds.csv, report_figures/confusion_h{1,2,3}.png

    python classify_signal.py --plots  # วาด Confusion Matrix ใหม่จาก out/classify_preds.csv โดยไม่ต้องรันใหม่
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


NAMES = {"rule": "กฎตามหมวด (baseline)", "logistic": "Logistic Regression", "lightgbm": "LightGBM"}


def plot_confusion(R, t=0.7):
    """Confusion Matrix ช่วง Test แยกตามระยะทาย สีเข้ม = สัดส่วนสูงในแถวนั้น"""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.colors import LinearSegmentedColormap
    fig_dir = HERE / "report_figures"
    fig_dir.mkdir(exist_ok=True)
    ink, muted, surface = "#0b0b0b", "#898781", "#fcfcfb"
    cmap = LinearSegmentedColormap.from_list("blue", ["#cde2fb", "#86b6ef", "#3987e5", "#1c5cab", "#104281"])
    plt.rcParams.update({"font.family": "Loma", "font.size": 11, "figure.facecolor": surface,
                         "savefig.facecolor": surface, "axes.facecolor": surface})
    for h in sorted(R.h.unique()):
        fig, axes = plt.subplots(1, 3, figsize=(13, 4.2))
        for ax, m in zip(axes, NAMES):
            cm = confusion(R, m, h, t).to_numpy()
            share = cm / cm.sum(axis=1, keepdims=True)
            ax.imshow(share, cmap=cmap, vmin=0, vmax=1)
            for i in range(2):
                for j in range(2):
                    r, g_, b, _ = cmap(share[i, j])  # เลือกสีตัวอักษรตามความสว่างของช่อง
                    dark = 0.2126 * r ** 2.2 + 0.7152 * g_ ** 2.2 + 0.0722 * b ** 2.2 < 0.22
                    ax.text(j, i, f"{cm[i, j]:,}\n({share[i, j]:.0%} ของแถว)", ha="center", va="center", fontsize=11,
                            color="white" if dark else ink)
            g = R[R.h == h]
            pred = g[f"p_{m}"] >= t
            prec = (pred & (g.moved == 1)).sum() / max(pred.sum(), 1)
            rec = (pred & (g.moved == 1)).sum() / max((g.moved == 1).sum(), 1)
            ax.set_title(f"{NAMES[m]}\nPrecision {prec:.0%}  Recall {rec:.0%}", fontsize=11, color=ink)
            ax.set_xticks([0, 1], ["ทายว่าไม่เปลี่ยน", "ทายว่าเปลี่ยน"], color=muted)
            ax.set_yticks([0, 1], ["จริง: ไม่เปลี่ยน", "จริง: เปลี่ยน"], color=muted)
            ax.tick_params(length=0)
            for sp in ax.spines.values():
                sp.set_visible(False)
        fig.suptitle(f"Confusion Matrix ป้าย \"ราคามีโอกาสเปลี่ยน\" (ทาย {h} เดือน, Test, ขึ้นป้ายเมื่อโอกาส {t:.0%} ขึ้นไป)",
                     x=0.01, ha="left", color=ink, fontweight="bold")
        fig.tight_layout()
        fig.savefig(fig_dir / f"confusion_h{h}.png", dpi=160, bbox_inches="tight")
        plt.close(fig)


def main():
    import sys
    if "--plots" in sys.argv:
        R = pd.read_csv(OUT / "classify_preds.csv")
        plot_confusion(R[R.split == "test"])
        return
    t0 = time.time()
    P, latest, active = load()
    cols = feature_cols(P)
    cv_origins = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS"))
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    CV = run(P, cv_origins, active, cols, "cv")
    TE = run(P, test_origins, active, cols, "test")
    pd.concat([CV.assign(split="validation"), TE.assign(split="test")]).to_csv(OUT / "classify_preds.csv", index=False)
    mcv, mte = metrics(CV), metrics(TE)
    tab = lambda m, t: m[m.threshold == t].drop(columns="threshold").assign(model=lambda d: d.model.map(NAMES)).set_index(["h", "model"])
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
    plot_confusion(TE)
    print("\n".join(report))


if __name__ == "__main__":
    main()
