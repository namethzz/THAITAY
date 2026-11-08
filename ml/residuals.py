"""
Residual analysis ของช่วง Test จากผลของ compare_models.py (ตามสไลด์ Regression: ดู residual ก่อนสรุป)

    python residuals.py

residual (%) = (ราคาจริง − ราคาที่ทาย) / ราคาจริง × 100  บวก = ทายต่ำไป, ลบ = ทายสูงไป
กราฟ 5 รูปใน report_figures/ และตัวเลขสรุปใน out/residuals_report.md
"""
from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from global_model import md

HERE = Path(__file__).resolve().parent
FIG = HERE / "report_figures"
FIG.mkdir(exist_ok=True)
# สีตาม entity คงที่ทุกกราฟ (ตรวจด้วย validate_palette.js แล้ว)
MODELS = {"naive": ("Naive (baseline)", "#2a78d6"), "lgbm": ("LightGBM", "#eb6834"),
          "rf": ("Random Forest", "#1baf7a"), "lstm": ("LSTM", "#eda100")}
INK, MUTED, GRID, SURFACE = "#0b0b0b", "#898781", "#e1e0d9", "#fcfcfb"
CAT = {"STR-01": "เหล็กเส้น", "STR-02": "เหล็กรูปพรรณ", "STR-03": "ตะแกรงเหล็ก", "STR-04": "ลวดผูกเหล็ก",
       "STR-05": "ลวดอัดแรง", "STR-06": "คอนกรีตผสมเสร็จ", "STR-07": "คอนกรีตหยาบ", "STR-08": "เสาเข็ม/สำเร็จรูป"}

plt.rcParams.update({
    "font.family": "Loma", "font.size": 11, "axes.edgecolor": "#c3c2b7", "axes.labelcolor": INK,
    "xtick.color": MUTED, "ytick.color": MUTED, "axes.grid": True, "grid.color": GRID, "grid.linewidth": 0.6,
    "axes.spines.top": False, "axes.spines.right": False, "figure.facecolor": SURFACE, "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE, "axes.titlesize": 12, "axes.titleweight": "bold", "axes.titlecolor": INK,
})


def load(h):
    R = pd.read_csv(HERE / "out" / "compare_preds_test.csv", parse_dates=["origin"])
    R = R[R.h == h].copy()
    R["target_month"] = R["origin"] + pd.DateOffset(months=h)
    R["actual_chg"] = (np.exp(R["y"]) - 1) * 100
    for m in MODELS:
        pred = R["price"] * np.exp(R[f"d_{m}"])
        R[f"pred_chg_{m}"] = (np.exp(R[f"d_{m}"]) - 1) * 100
        R[f"res_{m}"] = (R["actual"] - pred) / R["actual"] * 100
    return R


def save(fig, name):
    fig.savefig(FIG / name, dpi=160, bbox_inches="tight")
    plt.close(fig)


def actual_vs_pred(R, h):
    fig, axes = plt.subplots(1, 4, figsize=(15, 4.2), sharex=True, sharey=True)
    lim = np.nanpercentile(np.abs(R["actual_chg"]), 99.5) + 2
    for ax, (m, (name, color)) in zip(axes, MODELS.items()):
        ax.plot([-lim, lim], [-lim, lim], color=MUTED, lw=1, ls="--", zorder=1)
        ax.scatter(R[f"pred_chg_{m}"], R["actual_chg"], s=10, color=color, alpha=0.35, edgecolors="none", zorder=2)
        ax.set_title(name)
        ax.set_xlim(-lim, lim)
        ax.set_ylim(-lim, lim)
        ax.set_xlabel("% เปลี่ยนที่ทาย")
    axes[0].set_ylabel("% เปลี่ยนจริง")
    fig.suptitle(f"ราคาเปลี่ยนจริงเทียบที่ทาย (ทาย {h} เดือน, Test) เส้นประ = ทายถูกพอดี", x=0.01, ha="left", color=INK)
    save(fig, f"actual_vs_pred_h{h}.png")


def residual_vs_pred(R, h):
    fig, axes = plt.subplots(1, 4, figsize=(15, 4.2), sharey=True)
    lim = np.nanpercentile(np.abs(R[[f"res_{m}" for m in MODELS]].to_numpy()), 99.5) + 2
    for ax, (m, (name, color)) in zip(axes, MODELS.items()):
        ax.axhline(0, color=MUTED, lw=1)
        ax.scatter(R[f"pred_chg_{m}"], R[f"res_{m}"], s=10, color=color, alpha=0.35, edgecolors="none")
        ax.set_title(name)
        ax.set_ylim(-lim, lim)
        ax.set_xlabel("% เปลี่ยนที่ทาย")
    axes[0].set_ylabel("residual (%)")
    fig.suptitle(f"Residual เทียบค่าที่ทาย (ทาย {h} เดือน, Test) บวก = ทายต่ำไป ลบ = ทายสูงไป", x=0.01, ha="left", color=INK)
    save(fig, f"residual_vs_pred_h{h}.png")


