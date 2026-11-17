import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { materialCatalog, materialCategories } from "@/data.js";
import { comparisonSeries, monthlyChanges, monthLabel, shiftMonth, shortChartLabel, useChartData } from "@/lib/chartData";
import { materialTitle } from "@/lib/materialTitle";
import { formatPrice, isDemoData } from "@/services/priceService";
import { CHART } from "@/config/chartColors";
import ComparisonMaterialPicker from "./comparison-material-picker";

const COLORS = ["#242a2d", "#a84b1a", "#235fa4", "#2f6f55", "#744f92"];
const defaults = ["MAT-0401020203000000", "MAT-0101010107200000"].filter(id => materialCatalog.some(m => m.id === id));
type Change = ReturnType<typeof monthlyChanges>[number];

function Ranking({rows, up}: {rows: Change[]; up: boolean}) {
  const data = rows.map(r => ({...r, name: materialTitle(r.material).title, short: shortChartLabel(materialTitle(r.material).title)}));
  return <div className="ranking-card">
    <h3>{up ? "ราคาขึ้นมากที่สุด" : "ราคาลงมากที่สุด"}</h3>
    {!data.length ? <p className="chart-empty">ไม่มีรายการที่ราคา{up ? "ขึ้น" : "ลง"}ในกลุ่มนี้</p> : <>
      <div className="ranking-plot" role="img" aria-label={`${up ? "ราคาขึ้น" : "ราคาลง"} ${data.length} รายการ เปรียบเทียบเป็นเปอร์เซ็นต์`}>
        <ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={data} margin={{top: 8, right: 20, bottom: 4, left: 0}}>
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" domain={up ? [0, "auto"] : ["auto", 0]} tick={{fontSize: 11, fill: CHART.tick}} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="short" width={140} tick={{fontSize: 10, fill: CHART.tick}} tickLine={false} />
          <Tooltip wrapperStyle={CHART.tooltipWrapper} labelFormatter={(_, payload) => payload?.[0]?.payload.name ?? ""} formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(2)}%`, "เปลี่ยนจากเดือนก่อน"]} contentStyle={CHART.tooltip} />
          <ReferenceLine x={0} stroke={CHART.tick} /><Bar dataKey="change" fill={up ? "#9e1b3c" : "#2f6f55"} radius={4} isAnimationActive={false} />
        </BarChart></ResponsiveContainer>
      </div>
      <details className="chart-table"><summary>ดูรายการและราคาจริง</summary><div className="table-scroll"><table>
        <thead><tr><th>วัสดุ / หน่วย</th><th>เดือนก่อน</th><th>เดือนล่าสุด</th><th>เปลี่ยนแปลง</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.material.id}><td><a href={`#m/${r.material.id}`}>{materialTitle(r.material).title}</a><small>{r.material.unit}</small></td><td>{formatPrice(r.previous)}</td><td>{formatPrice(r.latest)}</td><td>{r.change > 0 ? "+" : ""}{r.change.toFixed(2)}%</td></tr>)}</tbody>
      </table></div></details>
    </>}
  </div>;
}

