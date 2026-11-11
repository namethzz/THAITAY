"""
ดึงราคาวัสดุก่อสร้างรายเดือนจากเว็บ สนค. (index.tpso.go.th) มาเป็น CSV ที่ prepare_data.py อ่านได้

    python fetch_tpso.py                       # ส่วนกลาง (กทม.) ม.ค. 2559 ถึงเดือนล่าสุด
    python fetch_tpso.py --from 2568-01        # เฉพาะช่วงที่ต้องการ (ปี พ.ศ.)
    python prepare_data.py data/tpso_prices.csv

ใช้ API เดียวกับที่หน้าเว็บ https://index.tpso.go.th/construction-material-prices/prices-building-materials/10 เรียก
(ไม่ใช่ API ที่ สนค. ประกาศให้ใช้อย่างเป็นทางการ อาจเปลี่ยนได้ ถ้าใช้ไม่ได้ให้ดาวน์โหลด Excel จากหน้าเว็บแทน)
ส่งคำขอครั้งเดียวต่อการรัน ไม่ต้องรันถี่กว่าเดือนละครั้ง
"""
from __future__ import annotations

import argparse
import csv
import json
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
API = "https://index.tpso.go.th/api/cmip"
# หมวดของ สนค. ที่มีวัสดุบนเว็บ: 01 วัสดุเทหล่อกับที่, 03 ชิ้นส่วนโครงสร้างสำเร็จรูป, 04 หน้าตัดรูปต่างๆ (เหล็ก), 16 วัสดุผสมคอนกรีต
HEAD_CATEGORIES = ["01", "03", "04", "16"]


def call(path: str, body: dict | None = None):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json", "User-Agent": "THAITAY-price-fetch"},
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.load(r)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from", dest="start", default="2559-01", help="เดือนเริ่ม พ.ศ. เช่น 2559-01")
    ap.add_argument("--region", default="10", help="รหัสพื้นที่ของ สนค. (10 = ส่วนกลาง)")
    ap.add_argument("--categories", nargs="+", default=HEAD_CATEGORIES)
    ap.add_argument("--out", type=Path, default=HERE / "data" / "tpso_prices.csv")
    args = ap.parse_args()

    period = call("/master")["period"]["end"]  # เดือนล่าสุดที่ สนค. เผยแพร่
    sy, sm = (int(x) for x in args.start.split("-"))
    body = {
        "YearBase": 2558, "Categories": [], "Search": "", "Types": [args.region],
        "HeadCategories": args.categories, "TimeOption": True,
        "Period": {"StartYear": str(sy), "StartMonth": sm, "EndYear": str(period["year"]), "EndMonth": int(period["month"])},
    }
    items = call("/filter", body)

    rows = []
    for it in items:
        for y in it["years"]:
            for m in y["months"]:
                if m.get("priceCur") is None:
                    continue
                rows.append({
                    "material_id": "MAT-" + it["commodityCode"],
                    "month_date": f"{y['year'] - 543}-{m['month']:02d}-01",
                    "price_thb": m["priceCur"],
                    "unit": (it.get("unitName") or "").strip(),
                    "material_name": " ".join((it.get("commodityNameTH") or "").split()),
                    "head_category": it.get("headCategory"),
                })
    rows.sort(key=lambda r: (r["material_id"], r["month_date"]))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    print(f"เขียน {args.out} แล้ว: {len(rows):,} แถว, {len({r['material_id'] for r in rows}):,} รายการ, "
          f"ถึงเดือน {period['month']}/{period['year']}")


if __name__ == "__main__":
    main()
