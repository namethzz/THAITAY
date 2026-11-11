"""
ต่อข้อมูลปัจจัยภายนอกรายเดือน (data/factors_monthly.csv) ให้ถึงเดือนล่าสุดของราคา สนค. โดยดึงจากแหล่งสาธารณะเอง

    python fetch_factors.py                  # ต่อถึงเดือนล่าสุดใน data/prices_clean.csv
    python fetch_factors.py --to 2026-10     # ต่อถึงเดือนที่กำหนด

ไฟล์เดิมมาจาก build_factors.py (ไฟล์ดิบของทีมใน Google Drive) สคริปต์นี้ไม่แตะเดือนเก่า เขียนใหม่เฉพาะ
เดือนสุดท้ายของไฟล์เดิม (ทีมมักดึงก่อนสิ้นเดือน ค่าเลยยังไม่ครบเดือน) และเดือนที่ต่อเพิ่ม

แหล่งข้อมูล (ตรวจกับไฟล์ของทีมแล้ว ม.ค. 2559 – ก.ย. 2569):
  brent_crude_usd_barrel    Yahoo BZ=F ราคาปิดรายเดือน               ตรงเป๊ะ 99% ของเดือน
  iron_ore_62fe_usd_ton     Yahoo TIO=F ราคาปิดรายเดือน              ตรงเป๊ะ 99% ของเดือน
  fx_usd_thb                Yahoo THB=X ราคาปิดวันสุดท้ายของเดือน    ต่างเฉลี่ย 0.17%
  fx_cny_thb                Yahoo THB=X ÷ CNY=X สิ้นเดือน            ต่างเฉลี่ย 0.63% จึงต่อจากค่าเดิมด้วย % การเปลี่ยน
  fuel_Hi_Diesel_thb_litre  ราคาดีเซลรายวันของ ปตท. (orapiweb.pttor.com) เฉลี่ยทั้งเดือน  ตรงกับไฟล์ทีม
  newcastle_coal_usd_ton, steel_futures_unverified, scrap_metal_ppi_index
                            ยังไม่รู้แหล่งของทีม ใช้ค่าเดือนล่าสุดที่มีไปก่อน และบอกไว้ในรายงาน
                            (ค่า scrap ในไฟล์ทีมดูเป็นราคาเศษเหล็ก ดอลลาร์ต่อตัน ไม่ใช่ดัชนี PPI)

ผลลัพธ์: data/factors_monthly.csv (สำรองไฟล์เดิมเป็น data/factors_monthly.before_fetch.csv), out/factors_update.md
"""
from __future__ import annotations

import argparse
import calendar
import json
import re
import shutil
import time
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

from global_model import md

HERE = Path(__file__).resolve().parent
UA = {"User-Agent": "Mozilla/5.0 (THAITAY factor update)"}
DIRECT = {"brent_crude_usd_barrel": "BZ=F", "iron_ore_62fe_usd_ton": "TIO=F"}
CARRY = ["newcastle_coal_usd_ton", "steel_futures_unverified", "scrap_metal_ppi_index"]


def get(url: str, data: bytes | None = None, headers: dict | None = None, tries: int = 4) -> bytes:
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={**UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception:
            if k == tries - 1:
                raise
            time.sleep(2 ** (k + 1))


def yahoo(symbol: str, interval: str, rng: str) -> pd.Series:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.request.quote(symbol)}?range={rng}&interval={interval}"
    r = json.loads(get(url))["chart"]["result"][0]
    s = pd.Series(r["indicators"]["quote"][0]["close"], index=pd.to_datetime(r["timestamp"], unit="s")).dropna()
    return s


def monthly_close(symbol: str) -> pd.Series:
    s = yahoo(symbol, "1mo", "2y")
    return s.groupby(s.index.to_period("M").to_timestamp()).last()


def month_end_daily(symbol: str) -> pd.Series:
    s = yahoo(symbol, "1d", "2y")
    return s.groupby(s.index.to_period("M").to_timestamp()).last()


