/** หน้าเว็บมี 3 ส่วน: หน้าแรก, ค้นหาวัสดุ (รายการ + หน้ารายละเอียดวัสดุ), ใบประมาณราคา */
export type Route =
  | { page: "home" }
  | { page: "search"; q: string; cat: string }
  | { page: "material"; id: string }
  /** shared = ใบประมาณที่ส่งมาทางลิงก์ (#estimate?d=…) เปิดดูแบบอ่านอย่างเดียว */
  | { page: "estimate"; shared?: string };

export type Go = (route: Route) => void;

export interface Material {
  id: string;
  categoryCode: string;
  familyCode: string;
  category: string;
  name: string;
  unit: string;
}

export interface EstimateLine {
  key: string;
  materialId: string;
  name: string;
  unit: string;
  /** 0 = ราคาล่าสุด, 1–3 = อีกกี่เดือนข้างหน้า */
  month: number;
  monthLabel: string;
  qty: number;
  price: number;
  low: number;
  high: number;
  demo: boolean;
  /** ราคานี้เป็นราคา ณ วันไหน (YYYY-MM-DD) — มีเฉพาะรายการที่มาจากลิงก์ที่ส่งมา ราคาไม่อัปเดตตามข้อมูลล่าสุด */
  asOf?: string;
}

export type AddLine = (line: Omit<EstimateLine, "key">) => void;

/** หัวใบประมาณราคาและการตั้งค่ายอดรวม (จำไว้ในเบราว์เซอร์ และส่งไปกับลิงก์แชร์) */
export interface EstimateMeta {
  project: string;
  customer: string;
  contingency: number;
  vat: boolean;
}
