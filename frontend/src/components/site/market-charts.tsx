import { useId, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { X } from "lucide-react";
import { calendarSeries, comparisonSeries, marketRow, monthLabel, shortChartLabel, type ChartData, type ComparableMarketRow, type MarketRow, type Movement } from "@/lib/chartData";
import { movements, percentText, priceText, statuses } from "@/lib/marketDisplay";
import { materialTitle } from "@/lib/materialTitle";
import ComparisonMaterialPicker from "./comparison-material-picker";

echarts.use([BarChart, LineChart, PieChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, CanvasRenderer]);
const palette = ["#173c62", "#ba581d", "#376f78", "#775a86", "#816b30"];
const textStyle = {fontFamily: "Prompt, sans-serif", color: "#485b6c"};
const tooltip = {confine: true, textStyle: {...textStyle, fontSize: 12}, extraCssText: "max-width:min(300px,75vw);white-space:normal;"};
type Hit = {dataIndex: number; seriesId: string};
const detail = (id: string) => { window.location.hash = "m/" + id; };

function priceTooltip(row: MarketRow, month: string) {
  const block = document.createElement("div");
  block.className = "md-tooltip";
  const title = document.createElement("strong");
  title.textContent = row.material.name;
  block.append(title);
  for (const line of [monthLabel(month) + " · บาท/" + row.material.unit, "ราคาเดือนก่อน  " + priceText(row.previous), "ราคาจริงเดือนนี้  " + priceText(row.latest), "เปลี่ยนแปลง  " + percentText(row.change)]) {
    const item = document.createElement("div");
    item.textContent = line;
    block.append(item);
  }
  return block;
}

function Chart({option, height, label, onHit}: {option: EChartsOption; height: number; label: string; onHit: (hit: Hit) => void}) {
  return <div role="img" aria-label={label}><ReactECharts echarts={echarts} notMerge option={{animation: false, textStyle, ...option}} style={{height, width: "100%"}} onEvents={{click: onHit}} /></div>;
}

export function Distribution({rows, onSelect}: {rows: ComparableMarketRow[]; onSelect: (status: Movement) => void}) {
  const slices = statuses.map(status => ({name: movements[status].label, value: rows.filter(r => r.status === status).length, itemStyle: {color: movements[status].color}}));
  return <section className="md-panel"><h2>สัดส่วนการเปลี่ยนราคา</h2>
    <div className="md-ring"><Chart height={172} label="กราฟโดนัทสัดส่วนสถานะราคา" onHit={hit => onSelect(statuses[hit.dataIndex])} option={{
      tooltip: {...tooltip, formatter: "{b} · {c} รายการ ({d}%)"},
      series: [{type: "pie", radius: ["65%", "88%"], stillShowZeroSum: false, label: {show: false}, itemStyle: {borderColor: "#fff", borderWidth: 2}, data: slices}],
    }}/><div className="md-ring-center"><b>{rows.length}</b><small>รายการ</small></div></div>
    <div className="md-key">{slices.map((s, i) => <button key={s.name} onClick={() => onSelect(statuses[i])}><i style={{background: s.itemStyle.color}}/>{s.name}<b>{s.value}</b></button>)}</div>
  </section>;
}

export function Movers({rows, month}: {rows: ComparableMarketRow[]; month: string}) {
  const sorted = [...rows].sort((a, b) => b.change - a.change);
  const movers = [...sorted.filter(r => r.status === "up").slice(0, 5), ...sorted.filter(r => r.status === "down").slice(-5)];
  return <section className="md-panel"><h2>วัสดุที่ราคาเปลี่ยนมากที่สุด</h2><p className="md-caption">เทียบเดือนก่อน · สูงสุดฝั่งละ 5 รายการ</p>
    {movers.length ? <Chart height={Math.max(208, movers.length * 33 + 55)} label="อันดับวัสดุราคาขึ้นและลง" onHit={hit => detail(movers[hit.dataIndex].material.id)} option={{
      grid: {top: 12, bottom: 28, left: "35%", right: 48, outerBoundsMode: "none"},
      tooltip: {...tooltip, formatter: p => priceTooltip(movers[(Array.isArray(p) ? p[0] : p).dataIndex], month)},
      xAxis: {type: "value", splitNumber: 4, axisLabel: {formatter: "{value}%", fontSize: 10}, splitLine: {lineStyle: {color: "#e6ebef"}}},
      yAxis: {type: "category", inverse: true, axisLine: {show: false, onZero: false}, axisTick: {show: false}, axisLabel: {interval: 0, fontSize: 11}, data: movers.map(r => {
        const title = materialTitle(r.material).title.replace(/\s*\([^)]*\)/g, "").trim();
        return shortChartLabel(title);
      })},
      series: [{type: "bar", barMaxWidth: 15, data: movers.map(r => ({value: r.change, itemStyle: {color: movements[r.status].color, borderRadius: 2}, label: {show: true, position: r.change < 0 ? "left" : "right", formatter: percentText(r.change), fontSize: 10, color: movements[r.status].color}}))}],
    }}/> : <p className="md-empty">ไม่มีวัสดุที่ราคาขึ้นหรือลงในกลุ่มนี้</p>}
  </section>;
}

