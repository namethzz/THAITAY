"""
โมเดลพื้นฐาน (baseline) ที่รันในเครื่องได้ ไม่ต้องใช้ cloud

    python baseline.py                 # อ่าน data/prices_clean.csv

ทำ 2 อย่าง
  1. Backtest: ย้อนไปยืนที่ 12 เดือนก่อนหน้า (rolling origin) ทีละเดือน ให้แต่ละโมเดลทายราคา 1–3 เดือนถัดไป
     แล้ววัดว่าผิดไปกี่ % (MAPE) ตัวเลขนี้คือ "เกณฑ์ขั้นต่ำ" ที่ Vertex AI / BigQuery ML ต้องชนะให้ได้
  2. พยากรณ์จริง 1–3 เดือนจากเดือนล่าสุด พร้อมช่วงต่ำ–สูง (low/high) จากความคลาดเคลื่อนที่เกิดจริงใน backtest

โมเดลที่เทียบ
  naive     ราคาเดือนหน้า = ราคาเดือนล่าสุด (โมเดลที่ต้องชนะให้ได้ก่อน)
  drift     ต่อแนวโน้มเฉลี่ย 12 เดือนล่าสุด
  snaive    ราคาเดือนเดียวกันปีก่อน × ระดับราคาปัจจุบัน (ต้องมี ≥ 36 เดือน)
  ets       Holt's damped trend บน log ราคา (statsmodels)

ผลลัพธ์
  out/backtest_errors.csv    ความคลาดเคลื่อนทุกจุด
  out/backtest_summary.md    MAPE ต่อโมเดล ต่อช่วงเวลา ต่อหมวด
  out/forecast.csv           material_id, month, date, price, low, high, model  (รูปแบบเดียวกับที่ serve.py ใช้)
"""
from __future__ import annotations

import argparse
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
H = 3

try:
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
except ImportError:  # ไม่มี statsmodels ก็ยังรันได้ แค่ไม่มี ets
    ExponentialSmoothing = None


# ---------------------------------------------------------------- models
def f_naive(y: np.ndarray) -> np.ndarray:
    return np.repeat(y[-1], H)


def f_drift(y: np.ndarray) -> np.ndarray:
    w = y[-13:]
    step = (np.log(w[-1]) - np.log(w[0])) / (len(w) - 1) if len(w) > 1 else 0.0
    return y[-1] * np.exp(step * np.arange(1, H + 1))


def f_snaive(y: np.ndarray) -> np.ndarray | None:
    if len(y) < 36:
        return None
    level = y[-12:].mean() / y[-24:-12].mean()  # ปรับระดับราคาปีก่อนให้เท่าปีนี้
    return y[-12:-12 + H] * level


def f_ets(y: np.ndarray) -> np.ndarray | None:
    if ExponentialSmoothing is None or len(y) < 12:
        return None
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        fit = ExponentialSmoothing(np.log(y), trend="add", damped_trend=True, initialization_method="estimated").fit()
    return np.exp(fit.forecast(H))


MODELS = {"naive": f_naive, "drift": f_drift, "snaive": f_snaive, "ets": f_ets}


def monthly(s: pd.Series) -> pd.Series:
    """เติมเดือนที่ขาดสั้น ๆ (≤ 2 เดือน) ด้วยการลากเส้นตรง ช่องว่างยาวกว่านั้นตัดเอาเฉพาะช่วงล่าสุดที่ต่อเนื่อง"""
    s = s.asfreq("MS")
    s = s.interpolate(limit=2, limit_area="inside")
    if s.isna().any():
        s = s[s.isna()[::-1].cumsum()[::-1] == 0]  # หลังช่องว่างสุดท้าย
    return s


