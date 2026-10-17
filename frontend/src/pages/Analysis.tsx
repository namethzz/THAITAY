import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { getMaterialById, materialCatalog } from "@/data.js";
import MaterialPicker from "@/components/MaterialPicker.jsx";
import { PageHeading } from "@/components/ui/scope-layout";
import { DemoBanner, RangeTabs, SourceLinks, useHistory } from "@/components/ui/price-widgets";
import { HISTORY_RANGES, formatBaht } from "@/services/priceService";
import type { SelectionProps } from "@/types";

export default function Analysis({ selectedId, onSelect }: SelectionProps) {
  const material = getMaterialById(selectedId)!;
  const [months, setMonths] = useState<number>(12);
  const { data, loading, error } = useHistory(material, months);
  const points = data?.points ?? [];
  const first = points[0]?.price;
  const last = points.at(-1)?.price;
  const pct = first && last ? ((last - first) / first) * 100 : 0;
  const prev = points.length > 1 ? points.at(-2)!.price : undefined;
  const momPct = prev && last ? ((last - prev) / prev) * 100 : 0;
  const rangeLabel = HISTORY_RANGES.find(r => r.months === months)?.label ?? `${months} เดือน`;
  const long = points.length > 24;
  const Trend = Math.abs(pct) < 0.05 ? Minus : pct > 0 ? ArrowUpRight : ArrowDownRight;
  const high = points.length ? Math.max(...points.map(p => p.price)) : undefined;
  const low = points.length ? Math.min(...points.map(p => p.price)) : undefined;

  return <div className="scope-page">
    <PageHeading title="วิเคราะห์การเปลี่ยนแปลงราคา">ดูว่าราคาวัสดุที่เลือกขยับอย่างไรย้อนหลังได้ตั้งแต่ 3 เดือนถึง 10 ปี</PageHeading>
    <DemoBanner />
    <section className="card scope-panel">
      <MaterialPicker materials={materialCatalog} value={selectedId} onChange={onSelect} label="วัสดุที่ต้องการวิเคราะห์" />
    </section>

    <section className="card scope-panel">
      <div className="scope-panel-title">
        <h2>ราคาย้อนหลัง {rangeLabel}</h2>
        <RangeTabs value={months} onChange={setMonths} />
      </div>
      {error && <p className="inline-error" role="alert">โหลดข้อมูลราคาไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>}
      <div className="scope-stats three analysis-stats">
        <article className="scope-stat"><span>ราคาล่าสุด</span><strong className="is-measured">{last ? formatBaht(last) : "—"}<small>บาท / {material.unit}</small></strong><p>{points.at(-1)?.label ?? "กำลังโหลด..."}</p></article>
        <article className="scope-stat"><span>เปลี่ยนแปลงใน {rangeLabel}</span><strong className={pct > 0.05 ? "trend-up" : pct < -0.05 ? "trend-down" : ""}><Trend size={22} className="trend-icon" />{pct > 0 ? "+" : ""}{pct.toFixed(2)}%</strong><p>{first && last ? `${last - first >= 0 ? "+" : ""}${formatBaht(last - first)} บาท / ${material.unit}` : "—"}</p></article>
        <article className="scope-stat"><span>เปลี่ยนแปลงจากเดือนก่อน</span><strong>{momPct > 0 ? "+" : ""}{momPct.toFixed(2)}%</strong><p>สูงสุด {high ? formatBaht(high) : "—"} · ต่ำสุด {low ? formatBaht(low) : "—"}</p></article>
      </div>
      <div className="chart-box" aria-busy={loading}>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={points} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <defs><linearGradient id="histFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#245594" stopOpacity={0.22} /><stop offset="100%" stopColor="#245594" stopOpacity={0.02} /></linearGradient></defs>
            <CartesianGrid stroke="#d3d9de" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" minTickGap={36} interval="preserveStartEnd" tick={{ fill: "#56687a", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#c8d0d6" }} />
            <YAxis tick={{ fill: "#56687a", fontSize: 12 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={64} tickFormatter={(v: number) => v.toLocaleString("th-TH")} />
            <Tooltip formatter={(v: number) => [`${formatBaht(v)} บาท / ${material.unit}`, "ราคา"]} contentStyle={{ borderRadius: 10, border: "1px solid #c8d0d6", background: "#fbfcfc", color: "#1b2c3e" }} />
            <Area type="monotone" dataKey="price" stroke="#245594" strokeWidth={2.5} fill="url(#histFill)" dot={long ? false : { r: 3.5, fill: "#245594" }} activeDot={{ r: 5 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
    <SourceLinks />
  </div>;
}
