import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { calendarSeries, monthLabel, shiftMonth, useChartData } from "@/lib/chartData";
import { formatPrice, isDemoData, type Quote } from "@/services/priceService";
import { CHART } from "@/config/chartColors";
import type { Material } from "@/types";

export default function MaterialHistoryChart({material, quote}: {material: Material; quote: Quote | null}) {
  const {data: snapshot, error} = useChartData();
  const [months, setMonths] = useState(12);
  const [showForecast, setShowForecast] = useState(true);
  const history = snapshot?.materials[material.id];
  const hist = snapshot && history ? calendarSeries(history.points, snapshot.asOf, months) : [];
  const last = hist.at(-1);
  const sameOrigin = snapshot && history?.unit === material.unit && quote?.latest.date === snapshot.asOf && quote.latest.price === last?.actual;
  const fc = showForecast && sameOrigin ? quote.forecast.filter(p => p.date > snapshot.asOf) : [];
  const lookup = new Map((history?.points ?? []).map(p => [p.date, p.price]));
  const points: {date: string; label: string; actual: number | null; predicted?: number; band?: number[]; change?: number | null}[] = hist.map((p, i) => {const previous = lookup.get(shiftMonth(p.date, -1)); return {...p, change: p.actual != null && previous != null ? (p.actual / previous - 1) * 100 : null, ...(i === hist.length - 1 && p.actual != null && fc.length ? {predicted: p.actual, band: [p.actual, p.actual]} : {})};});
  points.push(...fc.map(p => ({date: p.date, label: monthLabel(p.date), actual: null, predicted: p.price, band: [p.low, p.high]})));
  return <section className="panel chart-panel" aria-labelledby="chart-title">
    <div className="chart-toolbar"><h2 id="chart-title">ราคาย้อนหลังรายวัสดุ</h2><label>ช่วงเวลา<select aria-label="ช่วงเวลาราคาย้อนหลัง" value={months} onChange={e => setMonths(Number(e.target.value))}>{[6, 12, 24].map(n => <option key={n} value={n}>{n} เดือน</option>)}</select></label></div>
    <p className="chart-note">{snapshot ? `ข้อมูลถึง ${monthLabel(snapshot.asOf)} · บาท/${material.unit}` : "กำลังโหลดข้อมูล…"}</p>
    <label className="forecast-toggle"><input type="checkbox" checked={showForecast} onChange={e => setShowForecast(e.target.checked)} />แสดงราคาคาดการณ์เดิม 3 เดือน (เส้นประ)</label>
    {isDemoData ? <p>โหมดตัวอย่างไม่แสดงกราฟราคาจริง</p> : error ? <p role="alert">โหลดกราฟไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</p> : !snapshot ? <p role="status">กำลังโหลดกราฟ…</p> : !history ? <p>ไม่มีข้อมูลราคาจริงของวัสดุนี้</p> : <>
      <div className="chart-legend" aria-hidden="true"><span><i className="lg-actual" />ราคาจริง</span>{fc.length > 0 && <><span><i className="lg-pred" />คาดการณ์เดิม</span><span><i className="lg-band" />ช่วงจากระบบเดิม</span></>}</div>
      <div className="chart-box" role="img" aria-label={`กราฟราคาจริง ${months} เดือน หน่วยบาทต่อ${material.unit}${fc.length ? " พร้อมคาดการณ์เดิม 3 เดือน" : ""}`}><ResponsiveContainer width="100%" height="100%"><ComposedChart data={points} margin={{top: 12, right: 16, left: 0, bottom: 0}}>
        <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tick={{fill: CHART.tick, fontSize: 11}} minTickGap={22} /><YAxis domain={["auto", "auto"]} width={64} tick={{fill: CHART.tick, fontSize: 11}} tickFormatter={v => v.toLocaleString("th-TH")} />
        <Tooltip wrapperStyle={CHART.tooltipWrapper} contentStyle={CHART.tooltip} formatter={(v: number | number[], name: string) => Array.isArray(v) ? [`฿${formatPrice(v[0])}–${formatPrice(v[1])}`, "ช่วงคาดการณ์เดิม"] : [`฿${formatPrice(v)} / ${material.unit}`, name === "actual" ? "ราคาจริง" : "ราคาคาดการณ์เดิม"]} />
        {fc.length > 0 && <ReferenceLine x={monthLabel(snapshot.asOf)} stroke={CHART.tick} strokeDasharray="4 4" />}
        <Area dataKey="band" stroke="none" fill={CHART.band} fillOpacity={.2} connectNulls={false} isAnimationActive={false} /><Line dataKey="actual" stroke={CHART.measured} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} /><Line dataKey="predicted" stroke={CHART.forecast} strokeDasharray="6 5" strokeWidth={2.5} dot={{r: 3}} connectNulls={false} isAnimationActive={false} />
      </ComposedChart></ResponsiveContainer></div>
      <p className="chart-note">เดือนที่ไม่มีราคาจริงเว้นว่าง ไม่เติมค่าหรือลากเส้นข้าม{fc.length ? " · พื้นสีส้มเป็นช่วงคาดการณ์เดิม ไม่ใช่ราคาที่เกิดขึ้นจริง" : ""}</p>
      {showForecast && quote && !sameOrigin && <p className="chart-note">ไม่ต่อเส้นคาดการณ์ เพราะเดือนหรือราคาตั้งต้นไม่ตรงกับชุดประวัติกราฟ</p>}
      <details className="chart-table"><summary>ดูราคาและเปอร์เซ็นต์เปลี่ยนแปลงรายเดือน</summary><div className="table-scroll"><table><thead><tr><th>เดือน</th><th>ราคาจริง (บาท/{material.unit})</th><th>เปลี่ยนจากเดือนก่อน</th><th>คาดการณ์เดิม</th></tr></thead><tbody>{points.map(p => <tr key={p.date}><td>{p.label}</td><td>{p.actual == null ? "ไม่มีข้อมูล" : formatPrice(p.actual)}</td><td>{p.change == null ? "—" : `${p.change > 0 ? "+" : ""}${p.change.toFixed(2)}%`}</td><td>{p.predicted != null && p.date > snapshot.asOf ? formatPrice(p.predicted) : "—"}</td></tr>)}</tbody></table></div></details>
      <span className="sr-only">เดือนก่อนเดือนข้อมูลล่าสุดคือ {monthLabel(shiftMonth(snapshot.asOf, -1))}</span>
    </>}
  </section>;
}
