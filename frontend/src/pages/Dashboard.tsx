import { useMemo, useState, type CSSProperties } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarDays, CircleDashed, Minus, RotateCcw, SlidersHorizontal } from "lucide-react";
import { materialCatalog, materialCategories } from "@/data.js";
import { monthLabel, shiftMonth, marketRow, useChartData, type ChartData, type Movement } from "@/lib/chartData";
import { movements, statuses } from "@/lib/marketDisplay";
import { isDemoData } from "@/services/priceService";
import { Distribution, Movers, Trend } from "@/components/site/market-charts";
import { MarketTable } from "@/components/site/market-table";
import { PRIMARY_SOURCE } from "@/config/sources";
import "@/styles/dashboard.css";

const icons = {up: ArrowUpRight, down: ArrowDownRight, steady: Minus, missing: CircleDashed};
type StatusFilter = "all" | Movement;

function MonthSelect({label, months, value, onChange}: {label: string; months: string[]; value: string; onChange: (v: string) => void}) {
  return <label>{label}<select value={value} onChange={e => onChange(e.target.value)}>{months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>;
}

function MarketDashboard({data}: {data: ChartData}) {
  const months = useMemo(() => {
    const result = [];
    for (let date = data.firstMonth; date <= data.asOf; date = shiftMonth(date, 1)) result.push(date);
    return result;
  }, [data]);
  const initialStart = months[Math.max(0, months.length - 12)];
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [month, setMonth] = useState(data.asOf);
  const [start, setStart] = useState(initialStart);
  const [end, setEnd] = useState(data.asOf);
  const rows = useMemo(() => materialCatalog.filter(m => category === "all" || m.categoryCode === category)
    .map(m => marketRow(data, m, month)), [data, category, month]);
  const filtered = useMemo(() => status === "all" ? rows : rows.filter(r => r.status === status), [rows, status]);
  const toggle = (s: Movement) => setStatus(current => current === s ? "all" : s);
  const [resetKey, setResetKey] = useState(0);
  const reset = () => {
    setCategory("all"); setStatus("all"); setMonth(data.asOf); setStart(initialStart); setEnd(data.asOf);
    setResetKey(key => key + 1);
  };
  const filterKey = [category, status, month, resetKey].join("/");
  const previous = monthLabel(shiftMonth(month, -1));
  return <div className="md-wrap">
    <header className="md-hero">
      <div><h1>ภาพรวมราคา</h1><p>ราคาวัสดุก่อสร้างรายเดือน · กรุงเทพฯ (ส่วนกลาง)</p></div>
      <div className="md-source"><CalendarDays size={19}/><div><small>ข้อมูลล่าสุดจาก สนค.</small><strong>{monthLabel(data.asOf)}</strong></div></div>
    </header>
    <div className="md-content">
      <section className="md-panel md-filters"><div className="md-section-head"><h2><SlidersHorizontal size={17}/> ตัวกรอง</h2><button className="md-reset" onClick={reset}><RotateCcw size={14}/>ล้างตัวกรอง</button></div>
        <div className="md-fields"><label>หมวดวัสดุ<select value={category} onChange={e => setCategory(e.target.value)}><option value="all">ทุกหมวดวัสดุ</option>{materialCategories.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}</select></label>
          <MonthSelect label="เดือนอ้างอิง" months={months.slice(1).reverse()} value={month} onChange={setMonth}/>
          <MonthSelect label="กราฟเส้น ตั้งแต่" months={months} value={start} onChange={setStart}/>
          <MonthSelect label="กราฟเส้น ถึง" months={months} value={end} onChange={setEnd}/>
        </div>
        {start >= end && <p className="md-range-error" role="status">กรุณาเลือกเดือน “ถึง” ให้หลังเดือน “ตั้งแต่” เพื่อดูแนวโน้มราคา</p>}
      </section>
      <div className="md-summary-head"><h2>การเคลื่อนไหวของราคา</h2><span>{monthLabel(month)} เทียบกับ {previous}</span></div>
      <div className="md-kpis">{statuses.map(s => {
        const count = rows.filter(r => r.status === s).length, share = rows.length ? count / rows.length * 100 : 0;
        const Icon = icons[s];
        return <button key={s} className="md-kpi" aria-pressed={s === status} onClick={() => toggle(s)} style={{"--tone": movements[s].color} as CSSProperties}>
          <div><span className="md-kpi-icon"><Icon size={19}/></span><span>{movements[s].label}</span></div>
          <div className="md-count"><strong>{count}</strong><small>รายการ</small></div>
          <div className="md-share"><span><i style={{width: share + "%"}}/></span><small>{share.toFixed(1)}%</small></div>
        </button>;
      })}</div>
      <div className="md-charts"><Distribution rows={filtered} onSelect={toggle}/><Movers rows={filtered} month={month}/></div>
      <Trend key={"trend/" + filterKey} rows={filtered} data={data} dates={months.filter(m => m >= start && m <= end)}/>
      <MarketTable key={"table/" + filterKey} rows={filtered} month={monthLabel(month)} previousMonth={previous}/>
      <p className="md-footnote">ข้อมูลไม่ครบเมื่อเทียบราคาจริงสองเดือนติดกันไม่ได้ · <a href={PRIMARY_SOURCE.url} target="_blank" rel="noreferrer">แหล่งข้อมูล สนค.</a></p>
    </div>
  </div>;
}
function ActualDashboard() {
  const {data, error} = useChartData();
  if (!data) return <div className="page-loading" role="status">{error ? "โหลดข้อมูลราคาจริงไม่สำเร็จ" : "กำลังโหลดราคาจริง…"}{error && <button className="md-reset" onClick={() => window.location.reload()}>ลองอีกครั้ง</button>}</div>;
  return <MarketDashboard data={data}/>;
}
export default function Dashboard() {
  return isDemoData ? <section className="page-loading"><h1>ภาพรวมราคา</h1><p>โหมดตัวอย่างไม่แสดงข้อมูลราคาจริง</p></section> : <ActualDashboard/>;
}
