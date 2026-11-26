import { useEffect, useState } from "react";
import type { EstimateLine, Material } from "@/types";

export interface Observation { date: string; price: number }
export const shortChartLabel = (text: string) => text.length <= 28 ? text : `${text.slice(0, 12)}…${text.slice(-15)}`;
export interface ChartData { asOf: string; firstMonth: string; materials: Record<string, {unit: string; points: Observation[]}> }
let pending: Promise<ChartData> | undefined;
export function loadChartData() {
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}data/chart-history.json`).then(async r => {
      if (!r.ok) throw new Error("โหลดข้อมูลกราฟไม่สำเร็จ");
      const data = await r.json() as ChartData;
      if (!data.asOf || !data.materials) throw new Error("รูปแบบข้อมูลกราฟไม่ถูกต้อง");
      return data;
    });
    pending.catch(() => { pending = undefined; });
  }
  return pending;
}
export function useChartData() {
  const [state, setState] = useState<{data: ChartData | null; error: boolean}>({data: null, error: false});
  useEffect(() => { let alive = true; loadChartData().then(data => { if (alive) setState({data, error: false}); }).catch(() => { if (alive) setState({data: null, error: true}); }); return () => { alive = false; }; }, []);
  return state;
}
export function shiftMonth(date: string, n: number) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + n, 1)).toISOString().slice(0, 10);
}
export function monthLabel(date: string) {
  return new Date(date + "T00:00:00Z").toLocaleDateString("th-TH", {month: "short", year: "2-digit", timeZone: "UTC"});
}
export function calendarSeries(points: Observation[], end: string, months: number) {
  const byDate = new Map(points.map(p => [p.date, p.price]));
  return Array.from({length: months}, (_, i) => { const date = shiftMonth(end, i - months + 1); return {date, label: monthLabel(date), actual: byDate.get(date) ?? null}; });
}
export type Movement = "up" | "down" | "steady" | "missing";
export interface MarketRow {
  material: Material;
  previous: number | null;
  latest: number | null;
  change: number | null;
  status: Movement;
}

export function marketRow(data: ChartData, material: Material, month: string): MarketRow {
  const history = data.materials[material.id];
  const points = history?.unit === material.unit ? history.points : [];
  const priceAt = (date: string) => {
    const price = points.find(p => p.date === date)?.price;
    return price != null && Number.isFinite(price) && price > 0 ? price : null;
  };
  const previous = priceAt(shiftMonth(month, -1));
  const latest = priceAt(month);
  const change = latest !== null && previous !== null ? (latest / previous - 1) * 100 : null;
  const status = change === null ? "missing" : change > .000001 ? "up" : change < -.000001 ? "down" : "steady";
  return {material, previous, latest, change, status};
}
export function monthlyChanges(data: ChartData, catalog: Material[], category = "all") {
  return catalog.filter(m => category === "all" || m.categoryCode === category)
    .map(material => marketRow(data, material, data.asOf))
    .filter((r): r is MarketRow & {previous: number; latest: number; change: number} => r.change !== null);
}
export function comparisonSeries(data: ChartData, ids: string[], months: number, end = data.asOf) {
  const dates = calendarSeries([], end, months).map(p => p.date);
  const lookup = ids.map(id => new Map((data.materials[id]?.points ?? []).map(p => [p.date, p.price])));
  const base = dates.find(date => lookup.every(m => (m.get(date) ?? 0) > 0));
  if (!base || ids.length < 2) return {base: null, points: []};
  return {base, points: dates.filter(d => d >= base).map(date => Object.fromEntries([
    ["date", date], ["label", monthLabel(date)], ...lookup.map((m, i) => [ids[i], m.has(date) ? m.get(date)! / m.get(base)! * 100 : null]),
  ]))};
}
export function costBreakdown(lines: EstimateLine[]) {
  const groups = new Map<string, {id: string; name: string; value: number}>();
  for (const line of lines) {
    if (!Number.isFinite(line.price) || !Number.isFinite(line.qty) || line.price < 0 || line.qty <= 0) continue;
    const item = groups.get(line.materialId) ?? {id: line.materialId, name: line.name, value: 0};
    item.value += line.price * line.qty; groups.set(line.materialId, item);
  }
  const sorted = [...groups.values()].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, r) => sum + r.value, 0);
  const shown = sorted.length > 12 ? [...sorted.slice(0, 11), {id: "other", name: `อื่น ๆ ${sorted.length - 11} รายการ`, value: sorted.slice(11).reduce((s, r) => s + r.value, 0)}] : sorted;
  return {total, items: shown.map(r => ({...r, share: total > 0 ? r.value / total * 100 : 0}))};
}
