"""
Backend เล็ก ๆ ที่ให้บริการ 2 endpoint ตามที่หน้าเว็บรออยู่ (frontend/src/services/priceService.ts)

    GET /prices/{materialId}/history?months=1..12  -> { unit, points: [{ date, price }] }
    GET /prices/{materialId}/forecast?months=1..3  -> { unit, points: [{ month, date, price, low, high, changeProb? }] }

อ่านจากไฟล์ 2 ไฟล์ (ตั้ง path ผ่าน env ได้)
    PRICES_CSV    api_data/prices.csv     (สำเนาของ data/prices_clean.csv จาก prepare_data.py)
    FORECAST_CSV  api_data/forecast.csv   (สำเนาของ out/forecast.csv จาก baseline.py หรือผลจาก BigQuery / Vertex AI รูปแบบเดียวกัน)
    ALLOW_ORIGINS https://thaitay.vercel.app  (คั่นด้วย , ถ้ามีหลายโดเมน)
ไฟล์ใน api_data/ เป็นราคาสาธารณะของ สนค. จึง commit ไว้ให้ deploy ได้ทันที

รันในเครื่อง:  uvicorn serve:app --reload --port 8080
"""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

HERE = Path(__file__).resolve().parent
PRICES = pd.read_csv(os.environ.get("PRICES_CSV", HERE / "api_data" / "prices.csv"), dtype={"material_id": str})
FORECAST = pd.read_csv(os.environ.get("FORECAST_CSV", HERE / "api_data" / "forecast.csv"), dtype={"material_id": str})
UNITS = PRICES.drop_duplicates("material_id").set_index("material_id")["unit"].to_dict()
HISTORY = {m: g.sort_values("date")[["date", "price"]] for m, g in PRICES.groupby("material_id")}
if "change_prob" in FORECAST:  # จาก change_signal.py: โอกาสที่ราคาจะเปลี่ยน (ไม่บอกทิศ)
    FORECAST = FORECAST.rename(columns={"change_prob": "changeProb"})
FORECAST_COLS = [c for c in ("month", "date", "price", "low", "high", "changeProb") if c in FORECAST]
FORECASTS = {m: g.sort_values("month")[FORECAST_COLS] for m, g in FORECAST.groupby("material_id")}

app = FastAPI(title="THAI TAY prices")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in os.environ.get("ALLOW_ORIGINS", "http://localhost:5173,https://thaitay.vercel.app").split(",")],
    allow_methods=["GET"],
)


@app.get("/health")
def health():
    return {"materials": len(HISTORY), "forecasts": len(FORECASTS), "latest": PRICES["date"].max()}


@app.get("/prices/{material_id}/history")
def history(material_id: str, months: int = Query(12, ge=1, le=12)):
    if material_id not in HISTORY:
        raise HTTPException(404, "ไม่มีข้อมูลราคาของวัสดุนี้")
    # months+1 จุด: เดือนล่าสุดกับย้อนไปอีก months เดือน (เหมือนข้อมูลตัวอย่างบนเว็บ)
    pts = HISTORY[material_id].tail(months + 1)
    return {"unit": UNITS[material_id], "points": pts.to_dict("records")}


@app.get("/prices/{material_id}/forecast")
def forecast(material_id: str, months: int = Query(3, ge=1, le=3)):
    if material_id not in FORECASTS:
        raise HTTPException(404, "ไม่มีราคาคาดการณ์ของวัสดุนี้")
    pts = FORECASTS[material_id].query("month <= @months")
    points = [{k: v for k, v in p.items() if not (isinstance(v, float) and v != v)} for p in pts.to_dict("records")]  # ตัด NaN
    return {"unit": UNITS.get(material_id, ""), "points": points}
