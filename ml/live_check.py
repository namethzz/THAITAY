"""
สอบจริงรายเดือน: เทียบคำทาย 1 เดือนที่ขึ้นเว็บเดือนก่อน กับราคาจริงที่ สนค. เพิ่งประกาศ

    python live_check.py out/forecast_published_before.csv

อ่านราคาจริงจาก data/prices_clean.csv วัดเฉพาะวัสดุที่มีราคาเดือนที่ทาย เขียน out/live_check.md
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd

from global_model import md

HERE = Path(__file__).resolve().parent
CAT = {"STR-01": "เหล็กเส้น", "STR-02": "เหล็กรูปพรรณ", "STR-03": "ตะแกรงเหล็ก", "STR-04": "ลวดผูกเหล็ก",
       "STR-05": "ลวดอัดแรง", "STR-06": "คอนกรีตผสมเสร็จ", "STR-07": "คอนกรีตหยาบ", "STR-08": "เสาเข็ม/สำเร็จรูป"}


def main() -> None:
    fc = pd.read_csv(sys.argv[1], parse_dates=["date"])
    fc = fc[fc["month"] == 1]
    month = fc["date"].max()
    p = pd.read_csv(HERE / "data" / "prices_clean.csv", parse_dates=["date"])
    actual = p[p["date"] == month].set_index("material_id")["price"]
    cat = p.drop_duplicates("material_id").set_index("material_id")["categoryCode"]
    R = fc[fc["material_id"].isin(actual.index)].copy()
    if R.empty:
        raise SystemExit(f"ยังไม่มีราคาจริงของเดือน {month:%Y-%m} ให้เทียบ")
    R["actual"] = R["material_id"].map(actual)
    R["หมวด"] = R["material_id"].map(cat).map(CAT)
    R["err"] = (R["price"] - R["actual"]).abs() / R["actual"] * 100
    R["inside"] = (R["actual"] >= R["low"] - 1e-9) & (R["actual"] <= R["high"] + 1e-9)
    R["moved"] = (R["actual"] - R["price"]).abs() > 1e-6
    flag = R["change_prob"] >= 0.7 if "change_prob" in R else pd.Series(False, index=R.index)
    rebar = R[R["หมวด"] == "เหล็กเส้น"]
    summary = pd.DataFrame({"ผล": {
        "วัสดุที่เทียบได้": f"{len(R)}",
        "ทายผิดเฉลี่ย (MAE)": f"{R['err'].mean():.2f}%",
        "ราคาจริงอยู่ในช่วงต่ำ–สูง": f"{R['inside'].sum()} / {len(R)} ({R['inside'].mean():.0%})",
        "ราคาเปลี่ยนจริง": f"{R['moved'].sum()} วัสดุ ({R['moved'].mean():.0%})",
        "ขึ้นป้ายแล้วราคาเปลี่ยนจริง": f"{(flag & R['moved']).sum()} / {flag.sum()} ({(flag & R['moved']).sum() / max(flag.sum(), 1):.0%})",
        "ไม่ขึ้นป้ายแต่ราคาเปลี่ยน": f"{(~flag & R['moved']).sum()} / {(~flag).sum()}",
        "เหล็กเส้นทายผิดเฉลี่ย": f"{(rebar['price'] - rebar['actual']).abs().mean():,.0f} บาท/ตัน" if len(rebar) else "-",
    }})
    by_cat = R.groupby("หมวด").agg(วัสดุ=("err", "size"), ผิดเฉลี่ย_เปอร์เซ็นต์=("err", "mean"),
                                   ราคาเปลี่ยน=("moved", "mean"), อยู่ในช่วง=("inside", "mean"))
    by_cat[["ราคาเปลี่ยน", "อยู่ในช่วง"]] *= 100
    names = {m["id"]: m["name"] for m in json.loads((HERE.parent / "frontend" / "src" / "data" / "structural-materials.json").read_text(encoding="utf-8"))["materials"]}
    out = R[~R["inside"]].assign(ชื่อ=lambda d: d["material_id"].map(names).str[:60])
    lines = [f"# สอบจริง: คำทายเดือน {month:%Y-%m} เทียบราคาจริง (live_check.py)", "",
             "เกณฑ์จากการทดสอบย้อนหลัง: ทายผิดเฉลี่ย 0.67–1.75%, ช่วงราคาครอบ 87%, ขึ้นป้ายแล้วเปลี่ยนจริง 80%", "",
             md(summary), "", "## แยกหมวด", "", md(by_cat.round(1)), ""]
    if len(out):
        lines += ["## ราคาจริงหลุดช่วง", "", md(out[["ชื่อ", "price", "low", "high", "actual"]].set_index("ชื่อ")), ""]
    (HERE / "out" / "live_check.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
