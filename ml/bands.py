"""
ตั้งช่วงราคาต่ำ–สูงของเว็บ และวัดว่าครอบราคาจริงแค่ไหนแบบไม่ใช้ข้อมูลชุดเดียวกับที่ตั้งช่วง

    python bands.py              # ค้นหาค่าตั้งด้วย Validation, วัดบน Test, เขียนช่วงใหม่ลง api_data/forecast.csv
    python bands.py --no-apply   # วัดผลอย่างเดียว

วิธีตั้งช่วง ณ เดือน o (ราคาที่ทายคือ Naive = ราคาล่าสุด)
  1. รวม % การเปลี่ยนราคาจริงย้อนหลังของทุกวัสดุที่รู้ผลแล้ว (เดือนเป้าหมาย <= o)
  2. หาเปอร์เซ็นไทล์ q และ 1 - q แยกกลุ่ม × ระยะทาย (กลุ่มที่ตัวอย่างไม่ถึง MIN_N ใช้ระดับหมวด แล้วค่ารวม)
     ทำ 2 ชุด: จากประวัติทั้งหมด และจาก R เดือนล่าสุด แล้วใช้ช่วงที่กว้างกว่า พอราคาเริ่มแกว่ง ช่วงจะกว้างตาม
  3. ช่วงของระยะไกลต้องไม่แคบกว่าระยะใกล้ และต้องครอบราคาปัจจุบันเสมอ

ค้นหา q, R, กลุ่ม บน Validation (จุดเริ่มเดียวกับ compare_models.py, เดือนเป้าหมายก่อนช่วง Test, ราคาจริงเท่านั้น)
เกณฑ์: ครอบราคาจริง >= 80% ทุกระยะ ใน "ปีที่แย่ที่สุด" ของ Validation (ค่าเฉลี่ยรวมหลายปีกลบปีที่ราคาแกว่ง)
เลือกช่วงที่แคบที่สุดที่ผ่านเกณฑ์ แล้ววัดบน Test ครั้งเดียว
ผลลัพธ์: out/bands_report.md, out/bands_search.csv, api_data/forecast.csv (คอลัมน์ low, high)
"""
from __future__ import annotations

import argparse
import itertools
from pathlib import Path

import numpy as np
import pandas as pd

from baseline import monthly
from global_model import H, md

HERE = Path(__file__).resolve().parent
TARGET = 0.80
MIN_N = 30
# เคยลองรวมช่วงจาก 6, 12, 24 เดือนล่าสุดด้วย (ผ่านเกณฑ์และแคบกว่าในปีปกติ) แต่ช่วงพองตามการกระโดดครั้งเดียว
# เช่น ก.ย. 2569 คอนกรีตผสมเสร็จได้ช่วงเดือนหน้า 0 ถึง +24% เพราะเพิ่งขึ้น 22% เมื่อ พ.ค. ทั้งที่ราคาขั้นบันไดแทบไม่กระโดดซ้ำ
# จึงใช้ประวัติทั้งหมดอย่างเดียว (โค้ดส่วน recent ยังอยู่ ถ้าจะลองใหม่ให้ใส่ 6, 12, 24 กลับเข้าไป)
RECENT = [0]                             # 0 = ใช้ประวัติทั้งหมดอย่างเดียว
QUANTILES = [0.10, 0.075, 0.05, 0.035, 0.025]
GROUPS = ["categoryCode", "familyCode"]
ALL = 999                                # เดือน = ประวัติทั้งหมด
# ค่าที่ใช้บนเว็บ (ผลการค้นหาล่าสุด ดู out/bands_report.md) baseline.py ใช้ค่าชุดนี้
CHOSEN = dict(recent=0, q=0.025, group="categoryCode")


