import { getMaterialById } from "@/data.js";
import { materialTitle } from "@/lib/materialTitle";
import type { EstimateLine } from "@/types";

export const titleOf = (line: EstimateLine) => {
  const material = getMaterialById(line.materialId);
  return material ? materialTitle(material).title : line.name;
};
export const thaiDate = (iso?: string) =>
  (iso ? new Date(`${iso}T00:00:00`) : new Date()).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
// รายการจากลิงก์ที่ส่งมาเป็นราคาที่ตรึงไว้ ณ วันส่ง ต้องบอกวันที่ ไม่ให้ดูเหมือนราคาวันนี้
export const whenOf = (line: EstimateLine) => {
  const basis =
    line.month === 0 ? (line.asOf ? "ราคา" : "ราคาล่าสุด") : `คาดการณ์ ${line.monthLabel}`;
  return line.asOf ? `${basis} ณ ${thaiDate(line.asOf)}` : basis;
};
