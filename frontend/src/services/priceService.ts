import type { Material } from "@/types";
import { demoForecast, demoHistory, priceMonthLabel } from "./demoPriceSeries";

/**
 * ชั้นข้อมูลราคา — หน้าเว็บทุกหน้าเรียกผ่านไฟล์นี้เท่านั้น
 * ที่มาของราคา เรียงตามลำดับที่ใช้:
 *   1. VITE_DEMO_DATA=true  -> ข้อมูลตัวอย่าง (DEMO) ทั้งหมด ใช้ตอนพัฒนาหน้าจอ
 *   2. VITE_API_BASE        -> เรียก backend (ml/serve.py) ตาม contract ด้านล่าง
 *   3. ค่าเริ่มต้น              -> ไฟล์สำเร็จรูป public/data/prices/{materialId}.json สร้างด้วย ml/export_static.py
 *                              ข้อมูลเดียวกับที่ API ตอบ วัสดุที่ไม่มีไฟล์ใช้ข้อมูลตัวอย่างและติดป้าย "ข้อมูลตัวอย่าง"
 *
 *   GET {API}/prices/{materialId}/history?months=1..12   (การ์ดราคาใช้ 1, กราฟหน้าวัสดุใช้ 12)
 *       -> { unit: string, points: [{ date: "YYYY-MM-DD", price: number }] }
 *   GET {API}/prices/{materialId}/forecast?months=1..3
 *       -> { unit: string, points: [{ month: 1|2|3, date: "YYYY-MM-DD", price: number, low: number, high: number, changeProb?: number }] }
 */

export type Horizon = 1 | 2 | 3;

export interface HistoryPoint {
  date: string;
  label: string;
  price: number;
}
export interface ForecastPoint {
  month: Horizon;
  date: string;
  label: string;
  price: number;
  low: number;
  high: number;
  /** โอกาสที่ราคาจะเปลี่ยน (ขึ้นหรือลง) ภายในกี่เดือนนี้ 0–1 ปรับเทียบกับที่เกิดจริงในการทดสอบย้อนหลัง มีเฉพาะข้อมูลจริง (ไฟล์สำเร็จรูปหรือ API) */
  changeProb?: number;
}
export interface PriceSeries {
  demo: boolean;
  unit: string;
  points: HistoryPoint[];
}
export interface ForecastSeries {
  demo: boolean;
  unit: string;
  points: ForecastPoint[];
}

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "");
const DEMO_ONLY = import.meta.env.VITE_DEMO_DATA === "true";
export const isDemoData = DEMO_ONLY;
const STATIC_BASE = `${import.meta.env.BASE_URL}data/prices`;

// ---------- Public API ----------
async function remote<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

type RawHistory = { date: string; price: number }[];
type RawForecast = {
  month: Horizon;
  date: string;
  price: number;
  low: number;
  high: number;
  changeProb?: number;
}[];

// ไฟล์สำเร็จรูปของวัสดุหนึ่งรายการ: ราคาล่าสุดกับย้อนหลัง 12 เดือน และราคาคาดการณ์ 1–3 เดือน
// เก็บไว้ต่อวัสดุ เรียกไฟล์ครั้งเดียวต่อวัสดุ ถ้าโหลดไม่สำเร็จจะลบออกจากแคช ให้ลองใหม่ได้
interface StaticPrices {
  unit: string;
  history: RawHistory;
  forecast: RawForecast;
}
const staticCache = new Map<string, Promise<StaticPrices | null>>();
function staticPrices(id: string): Promise<StaticPrices | null> {
  let pending = staticCache.get(id);
  if (!pending) {
    pending = fetch(`${STATIC_BASE}/${encodeURIComponent(id)}.json`)
      .then((res) => (res.ok ? (res.json() as Promise<StaticPrices>) : null))
      .catch(() => {
        staticCache.delete(id);
        return null;
      });
    staticCache.set(id, pending);
  }
  return pending;
}

const withLabel = <T extends { date: string }>(p: T) => ({
  ...p,
  label: priceMonthLabel(new Date(p.date)),
});

export async function getHistory(material: Material, months: number): Promise<PriceSeries> {
  if (DEMO_ONLY) return demoHistory(material, months);
  if (API_BASE) {
    const data = await remote<{ unit: string; points: RawHistory }>(
      `/prices/${encodeURIComponent(material.id)}/history?months=${months}`,
    );
    return { demo: false, unit: data.unit, points: data.points.map(withLabel) };
  }
  const data = await staticPrices(material.id);
  if (!data?.history?.length) return demoHistory(material, months);
  return { demo: false, unit: data.unit, points: data.history.slice(-(months + 1)).map(withLabel) };
}

