import type { Material } from "@/types";

/**
 * ชื่อสั้นที่คนหน้างานอ่านแล้วแยกออกทันที เช่น "เหล็กข้ออ้อย SD40 · 16 มม." แทนชื่อเต็มของกระทรวงพาณิชย์
 * ที่ขึ้นต้นเหมือนกันหลายสิบรายการ ชื่อเต็มยังแสดงเป็นบรรทัดรองเสมอ (detail) วัสดุที่ย่อไม่ได้ใช้ชื่อเต็มตามเดิม
 */
export function materialTitle(material: Material): { title: string; detail: string | null } {
  const name = material.name;
  const mm = name.match(/(?:ศก\.?|เส้นผ่านศูนย์กลาง)\s*(\d+(?:\.\d+)?)\s*มม/)?.[1];
  const tis = /มอก\./.test(name) ? " มอก." : "";
  // กระทรวงฯ มีทั้ง "Tempcort" และ "Tempcore" เป็นคนละรายการ จึงคงตัวสะกดตามต้นฉบับไว้ให้แยกกันได้
  const tempcoMatch = name.match(/tempcor[et]/i)?.[0];
  const tempcore = tempcoMatch ? ` ${tempcoMatch[0].toUpperCase()}${tempcoMatch.slice(1).toLowerCase()}` : "";

  if (material.categoryCode === "STR-01") {
    const grade = name.match(/S([RD])\.?\s*(\d+)/i);
    if (grade && mm) {
      const kind = grade[1].toUpperCase() === "R" ? "เหล็กกลม" : "เหล็กข้ออ้อย";
      return { title: `${kind} S${grade[1].toUpperCase()}${grade[2]}${tempcore}${tis} · ${mm} มม.`, detail: name };
    }
  }
  if (material.categoryCode === "STR-03") {
    const grid = name.match(/ตาราง\s*(0\.\d+)\s*x\s*(0\.\d+)/);
    if (grid && mm) {
      const kind = /ข้ออ้อย/.test(name) ? "ตะแกรงข้ออ้อย" : "ตะแกรงเหล็กกลม";
      return { title: `${kind} ${mm} มม. · ตาราง ${grid[1]}×${grid[2]} ม.`, detail: name };
    }
  }
  if (material.categoryCode === "STR-05" && mm) {
    const kind = /strand/i.test(name) ? "ลวดอัดแรง PC Strand" : "ลวดอัดแรง PC Wire";
    const grade = name.match(/ประเภท\s*(\d+)/)?.[1];
    return { title: `${kind}${grade ? ` ${grade}` : ""} · ${mm} มม.`, detail: name };
  }
  if (material.categoryCode === "STR-06") {
    const ksc = name.match(/ลูกบาศก์\s*(\d+)/)?.[1];
    if (ksc) return { title: `คอนกรีตผสมเสร็จ ${ksc} กก./ตร.ซม.`, detail: name };
  }
  return { title: name, detail: null };
}
