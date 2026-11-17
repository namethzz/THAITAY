import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { costBreakdown, shortChartLabel } from "@/lib/chartData";
import { materialTitle } from "@/lib/materialTitle";
import { getMaterialById } from "@/data.js";
import { formatBaht } from "@/services/priceService";
import { CHART } from "@/config/chartColors";
import type { EstimateLine } from "@/types";

export default function CostBreakdown({lines}: {lines: EstimateLine[]}) {
  const breakdown = useMemo(() => costBreakdown(lines), [lines]);
  const items = breakdown.items.map(r => {const m = getMaterialById(r.id); return {...r, title: m ? materialTitle(m).title : r.name, short: shortChartLabel(m ? materialTitle(m).title : r.name)};});
  return <section className="panel cost-breakdown" aria-labelledby="breakdown-title">
    <h2 id="breakdown-title">ต้นทุนแยกตามวัสดุ</h2><p className="chart-note">ราคา × จำนวน รวมค่าวัสดุ ฿{formatBaht(breakdown.total)} · ไม่รวม VAT และเงินสำรอง</p>
    {breakdown.total <= 0 ? <p>เพิ่มจำนวนวัสดุเพื่อดูสัดส่วนต้นทุน</p> : <>
      <div style={{height: Math.max(180, items.length * 46 + 45)}} role="img" aria-label={`ต้นทุนวัสดุ ${items.length} กลุ่ม รวม ${formatBaht(breakdown.total)} บาท`}><ResponsiveContainer width="100%" height="100%"><BarChart data={items} layout="vertical" margin={{top: 10, right: 20, bottom: 4, left: 0}}>
        <CartesianGrid stroke={CHART.grid} horizontal={false} /><XAxis type="number" tick={{fontSize: 11, fill: CHART.tick}} tickFormatter={v => v.toLocaleString("th-TH")} /><YAxis type="category" dataKey="short" width={145} tick={{fontSize: 10, fill: CHART.tick}} tickLine={false} /><Tooltip wrapperStyle={CHART.tooltipWrapper} labelFormatter={(_, p) => p?.[0]?.payload.title ?? ""} formatter={(v: number) => [`฿${formatBaht(v)}`, "ต้นทุนวัสดุ"]} contentStyle={CHART.tooltip} /><Bar dataKey="value" fill={CHART.forecast} radius={4} isAnimationActive={false} />
      </BarChart></ResponsiveContainer></div>
      <ul className="cost-shares">{items.map(item => <li key={item.id}><span>{item.title}</span><strong>฿{formatBaht(item.value)}</strong><small>{item.share.toFixed(1)}%</small></li>)}</ul>
    </>}
  </section>;
}
