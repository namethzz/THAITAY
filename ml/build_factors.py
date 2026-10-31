"""
สร้างไฟล์ปัจจัยภายนอกรายเดือนจากไฟล์ดิบในโฟลเดอร์ Google Drive "New Data"

    python build_factors.py data/raw          # โฟลเดอร์ที่มีไฟล์ดิบ
    -> data/factors_monthly.csv

ทำแบบเดียวกับ notebook ของทีม (THAI_TAY_Data_Preparation.ipynb) แต่เก็บถึงเดือนล่าสุดที่ไฟล์ดิบมี
  - ไฟล์รายเดือน (Brent, ค่าเงิน, แร่เหล็ก, ถ่านหิน, เศษเหล็ก) ใช้ค่าตามไฟล์
  - เหล็กฟิวเจอร์ส: วันที่ในไฟล์เป็น ปี-วัน-เดือน (เช่น 2026-01-09 = ก.ย. 2569) ตรวจแล้วจากลำดับเดือน
  - ดีเซล: ราคาตามวันที่มีผล ลากค่าไปจนวันที่เปลี่ยน แล้วเฉลี่ยรายวันในแต่ละเดือน
ถ้ามี data/macro_monthly_clean.csv (ไฟล์ของทีม) จะเทียบเดือนที่ซ้อนกันให้ดูว่าตรงกัน
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent


def monthly(path: Path, col: str, ydm: bool = False) -> pd.Series:
    df = pd.read_csv(path)
    date_col = df.columns[0]
    val = pd.to_numeric(df[col].astype(str).str.replace(",", ""), errors="coerce")
    parts = df[date_col].astype(str).str.split("-", expand=True).astype(int)
    month = parts[2] if ydm else parts[1]
    idx = pd.to_datetime(dict(year=parts[0], month=month, day=1))
    return pd.Series(val.values, index=idx).groupby(level=0).mean().rename(col)


def diesel(path: Path) -> pd.Series:
    df = pd.read_csv(path, parse_dates=["Date"]).set_index("Date").sort_index()
    daily = df["Hi_Diesel"].dropna().groupby(level=0).last()
    days = pd.date_range(daily.index.min(), daily.index.max(), freq="D")
    s = daily.reindex(days).ffill()
    return s.groupby(s.index.to_period("M")).mean().to_timestamp().rename("fuel_Hi_Diesel_thb_litre")


def main() -> None:
    raw = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / "data" / "raw"
    cols = [
        monthly(raw / "Brent_Crude_prices.csv", "brent_crude_usd_barrel"),
        monthly(raw / "fx_usd_thb.csv", "fx_usd_thb"),
        monthly(raw / "fx_cny_thb.csv", "fx_cny_thb"),
        monthly(raw / "Iron_Ore_prices.csv", "iron_ore_62fe_usd_ton"),
        monthly(raw / "newcastle_coal_usd-prices_ton.csv", "newcastle_coal_usd_ton"),
        diesel(raw / "Fuels_prices.csv"),
        monthly(raw / "Steel_Futures_prices.csv", "price", ydm=True).rename("steel_futures_unverified"),
        monthly(raw / "scrap_metal_prices.csv", "scrap_metal_ppi_index"),
    ]
    F = pd.concat(cols, axis=1).sort_index()
    F.index.name = "month_date"
    out = HERE / "data" / "factors_monthly.csv"
    F.to_csv(out, date_format="%Y-%m-%d")
    print(f"เขียน {out}: {F.index.min():%Y-%m} ถึง {F.index.max():%Y-%m}")
    print(F.apply(lambda s: s.last_valid_index()).dt.strftime("%Y-%m").to_string())

    team = HERE / "data" / "macro_monthly_clean.csv"
    if team.exists():
        T = pd.read_csv(team, encoding="utf-8-sig", parse_dates=["month_date"]).set_index("month_date")
        print("\nเทียบกับไฟล์ของทีม (เดือนที่มีทั้งสองฝั่ง): ต่างกันมากสุด (%)")
        for c in F.columns:
            if c in T:
                both = pd.concat([F[c], T[c]], axis=1, keys=["a", "b"]).dropna()
                diff = ((both.a - both.b).abs() / both.b.abs() * 100).max() if len(both) else np.nan
                print(f"  {c:35s} {len(both):4d} เดือน  {diff:.4f}")


if __name__ == "__main__":
    main()
