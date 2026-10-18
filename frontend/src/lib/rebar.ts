import type { Material } from "@/types";

export interface RebarSpec { diameter: number; length: number; kgPerBar: number }

/**
 * เหล็กเส้นขายเป็นตัน แต่หน้างานนับเป็นเส้น: น้ำหนักต่อเมตรตามมาตรฐาน = 0.00617 × ศก.² (มม.) กก./ม.
 * (เช่น 12 มม. = 0.888 กก./ม. ยาว 10 ม. = 8.88 กก./เส้น) ใช้แปลงราคาต่อตันเป็นราคาต่อเส้น
 */
export function rebarSpec(material: Material): RebarSpec | null {
  if (material.categoryCode !== "STR-01" || material.unit !== "ตัน") return null;
  const name = material.name;
  const d = Number(name.match(/(?:ศก\.?|เส้นผ่านศูนย์กลาง)\s*(\d+(?:\.\d+)?)\s*มม/)?.[1]);
  if (!d) return null;
  const length = Number(name.match(/ยาว\s*(\d+(?:\.\d+)?)\s*(?:ม\.|เมตร)/)?.[1]) || 10;
  return { diameter: d, length, kgPerBar: Math.round(0.00617 * d * d * length * 100) / 100 };
}

/** ราคาต่อเส้นจากราคาต่อตัน: หลักร้อยขึ้นไปเป็นบาทเต็มแบบที่ร้านคิด */
export function pricePerBar(pricePerTon: number, spec: RebarSpec) {
  const price = (pricePerTon * spec.kgPerBar) / 1000;
  return price >= 100 ? Math.round(price) : Math.round(price * 100) / 100;
}
