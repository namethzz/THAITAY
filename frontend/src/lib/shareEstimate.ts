import { getMaterialById } from "@/data.js";
import { monthsLabel } from "@/services/priceService";
import type { EstimateLine, EstimateMeta } from "@/types";

/**
 * ใบประมาณราคาที่ส่งเป็นลิงก์: รายการ + ราคา ณ วันที่ส่ง อยู่ในลิงก์เอง (#estimate?d=…) ไม่ต้องมีเซิร์ฟเวอร์
 * คนเปิดลิงก์เห็นตัวเลขเดียวกับคนส่ง แม้ราคาจะเปลี่ยนไปแล้ว รูปแบบ v1:
 *   { v, p: โครงการ, c: ลูกค้า, k: % สำรอง, t: VAT 0/1, d: วันที่ส่ง, l: [[รหัสไม่มี MAT-, เดือน, จำนวน, ราคา, ต่ำ, สูง, หน่วยเส้น 0/1, demo 0/1], …] }
 */
export interface SharedEstimate { meta: EstimateMeta; lines: EstimateLine[]; date: string }

const toBase64Url = (text: string) => {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromBase64Url = (code: string) => {
  const binary = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(binary, ch => ch.charCodeAt(0)));
};

export function encodeEstimate(meta: EstimateMeta, lines: EstimateLine[], date = new Date()) {
  return toBase64Url(JSON.stringify({
    v: 1,
    p: meta.project.trim(),
    c: meta.customer.trim(),
    k: meta.contingency,
    t: meta.vat ? 1 : 0,
    d: date.toISOString().slice(0, 10),
    l: lines.map(l => [l.materialId.replace(/^MAT-/, ""), l.month, l.qty, l.price, l.low, l.high, l.unit === "เส้น" ? 1 : 0, l.demo ? 1 : 0]),
  }));
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : null);
const text = (v: unknown, max = 120) => (typeof v === "string" ? v.slice(0, max) : "");

/** อ่านลิงก์ที่ส่งมา: ข้อมูลผิดรูปแบบหรือรหัสวัสดุที่ไม่มีจะถูกข้าม ได้ null ถ้าใช้ไม่ได้เลย */
export function decodeEstimate(code: string): SharedEstimate | null {
  try {
    const raw = JSON.parse(fromBase64Url(code));
    if (raw?.v !== 1 || !Array.isArray(raw.l)) return null;
    const lines: EstimateLine[] = [];
    raw.l.forEach((row: unknown, index: number) => {
      if (!Array.isArray(row)) return;
      const material = getMaterialById(String(row[0]));
      const month = num(row[1]);
      const [qty, price, low, high] = [num(row[2]), num(row[3]), num(row[4]), num(row[5])];
      if (!material || month === null || month > 3 || qty === null || price === null || low === null || high === null) return;
      lines.push({
        key: `shared-${index}`,
        materialId: material.id,
        name: material.name,
        unit: row[6] === 1 ? "เส้น" : material.unit,
        month,
        monthLabel: monthsLabel(month),
        qty, price, low, high,
        demo: row[7] === 1,
      });
    });
    if (!lines.length) return null;
    const contingency = [0, 3, 5, 10].includes(raw.k) ? raw.k : 0;
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw.d) ? raw.d : "";
    return { meta: { project: text(raw.p), customer: text(raw.c), contingency, vat: raw.t !== 0 }, lines, date };
  } catch {
    return null;
  }
}

/** ลิงก์เต็มของใบประมาณราคา ใช้ที่อยู่เว็บปัจจุบัน (Vercel / GitHub Pages ได้ทั้งคู่) */
export const shareUrl = (code: string) => `${window.location.origin}${window.location.pathname}#estimate?d=${code}`;