def history(df: pd.DataFrame) -> pd.DataFrame:
    """% การเปลี่ยนราคา (log) ทุกคู่ เดือน t -> t+h ของทุกวัสดุ พร้อมธงว่าเป็นราคาจริงทั้งสองเดือน"""
    meta = df.drop_duplicates("material_id").set_index("material_id")[["categoryCode", "familyCode"]]
    real = set(zip(df["material_id"], df["date"]))
    rows = []
    for mid, g in df.groupby("material_id"):
        s = monthly(g.set_index("date")["price"].sort_index())
        lp = np.log(s)
        for h in range(1, H + 1):
            lr = (lp.shift(-h) - lp).dropna()
            rows.append(pd.DataFrame({"material_id": mid, "origin": lr.index, "h": h, "lr": lr.values}))
    E = pd.concat(rows, ignore_index=True)
    E["target"] = [o + pd.DateOffset(months=int(h)) for o, h in zip(E["origin"], E["h"])]
    E["real"] = [(m, o) in real and (m, t) in real for m, o, t in zip(E["material_id"], E["origin"], E["target"])]
    return E.join(meta, on="material_id")


def band_table(E: pd.DataFrame, o: pd.Timestamp, window: int, q: float, group: str) -> dict:
    """ช่วง (lo, hi) ของ log(ราคาจริง / ราคาล่าสุด) ณ เดือน o แยก กลุ่ม, หมวด, ทั้งหมด × h"""
    hist = E[(E["target"] <= o) & (E["target"] > o - pd.DateOffset(months=window)) & E["real"]]
    out = {}
    for key in dict.fromkeys([group, "categoryCode", None]):
        g = hist.groupby([key, "h"])["lr"] if key else hist.groupby("h")["lr"]
        t = g.quantile([q, 1 - q]).unstack()
        t.columns = ["lo", "hi"]
        t["n"] = g.size()
        if key:  # ระยะไกลไม่แคบกว่าระยะใกล้
            t["lo"], t["hi"] = t["lo"].groupby(level=0).cummin(), t["hi"].groupby(level=0).cummax()
        else:
            t["lo"], t["hi"] = t["lo"].cummin(), t["hi"].cummax()
        out[key] = t
    return out


def lookup(bt: dict, rows: pd.DataFrame, group: str, h_col: str = "h") -> tuple[np.ndarray, np.ndarray]:
    lo, hi = np.full(len(rows), np.nan), np.full(len(rows), np.nan)
    for key in dict.fromkeys([group, "categoryCode", None]):
        t = bt[key]
        t = t[t["n"] >= MIN_N] if key else t
        idx = pd.MultiIndex.from_arrays([rows[key], rows[h_col]]) if key else pd.Index(rows[h_col])
        need = np.isnan(lo)
        lo[need] = t["lo"].reindex(idx).to_numpy()[need]
        hi[need] = t["hi"].reindex(idx).to_numpy()[need]
    return np.minimum(lo, 0.0), np.maximum(hi, 0.0)  # ต้องครอบราคาปัจจุบัน


def bands_at(E, o, rows, cfg, h_col="h"):
    """ช่วง (lo, hi) ของแต่ละแถว ณ เดือน o: ช่วงที่กว้างกว่าระหว่างประวัติทั้งหมดกับ R เดือนล่าสุด"""
    lo, hi = lookup(band_table(E, o, cfg.get("window", ALL), cfg["q"], cfg["group"]), rows, cfg["group"], h_col)
    if cfg["recent"]:
        lo2, hi2 = lookup(band_table(E, o, cfg["recent"], cfg["q"], cfg["group"]), rows, cfg["group"], h_col)
        lo, hi = np.fmin(lo, lo2), np.fmax(hi, hi2)
    return lo, hi


def evaluate(E, origins, eval_rows, cfg):
    parts = []
    for o in origins:
        r = eval_rows[eval_rows["origin"] == o]
        if r.empty:
            continue
        lo, hi = bands_at(E, o, r, cfg)
        parts.append(r.assign(lo=lo, hi=hi))
    R = pd.concat(parts, ignore_index=True)
    R["inside"] = (R["lr"] >= R["lo"] - 1e-12) & (R["lr"] <= R["hi"] + 1e-12)
    R["width"] = (np.exp(R["hi"]) - np.exp(R["lo"])) * 100
    return R