export default function MarketCharts() {
  const {data, error} = useChartData();
  const [category, setCategory] = useState("all");
  const [months, setMonths] = useState(12);
  const [ids, setIds] = useState<string[]>(defaults);
  const changes = useMemo(() => data ? monthlyChanges(data, materialCatalog, category) : [], [data, category]);
  const comparison = useMemo(() => data ? comparisonSeries(data, ids, months) : {base: null, points: []}, [data, ids, months]);
  const eligible = materialCatalog.filter(m => category === "all" || m.categoryCode === category).length;
  const up = [...changes].filter(r => r.change > .000001).sort((a, b) => b.change - a.change);
  const down = [...changes].filter(r => r.change < -.000001).sort((a, b) => a.change - b.change);
  if (isDemoData) return <section className="market-section"><h2>ภาพรวมราคาจริง</h2><p>โหมดตัวอย่างไม่แสดงกราฟราคาจริง</p></section>;
  return <section className="market-section" aria-labelledby="market-title">
    <div className="section-head"><h2 id="market-title">ภาพรวมราคาจริง</h2><p>ดูการเปลี่ยนแปลงและเปรียบเทียบแนวโน้มจากข้อมูลที่มี</p></div>
    {!data ? <p role="status">{error ? "โหลดข้อมูลกราฟไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง" : "กำลังโหลดข้อมูลกราฟ…"}</p> : <>
      <div className="chart-toolbar"><p>ข้อมูลล่าสุด <strong>{monthLabel(data.asOf)}</strong> · เทียบกับ {monthLabel(shiftMonth(data.asOf, -1))}</p><label>หมวดวัสดุ<select aria-label="หมวดกราฟขึ้นลง" value={category} onChange={e => setCategory(e.target.value)}><option value="all">ทุกหมวด</option>{materialCategories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label></div>
      <dl className="market-stats"><div><dt>ราคาขึ้น</dt><dd>{up.length}<small> รายการ</small></dd></div><div><dt>ราคาลง</dt><dd>{down.length}<small> รายการ</small></dd></div><div><dt>ราคาเท่าเดิม</dt><dd>{changes.length - up.length - down.length}<small> รายการ</small></dd></div><div><dt>ข้อมูลสองเดือนไม่ครบ</dt><dd>{eligible - changes.length}<small> รายการ</small></dd></div></dl>
      <p className="chart-note">เปรียบเทียบได้ {changes.length}/{eligible} รายการ ใช้เฉพาะราคาจริงครบทั้งสองเดือน ไม่รวมข้อมูลขาด และไม่เฉลี่ยราคาต่างหน่วยเข้าด้วยกัน</p>
      <div className="ranking-grid"><Ranking rows={up.slice(0, 5)} up /><Ranking rows={down.slice(0, 5)} up={false} /></div>
      <section className="panel comparison-panel" aria-labelledby="comparison-title">
        <div className="chart-toolbar"><h3 id="comparison-title">เปรียบเทียบแนวโน้มวัสดุ</h3><label>ช่วงเวลา<select aria-label="ช่วงเวลาเปรียบเทียบ" value={months} onChange={e => setMonths(Number(e.target.value))}>{[6, 12, 24].map(n => <option key={n} value={n}>{n} เดือน</option>)}</select></label></div>
        <p className="chart-note">ปรับเดือนฐานร่วมกันเป็น 100 เพื่อเทียบแนวโน้มแม้หน่วยต่างกัน ตัวเลขบนกราฟเป็นดัชนี ไม่ใช่บาท</p>
        <ComparisonMaterialPicker selected={ids} onPick={material => setIds(prev => prev.length < 5 && !prev.includes(material.id) ? [...prev, material.id] : prev)} />
        <ul className="compare-tags">{ids.map((id, i) => <li key={id}><i style={{background: COLORS[i]}} /><span>{materialTitle(materialCatalog.find(m => m.id === id)!).title}</span><button type="button" aria-label={`นำ ${materialTitle(materialCatalog.find(m => m.id === id)!).title} ออกจากกราฟ`} onClick={() => setIds(prev => prev.filter(v => v !== id))}>×</button></li>)}</ul>
        {!comparison.base ? <p className="chart-empty">เลือกอย่างน้อย 2 รายการที่มีเดือนข้อมูลร่วมกันในช่วงที่เลือก</p> : <>
          <p className="chart-note">เดือนฐาน {monthLabel(comparison.base)} = 100 · ช่องที่ขาดข้อมูลเว้นว่าง ไม่ลากเส้นข้าม</p>
          <div className="comparison-plot" role="img" aria-label={`แนวโน้ม ${ids.length} วัสดุ เดือนฐาน ${monthLabel(comparison.base)} เท่ากับ 100`}><ResponsiveContainer width="100%" height="100%"><LineChart data={comparison.points} margin={{top: 12, right: 18, bottom: 4, left: 0}}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" /><XAxis dataKey="label" tick={{fontSize: 11, fill: CHART.tick}} minTickGap={24} /><YAxis domain={["auto", "auto"]} width={48} tick={{fontSize: 11, fill: CHART.tick}} /><ReferenceLine y={100} stroke={CHART.tick} strokeDasharray="4 4" />
            <Tooltip wrapperStyle={CHART.tooltipWrapper} contentStyle={CHART.tooltip} formatter={(v: number, name: string) => [v.toFixed(2), name]} />
            {ids.map((id, i) => <Line key={id} dataKey={id} name={materialTitle(materialCatalog.find(m => m.id === id)!).title} stroke={COLORS[i]} strokeDasharray={[undefined, "8 3", "3 3", "10 3 2 3", "2 5"][i]} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false} />)}
          </LineChart></ResponsiveContainer></div>
          <details className="chart-table"><summary>ดูข้อมูลเปรียบเทียบเป็นตาราง</summary><div className="table-scroll"><table><thead><tr><th>เดือน</th>{ids.map(id => <th key={id}>{materialTitle(materialCatalog.find(m => m.id === id)!).title}</th>)}</tr></thead><tbody>{comparison.points.map(row => <tr key={String(row.date)}><td>{row.label}</td>{ids.map(id => <td key={id}>{row[id] == null ? "ไม่มีข้อมูล" : Number(row[id]).toFixed(2)}</td>)}</tr>)}</tbody></table></div></details>
        </>}
      </section>
    </>}
  </section>;
}
