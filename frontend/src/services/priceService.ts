import type { Material } from "@/types";

/**
 * ชั้นข้อมูลราคา — หน้าเว็บทุกหน้าเรียกผ่านไฟล์นี้เท่านั้น
 * ตอนนี้ใช้ข้อมูลตัวอย่าง (DEMO) เพื่อให้เห็นหน้าจอทำงานจริง
 * เมื่อ backend / โมเดล ML พร้อม ให้ตั้ง VITE_API_BASE แล้วระบบจะเรียก API ตาม contract ด้านล่าง
 *
 *   GET {API}/prices/{materialId}/history?months=1..3
 *       -> { unit: string, points: [{ date: "YYYY-MM-DD", price: number }] }
 *   GET {API}/prices/{materialId}/forecast?months=1..3
 *       -> { unit: string, points: [{ month: 1|2|3, date: "YYYY-MM-DD", price: number, low: number, high: number }] }
 */

export type Horizon = 1 | 2 | 3;
export const HORIZONS: Horizon[] = [1, 2, 3];

/** ช่วงย้อนหลังสำหรับหน้าวิเคราะห์ (หน่วยเป็นเดือน) — ปิดตัวเลือกที่ยาวกว่าข้อมูลที่มี โดยตั้ง VITE_MAX_HISTORY_MONTHS */
export const HISTORY_RANGES = [
  { months: 3, label: "3 เดือน" },
  { months: 6, label: "6 เดือน" },
  { months: 12, label: "1 ปี" },
  { months: 36, label: "3 ปี" },
  { months: 60, label: "5 ปี" },
  { months: 120, label: "10 ปี" },
] as const;
export const MAX_HISTORY_MONTHS = Number(import.meta.env.VITE_MAX_HISTORY_MONTHS) || 120;

export interface HistoryPoint { date: string; label: string; price: number }
export interface ForecastPoint { month: Horizon; date: string; label: string; price: number; low: number; high: number }
export interface PriceSeries { demo: boolean; unit: string; points: HistoryPoint[] }
export interface ForecastSeries { demo: boolean; unit: string; points: ForecastPoint[] }

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "");
export const isDemoData = !API_BASE;

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const addMonths = (base: Date, n: number) => new Date(base.getFullYear(), base.getMonth() + n, 1);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
const label = (d: Date) => `${TH_MONTHS[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`;
export const addMonthsLabel = (n: number) => label(addMonths(new Date(), n));

// ---------- DEMO generator (ไม่ใช่ราคาจริง) ----------
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const rand = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

const BASE_BY_UNIT: Record<string, number> = { "ตัน": 21500, "ท่อน": 190, "ตร.ม.": 85, "เมตร": 420, "ลบ.ม.": 2250, "กก.": 28, "ม้วน": 950 };
const BASE_BY_CATEGORY: Record<string, number> = { "STR-08": 1.6, "STR-09": 0.12, "STR-07": 0.85 };

function demoModel(material: Material) {
  const h = hash(material.id);
  const base = (BASE_BY_UNIT[material.unit] ?? 500) * (BASE_BY_CATEGORY[material.categoryCode] ?? 1) * (0.7 + (h % 700) / 1000);
  const drift = ((h >> 5) % 31 - 12) / 1000;       // แนวโน้มต่อเดือน
  return { base, drift, h };
}
const round = (n: number) => (n >= 1000 ? Math.round(n / 5) * 5 : Math.round(n * 100) / 100);

// ราคาตัวอย่างของเดือนที่ย้อนไป i เดือน: ขึ้นกับวัสดุและเดือนเท่านั้น ไม่ขึ้นกับช่วงที่ขอ ทุกหน้าจึงเห็นราคาเดือนเดียวกันตรงกัน
function demoPriceAt(material: Material, i: number) {
  const { base, drift, h } = demoModel(material);
  const noise = (rand(h + i * 7) - 0.5) * 0.012;
  const cycle = Math.sin((i + (h % 12)) / 9) * 0.04; // วงจรราคาช่วงยาว (ตัวอย่าง)
  return round(base * (Math.exp(-drift * 0.35 * i) + noise + cycle));
}

function demoHistory(material: Material, months: number): PriceSeries {
  const now = new Date();
  const points: HistoryPoint[] = [];
  for (let i = months; i >= 0; i--) {
    const d = addMonths(now, -i);
    points.push({ date: iso(d), label: label(d), price: demoPriceAt(material, i) });
  }
  return { demo: true, unit: material.unit, points };
}

function demoForecast(material: Material, months: number): ForecastSeries {
  const { drift, h } = demoModel(material);
  const latest = demoPriceAt(material, 0); // ต่อจากราคาล่าสุดในประวัติ
  const now = new Date();
  const points: ForecastPoint[] = [];
  for (let m = 1; m <= months; m++) {
    const d = addMonths(now, m);
    const price = latest * (1 + drift * m + (rand(h + m * 13) - 0.5) * 0.006);
    const band = 0.012 + 0.011 * m; // ช่วงความไม่แน่นอนกว้างขึ้นตามระยะเวลา
    points.push({ month: m as Horizon, date: iso(d), label: label(d), price: round(price), low: round(price * (1 - band)), high: round(price * (1 + band)) });
  }
  return { demo: true, unit: material.unit, points };
}

// ---------- Public API ----------
async function remote<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

export async function getHistory(material: Material, months: number): Promise<PriceSeries> {
  if (!API_BASE) return demoHistory(material, months);
  const data = await remote<{ unit: string; points: { date: string; price: number }[] }>(`/prices/${encodeURIComponent(material.id)}/history?months=${months}`);
  return { demo: false, unit: data.unit, points: data.points.map(p => ({ ...p, label: label(new Date(p.date)) })) };
}

export async function getForecast(material: Material, months: Horizon = 3): Promise<ForecastSeries> {
  if (!API_BASE) return demoForecast(material, months);
  const data = await remote<{ unit: string; points: { month: Horizon; date: string; price: number; low: number; high: number }[] }>(`/prices/${encodeURIComponent(material.id)}/forecast?months=${months}`);
  return { demo: false, unit: data.unit, points: data.points.map(p => ({ ...p, label: label(new Date(p.date)) })) };
}

export const formatBaht = (n: number, digits = 2) => n.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const monthsLabel = (h: number) => (h === 0 ? "ราคาปัจจุบัน" : `อีก ${h} เดือน`);
