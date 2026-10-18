import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Plus } from "lucide-react";
import { getMaterialById } from "@/data.js";
import { MaterialSearch } from "@/components/site/material-search";
import { PriceCard } from "@/components/site/price-card";
import { QtyStepper } from "@/components/site/qty-stepper";
import { DemoNote, SourceLinks, useHistory, useQuote } from "@/components/ui/price-widgets";
import { formatBaht, formatMoney, formatPrice, monthsLabel, type Quote } from "@/services/priceService";
import { CHART } from "@/config/chartColors";
import { materialTitle } from "@/lib/materialTitle";
import { pricePerBar, rebarSpec } from "@/lib/rebar";
import { CategoryIcon } from "@/components/site/category-icon";
import type { AddLine, Go, Material } from "@/types";

export default function MaterialPage({ id, go, addLine, watch, onToggleWatch }: { id: string; go: Go; addLine: AddLine; watch: string[]; onToggleWatch: (id: string) => void }) {
  const material = getMaterialById(id)!;
  const quote = useQuote(material);
  const { title, detail } = materialTitle(material);

  return (
    <div className="page material-page">
      <div className="material-bar">
        <a className="back-link" href="#search"><ArrowLeft size={18} aria-hidden="true" />ค้นหาวัสดุอื่น</a>
        <MaterialSearch size="compact" label="ค้นหาวัสดุอื่น" onPick={m => go({ page: "material", id: m.id })} onShowAll={q => go({ page: "search", q, cat: "all" })} />
      </div>

      <header className="material-head">
        <CategoryIcon code={material.categoryCode} size={72} className="material-icon" />
        <div>
          <span className="cat-pill">{material.category}</span>
          <h1>{title}</h1>
          {detail && <p className="material-fullname">{detail}</p>}
          <p>ราคาต่อ {material.unit} · รหัสสินค้า {material.id.replace(/^MAT-/, "")}</p>
        </div>
      </header>

      <div className="material-grid">
        <div className="material-summary"><PriceCard material={material} variant="detail" watched={watch.includes(material.id)} onToggleWatch={() => onToggleWatch(material.id)} /></div>
        <CostBox material={material} quote={quote.data} addLine={addLine} />
        <PriceChart material={material} quote={quote.data} />
      </div>

      <section className="material-sources" aria-labelledby="sources-title">
        <h2 id="sources-title">ที่มาของราคา</h2>
        <SourceLinks />
        <DemoNote />
      </section>
    </div>
  );
}

/** คำนวณต้นทุน: เลือกว่าจะซื้อเมื่อไหร่ ใส่จำนวน แล้วเพิ่มลงใบประมาณราคา */
function CostBox({ material, quote, addLine }: { material: Material; quote: Quote | null; addLine: AddLine }) {
  const [month, setMonth] = useState(0);
  const [qty, setQty] = useState(1);
  // เหล็กเส้นสั่งเป็นเส้นได้: ราคาต่อเส้นคิดจากน้ำหนักมาตรฐานของขนาดนั้น (ค่าเริ่มต้นเป็นเส้น เพราะหน้างานนับแบบนี้)
  const bar = rebarSpec(material);
  const [byBar, setByBar] = useState(Boolean(bar));
  const perUnit = (price: number) => (bar && byBar ? pricePerBar(price, bar) : price);
  const unit = bar && byBar ? "เส้น" : material.unit;
  // ราคาของแต่ละช่วงแสดงอยู่ในการ์ดราคาแล้ว ที่นี่จึงเลือกแค่ "เมื่อไหร่" แล้วบอกราคาที่ใช้คำนวณบรรทัดเดียว
  const options = quote
    ? [{ month: 0, label: "ตอนนี้", when: quote.latest.label, price: quote.latest.price, low: quote.latest.price, high: quote.latest.price }, ...quote.forecast.map(p => ({ month: p.month, label: `${p.month} เดือน`, when: p.label, price: p.price, low: p.low, high: p.high }))]
    : [];
  const chosen = options.find(o => o.month === month);

  const add = () => {
    if (!chosen || !quote || qty <= 0) return;
    addLine({ materialId: material.id, name: material.name, unit, month, monthLabel: monthsLabel(month), qty, price: perUnit(chosen.price), low: perUnit(chosen.low), high: perUnit(chosen.high), demo: quote.demo });
  };

  return (
    <section className="panel cost-box" aria-labelledby="cost-title">
      <h2 id="cost-title">คำนวณต้นทุน</h2>
      <fieldset className="when">
        <legend>จะซื้อเมื่อไหร่</legend>
        <div className="seg">
          {options.map(o => (
            <label key={o.month}>
              <input type="radio" name="when" value={o.month} checked={month === o.month} onChange={() => setMonth(o.month)} />
              <span>{o.label}</span>
            </label>
          ))}
        </div>
        {chosen && <p className="when-price">ใช้ราคา{month === 0 ? "ล่าสุด" : "คาดการณ์"} {chosen.when} · <strong className="num">฿{formatPrice(perUnit(chosen.price))}</strong> ต่อ {unit}</p>}
      </fieldset>

      {bar && (
        <fieldset className="when">
          <legend>สั่งเป็น</legend>
          <div className="seg seg-2">
            <label><input type="radio" name="by" checked={byBar} onChange={() => setByBar(true)} /><span>เส้น ({bar.length} ม.)</span></label>
            <label><input type="radio" name="by" checked={!byBar} onChange={() => setByBar(false)} /><span>ตัน</span></label>
          </div>
        </fieldset>
      )}

      <div className="qty">
        <label htmlFor="qty-input">จำนวน ({unit})</label>
        <QtyStepper id="qty-input" label="จำนวน" value={qty} onChange={setQty} />
        {bar && byBar && qty > 0 && <p className="qty-note">{qty.toLocaleString("th-TH")} เส้น × {bar.kgPerBar.toLocaleString("th-TH")} กก. ≈ {((qty * bar.kgPerBar) / 1000).toLocaleString("th-TH", { maximumFractionDigits: 3 })} ตัน</p>}
      </div>

      <div className="cost-total" aria-live="polite">
        <span>รวมประมาณ</span>
        <strong className="num">{chosen ? `฿${formatMoney(perUnit(chosen.price) * qty)}` : "—"}</strong>
        {chosen && month > 0 && qty > 0 && <small>ช่วงที่เป็นไปได้ ฿{formatBaht(perUnit(chosen.low) * qty, 0)} – {formatBaht(perUnit(chosen.high) * qty, 0)}</small>}
      </div>
      <button type="button" className="btn btn-primary btn-block btn-lg" onClick={add} disabled={!chosen || qty <= 0}>
        <Plus size={18} aria-hidden="true" />เพิ่มลงใบประมาณราคา
      </button>
      <p className="fine">เพิ่มได้หลายรายการ แล้วไปดูยอดรวมที่ “ใบประมาณราคา”</p>
    </section>
  );
}