const preferredIds = ["MAT-0401020203000000", "MAT-0101010107200000"];
export function Trend({data, rows, dates}: {data: ChartData; rows: MarketRow[]; dates: string[]}) {
  const pickerId = useId();
  const eligible = useMemo(() => new Set(rows.map(r => r.material.id)), [rows]);
  const defaults = preferredIds.filter(id => eligible.has(id));
  const [picked, setPicked] = useState<string[]>(() => defaults.length ? defaults : rows.slice(0, 1).map(r => r.material.id));
  if (dates.length < 2) return <section className="md-panel"><h2>แนวโน้มราคาย้อนหลัง</h2><p className="md-empty">เลือกช่วงเวลาอย่างน้อย 2 เดือนในตัวกรอง</p></section>;
  const materials = picked.flatMap(id => rows.find(r => r.material.id === id)?.material ?? []);
  const index = materials.length > 1;
  const end = dates[dates.length - 1];
  const comparable = materials.filter(m => data.materials[m.id]?.unit === m.unit);
  const comparison = index && comparable.length === materials.length ? comparisonSeries(data, picked, dates.length, end) : null;
  const plottedDates = index ? comparison?.points.map(p => String(p.date)) ?? [] : dates;
  const lines = materials.map((m, i) => {
    const points = data.materials[m.id]?.unit === m.unit ? data.materials[m.id].points : [];
    const values = index ? comparison?.points.map(p => p[m.id] as number | null) ?? [] : calendarSeries(points, end, dates.length).map(p => p.actual);
    return {id: m.id, name: m.id, type: "line" as const, data: values, symbolSize: 7, connectNulls: false, itemStyle: {color: palette[i]}};
  });
  const hasValues = lines.some(line => line.data.some(n => n !== null));
  return <section className="md-panel"><div className="md-section-head"><h2>แนวโน้มราคาย้อนหลัง</h2><span>{monthLabel(dates[0])} – {monthLabel(end)}</span></div>
    <label className="md-picker-label" htmlFor={pickerId}>เลือกวัสดุสำหรับกราฟ (สูงสุด 5 รายการ)</label>
    <div className="md-trend-tools"><ComparisonMaterialPicker id={pickerId} eligible={eligible} selected={picked} onPick={m => setPicked(ids => [...ids, m.id])}/>
      <ul className="md-tags">{materials.map((m, i) => <li key={m.id}><i style={{background: palette[i]}}/><a href={"#m/" + m.id}>{materialTitle(m).title}</a><button aria-label={"นำออก " + m.name} onClick={() => setPicked(ids => ids.filter(id => id !== m.id))}><X size={14}/></button></li>)}</ul></div>
    {picked.length >= 5 && <p className="md-caption">นำวัสดุออกจากกราฟก่อน เพื่อเลือกวัสดุใหม่</p>}
    {hasValues ? <><p className="md-caption">{index && comparison?.base ? "ดัชนีราคา · " + monthLabel(comparison.base) + " = 100" : "ราคาจริง · บาท/" + materials[0]?.unit}</p>
      <Chart height={310} label="กราฟเส้นแนวโน้มราคาจริงย้อนหลัง" onHit={hit => {if (picked.includes(hit.seriesId)) detail(hit.seriesId);}} option={{
        grid: {left: 56, right: 20, top: 43, bottom: 68},
        legend: {type: "scroll", top: 0, formatter: id => shortChartLabel(materialTitle(materials.find(m => m.id === id)!).title)},
        tooltip: {...tooltip, trigger: "item", formatter: p => {
          const hit = Array.isArray(p) ? p[0] : p;
          const m = materials[hit.seriesIndex ?? 0], month = plottedDates[hit.dataIndex];
          return priceTooltip(marketRow(data, m, month), month);
        }},
        xAxis: {type: "category", data: plottedDates.map(monthLabel), boundaryGap: false},
        yAxis: {type: "value", scale: true, splitLine: {lineStyle: {color: "#e6ebef"}}},
        dataZoom: [{type: "inside", zoomOnMouseWheel: "ctrl"}, {type: "slider", height: 20, bottom: 8, brushSelect: false}],
        series: lines,
      }}/></> : <p className="md-empty">{!materials.length ? "เลือกวัสดุเพื่อดูราคาย้อนหลัง" : index ? "วัสดุที่เลือกไม่มีเดือนฐานร่วมกันในช่วงนี้" : "ไม่มีราคาจริงในช่วงที่เลือก"}</p>}
  </section>;
}