def residual_hist(R, h):
    fig, axes = plt.subplots(1, 4, figsize=(15, 3.8), sharex=True, sharey=True)
    bins = np.linspace(-15, 15, 61)
    for ax, (m, (name, color)) in zip(axes, MODELS.items()):
        r = R[f"res_{m}"].clip(-15, 15)
        ax.hist(r, bins=bins, color=color, edgecolor=SURFACE, linewidth=0.8)
        ax.set_title(f"{name}\nเฉลี่ย {R[f'res_{m}'].mean():+.2f}%  |MAE| {R[f'res_{m}'].abs().mean():.2f}%", fontsize=11)
        ax.set_xlabel("residual (%)")
    axes[0].set_ylabel("จำนวนการทาย")
    fig.suptitle(f"การกระจายของ residual (ทาย {h} เดือน, Test, ตัดที่ ±15%)", x=0.01, ha="left", color=INK, y=1.04)
    save(fig, f"residual_hist_h{h}.png")


def error_by_month(R, h):
    fig, ax = plt.subplots(figsize=(10, 4.4))
    g = R.groupby("target_month")[[f"res_{m}" for m in MODELS]].apply(lambda d: d.abs().mean())
    for m, (name, color) in MODELS.items():
        ax.plot(g.index, g[f"res_{m}"], color=color, lw=2, marker="o", ms=4, label=name)
    last = g.index[-1]
    for m, (name, color) in MODELS.items():
        ax.annotate(name, (last, g[f"res_{m}"].iloc[-1]), xytext=(6, 0), textcoords="offset points",
                    va="center", fontsize=9, color=INK)
    ax.set_ylabel("MAE (%)")
    ax.set_ylim(bottom=0)
    ax.set_title(f"ความผิดพลาดรายเดือน (ทาย {h} เดือน, Test) ช่วง มี.ค.–มิ.ย. 2569 เหล็กพุ่งแล้วลง", loc="left")
    ax.legend(frameon=False, ncol=4, loc="upper left")
    ax.xaxis.set_major_formatter(matplotlib.dates.DateFormatter("%m/%y"))
    save(fig, f"error_by_month_h{h}.png")


def error_by_category(R, h):
    R = R[R["categoryCode"].isin(CAT)]
    g = R.groupby("categoryCode")[[f"res_{m}" for m in MODELS]].apply(lambda d: d.abs().mean())
    g = g.sort_values("res_naive")
    fig, ax = plt.subplots(figsize=(10, 5.2))
    y = np.arange(len(g))
    w = 0.2
    for k, (m, (name, color)) in enumerate(MODELS.items()):
        ax.barh(y + (k - 1.5) * w, g[f"res_{m}"], height=w - 0.03, color=color, label=name)
    ax.set_yticks(y)
    ax.set_yticklabels([CAT[c] for c in g.index])
    ax.set_xlabel("MAE (%)")
    ax.grid(axis="y", visible=False)
    ax.set_title(f"ความผิดพลาดแยกหมวด (ทาย {h} เดือน, Test)", loc="left")
    ax.legend(frameon=False, ncol=4, loc="lower right")
    save(fig, f"error_by_category_h{h}.png")


def main():
    lines = ["# Residual analysis (residuals.py)", "", "residual (%) = (ราคาจริง − ราคาที่ทาย) / ราคาจริง × 100", ""]
    for h in (1, 3):
        R = load(h)
        for f in (actual_vs_pred, residual_vs_pred, residual_hist, error_by_month, error_by_category):
            f(R, h)
        s = pd.DataFrame({MODELS[m][0]: {"เฉลี่ย (bias, %)": R[f"res_{m}"].mean(), "MAE (%)": R[f"res_{m}"].abs().mean(),
                                         "สัดส่วนทายต่ำไป (%)": (R[f"res_{m}"] > 0.01).mean() * 100,
                                         "สัดส่วนทายสูงไป (%)": (R[f"res_{m}"] < -0.01).mean() * 100,
                                         "|residual| > 10% (%)": (R[f"res_{m}"].abs() > 10).mean() * 100} for m in MODELS}).T
        lines += [f"## ทาย {h} เดือน", "", md(s), ""]
    lines += ["กราฟอยู่ใน `report_figures/`"]
    (HERE / "out" / "residuals_report.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