def summarize(R):
    g = R.groupby("h")
    worst = R.groupby([R["target"].dt.year, "h"])["inside"].mean().unstack().min() * 100
    return pd.DataFrame({"ครอบ (%)": g["inside"].mean() * 100, "ครอบปีที่แย่สุด (%)": worst, "กว้าง (% ของราคา)": g["width"].mean()})


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, default=HERE / "data" / "prices_clean.csv")
    ap.add_argument("--no-apply", action="store_true")
    args = ap.parse_args()

    df = pd.read_csv(args.data, parse_dates=["date"])
    latest = df["date"].max()
    last = df.groupby("material_id")["date"].max()
    active = set(last[last >= latest - pd.DateOffset(months=3)].index)
    E = history(df)
    cv_origins = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS"))
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    first_test = test_origins[0]
    ev = E[E["real"] & E["material_id"].isin(active)]
    cv_rows = ev[ev["origin"].isin(cv_origins) & (ev["target"] < first_test)]
    te_rows = ev[ev["origin"].isin(test_origins) & (ev["target"] <= latest)]

    # ค้นหาบน Validation
    res = []
    for r, q, grp in itertools.product(RECENT, QUANTILES, GROUPS):
        cfg = dict(recent=r, q=q, group=grp)
        s = summarize(evaluate(E, cv_origins, cv_rows, cfg))
        res.append({**cfg, **{f"ครอบ h{h}": s.loc[h, "ครอบ (%)"] for h in s.index},
                    **{f"ปีแย่สุด h{h}": s.loc[h, "ครอบปีที่แย่สุด (%)"] for h in s.index},
                    **{f"กว้าง h{h}": s.loc[h, "กว้าง (% ของราคา)"] for h in s.index}})
    S = pd.DataFrame(res)
    S["ครอบต่ำสุด"] = S[[f"ปีแย่สุด h{h}" for h in range(1, H + 1)]].min(axis=1)
    S["กว้างเฉลี่ย"] = S[[f"กว้าง h{h}" for h in range(1, H + 1)]].mean(axis=1)
    ok = S[S["ครอบต่ำสุด"] >= TARGET * 100]
    best = (ok.sort_values("กว้างเฉลี่ย") if len(ok) else S.sort_values("ครอบต่ำสุด", ascending=False)).iloc[0]
    chosen = dict(recent=int(best["recent"]), q=float(best["q"]), group=best["group"])
    S.sort_values(["ครอบต่ำสุด"], ascending=False).to_csv(HERE / "out" / "bands_search.csv", index=False)

    # วัดบน Test: แบบเดิมของเว็บ (10–90% จาก 12 เดือนล่าสุด) เทียบแบบที่เลือก
    old = dict(window=12, recent=0, q=0.10, group="categoryCode")  # แบบเดิมของเว็บ: 10–90% จาก 12 เดือนล่าสุด
    T_old, T_new = evaluate(E, test_origins, te_rows, old), evaluate(E, test_origins, te_rows, chosen)
    CV_new = evaluate(E, cv_origins, cv_rows, chosen)
    by_cat = lambda R: (R.groupby(["categoryCode", "h"])["inside"].mean().unstack() * 100).round(0)

    lines = [
        "# ช่วงราคาต่ำ–สูง (bands.py)", "",
        f"- ค้นหา {len(S)} แบบ: ช่วงจากเดือนล่าสุด {RECENT} เดือน (0 = ไม่ใช้), เปอร์เซ็นไทล์ล่าง {QUANTILES}, กลุ่ม {GROUPS}",
        f"- Validation: {len(cv_rows):,} คู่ (เดือนเป้าหมายก่อน {first_test:%Y-%m}, ราคาจริง), Test: {len(te_rows):,} คู่",
        f"- เกณฑ์: ครอบราคาจริง >= {TARGET:.0%} ทุกระยะ ในปีที่แย่ที่สุดของ Validation แล้วเลือกช่วงที่แคบที่สุด",
        f"- ที่เลือก: ประวัติทั้งหมด" + (f" + {chosen['recent']} เดือนล่าสุด" if chosen["recent"] else "") + f", เปอร์เซ็นไทล์ {chosen['q']:.3g}–{1 - chosen['q']:.3g}, กลุ่ม {chosen['group']}", "",
        "## 10 แบบที่แคบที่สุดที่ผ่านเกณฑ์ (Validation)", "",
        md((ok if len(ok) else S).sort_values("กว้างเฉลี่ย").head(10).round(1).assign(q=lambda d: d["q"].map(lambda v: f"{v:.3f}"))
           .set_index(["recent", "q", "group"])), "",
        "## ผลที่เลือก", "",
        md(pd.concat({"Validation": summarize(CV_new), "Test แบบเดิม (10–90% จาก 12 เดือนล่าสุด)": summarize(T_old),
                      "Test แบบใหม่": summarize(T_new)}, axis=1).round(1)), "",
        "## Test แบบที่เลือก แยกหมวด (% ครอบ)", "", md(by_cat(T_new)), "",
        "แบบเดิมของเว็บตั้งช่วง 10–90% จาก backtest 12 เดือนล่าสุด แล้ววัดบนข้อมูลชุดเดียวกัน จึงเคยรายงานว่าครอบ 83%", "",
    ]
    if not args.no_apply:
        lines += apply_to_forecast(df, E, latest, chosen)
    (HERE / "out" / "bands_report.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))
    if chosen != CHOSEN:
        print(f"\nหมายเหตุ: ค่าที่เลือกรอบนี้ {chosen} ต่างจาก CHOSEN ในไฟล์ {CHOSEN} ถ้าจะใช้ ให้แก้ CHOSEN แล้วรันใหม่")


def production_bands(df: pd.DataFrame, E: pd.DataFrame | None = None, cfg: dict | None = None):
    """ค่าตั้งและตารางประวัติสำหรับพยากรณ์จริง (ใช้คู่กับ bands_at ณ เดือนล่าสุด)"""
    cfg = cfg or CHOSEN
    E = history(df) if E is None else E
    return cfg, E


def apply_to_forecast(df, E, latest, chosen) -> list[str]:
    """เขียน low, high ใหม่ลง api_data/forecast.csv (ราคาที่ทายและ change_prob คงเดิม)"""
    path = HERE / "api_data" / "forecast.csv"
    F = pd.read_csv(path)
    meta = df.drop_duplicates("material_id").set_index("material_id")[["categoryCode", "familyCode"]]
    last = df.groupby("material_id")["date"].max()
    lag = ((latest.year - last.dt.year) * 12 + latest.month - last.dt.month).reindex(F["material_id"]).fillna(0).astype(int).values
    rows = F.join(meta, on="material_id")
    rows["hb"] = np.minimum(rows["month"].to_numpy() + lag, H)  # ราคาล่าสุดช้ากว่าเดือนล่าสุด = ไกลขึ้นตาม lag
    cfg, E = production_bands(df, E, CHOSEN)
    lo, hi = bands_at(E, latest, rows, cfg, h_col="hb")
    before = ((F["high"] - F["low"]) / F["price"] * 100).groupby(F["month"]).mean()
    F["low"], F["high"] = (F["price"] * np.exp(lo)).round(2), (F["price"] * np.exp(hi)).round(2)
    after = ((F["high"] - F["low"]) / F["price"] * 100).groupby(F["month"]).mean()
    F.to_csv(path, index=False)
    return ["## เขียนลง api_data/forecast.csv", "",
            f"ใช้ค่าตั้งใน CHOSEN: {CHOSEN} ณ เดือน {latest:%Y-%m}", "",
            md(pd.DataFrame({"กว้างเฉลี่ยเดิม (% ของราคา)": before, "กว้างเฉลี่ยใหม่ (% ของราคา)": after}).round(1)), ""]


if __name__ == "__main__":
    main()
