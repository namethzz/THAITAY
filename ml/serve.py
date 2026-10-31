"""
Backend เล็ก ๆ ที่ให้บริการ 2 endpoint ตามที่หน้าเว็บรออยู่ (frontend/src/services/priceService.ts)

    GET /prices/{materialId}/history?months=1..12  -> { unit, points: [{ date, price }] }
    GET /prices/{materialId}/forecast?months=1..3  -> { unit, points: [{ month, date, price, low, high }] }

อ่านจากไฟล์ 2 ไฟล์ (ตั้ง path ผ่าน env ได้)
    PRICES_CSV    data/prices_clean.csv   (จาก prepare_data.py)
    FORECAST_CSV  out/forecast.csv        (จาก baseline.py หรือผลที่ export จาก BigQuery / Vertex AI ในรูปแบบเดียวกัน)
    ALLOW_ORIGINS https://thaitay.vercel.app  (คั่นด้วย , ถ้ามีหลายโดเมน)

รันในเครื่อง:  uvicorn serve:app --reload --port 8080
"""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

HERE = Path(__file__).resolve().parent
PRICES = pd.read_csv(os.environ.get("PRICES_CSV", HERE / "data" / "prices_clean.csv"), dtype={"material_id": str})
FORECAST = pd.read_csv(os.environ.get("FORECAST_CSV", HERE / "out" / "forecast.csv"), dtype={"material_id": str})
UNITS = PRICES.drop_duplicates("material_id").set_index("material_id")["unit"].to_dict()
HISTORY = {m: g.sort_values("date")[["date", "price"]] for m, g in PRICES.groupby("material_id")}
FORECASTS = {m: g.sort_values("month")[["month", "date", "price", "low", "high"]] for m, g in FORECAST.groupby("material_id")}

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
    return {"unit": UNITS.get(material_id, ""), "points": pts.to_dict("records")}
