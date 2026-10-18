// แหล่งที่มาของข้อมูลราคาวัสดุ — แก้ URL/ชื่อได้ที่ไฟล์นี้ที่เดียว
// รหัสวัสดุ 16 หลัก (MAT-xxxxxxxxxxxxxxxx) อิงรหัสสินค้าของกระทรวงพาณิชย์ (com_code)
export interface PriceSource {
  id: string;
  name: string;
  owner: string;
  description: string;
  url: string;
}

export const PRICE_SOURCES: PriceSource[] = [
  {
    id: "tpso-building-material-prices",
    name: "ราคาวัสดุก่อสร้าง",
    owner: "สำนักงานนโยบายและยุทธศาสตร์การค้า (สนค.) · กระทรวงพาณิชย์",
    description: "ราคาวัสดุก่อสร้างรายสินค้า รายเดือน (แหล่งราคาหลักของเว็บ)",
    url: "https://index.tpso.go.th/construction-material-prices/prices-building-materials",
  },
  {
    id: "tpso-cmi",
    name: "ดัชนีราคาวัสดุก่อสร้าง (CMI)",
    owner: "สำนักงานนโยบายและยุทธศาสตร์การค้า (สนค.)",
    description: "ดัชนีและรายงานประจำเดือน ใช้ตรวจแนวโน้มภาพรวม",
    url: "https://www.tpso.go.th/economic-data/construction-materials-price-index",
  },
];

export const PRIMARY_SOURCE = PRICE_SOURCES[0];