def ptt_diesel(month: pd.Timestamp) -> float:
    """ราคาดีเซล (Hi Diesel) ของ ปตท. ทุกวันในเดือน แล้วเฉลี่ย"""
    days = calendar.monthrange(month.year, month.month)[1]
    prices = []
    for d in range(1, days + 1):
        body = ('<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">'
                f'<soap:Body><GetOilPrice xmlns="http://www.pttor.com"><Language>en</Language><DD>{d}</DD><MM>{month.month}</MM>'
                f'<YYYY>{month.year}</YYYY></GetOilPrice></soap:Body></soap:Envelope>').encode()
        xml = get("https://orapiweb.pttor.com/oilservice/OilPrice.asmx", body,
                  {"Content-Type": "text/xml; charset=utf-8", "SOAPAction": '"http://www.pttor.com/GetOilPrice"'}).decode()
        xml = xml.replace("&lt;", "<").replace("&gt;", ">")
        m = re.search(r"<PRODUCT>Diesel</PRODUCT>\s*<PRICE>([\d.]+)</PRICE>", xml)
        prices.append(float(m.group(1)) if m else np.nan)
        time.sleep(0.2)
    s = pd.Series(prices).ffill().bfill()
    if s.isna().all():
        raise RuntimeError(f"ไม่ได้ราคาดีเซลของเดือน {month:%Y-%m}")
    return float(s.mean())


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--to", help="ต่อถึงเดือนนี้ (YYYY-MM) ค่าเริ่มต้น = เดือนล่าสุดของราคา สนค.")
    args = ap.parse_args()

    path = HERE / "data" / "factors_monthly.csv"
    F = pd.read_csv(path, parse_dates=["month_date"]).set_index("month_date").sort_index()
    target = pd.Timestamp(args.to + "-01") if args.to else pd.read_csv(HERE / "data" / "prices_clean.csv", parse_dates=["date"])["date"].max()
    today = pd.Timestamp.today().normalize()
    if target + pd.offsets.MonthEnd(0) >= today:
        raise SystemExit(f"เดือน {target:%Y-%m} ยังไม่จบ ข้อมูลรายเดือนยังไม่ครบ")
    last = F.index.max()
    months = pd.date_range(last, target, freq="MS")  # เดือนสุดท้ายของไฟล์เดิม + เดือนที่ต่อเพิ่ม
    if len(months) == 0:
        raise SystemExit(f"ไฟล์มีข้อมูลถึง {last:%Y-%m} แล้ว")
    shutil.copy(path, path.with_name("factors_monthly.before_fetch.csv"))
    before = F.reindex(months).copy()
    F = F.reindex(F.index.union(months))
    notes = []

    for col, sym in DIRECT.items():
        s = monthly_close(sym)
        F.loc[months, col] = s.reindex(months).values
        notes.append(f"- {col}: Yahoo {sym} ราคาปิดรายเดือน")

    thb = month_end_daily("THB=X")
    F.loc[months, "fx_usd_thb"] = thb.reindex(months).values
    notes.append("- fx_usd_thb: Yahoo THB=X ราคาปิดวันสุดท้ายของเดือน")

    cny = (thb / month_end_daily("CNY=X")).dropna()
    prev = months[0] - pd.DateOffset(months=1)  # ต่อจากเดือนก่อนเดือนสุดท้ายของไฟล์เดิม ด้วย % การเปลี่ยน
    anchor = F.at[prev, "fx_cny_thb"]
    F.loc[months, "fx_cny_thb"] = (anchor * cny.reindex(months) / cny.get(prev, np.nan)).values
    notes.append(f"- fx_cny_thb: ค่าเดิมเดือน {prev:%Y-%m} × การเปลี่ยนของ THB=X ÷ CNY=X")

    F.loc[months, "fuel_Hi_Diesel_thb_litre"] = [ptt_diesel(m) for m in months]
    notes.append("- fuel_Hi_Diesel_thb_litre: ราคาดีเซลรายวันของ ปตท. เฉลี่ยทั้งเดือน")

    for col in CARRY:
        if col in F:
            known = F.loc[: last, col].dropna()
            fill = [m for m in months if pd.isna(F.at[m, col])]
            F.loc[fill, col] = known.iloc[-1]
            notes.append(f"- {col}: ยังไม่รู้แหล่ง ใช้ค่า {known.index[-1]:%Y-%m} ({known.iloc[-1]:,.2f}) กับเดือน "
                         + (", ".join(f"{m:%Y-%m}" for m in fill) or "-"))

    missing = F.loc[months].isna().sum()
    if missing.any():
        raise SystemExit(f"ยังมีค่าว่าง: {missing[missing > 0].to_dict()} ไม่ได้เขียนไฟล์")
    F.reset_index().rename(columns={"index": "month_date"}).to_csv(path, index=False, date_format="%Y-%m-%d")

    show = pd.concat({"เดิม": before.T, "ใหม่": F.loc[months].T}, axis=1)
    show.columns = [f"{a} {b:%Y-%m}" for a, b in show.columns]
    report = ["# ต่อข้อมูลปัจจัยภายนอก (fetch_factors.py)", "", f"- เขียนเดือน {months[0]:%Y-%m} ถึง {months[-1]:%Y-%m}",
              f"- สำรองไฟล์เดิม: data/factors_monthly.before_fetch.csv", "", "## แหล่ง", "", *notes, "", "## ค่า", "", md(show.round(3)), ""]
    (HERE / "out" / "factors_update.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
