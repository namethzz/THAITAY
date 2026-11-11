"""
แปลงราคาจริงและราคาคาดการณ์ใน api_data/ เป็นไฟล์ JSON สำเร็จรูป ให้หน้าเว็บอ่านเองได้โดยไม่ต้องมี backend

    python export_static.py

เขียน ../frontend/public/data/prices/{material_id}.json (ลบไฟล์เก่าในโฟลเดอร์นั้นก่อน) Vercel ส่งไฟล์เหล่านี้ไปพร้อมหน้าเว็บ
ข้อมูลเหมือนที่ serve.py ตอบทุกตัว:
  history   ราคาล่าสุดกับย้อนหลัง 12 เดือน (13 จุด) หน้าเว็บตัดเหลือเท่าที่ต้องใช้เอง
  forecast  ราคาคาดการณ์ 1–3 เดือน พร้อม low, high และ changeProb (ถ้ามี)
"""
from __future__ import annotations

import json
import shutil
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "frontend" / "public" / "data" / "prices"
HISTORY_MONTHS = 12


def main() -> None:
    prices = pd.read_csv(HERE / "api_data" / "prices.csv", dtype={"material_id": str})
    forecast = pd.read_csv(HERE / "api_data" / "forecast.csv", dtype={"material_id": str})
    forecast = forecast.rename(columns={"change_prob": "changeProb"})
    cols = [c for c in ("month", "date", "price", "low", "high", "changeProb") if c in forecast]
    units = prices.drop_duplicates("material_id").set_index("material_id")["unit"].to_dict()
    fc = {m: g.sort_values("month")[cols] for m, g in forecast.groupby("material_id")}

    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    n_fc = 0
    for mid, g in prices.groupby("material_id"):
        hist = g.sort_values("date")[["date", "price"]].tail(HISTORY_MONTHS + 1)
        points = []
        if mid in fc:
            n_fc += 1
            for p in fc[mid].to_dict("records"):
                p = {k: v for k, v in p.items() if not (isinstance(v, float) and v != v)}  # ตัด NaN
                p["month"] = int(p["month"])
                points.append(p)
        data = {"unit": units[mid], "history": hist.to_dict("records"), "forecast": points}
        (OUT / f"{mid}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    latest = prices["date"].max()
    print(f"เขียน {prices['material_id'].nunique()} ไฟล์ (มีราคาคาดการณ์ {n_fc}) ข้อมูลถึง {latest} -> {OUT}")


if __name__ == "__main__":
    main()