# ---------------------------------------------------------------- main
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, default=HERE / "data" / "prices_clean.csv")
    ap.add_argument("--origins", type=int, default=12, help="จำนวนเดือนที่ย้อนไป backtest")
    ap.add_argument("--min-train", type=int, default=12, help="ต้องมีข้อมูลอย่างน้อยกี่เดือนก่อนจุดที่ทาย")
    ap.add_argument("--select", choices=["per-material", "global"], default="global",
                    help="global = ใช้โมเดลที่ดีที่สุดโดยรวมกับทุกวัสดุ (เสถียรกว่า), per-material = เลือกรายวัสดุ")
    ap.add_argument("--stale", type=int, default=3, help="ข้ามวัสดุที่ไม่มีราคาเกินกี่เดือนก่อนเดือนล่าสุด (เลิกเก็บราคาแล้ว)")
    ap.add_argument("--out", type=Path, default=HERE / "out")
    args = ap.parse_args()

    df = pd.read_csv(args.data, parse_dates=["date"])
    meta = df.drop_duplicates("material_id").set_index("material_id")[["categoryCode"]]
    latest = df["date"].max()
    cutoff = latest - pd.DateOffset(months=args.stale)
    active = df.groupby("material_id")["date"].max() >= cutoff
    skipped = int((~active).sum())
    series = {m: monthly(g.set_index("date")["price"].sort_index()) for m, g in df[df["material_id"].map(active)].groupby("material_id")}

    # 1) backtest
    err = []
    for mid, s in series.items():
        y = s.to_numpy(float)
        for k in range(args.origins, 0, -1):
            cut = len(y) - k                      # ทายจากข้อมูล y[:cut]
            if cut < args.min_train:
                continue
            actual = y[cut:cut + H]
            for name, fn in MODELS.items():
                fc = fn(y[:cut])
                if fc is None:
                    continue
                for h in range(1, len(actual) + 1):
                    err.append((mid, s.index[cut - 1], k, name, h, actual[h - 1], fc[h - 1]))
    E = pd.DataFrame(err, columns=["material_id", "origin", "k", "model", "h", "actual", "forecast"])
    if E.empty:
        raise SystemExit("ข้อมูลสั้นเกินไปสำหรับ backtest (ต้องมีอย่างน้อย min-train + 1 เดือน)")
    E["ape"] = (E["forecast"] - E["actual"]).abs() / E["actual"] * 100
    E["log_ratio"] = np.log(E["actual"] / E["forecast"])
    E["categoryCode"] = E["material_id"].map(meta["categoryCode"])
    # เทียบเฉพาะจุดที่ทุกโมเดลทายได้ ให้ยุติธรรม
    common = E.groupby(["material_id", "origin", "h"])["model"].transform("nunique") == E.groupby(["material_id", "origin", "h"])["model"].transform("size")
    E = E[common]
    args.out.mkdir(parents=True, exist_ok=True)
    E.to_csv(args.out / "backtest_errors.csv", index=False)

    overall = E.pivot_table(index="model", columns="h", values="ape", aggfunc="mean")
    overall["เฉลี่ย 1–3"] = overall.mean(axis=1)
    overall = overall.sort_values("เฉลี่ย 1–3")
    holdout = E[E["k"] == H]  # ยืนที่ 3 เดือนก่อนเดือนล่าสุด แล้วทาย 3 เดือนสุดท้าย
    holdout = holdout.pivot_table(index="model", columns="h", values="ape", aggfunc="mean").reindex(overall.index)
    by_cat = E.pivot_table(index="categoryCode", columns="model", values="ape", aggfunc="mean")[overall.index]
    best_global = overall.index[0]

    per_mat = E.groupby(["material_id", "model"])["ape"].mean().unstack()
    choice = per_mat.idxmin(axis=1) if args.select == "per-material" else pd.Series(best_global, index=per_mat.index)


    # 2) พยากรณ์จริง
    rows = []
    for mid, s in series.items():
        y = s.to_numpy(float)  # มีจุดเดียวได้ (เช่น เพิ่งกลับมาเก็บราคาหลังหยุดไปนาน) จะใช้ naive
        # วัสดุที่ราคาเดือนล่าสุดยังไม่ออก (ช้ากว่าเดือนล่าสุดของชุดข้อมูล lag เดือน) ทายจากราคาที่มี
        # แต่ลงวันที่นับจากเดือนล่าสุดของชุดข้อมูล ให้ "อีก 1 เดือน" บนเว็บเป็นเดือนหน้าจริง และใช้ช่วงต่ำ–สูงที่กว้างขึ้นตาม lag
        lag = (latest.year - s.index[-1].year) * 12 + latest.month - s.index[-1].month
        name = choice.get(mid, best_global)
        fc = MODELS[name](y) if lag == 0 and len(y) >= 2 else None
        if fc is None:
            name, fc = "naive", f_naive(y)
        for h in range(1, H + 1):
            d = latest + pd.DateOffset(months=h)
            p = fc[h - 1]
            rows.append(dict(material_id=mid, month=h, date=d.strftime("%Y-%m-%d"), price=round(p, 2),
                             low=np.nan, high=np.nan, model=name, hb=min(h + lag, H)))
    F = pd.DataFrame(rows)
    # ช่วง low–high: วิธีใน bands.py เลือกด้วย Validation และวัดบน Test แบบแยกชุด (ดู out/bands_report.md)
    # ราคาล่าสุดที่ช้ากว่าเดือนล่าสุด lag เดือน ใช้ช่วงของระยะที่ไกลขึ้นตาม lag (hb)
    from bands import CHOSEN, bands_at, history
    R = F.join(df.drop_duplicates("material_id").set_index("material_id")[["categoryCode", "familyCode"]], on="material_id")
    lo, hi = bands_at(history(df), latest, R, CHOSEN, h_col="hb")
    F["low"], F["high"] = (F["price"] * np.exp(lo)).round(2), (F["price"] * np.exp(hi)).round(2)
    F = F.drop(columns="hb")
    F.to_csv(args.out / "forecast.csv", index=False)

    fmt = lambda t: t.round(2).to_markdown() if hasattr(t, "to_markdown") else t.round(2).to_string()
    try:
        import tabulate  # noqa: F401  (to_markdown ต้องใช้)
    except ImportError:
        fmt = lambda t: "```\n" + t.round(2).to_string() + "\n```"
    md = [
        "# ผล backtest โมเดลพื้นฐาน", "",
        f"- วัสดุ: {E['material_id'].nunique():,} รายการ, จุดที่ทดสอบ: {len(E) // E['model'].nunique():,} ต่อโมเดล",
        f"- ย้อนทดสอบ {args.origins} เดือนล่าสุด ทายล่วงหน้า 1–3 เดือน",
        f"- ข้ามวัสดุที่ไม่มีราคาตั้งแต่ก่อน {cutoff:%Y-%m} (เลิกเก็บราคาแล้ว): {skipped:,} รายการ",
        "- ตัวเลขคือ MAPE (%) ยิ่งต่ำยิ่งแม่น", "",
        "## ทุกจุดที่ทดสอบ (rolling)", "", fmt(overall), "",
        "## เฉพาะ 3 เดือนสุดท้าย (holdout)", "",
        "ใช้เทียบกับ BigQuery ML / Vertex AI ที่ฝึกด้วยข้อมูลถึง 3 เดือนก่อนเดือนล่าสุด", "", fmt(holdout), "",
        "## แยกหมวด (เฉลี่ย 1–3 เดือน)", "", fmt(by_cat), "",
        "## โมเดลที่ใช้พยากรณ์", "",
        f"- วิธีเลือก: {args.select}" + (f" → `{best_global}` กับทุกวัสดุ" if args.select == "global" else ""),
        *(f"- `{k}`: {v} วัสดุ" for k, v in F.drop_duplicates("material_id")["model"].value_counts().items()),
        f"- ช่วง low–high: `bands.py` {CHOSEN} (ผลวัดแบบแยกชุดอยู่ใน out/bands_report.md)",
        "", f"ไฟล์พยากรณ์: `out/forecast.csv` ({F['material_id'].nunique():,} วัสดุ)",
    ]
    (args.out / "backtest_summary.md").write_text("\n".join(md), encoding="utf-8")
    print("\n".join(md))


if __name__ == "__main__":
    main()