export async function getForecast(
  material: Material,
  months: Horizon = 3,
): Promise<ForecastSeries> {
  if (DEMO_ONLY) return demoForecast(material, months);
  if (API_BASE) {
    const data = await remote<{ unit: string; points: RawForecast }>(
      `/prices/${encodeURIComponent(material.id)}/forecast?months=${months}`,
    );
    return { demo: false, unit: data.unit, points: data.points.map(withLabel) };
  }
  const data = await staticPrices(material.id);
  if (!data?.forecast?.length) return demoForecast(material, months);
  return {
    demo: false,
    unit: data.unit,
    points: data.forecast.filter((p) => p.month <= months).map(withLabel),
  };
}

/** ราคาล่าสุด + ราคาคาดการณ์ 1–3 เดือน ของวัสดุหนึ่งรายการ: สิ่งที่การ์ดราคาและรายการค้นหาใช้ */
export interface Quote {
  demo: boolean;
  unit: string;
  latest: HistoryPoint;
  forecast: ForecastPoint[];
}

// เก็บผลไว้ต่อวัสดุ: พิมพ์ค้นหาซ้ำหรือเปิดหน้าเดิมจะไม่เรียก API ซ้ำ (ลบออกจากแคชถ้าเรียกไม่สำเร็จ ให้ลองใหม่ได้)
const quoteCache = new Map<string, Promise<Quote>>();
export function getQuote(material: Material): Promise<Quote> {
  let pending = quoteCache.get(material.id);
  if (!pending) {
    pending = Promise.all([getHistory(material, 1), getForecast(material, 3)]).then(
      ([history, forecast]) => ({
        demo: history.demo || forecast.demo,
        unit: history.unit,
        latest: history.points.at(-1)!,
        forecast: forecast.points,
      }),
    );
    pending.catch(() => quoteCache.delete(material.id));
    quoteCache.set(material.id, pending);
  }
  return pending;
}

export const formatBaht = (n: number, digits = 2) =>
  n.toLocaleString("th-TH", { minimumFractionDigits: digits, maximumFractionDigits: digits });
/** ราคาต่อหน่วย: หลักร้อยขึ้นไปเป็นบาทเต็ม */
export const formatPrice = (n: number) => formatBaht(n, n >= 100 ? 0 : 2);
/** ยอดเงิน: แสดงสตางค์เฉพาะเมื่อมีเศษ (15,460 ไม่ใช่ 15,460.00) */
export const formatMoney = (n: number) =>
  formatBaht(n, Math.abs(Math.round(n * 100) % 100) > 0 ? 2 : 0);
export const monthsLabel = (h: number) => (h === 0 ? "ราคาล่าสุด" : `อีก ${h} เดือน`);
export const percentChange = (from: number, to: number) => ((to - from) / from) * 100;

/** แสดงป้าย "ราคามีโอกาสเปลี่ยน" เมื่อโอกาสที่เกิดจริงในการทดสอบย้อนหลังตั้งแต่ 70% */
export const CHANGE_SIGNAL_AT = 0.7;
export function changeVerdict(prob: number) {
  return {
    tone: "watch" as const,
    title: `ราคามีโอกาสเปลี่ยนภายในเดือนหน้า ราว ${Math.round(prob * 100)}%`,
    advice: "ยังบอกไม่ได้ว่าจะขึ้นหรือลง ถ้าต้องใช้แน่ ขอใบเสนอราคาและให้ร้านยืนราคาไว้ก่อน",
  };
}

/** แปลตัวเลขคาดการณ์ 3 เดือนเป็นคำแนะนำสั้น ๆ ให้คนอ่านรู้ว่าควรทำอะไรต่อ */
export function trendVerdict(change: number) {
  if (change >= 1)
    return {
      tone: "up" as const,
      title: `ราคามีแนวโน้มขึ้นราว ${change.toFixed(1)}% ใน 3 เดือน`,
      advice: "ถ้าต้องใช้แน่ ซื้อช่วงนี้น่าจะคุ้มกว่ารอ",
    };
  if (change <= -1)
    return {
      tone: "down" as const,
      title: `ราคามีแนวโน้มลงราว ${Math.abs(change).toFixed(1)}% ใน 3 เดือน`,
      advice: "ถ้ายังไม่รีบใช้ รอซื้อได้",
    };
  return {
    tone: "flat" as const,
    title: "ราคาค่อนข้างทรงตัวใน 3 เดือน",
    advice: "ซื้อเมื่อพร้อมได้เลย ราคาไม่น่าเปลี่ยนมาก",
  };
}