/** กราฟเดียว: ราคาจริง 12 เดือนล่าสุด ต่อด้วยราคาคาดการณ์ 3 เดือนพร้อมช่วงต่ำ–สูง */
function PriceChart({ material, quote }: { material: Material; quote: Quote | null }) {
  const history = useHistory(material, 12);
  const hist = history.data?.points ?? [];
  const fc = quote?.forecast ?? [];
  const data = [
    ...hist.map((p, i) => ({ label: p.label, actual: p.price, ...(i === hist.length - 1 && fc.length ? { predicted: p.price, band: [p.price, p.price] } : {}) })),
    ...(hist.length ? fc.map(p => ({ label: p.label, predicted: p.price, band: [p.low, p.high] })) : []),
  ];

  return (
    <section className="panel chart-panel" aria-labelledby="chart-title">
      <h2 id="chart-title">ราคาย้อนหลัง 12 เดือน และคาดการณ์ 3 เดือน</h2>
      <div className="chart-legend" aria-hidden="true">
        <span><i className="lg-actual" />ราคาจริง</span>
        <span><i className="lg-pred" />ราคาคาดการณ์</span>
        <span><i className="lg-band" />ช่วงที่เป็นไปได้</span>
      </div>
      <div className="chart-box" aria-busy={history.loading} role="img" aria-label={hist.length && fc.length ? `ราคาจริงล่าสุด ${formatPrice(hist.at(-1)!.price)} บาท คาดการณ์อีก 3 เดือน ${formatPrice(fc.at(-1)!.price)} บาท ต่อ ${material.unit}` : "กำลังโหลดกราฟราคา"}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={{ stroke: CHART.axis }} interval="preserveStartEnd" minTickGap={18} />
            <YAxis tick={{ fill: CHART.tick, fontSize: 12 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} width={58} tickFormatter={(v: number) => v.toLocaleString("th-TH")} />
            <Tooltip
              formatter={(v: number | number[], name: string) => Array.isArray(v) ? [`${formatPrice(v[0])} – ${formatPrice(v[1])}`, "ช่วงที่เป็นไปได้"] : [`฿${formatPrice(v)} ต่อ ${material.unit}`, name === "actual" ? "ราคาจริง" : "ราคาคาดการณ์"]}
              contentStyle={CHART.tooltip}
            />
            <Area dataKey="band" stroke="none" fill={CHART.band} fillOpacity={0.2} isAnimationActive={false} />
            <Line dataKey="actual" stroke={CHART.measured} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
            <Line dataKey="predicted" stroke={CHART.forecast} strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3.5, fill: "#fff", stroke: CHART.forecast, strokeWidth: 2 }} connectNulls isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
