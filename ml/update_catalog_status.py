"""
บอกหน้าเว็บว่าวัสดุไหน สนค. เลิกเก็บราคาแล้ว และรหัสเก่าไหนมีรหัสใหม่มาแทน

    python update_catalog_status.py        # หลัง prepare_data.py ทุกครั้งที่ได้ราคาเดือนใหม่

เขียน 2 ช่องลงใน frontend/src/data/structural-materials.json
  discontinued  "YYYY-MM" เดือนสุดท้ายที่มีราคา  ใส่เมื่อไม่มีราคาเกิน --stale เดือน
  replacedBy    รหัสใหม่ที่ต่อประวัติให้แล้ว (จาก out/series_links.csv)
หน้าเว็บซ่อนวัสดุที่มี discontinued จากการค้นหา และพาลิงก์ของรหัสเก่าไปที่รหัสใหม่
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent / "frontend" / "src" / "data" / "structural-materials.json"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, default=HERE / "data" / "prices_clean.csv")
    ap.add_argument("--links", type=Path, default=HERE / "out" / "series_links.csv")
    ap.add_argument("--stale", type=int, default=3)
    args = ap.parse_args()

    df = pd.read_csv(args.data, parse_dates=["date"])
    last = df.groupby("material_id")["date"].max()
    cutoff = df["date"].max() - pd.DateOffset(months=args.stale)
    links = pd.read_csv(args.links) if args.links.exists() else pd.DataFrame(columns=["old_id", "new_id", "accepted"])
    nxt = dict(zip(links.loc[links.accepted, "old_id"], links.loc[links.accepted, "new_id"]))

    def final(mid: str) -> str:
        while mid in nxt:
            mid = nxt[mid]
        return mid

    text = CATALOG.read_text(encoding="utf-8")
    catalog = json.loads(text)
    counts = {"active": 0, "discontinued": 0, "replaced": 0}
    for m in catalog["materials"]:
        m.pop("discontinued", None)
        m.pop("replacedBy", None)
        end = last.get(m["id"])
        if end is not None and end >= cutoff:
            counts["active"] += 1
            continue
        m["discontinued"] = end.strftime("%Y-%m") if end is not None else "none"
        counts["discontinued"] += 1
        new = final(m["id"])
        if new != m["id"]:
            m["replacedBy"] = new
            counts["replaced"] += 1
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"ยังเก็บราคา {counts['active']} · เลิกเก็บ {counts['discontinued']} (มีรหัสใหม่แทน {counts['replaced']}) "
          f"· เดือนล่าสุด {df['date'].max():%Y-%m}")


if __name__ == "__main__":
    main()
