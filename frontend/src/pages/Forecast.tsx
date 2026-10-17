import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, Calculator } from "lucide-react";
import { getMaterialById, materialCatalog } from "@/data.js";
import MaterialPicker from "@/components/MaterialPicker.jsx";
import { PageHeading } from "@/components/ui/scope-layout";
import { Button } from "@/components/ui/button";
import { DemoBanner, SourceLinks, useForecast, useHistory } from "@/components/ui/price-widgets";
import { formatBaht, type Horizon } from "@/services/priceService";
import { CHART } from "@/config/chartColors";
import type { Navigate, SelectionProps } from "@/types";

const MEASURED = CHART.measured;
const FORECAST = CHART.forecast;

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
    <PageHeading title="พยากรณ์ราคา 1–3 เดือน">ราคาคาดการณ์ต่อหน่วยของวัสดุที่เลือก พร้อมช่วงต่ำ–สูงที่เป็นไปได้ ช่วงจะกว้างขึ้นเมื่อมองไกลขึ้น</PageHeading>
    <DemoBanner />
    <MaterialPicker materials={materialCatalog} value={selectedId} onChange={onSelect} label="วัสดุที่ต้องการพยากรณ์" />

    <div className="horizon-grid" role="radiogroup" aria-label="ช่วงพยากรณ์ที่แสดงในกราฟ">
      {fc.map(point => {
        const change = now ? ((point.price - now) / now) * 100 : null;
        return (
          <button type="button" role="radio" aria-checked={point.month === horizon} className={`horizon-card tag-panel ${point.month === horizon ? "active" : ""}`} key={point.month} onClick={() => setHorizon(point.month)}>
            <span className="horizon-top"><strong>ล่วงหน้า {point.month} เดือน</strong><span>{point.label}</span></span>
            <span className="prediction-value"><span className="num">{formatBaht(point.price)}</span><small>บาท / {material.unit}</small></span>
            <span className="range-note">ช่วงที่เป็นไปได้ {formatBaht(point.low)} – {formatBaht(point.high)}</span>
            {change !== null && <span className={`delta-chip ${change >= 0 ? "up" : "down"}`}>{change >= 0 ? "แพงขึ้น" : "ถูกลง"} {Math.abs(change).toFixed(2)}% จากราคาล่าสุด</span>}
          </button>
        );
      })}
      {!fc.length && [1, 2, 3].map(m => <div className="horizon-card tag-panel" key={m}><span className="horizon-top"><strong>ล่วงหน้า {m} เดือน</strong></span><span className="prediction-value"><span className="num">—</span></span></div>)}
    </div>

    <section className="card scope-panel">
      <div className="scope-panel-title">
        <h2>ราคาจริง 3 เดือนล่าสุด และราคาคาดการณ์ถึง {horizon} เดือน</h2>
        <div className="chart-legend"><span><i className="lg-actual" />ราคาจริง</span><span><i className="lg-pred" />ราคาคาดการณ์</span><span><i className="lg-band" />ช่วงที่เป็นไปได้</span></div>
      </div>
      <div className="chart-box" aria-busy={forecast.loading || history.loading}>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chart} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: CHART.axis }} />
            <YAxis tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={64} tickFormatter={(v: number) => v.toLocaleString("th-TH")} />
            <Tooltip formatter={(v: number | number[], name: string) => Array.isArray(v) ? [`${formatBaht(v[0])} – ${formatBaht(v[1])}`, "ช่วงที่เป็นไปได้"] : [`${formatBaht(v)} บาท / ${material.unit}`, name === "actual" ? "ราคาจริง" : "ราคาคาดการณ์"]} contentStyle={CHART.tooltip} />
            <Area dataKey="band" stroke="none" fill={FORECAST} fillOpacity={0.16} isAnimationActive={false} />
            <Line dataKey="actual" stroke={MEASURED} strokeWidth={2.5} dot={{ r: 3.5, fill: MEASURED }} connectNulls isAnimationActive={false} />
            <Line dataKey="predicted" stroke={FORECAST} strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 4, fill: "#fcfbf8", stroke: FORECAST, strokeWidth: 2 }} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="hint">กดป้ายด้านบนเพื่อเลือกว่าจะดูราคาคาดการณ์ไกลแค่ไหนในกราฟ</p>
      <div className="forecast-cta">
        <p>ต้องการนำราคาคาดการณ์ไปทำใบประมาณราคา?</p>
        <Button onClick={() => navigate("cost")}><Calculator size={16} className="mr-2" />นำไปคำนวณต้นทุน<ArrowRight size={14} className="ml-2" /></Button>
      </div>
    </section>
    <SourceLinks />
  </div>;
}
