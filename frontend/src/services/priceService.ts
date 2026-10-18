import type { Material } from "@/types";
import { demoBasePrice } from "./demoPrices";

/**
 * ชั้นข้อมูลราคา — หน้าเว็บทุกหน้าเรียกผ่านไฟล์นี้เท่านั้น
 * ตอนนี้ใช้ข้อมูลตัวอย่าง (DEMO) เพื่อให้เห็นหน้าจอทำงานจริง
 * เมื่อ backend / โมเดล ML พร้อม ให้ตั้ง VITE_API_BASE แล้วระบบจะเรียก API ตาม contract ด้านล่าง
 *
 *   GET {API}/prices/{materialId}/history?months=1..12   (การ์ดราคาใช้ 1, กราฟหน้าวัสดุใช้ 12)
 *       -> { unit: string, points: [{ date: "YYYY-MM-DD", price: number }] }
 *   GET {API}/prices/{materialId}/forecast?months=1..3
 *       -> { unit: string, points: [{ month: 1|2|3, date: "YYYY-MM-DD", price: number, low: number, high: number }] }
 */

export type Horizon = 1 | 2 | 3;

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

// ---------- DEMO generator (ไม่ใช่ราคาจริง) ----------
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const rand = (seed: number) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

// แนวโน้มและวงจรราคามาจากกลุ่มสินค้า (familyCode) วัสดุกลุ่มเดียวกันจึงขึ้นลงไปด้วยกัน ลำดับราคาตามสเปกไม่สลับกัน
function demoModel(material: Material) {
  const h = hash(material.id);
  const hf = hash(material.familyCode || material.categoryCode);
  const base = demoBasePrice(material) * (0.996 + (h % 9) / 1000);
  const drift = ((hf >> 5) % 31 - 12) / 1000;       // แนวโน้มต่อเดือน
  return { base, drift, h, hf };
}
// หลักพันปัดทีละ 5 บาท, หลักร้อยเป็นบาทเต็ม, ต่ำกว่านั้นมีสตางค์
const round = (n: number) => (n >= 1000 ? Math.round(n / 5) * 5 : n >= 100 ? Math.round(n) : Math.round(n * 100) / 100);

// ราคาตัวอย่างของเดือนที่ย้อนไป i เดือน: ขึ้นกับวัสดุและเดือนเท่านั้น ไม่ขึ้นกับช่วงที่ขอ ทุกหน้าจึงเห็นราคาเดือนเดียวกันตรงกัน
function demoPriceAt(material: Material, i: number) {
  const { base, drift, h, hf } = demoModel(material);
  const noise = (rand(hf + i * 7) - 0.5) * 0.012 + (rand(h + i * 3) - 0.5) * 0.003;
  const cycle = Math.sin((i + (hf % 12)) / 9) * 0.025; // วงจรราคาช่วงยาว (ตัวอย่าง)
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
  const { drift, hf: h } = demoModel(material);
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

/** ราคาล่าสุด + ราคาคาดการณ์ 1–3 เดือน ของวัสดุหนึ่งรายการ: สิ่งที่การ์ดราคาและรายการค้นหาใช้ */
export interface Quote { demo: boolean; unit: string; latest: HistoryPoint; forecast: ForecastPoint[] }

// เก็บผลไว้ต่อวัสดุ: พิมพ์ค้นหาซ้ำหรือเปิดหน้าเดิมจะไม่เรียก API ซ้ำ (ลบออกจากแคชถ้าเรียกไม่สำเร็จ ให้ลองใหม่ได้)
const quoteCache = new Map<string, Promise<Quote>>();
export function getQuote(material: Material): Promise<Quote> {
  let pending = quoteCache.get(material.id);
  if (!pending) {
    pending = Promise.all([getHistory(material, 1), getForecast(material, 3)]).then(([history, forecast]) => ({
      demo: history.demo || forecast.demo,
      unit: history.unit,
      latest: history.points.at(-1)!,
      forecast: forecast.points,
    }));
    pending.catch(() => quoteCache.delete(material.id));
    quoteCache.set(material.id, pending);
  }
  return pending;
}

export const formatBaht = (n: number, digits = 2) => n.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** ราคาต่อหน่วย: หลักร้อยขึ้นไปเป็นบาทเต็ม */
export const formatPrice = (n: number) => formatBaht(n, n >= 100 ? 0 : 2);
/** ยอดเงิน: แสดงสตางค์เฉพาะเมื่อมีเศษ (15,460 ไม่ใช่ 15,460.00) */
export const formatMoney = (n: number) => formatBaht(n, Math.abs(Math.round(n * 100) % 100) > 0 ? 2 : 0);
export const monthsLabel = (h: number) => (h === 0 ? "ราคาล่าสุด" : `อีก ${h} เดือน`);
export const percentChange = (from: number, to: number) => ((to - from) / from) * 100;

/** แปลตัวเลขคาดการณ์ 3 เดือนเป็นคำแนะนำสั้น ๆ ให้คนอ่านรู้ว่าควรทำอะไรต่อ */
export function trendVerdict(change: number) {
  if (change >= 1) return { tone: "up" as const, title: `ราคามีแนวโน้มขึ้นราว ${change.toFixed(1)}% ใน 3 เดือน`, advice: "ถ้าต้องใช้แน่ ซื้อช่วงนี้น่าจะคุ้มกว่ารอ" };
  if (change <= -1) return { tone: "down" as const, title: `ราคามีแนวโน้มลงราว ${Math.abs(change).toFixed(1)}% ใน 3 เดือน`, advice: "ถ้ายังไม่รีบใช้ รอซื้อได้" };
  return { tone: "flat" as const, title: "ราคาค่อนข้างทรงตัวใน 3 เดือน", advice: "ซื้อเมื่อพร้อมได้เลย ราคาไม่น่าเปลี่ยนมาก" };
}
