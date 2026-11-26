import type { Material } from "@/types";
import type {
  ForecastPoint,
  ForecastSeries,
  HistoryPoint,
  Horizon,
  PriceSeries,
} from "./priceService";
import { demoBasePrice } from "./demoPrices";

const TH_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];
const addMonths = (base: Date, n: number) => new Date(base.getFullYear(), base.getMonth() + n, 1);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
export const priceMonthLabel = (d: Date) =>
  `${TH_MONTHS[d.getMonth()]} ${String(d.getFullYear() + 543).slice(2)}`;

// ---------- DEMO generator (ไม่ใช่ราคาจริง) ----------
function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const rand = (seed: number) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// แนวโน้มและวงจรราคามาจากกลุ่มสินค้า (familyCode) วัสดุกลุ่มเดียวกันจึงขึ้นลงไปด้วยกัน ลำดับราคาตามสเปกไม่สลับกัน
function demoModel(material: Material) {
  const h = hash(material.id);
  const hf = hash(material.familyCode || material.categoryCode);
  const base = demoBasePrice(material) * (0.996 + (h % 9) / 1000);
  const drift = (((hf >> 5) % 31) - 12) / 1000; // แนวโน้มต่อเดือน
  return { base, drift, h, hf };
}
// หลักพันปัดทีละ 5 บาท, หลักร้อยเป็นบาทเต็ม, ต่ำกว่านั้นมีสตางค์
const round = (n: number) =>
  n >= 1000 ? Math.round(n / 5) * 5 : n >= 100 ? Math.round(n) : Math.round(n * 100) / 100;

// ราคาตัวอย่างของเดือนที่ย้อนไป i เดือน: ขึ้นกับวัสดุและเดือนเท่านั้น ไม่ขึ้นกับช่วงที่ขอ ทุกหน้าจึงเห็นราคาเดือนเดียวกันตรงกัน
function demoPriceAt(material: Material, i: number) {
  const { base, drift, h, hf } = demoModel(material);
  const noise = (rand(hf + i * 7) - 0.5) * 0.012 + (rand(h + i * 3) - 0.5) * 0.003;
  const cycle = Math.sin((i + (hf % 12)) / 9) * 0.025; // วงจรราคาช่วงยาว (ตัวอย่าง)
  return round(base * (Math.exp(-drift * 0.35 * i) + noise + cycle));
}

export function demoHistory(material: Material, months: number): PriceSeries {
  const now = new Date();
  const points: HistoryPoint[] = [];
  for (let i = months; i >= 0; i--) {
    const d = addMonths(now, -i);
    points.push({ date: iso(d), label: priceMonthLabel(d), price: demoPriceAt(material, i) });
  }
  return { demo: true, unit: material.unit, points };
}

export function demoForecast(material: Material, months: number): ForecastSeries {
  const { drift, hf: h } = demoModel(material);
  const latest = demoPriceAt(material, 0); // ต่อจากราคาล่าสุดในประวัติ
  const now = new Date();
  const points: ForecastPoint[] = [];
  for (let m = 1; m <= months; m++) {
    const d = addMonths(now, m);
    const price = latest * (1 + drift * m + (rand(h + m * 13) - 0.5) * 0.006);
    const band = 0.012 + 0.011 * m; // ช่วงความไม่แน่นอนกว้างขึ้นตามระยะเวลา
    points.push({
      month: m as Horizon,
      date: iso(d),
      label: priceMonthLabel(d),
      price: round(price),
      low: round(price * (1 - band)),
      high: round(price * (1 + band)),
    });
  }
  return { demo: true, unit: material.unit, points };
}
