"""
เตรียมและตรวจข้อมูลราคาวัสดุก่อนฝึกโมเดล

    python prepare_data.py data/ราคาวัสดุ.xlsx [ไฟล์อื่น ...]

อ่านไฟล์ CSV / Excel ได้ทั้งสองรูปแบบ
  - แบบยาว (long): 1 แถว = วัสดุ 1 รายการ × 1 เดือน  เช่น  รหัสสินค้า | เดือน | ราคา
  - แบบกว้าง (wide): 1 แถว = วัสดุ 1 รายการ  คอลัมน์เป็นเดือน  เช่น  รหัสสินค้า | ม.ค. 67 | ก.พ. 67 | ...
ถ้าเดาชื่อคอลัมน์ไม่ถูก ระบุเองได้ด้วย --id-col --date-col --price-col (หรือ --year-col --month-col)

ผลลัพธ์
  data/prices_clean.csv   material_id, date (YYYY-MM-01), price, unit, categoryCode, familyCode
  out/data_report.md      รายงานว่าข้อมูลถูกต้องแค่ไหน ควรแก้อะไรก่อนฝึกโมเดล
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
CATALOG = HERE.parent / "frontend" / "src" / "data" / "structural-materials.json"

TH_MONTHS = {
    "ม.ค.": 1, "มกราคม": 1, "ก.พ.": 2, "กุมภาพันธ์": 2, "มี.ค.": 3, "มีนาคม": 3,
    "เม.ย.": 4, "เมษายน": 4, "พ.ค.": 5, "พฤษภาคม": 5, "มิ.ย.": 6, "มิถุนายน": 6,
    "ก.ค.": 7, "กรกฎาคม": 7, "ส.ค.": 8, "สิงหาคม": 8, "ก.ย.": 9, "กันยายน": 9,
    "ต.ค.": 10, "ตุลาคม": 10, "พ.ย.": 11, "พฤศจิกายน": 11, "ธ.ค.": 12, "ธันวาคม": 12,
}
# ชื่อเต็มก่อนตัวย่อ และไม่บังคับจุดในตัวย่อ ("มค", "ม.ค")
_TH_MONTH_RE = re.compile("|".join(sorted((re.escape(k).replace(r"\.", r"\.?") for k in TH_MONTHS), key=len, reverse=True)))

ID_NAMES = ["material_id", "com_code", "commodity_code", "รหัสสินค้า", "รหัสวัสดุ", "รหัส", "code", "id"]
DATE_NAMES = ["date", "period", "month_date", "วันที่", "เดือนปี", "งวด"]
YEAR_NAMES = ["year", "ปี", "ปี พ.ศ.", "พ.ศ."]
MONTH_NAMES = ["month", "เดือน"]
PRICE_NAMES = ["price", "ราคา", "ราคาเฉลี่ย", "value", "ราคา (บาท)"]
UNIT_NAMES = ["unit", "หน่วย"]


# ---------------------------------------------------------------- parsing
def norm_id(value) -> str | None:
    """รหัสสินค้า 16 หลัก -> MAT-xxxxxxxxxxxxxxxx  (Excel มักตัดเลข 0 หน้าทิ้งหรือแปลงเป็นทศนิยม)"""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    text = str(value).strip().upper().replace("MAT-", "").replace("-", "").replace(" ", "")
    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".")[0]
    if re.fullmatch(r"\d+(\.\d+)?E\+\d+", text):
        return "SCI:" + text  # เลขแบบ 1.01E+14 ข้อมูลหายไปแล้ว กู้คืนไม่ได้
    if not re.fullmatch(r"\d{1,16}", text):
        return None
    return "MAT-" + text.zfill(16)


def to_year(y: int) -> int:
    if y >= 2400:      # พ.ศ.
        return y - 543
    if y < 100:        # ปีสองหลัก: 60-99 = พ.ศ. 25xx, 00-59 = ค.ศ. 20xx
        return (2500 + y - 543) if y >= 60 else 2000 + y
    return y


def parse_month(value) -> pd.Timestamp | None:
    """แปลงค่าเดือนหลายรูปแบบเป็นวันที่ 1 ของเดือน: 2024-01, 2567-01, ม.ค. 67, มกราคม 2567, 01/2567, datetime"""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    if isinstance(value, (pd.Timestamp, np.datetime64)) or hasattr(value, "year"):
        ts = pd.Timestamp(value)
        return pd.Timestamp(to_year(ts.year), ts.month, 1)
    text = str(value).strip()
    m = _TH_MONTH_RE.search(text)
    if m:
        key = m.group(0) if m.group(0) in TH_MONTHS else next(k for k in TH_MONTHS if k.replace(".", "") == m.group(0).replace(".", ""))
        y = re.search(r"\d{2,4}", text[m.end():]) or re.search(r"\d{2,4}", text)
        if not y:
            return None
        return pd.Timestamp(to_year(int(y.group(0))), TH_MONTHS[key], 1)
    m = re.fullmatch(r"(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?(?:[ T].*)?", text)
    if m:
        return _ym(int(m.group(1)), int(m.group(2)))
    m = re.fullmatch(r"(\d{1,2})[-/.](\d{4})", text)
    if m:
        return _ym(int(m.group(2)), int(m.group(1)))
    m = re.fullmatch(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", text)  # dd/mm/yyyy
    if m:
        return _ym(int(m.group(3)), int(m.group(2)))
    return None


def _ym(y: int, mo: int) -> pd.Timestamp | None:
    return pd.Timestamp(to_year(y), mo, 1) if 1 <= mo <= 12 else None


def parse_price(value) -> float:
    if value is None:
        return np.nan
    if isinstance(value, (int, float, np.number)):
        return float(value)
    text = str(value).replace(",", "").replace("฿", "").replace("บาท", "").strip()
    try:
        return float(text)
    except ValueError:
        return np.nan


def find_col(columns, wanted: list[str], explicit: str | None) -> str | None:
    if explicit:
        if explicit not in columns:
            sys.exit(f"ไม่พบคอลัมน์ '{explicit}' ในไฟล์ (มี: {list(columns)})")
        return explicit
    lower = {str(c).strip().lower(): c for c in columns}
    for name in wanted:
        if name.lower() in lower:
            return lower[name.lower()]
    for name in wanted:  # ชื่อคอลัมน์ที่มีคำนี้อยู่ข้างใน
        for low, original in lower.items():
            if name.lower() in low:
                return original
    return None


def read_any(path: Path) -> list[tuple[str, pd.DataFrame]]:
    if path.suffix.lower() in (".xlsx", ".xlsm", ".xls"):
        sheets = pd.read_excel(path, sheet_name=None, dtype=object)
        return [(f"{path.name}:{name}", df) for name, df in sheets.items()]
    for enc in ("utf-8-sig", "cp874", "tis-620"):
        try:
            return [(path.name, pd.read_csv(path, dtype=object, encoding=enc))]
        except UnicodeDecodeError:
            continue
    sys.exit(f"อ่านไฟล์ {path} ไม่ได้ (ลองบันทึกเป็น CSV UTF-8)")


def to_long(df: pd.DataFrame, args) -> pd.DataFrame | None:
    df = df.dropna(how="all").dropna(axis=1, how="all")
    cols = list(df.columns)
    id_col = find_col(cols, ID_NAMES, args.id_col)
    if id_col is None:
        return None
    unit_col = find_col(cols, UNIT_NAMES, args.unit_col)
    month_cols = [c for c in cols if c not in (id_col, unit_col) and parse_month(c) is not None]

    if len(month_cols) >= 3 and not (args.date_col or args.price_col):  # แบบกว้าง
        keep = [id_col] + ([unit_col] if unit_col else [])
        long = df[keep + month_cols].melt(id_vars=keep, var_name="_date", value_name="_price")
        long["date"] = long["_date"].map(parse_month)
    else:  # แบบยาว
        price_col = find_col(cols, PRICE_NAMES, args.price_col)
        date_col = find_col(cols, DATE_NAMES, args.date_col)
        year_col = find_col(cols, YEAR_NAMES, args.year_col)
        month_col = find_col(cols, MONTH_NAMES, args.month_col)
        if price_col is None:
            return None
        long = df.rename(columns={price_col: "_price"})
        if date_col is not None:
            long["date"] = long[date_col].map(parse_month)
        elif year_col is not None and month_col is not None:
            long["date"] = [
                parse_month(f"{m} {y}") if not str(m).strip().isdigit() else _ym(int(float(y)), int(m))
                for y, m in zip(long[year_col], long[month_col])
            ]
        elif month_col is not None:
            long["date"] = long[month_col].map(parse_month)
        else:
            return None
    long["material_id"] = long[id_col].map(norm_id)
    long["price"] = long["_price"].map(parse_price)
    long["unit_in"] = long[unit_col].astype(str).str.strip() if unit_col else None
    long["raw_id"] = long[id_col].astype(str)
    return long[["material_id", "raw_id", "date", "price", "unit_in"]]


# ---------------------------------------------------------------- checks
def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("files", nargs="+", type=Path)
    ap.add_argument("--id-col"); ap.add_argument("--date-col"); ap.add_argument("--price-col")
    ap.add_argument("--year-col"); ap.add_argument("--month-col"); ap.add_argument("--unit-col")
    ap.add_argument("--out", type=Path, default=HERE / "data" / "prices_clean.csv")
    ap.add_argument("--report", type=Path, default=HERE / "out" / "data_report.md")
    ap.add_argument("--jump", type=float, default=0.25, help="เตือนเมื่อราคาเปลี่ยนจากเดือนก่อนเกินสัดส่วนนี้ (ค่าเริ่มต้น 25%%)")
    args = ap.parse_args()

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))["materials"]
    cat = pd.DataFrame(catalog).set_index("id")

    frames, skipped = [], []
    for path in args.files:
        for name, df in read_any(path):
            long = to_long(df, args)
            if long is None:
                skipped.append(name)
            else:
                long["source"] = name
                frames.append(long)
    if not frames:
        sys.exit("ไม่พบตารางที่มีคอลัมน์รหัสสินค้า + เดือน + ราคา ลองระบุชื่อคอลัมน์ด้วย --id-col --date-col --price-col")
    raw = pd.concat(frames, ignore_index=True)

    R: list[str] = ["# รายงานตรวจข้อมูลราคา", ""]
    def section(title, lines):
        R.extend([f"## {title}", "", *lines, ""])

    n_raw = len(raw)
    sci = raw["material_id"].fillna("").str.startswith("SCI:")
    bad_id = raw["material_id"].isna() | sci
    bad_date = raw["date"].isna()
    empty_price = raw["price"].isna()
    bad_price = ~empty_price & (raw["price"] <= 0)
    ok = raw[~bad_id & ~bad_date & ~empty_price & ~bad_price].copy()

    lines = [f"- ไฟล์/ชีตที่อ่าน: {', '.join(sorted(raw['source'].unique()))}"]
    if skipped:
        lines.append(f"- ข้ามชีตที่ไม่มีคอลัมน์รหัส/ราคา: {', '.join(skipped)}")
    lines += [
        f"- แถวทั้งหมด: {n_raw:,}",
        f"- รหัสสินค้าอ่านไม่ได้: {int(bad_id.sum()):,}" + (f" (ในนี้ {int(sci.sum()):,} แถวเป็นเลขแบบ 1.01E+14 ที่ Excel ตัดหลักทิ้งแล้ว ต้องดึงข้อมูลใหม่โดยตั้งคอลัมน์รหัสเป็น Text)" if sci.any() else ""),
        f"- เดือนอ่านไม่ได้: {int(bad_date.sum()):,}",
        f"- ไม่มีราคา (ช่องว่าง/ข้อความ): {int(empty_price.sum()):,}",
        f"- ราคา ≤ 0: {int(bad_price.sum()):,}",
        f"- แถวที่ใช้ได้: {len(ok):,}",
    ]
    section("ภาพรวม", lines)

    # ซ้ำ: วัสดุเดียวกัน เดือนเดียวกัน
    g = ok.groupby(["material_id", "date"])["price"]
    dup = g.agg(["count", "min", "max"]).query("count > 1")
    conflict = dup[(dup["max"] - dup["min"]) / dup["min"] > 0.001]
    section("ข้อมูลซ้ำ", [
        f"- วัสดุ×เดือน ที่มีมากกว่า 1 แถว: {len(dup):,} (ใช้ค่าเฉลี่ย)",
        f"- ในนั้นราคาไม่ตรงกัน: {len(conflict):,}",
        *[f"  - `{i}` {d:%Y-%m}: {r['min']:,.2f} – {r['max']:,.2f}" for (i, d), r in conflict.head(15).iterrows()],
    ])

    # หน่วยไม่ตรงกับแคตตาล็อก
    if ok["unit_in"].notna().any():
        u = ok.dropna(subset=["unit_in"]).drop_duplicates(["material_id", "unit_in"])
        u = u[u["material_id"].isin(cat.index)]
        u = u[u["unit_in"].str.replace(" ", "") != u["material_id"].map(cat["unit"]).str.replace(" ", "")]
        section("หน่วยไม่ตรงกับแคตตาล็อกบนเว็บ", [f"- {len(u):,} รายการ"] + [
            f"  - `{r.material_id}` ในไฟล์: {r.unit_in} / บนเว็บ: {cat.at[r.material_id, 'unit']}" for r in u.head(15).itertuples()])

    clean = g.mean().reset_index()
    in_cat = clean["material_id"].isin(cat.index)
    extra = sorted(clean.loc[~in_cat, "material_id"].unique())
    missing = sorted(set(cat.index) - set(clean["material_id"]))
    section("เทียบกับรายการวัสดุ 287 รายการบนเว็บ", [
        f"- วัสดุบนเว็บที่มีราคาในไฟล์: {clean.loc[in_cat, 'material_id'].nunique():,} / {len(cat):,}",
        f"- วัสดุบนเว็บที่ไม่มีราคาเลย: {len(missing):,}" + (" (ตัวอย่าง: " + ", ".join(f"`{m}`" for m in missing[:8]) + ")" if missing else ""),
        f"- รหัสในไฟล์ที่ไม่อยู่บนเว็บ (ตัดออก): {len(extra):,}" + (" (ตัวอย่าง: " + ", ".join(f"`{m}`" for m in extra[:8]) + ")" if extra else ""),
    ])
    clean = clean[in_cat]

    # ต่อชุดข้อมูล: ความยาว ช่องว่าง ความสด ราคากระโดด
    last_month = clean["date"].max()
    rows, jumps = [], []
    for mid, s in clean.groupby("material_id"):
        s = s.set_index("date")["price"].sort_index()
        full = pd.date_range(s.index.min(), s.index.max(), freq="MS")
        gaps = len(full) - len(s)
        stale = (last_month.year - s.index.max().year) * 12 + last_month.month - s.index.max().month
        r = s.pct_change().dropna()
        for d, v in r[r.abs() > args.jump].items():
            jumps.append((mid, d, v, s.shift(1).get(d), s.get(d)))
        flat = int((s.diff().dropna() == 0).sum())
        rows.append(dict(material_id=mid, months=len(s), first=s.index.min(), last=s.index.max(), gaps=gaps, stale=stale, flat=flat))
    st = pd.DataFrame(rows)
    if st.empty:
        sys.exit("ไม่เหลือข้อมูลที่ใช้ได้หลังตรวจ ดูรายงาน " + str(args.report))
    q = st["months"].describe()
    section("ความยาวของแต่ละชุดข้อมูล", [
        f"- ช่วงข้อมูลทั้งหมด: {clean['date'].min():%Y-%m} ถึง {last_month:%Y-%m}",
        f"- จำนวนเดือนต่อวัสดุ: ต่ำสุด {q['min']:.0f}, มัธยฐาน {q['50%']:.0f}, สูงสุด {q['max']:.0f}",
        f"- น้อยกว่า 24 เดือน (โมเดลเรียนฤดูกาลไม่ได้): {(st['months'] < 24).sum():,} รายการ",
        f"- น้อยกว่า 12 เดือน (แนะนำตัดออกหรือใช้ค่าเดิม): {(st['months'] < 12).sum():,} รายการ",
        f"- มีเดือนขาดกลางชุด: {(st['gaps'] > 0).sum():,} รายการ (รวม {int(st['gaps'].sum()):,} เดือน)",
        f"- ไม่มีราคาเดือนล่าสุด ({last_month:%Y-%m}): {(st['stale'] > 0).sum():,} รายการ",
        f"- ราคาเท่าเดิมทุกเดือน: {(st['flat'] == st['months'] - 1).sum():,} รายการ (อาจเป็นราคาที่ไม่ได้อัปเดตจริง)",
    ])
    jumps.sort(key=lambda j: -abs(j[2]))
    section(f"ราคากระโดดเกิน {args.jump:.0%} จากเดือนก่อน (ตรวจว่าพิมพ์ผิด/เปลี่ยนหน่วยหรือไม่)", [f"- {len(jumps):,} จุด"] + [
        f"  - `{m}` {d:%Y-%m}: {a:,.2f} → {b:,.2f} ({v:+.0%}) {cat.at[m, 'name'][:60]}" for m, d, v, a, b in jumps[:25]])

    clean = clean.merge(cat[["unit", "categoryCode", "familyCode"]], left_on="material_id", right_index=True)
    clean["date"] = clean["date"].dt.strftime("%Y-%m-%d")
    clean["price"] = clean["price"].round(4)
    clean = clean.sort_values(["material_id", "date"])
    args.out.parent.mkdir(parents=True, exist_ok=True)
    clean.to_csv(args.out, index=False)
    st.sort_values("months").to_csv(args.report.with_name("series_stats.csv"), index=False)

    section("ไฟล์ที่ได้", [f"- `{args.out.relative_to(HERE) if args.out.is_relative_to(HERE) else args.out}` {len(clean):,} แถว, {clean['material_id'].nunique():,} วัสดุ",
                           "- `out/series_stats.csv` สถิติรายวัสดุ"])
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text("\n".join(R), encoding="utf-8")
    print("\n".join(R))


if __name__ == "__main__":
    main()
