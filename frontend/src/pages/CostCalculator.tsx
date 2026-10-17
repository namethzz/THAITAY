import { useEffect, useMemo, useState } from "react";
import { Calculator, Download, Minus, Plus, Printer, Trash2, TrendingUp } from "lucide-react";
import { getMaterialById, materialCatalog } from "@/data.js";
import MaterialPicker from "@/components/MaterialPicker.jsx";
import { PageHeading } from "@/components/ui/scope-layout";
import { Button } from "@/components/ui/button";
import { DemoBanner, SourceLinks } from "@/components/ui/price-widgets";
import { formatBaht, getForecast, getHistory, monthsLabel } from "@/services/priceService";
import type { EstimateLine, SelectionProps } from "@/types";

const WHEN = [0, 1, 2, 3];
const CONTINGENCY = [0, 3, 5, 10];
const VAT_RATE = 0.07;

interface Quote { price: number; low: number; high: number; demo: boolean }

export default function CostCalculator({ selectedId, onSelect, lines, setLines }: SelectionProps & { lines: EstimateLine[]; setLines: (fn: (prev: EstimateLine[]) => EstimateLine[]) => void }) {
  const material = getMaterialById(selectedId)!;
  const [month, setMonth] = useState(3);
  const [qtyText, setQtyText] = useState("10");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [contingency, setContingency] = useState(0);
  const [vat, setVat] = useState(true);

  const qty = Math.max(0, Number(qtyText.replace(/,/g, "")) || 0);

  useEffect(() => {
    let alive = true;
    setLoading(true); setFailed(false);
    const load = month === 0
      ? getHistory(material, 1).then(s => { const p = s.points.at(-1)!.price; return { price: p, low: p, high: p, demo: s.demo }; })
      : getForecast(material, 3).then(s => { const p = s.points.find(x => x.month === month)!; return { price: p.price, low: p.low, high: p.high, demo: s.demo }; });
    load.then(q => alive && (setQuote(q), setLoading(false))).catch(() => alive && (setFailed(true), setLoading(false)));
    return () => { alive = false; };
  }, [material.id, month]);

  const add = () => {
    if (!quote || qty <= 0) return;
    setLines(prev => [...prev, { key: `${material.id}-${month}-${Date.now()}`, materialId: material.id, name: material.name, unit: material.unit, month, monthLabel: monthsLabel(month), qty, ...quote }]);
  };

  const totals = useMemo(() => {
    const sum = (pick: (l: EstimateLine) => number) => lines.reduce((s, l) => s + pick(l) * l.qty, 0);
    const factor = 1 + contingency / 100;
    const build = (base: number) => { const sub = base * factor; const v = vat ? sub * VAT_RATE : 0; return { base, cont: base * (factor - 1), vat: v, total: sub + v }; };
    return { expected: build(sum(l => l.price)), low: build(sum(l => l.low)), high: build(sum(l => l.high)) };
  }, [lines, contingency, vat]);

  const updateQty = (key: string, q: number) => setLines(prev => prev.map(l => l.key === key ? { ...l, qty: Math.max(0, q) } : l));
  const remove = (key: string) => setLines(prev => prev.filter(l => l.key !== key));
  const anyDemo = lines.some(l => l.demo) || quote?.demo;

  const exportCsv = () => {
    const head = ["วัสดุ", "รหัส", "ช่วงเวลา", "จำนวน", "หน่วย", "ราคาต่อหน่วย (บาท)", "รวม (บาท)"];
    const rows = lines.map(l => [l.name, l.materialId, l.monthLabel, l.qty, l.unit, l.price, (l.price * l.qty).toFixed(2)]);
    rows.push([], ["รวมก่อนสำรอง/ภาษี", "", "", "", "", "", totals.expected.base.toFixed(2)], [`สำรองเผื่อความผันผวน ${contingency}%`, "", "", "", "", "", totals.expected.cont.toFixed(2)], [vat ? "ภาษีมูลค่าเพิ่ม 7%" : "ไม่รวมภาษีมูลค่าเพิ่ม", "", "", "", "", "", totals.expected.vat.toFixed(2)], ["รวมทั้งสิ้น", "", "", "", "", "", totals.expected.total.toFixed(2)]);
    const csv = "\ufeff" + [head, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "ประมาณราคาวัสดุ.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  const lineTotal = quote ? quote.price * qty : 0;

  return <div className="scope-page cost-page">
    <PageHeading title="คำนวณต้นทุนวัสดุ">เลือกวัสดุ เลือกว่าจะซื้อเมื่อไหร่ ใส่จำนวน — ระบบใช้ราคาคาดการณ์ของช่วงนั้นมาคำนวณให้ ใช้ประกอบการยื่นใบเสนอราคาล่วงหน้าได้</PageHeading>
    <DemoBanner />

    <div className="cost-grid">
      <section className="card scope-panel cost-builder" aria-label="ตัวคำนวณ">
        <ol className="cost-steps">
          <li>
            <div className="step-head"><span className="step-no">1</span><h2>เลือกวัสดุ</h2></div>
            <MaterialPicker materials={materialCatalog} value={selectedId} onChange={onSelect} label="วัสดุที่จะสั่งซื้อ" />
          </li>
          <li>
            <div className="step-head"><span className="step-no">2</span><h2>จะสั่งซื้อเมื่อไหร่</h2></div>
            <div className="when-grid" role="radiogroup" aria-label="ช่วงเวลาสั่งซื้อ">
              {WHEN.map(m => (
                <button type="button" key={m} role="radio" aria-checked={month === m} className={`when-option ${month === m ? "active" : ""}`} onClick={() => setMonth(m)}>
                  <strong>{m === 0 ? "วันนี้" : `อีก ${m} เดือน`}</strong>
                  <small>{m === 0 ? "ราคาปัจจุบัน" : "ราคาคาดการณ์"}</small>
                </button>
              ))}
            </div>
          </li>
          <li>
            <div className="step-head"><span className="step-no">3</span><h2>ต้องการกี่{material.unit}</h2></div>
            <div className="qty-row">
              <button type="button" className="qty-step" aria-label="ลดจำนวน" onClick={() => setQtyText(String(Math.max(0, qty - 1)))}><Minus size={16} /></button>
              <label className="qty-field"><input inputMode="decimal" aria-label={`จำนวน (${material.unit})`} value={qtyText} onChange={e => setQtyText(e.target.value.replace(/[^\d.,]/g, ""))} /><span>{material.unit}</span></label>
              <button type="button" className="qty-step" aria-label="เพิ่มจำนวน" onClick={() => setQtyText(String(qty + 1))}><Plus size={16} /></button>
            </div>
            <div className="qty-chips">{[1, 10, 50, 100, 500].map(n => <button type="button" key={n} onClick={() => setQtyText(String(n))} className={qty === n ? "active" : ""}>{n.toLocaleString("th-TH")}</button>)}</div>
          </li>
        </ol>

        <div className="result-panel" aria-live="polite" aria-busy={loading}>
          <div className="result-unit">
            <span><TrendingUp size={14} /> ราคาต่อ 1 {material.unit} · {monthsLabel(month)}</span>
            <strong className="num">{quote && !loading ? formatBaht(quote.price) : "—"}<small>บาท</small></strong>
            {quote && month > 0 && !loading && <em>ช่วงที่เป็นไปได้ {formatBaht(quote.low)} – {formatBaht(quote.high)} บาท</em>}
            {failed && <em className="inline-error">โหลดราคาไม่สำเร็จ ลองใหม่อีกครั้ง</em>}
          </div>
          <div className="result-total">
            <span>{qty.toLocaleString("th-TH")} {material.unit} รวมประมาณ</span>
            <strong className="num">{quote && !loading ? formatBaht(lineTotal) : "—"}<small>บาท</small></strong>
            {quote && month > 0 && !loading && <em>{formatBaht(quote.low * qty, 0)} – {formatBaht(quote.high * qty, 0)} บาท</em>}
          </div>
        </div>
        <Button size="lg" className="add-line-btn" onClick={add} disabled={!quote || loading || qty <= 0}><Plus size={17} className="mr-2" />เพิ่มลงใบประมาณราคา</Button>
        <p className="hint">เพิ่มวัสดุได้หลายรายการ แต่ละรายการเลือกช่วงเวลาสั่งซื้อต่างกันได้</p>
      </section>

      <section className="card scope-panel estimate" aria-label="ใบประมาณราคา">
        <div className="scope-panel-title"><h2>ใบประมาณราคา</h2><span className="subtle-tag">{lines.length} รายการ</span></div>
        {!lines.length ? (
          <div className="estimate-empty"><Calculator size={30} strokeWidth={1.4} /><h3>ยังไม่มีรายการ</h3><p>เลือกวัสดุ ช่วงเวลา และจำนวนในขั้นตอน 1–3 แล้วกด “เพิ่มลงใบประมาณราคา”</p></div>
        ) : (
          <>
            <ul className="estimate-lines">
              {lines.map(l => (
                <li key={l.key}>
                  <div className="el-main"><strong>{l.name}</strong><small>{l.monthLabel} · {formatBaht(l.price)} บาท / {l.unit}</small></div>
                  <label className="el-qty"><input inputMode="decimal" aria-label={`จำนวน ${l.name}`} value={l.qty} onChange={e => updateQty(l.key, Number(e.target.value.replace(/[^\d.]/g, "")) || 0)} /><span>{l.unit}</span></label>
                  <b className="el-total">{formatBaht(l.price * l.qty)}</b>
                  <button type="button" className="el-remove" aria-label={`ลบ ${l.name}`} onClick={() => remove(l.key)}><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>

            <div className="adjust">
              <div><span>สำรองเผื่อราคาผันผวน</span><div className="chip-row">{CONTINGENCY.map(c => <button type="button" key={c} className={contingency === c ? "active" : ""} onClick={() => setContingency(c)}>{c}%</button>)}</div></div>
              <label className="vat-toggle"><input type="checkbox" checked={vat} onChange={e => setVat(e.target.checked)} /><span>รวมภาษีมูลค่าเพิ่ม 7%</span></label>
            </div>

            <dl className="sum">
              <div><dt>รวมค่าวัสดุ</dt><dd>{formatBaht(totals.expected.base)}</dd></div>
              {contingency > 0 && <div><dt>สำรอง {contingency}%</dt><dd>{formatBaht(totals.expected.cont)}</dd></div>}
              {vat && <div><dt>ภาษีมูลค่าเพิ่ม 7%</dt><dd>{formatBaht(totals.expected.vat)}</dd></div>}
              <div className="grand"><dt>รวมทั้งสิ้น (บาท)</dt><dd>{formatBaht(totals.expected.total)}</dd></div>
              <div className="range"><dt>ช่วงที่เป็นไปได้</dt><dd>{formatBaht(totals.low.total, 0)} – {formatBaht(totals.high.total, 0)}</dd></div>
            </dl>
            {anyDemo && <p className="hint warn">ตัวเลขนี้คำนวณจากข้อมูลตัวอย่าง ยังไม่ควรนำไปยื่นราคาจริง</p>}
            <div className="estimate-actions">
              <Button variant="outline" onClick={exportCsv}><Download size={15} className="mr-2" />ดาวน์โหลด CSV</Button>
              <Button variant="outline" onClick={() => window.print()}><Printer size={15} className="mr-2" />พิมพ์</Button>
              <Button variant="ghost" onClick={() => setLines(() => [])}>ล้างทั้งหมด</Button>
            </div>
          </>
        )}
      </section>
    </div>
    <SourceLinks compact />
  </div>;
}
