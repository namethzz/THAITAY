import { useEffect, useState } from "react";
import { getQuote, percentChange, type Quote } from "@/services/priceService";
import type { Material } from "@/types";

/** ตัวกรองและการเรียงในหน้าค้นหา (เก็บใน URL: sort, trend, unit, grade, size) */
export type SortKey = "relevance" | "drop" | "rise" | "priceAsc" | "priceDesc";
export type TrendKey = "all" | "down" | "flat" | "up";
export interface SearchFilters { sort: SortKey; trend: TrendKey; unit: string; grade: string; size: string }
export const NO_FILTERS: SearchFilters = { sort: "relevance", trend: "all", unit: "all", grade: "all", size: "all" };

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "แนะนำ" },
  { key: "drop", label: "ราคาลงมากสุด" },
  { key: "rise", label: "ราคาขึ้นมากสุด" },
  { key: "priceAsc", label: "ราคาต่ำ → สูง" },
  { key: "priceDesc", label: "ราคาสูง → ต่ำ" },
];
export const TRENDS: { key: TrendKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "down", label: "ราคาลง" },
  { key: "flat", label: "ทรงตัว" },
  { key: "up", label: "ราคาขึ้น" },
];

const SORT_KEYS = SORTS.map(s => s.key) as string[];
const TREND_KEYS = TRENDS.map(t => t.key) as string[];

export function readFilters(params: URLSearchParams): SearchFilters {
  const sort = params.get("sort") ?? "";
  const trend = params.get("trend") ?? "";
  return {
    sort: (SORT_KEYS.includes(sort) ? sort : "relevance") as SortKey,
    trend: (TREND_KEYS.includes(trend) ? trend : "all") as TrendKey,
    unit: params.get("unit") || "all",
    grade: params.get("grade") || "all",
    size: params.get("size") || "all",
  };
}
export function writeFilters(params: URLSearchParams, f: SearchFilters) {
  (Object.keys(NO_FILTERS) as (keyof SearchFilters)[]).forEach(k => { if (f[k] !== NO_FILTERS[k]) params.set(k, f[k]); });
}
/** จำนวนตัวกรองที่เปิดอยู่ (ไม่นับการเรียง) สำหรับป้ายบนปุ่ม */
export const filterCount = (f: SearchFilters) => (["trend", "unit", "grade", "size"] as const).filter(k => f[k] !== NO_FILTERS[k]).length;

/** เกรดและขนาดของเหล็กเส้น ใช้กรองสเปก (SR24 / SD40 …, 12 มม.) */
export function rebarGradeSize(material: Material) {
  if (material.categoryCode !== "STR-01") return null;
  const grade = material.name.match(/S([RD])\.?\s*(\d+)/i);
  const size = material.name.match(/(?:ศก\.?|เส้นผ่านศูนย์กลาง)\s*(\d+(?:\.\d+)?)\s*มม/)?.[1];
  return grade && size ? { grade: `S${grade[1].toUpperCase()}${grade[2]}`, size } : null;
}

/** แนวโน้ม 3 เดือนแบบเดียวกับคำแนะนำบนการ์ดราคา (±1%) */
export function trendOf(quote: Quote | undefined): { key: TrendKey; change: number } | null {
  const last = quote?.forecast.at(-1);
  if (!quote || !last) return null;
  const change = percentChange(quote.latest.price, last.price);
  return { key: change >= 1 ? "up" : change <= -1 ? "down" : "flat", change };
}

/** กรองและเรียง: ตัวกรองที่ต้องใช้ราคา (แนวโน้ม, เรียงตามราคา) รอจนราคาโหลดครบก่อน */
export function applyFilters(materials: Material[], f: SearchFilters, quotes: Map<string, Quote> | null) {
  let list = materials.filter(m => {
    if (f.unit !== "all" && m.unit !== f.unit) return false;
    if (f.grade !== "all" || f.size !== "all") {
      const spec = rebarGradeSize(m);
      if (!spec || (f.grade !== "all" && spec.grade !== f.grade) || (f.size !== "all" && spec.size !== f.size)) return false;
    }
    if (f.trend !== "all") return quotes ? trendOf(quotes.get(m.id))?.key === f.trend : true;
    return true;
  });
  if (f.sort === "relevance" || !quotes) return list;
  const change = (m: Material) => trendOf(quotes.get(m.id))?.change ?? 0;
  const price = (m: Material) => quotes.get(m.id)?.latest.price ?? 0;
  // ราคาเทียบกันได้เฉพาะหน่วยเดียวกัน: เรียงหน่วยตามลำดับที่พบก่อน แล้วค่อยเรียงราคาในหน่วยนั้น
  const unitRank = new Map<string, number>();
  list.forEach(m => { if (!unitRank.has(m.unit)) unitRank.set(m.unit, unitRank.size); });
  const byUnit = (a: Material, b: Material) => unitRank.get(a.unit)! - unitRank.get(b.unit)!;
  list = [...list];
  if (f.sort === "drop") list.sort((a, b) => change(a) - change(b));
  if (f.sort === "rise") list.sort((a, b) => change(b) - change(a));
  if (f.sort === "priceAsc") list.sort((a, b) => byUnit(a, b) || price(a) - price(b));
  if (f.sort === "priceDesc") list.sort((a, b) => byUnit(a, b) || price(b) - price(a));
  return list;
}

/** โหลดราคาของทุกรายการที่ตรงคำค้น (ใช้แคชเดียวกับการ์ดราคา) เฉพาะเมื่อต้องใช้ */
export function useQuotes(materials: Material[], enabled: boolean) {
  const [quotes, setQuotes] = useState<Map<string, Quote> | null>(null);
  const key = enabled ? materials.map(m => m.id).join(",") : "";
  useEffect(() => {
    if (!enabled) { setQuotes(null); return; }
    let alive = true;
    Promise.all(materials.map(m => getQuote(m).then(q => [m.id, q] as const).catch(() => null)))
      .then(rows => { if (alive) setQuotes(new Map(rows.filter((r): r is readonly [string, Quote] => r !== null))); });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return quotes;
}
