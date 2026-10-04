import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Calculator } from "lucide-react";
import { getMaterialById, materialCatalog } from "@/data.js";
import MaterialPicker from "@/components/MaterialPicker.jsx";
import { MaterialDetails } from "@/components/ui/material-details";
import { PageHeading } from "@/components/ui/scope-layout";
import { Button } from "@/components/ui/button";
import { DemoBanner, MonthTabs, SourceLinks, useForecast, useHistory } from "@/components/ui/price-widgets";
import { formatBaht, type Horizon } from "@/services/priceService";
import type { Navigate, SelectionProps } from "@/types";

export default function Forecast({ selectedId, onSelect, navigate }: SelectionProps & { navigate: Navigate }) {
  const material = getMaterialById(selectedId)!;
  const [horizon, setHorizon] = useState<Horizon>(3);
  const forecast = useForecast(material);
  const history = useHistory(material, 3);
  const hist = history.data?.points ?? [];
  const fc = forecast.data?.points ?? [];
  const now = hist.at(-1)?.price;

  const chart = [
    ...hist.map((p, i) => ({ label: p.label, actual: p.price, ...(i === hist.length - 1 ? { predicted: p.price, band: [p.price, p.price] } : {}) })),
    ...fc.filter(p => p.month <= horizon).map(p => ({ label: p.label, predicted: p.price, band: [p.low, p.high] })),
  ];

  return <div className="scope-page">
    <PageHeading kicker="MATERIAL PRICE FORECAST" title="พยากรณ์ราคาวัสดุก่อสร้าง">คาดการณ์ราคาต่อหน่วยล่วงหน้า 1–3 เดือน พร้อมช่วงราคาที่เป็นไปได้</PageHeading>
    <DemoBanner />
    <section className="card scope-panel">
      <MaterialPicker materials={materialCatalog} value={selectedId} onChange={onSelect} label="วัสดุที่ต้องการพยากรณ์" />
      <MaterialDetails material={material} />
    </section>

    <div className="horizon-grid">
      {fc.map(point => (
        <article className={`horizon-card ${point.month === horizon ? "active" : ""}`} key={point.month} data-horizon={point.month}>
          <div className="horizon-top"><span>ล่วงหน้า {point.month} เดือน</span><span>{point.label}</span></div>
          <h2>ราคาคาดการณ์</h2>
          <strong className="prediction-value">{formatBaht(point.price)}<small>บาท / {material.unit}</small></strong>
          <span className="range-note">ช่วงที่เป็นไปได้ {formatBaht(point.low)} – {formatBaht(point.high)}</span>
          {now && <span className={`delta-chip ${point.price >= now ? "up" : "down"}`}>{point.price >= now ? "▲" : "▼"} {Math.abs(((point.price - now) / now) * 100).toFixed(2)}% จากราคาล่าสุด</span>}
        </article>
      ))}
      {!fc.length && [1, 2, 3].map(m => <article className="horizon-card" key={m}><div className="horizon-top"><span>ล่วงหน้า {m} เดือน</span></div><h2>ราคาคาดการณ์</h2><strong className="prediction-value">—</strong></article>)}
    </div>

    <section className="card scope-panel">
      <div className="scope-panel-title">
        <div><span className="section-kicker">FORECAST CHART</span><h2>ราคาจริง 3 เดือนล่าสุด และราคาคาดการณ์</h2></div>
        <MonthTabs value={horizon} onChange={setHorizon} label="ช่วงพยากรณ์ที่แสดง" prefix="ล่วงหน้า " />
      </div>
      <div className="chart-legend"><span><i className="lg-actual" />ราคาจริง</span><span><i className="lg-pred" />ราคาคาดการณ์</span><span><i className="lg-band" />ช่วงที่เป็นไปได้</span></div>
      <div className="chart-box" aria-busy={forecast.loading || history.loading}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chart} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#e8dcc8" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: "#85705e", fontSize: 12 }} tickLine={false} axisLine={{ stroke: "#e5d9c6" }} />
            <YAxis tick={{ fill: "#85705e", fontSize: 12 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={64} tickFormatter={(v: number) => v.toLocaleString("th-TH")} />
            <Tooltip formatter={(v: number | number[], name: string) => Array.isArray(v) ? [`${formatBaht(v[0])} – ${formatBaht(v[1])}`, "ช่วงที่เป็นไปได้"] : [`${formatBaht(v)} บาท / ${material.unit}`, name === "actual" ? "ราคาจริง" : "ราคาคาดการณ์"]} contentStyle={{ borderRadius: 10, border: "1px solid #e5d9c6", background: "#fffdf9" }} />
            <Area dataKey="band" stroke="none" fill="#d9c3a0" fillOpacity={0.45} isAnimationActive={false} />
            <Line dataKey="actual" stroke="#3a2a1d" strokeWidth={2.5} dot={{ r: 3.5, fill: "#3a2a1d" }} connectNulls />
            <Line dataKey="predicted" stroke="#b9743a" strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 4, fill: "#fffdf9", stroke: "#b9743a", strokeWidth: 2 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="forecast-cta">
        <p>ต้องการนำราคาคาดการณ์ไปทำใบเสนอราคา?</p>
        <Button onClick={() => navigate("cost")}><Calculator size={16} className="mr-2" />นำไปคำนวณต้นทุน<ArrowRight size={14} className="ml-2" /></Button>
      </div>
    </section>
    <SourceLinks />
  </div>;
}
