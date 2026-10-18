import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ClipboardList, Download, Printer, Search, Trash2 } from "lucide-react";
import { QtyStepper } from "@/components/site/qty-stepper";
import { DemoStamp } from "@/components/ui/price-widgets";
import { formatBaht, formatPrice } from "@/services/priceService";
import type { EstimateLine } from "@/types";

const CONTINGENCY = [0, 3, 5, 10];
const VAT_RATE = 0.07;

export default function Estimate({ lines, setLines }: { lines: EstimateLine[]; setLines: Dispatch<SetStateAction<EstimateLine[]>> }) {
  const [contingency, setContingency] = useState(0);
  const [vat, setVat] = useState(true);

  const totals = useMemo(() => {
    const sum = (pick: (l: EstimateLine) => number) => lines.reduce((s, l) => s + pick(l) * l.qty, 0);
    const factor = 1 + contingency / 100;
    const build = (base: number) => { const sub = base * factor; const tax = vat ? sub * VAT_RATE : 0; return { base, cont: sub - base, vat: tax, total: sub + tax }; };
    return { expected: build(sum(l => l.price)), low: build(sum(l => l.low)), high: build(sum(l => l.high)) };
  }, [lines, contingency, vat]);

  const setQty = (key: string, qty: number) => setLines(prev => prev.map(l => (l.key === key ? { ...l, qty } : l)));
  const remove = (key: string) => setLines(prev => prev.filter(l => l.key !== key));
  const clearAll = () => { if (window.confirm("ล้างรายการทั้งหมดในใบประมาณราคา?")) setLines([]); };
  const anyDemo = lines.some(l => l.demo);
  const hasRange = Math.round(totals.low.total) !== Math.round(totals.high.total);

  const exportCsv = () => {
    const head = ["วัสดุ", "รหัส", "ซื้อเมื่อ", "จำนวน", "หน่วย", "ราคาต่อหน่วย (บาท)", "รวม (บาท)"];
    const rows: (string | number)[][] = lines.map(l => [l.name, l.materialId, l.monthLabel, l.qty, l.unit, l.price, (l.price * l.qty).toFixed(2)]);
    rows.push([], ["รวมค่าวัสดุ", "", "", "", "", "", totals.expected.base.toFixed(2)], [`เงินสำรอง ${contingency}%`, "", "", "", "", "", totals.expected.cont.toFixed(2)], [vat ? "ภาษีมูลค่าเพิ่ม 7%" : "ไม่รวมภาษีมูลค่าเพิ่ม", "", "", "", "", "", totals.expected.vat.toFixed(2)], ["รวมทั้งสิ้น", "", "", "", "", "", totals.expected.total.toFixed(2)]);
    if (anyDemo) rows.push([], ["หมายเหตุ: คำนวณจากข้อมูลตัวอย่าง ยังไม่ใช่ราคาจริง"]);
    const csv = "﻿" + [head, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "ใบประมาณราคาวัสดุ-THAI-TAY.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (!lines.length) {
    return (
      <div className="page estimate-page">
        <header className="page-head"><h1>ใบประมาณราคา</h1></header>
        <div className="empty-state big">
          <span className="empty-icon"><ClipboardList size={36} strokeWidth={1.6} aria-hidden="true" /></span>
          <h2>ยังไม่มีรายการ</h2>
          <p>ค้นหาวัสดุ เลือกว่าจะซื้อเมื่อไหร่ ใส่จำนวน แล้วกด “เพิ่มลงใบประมาณราคา” รายการจะมารวมยอดที่นี่</p>
          <a className="btn btn-primary btn-lg" href="#search"><Search size={18} aria-hidden="true" />ค้นหาวัสดุ</a>
        </div>
      </div>
    );
  }

  return (
    <div className="page estimate-page">
      <header className="page-head">
        <h1>ใบประมาณราคา</h1>
        <p>{lines.length} รายการ · รวมทั้งสิ้น <strong className="num">฿{formatBaht(totals.expected.total)}</strong> · ปรับจำนวนแล้วยอดคำนวณใหม่ทันที</p>
      </header>

      <div className="estimate-grid">
        <ul className="line-list" aria-label="รายการวัสดุ">
          {lines.map(l => (
            <li className="line" key={l.key}>
              <div className="line-copy">
                <a href={`#m/${l.materialId}`}>{l.name}</a>
                <small>{l.month === 0 ? "ราคาล่าสุด" : `ราคาคาดการณ์ ${l.monthLabel}`} · ฿{formatPrice(l.price)} ต่อ {l.unit}</small>
              </div>
              <div className="line-qty">
                <QtyStepper size="sm" label={`จำนวน ${l.name} (${l.unit})`} value={l.qty} onChange={qty => setQty(l.key, qty)} />
                <span>{l.unit}</span>
              </div>
              <strong className="line-total num">฿{formatBaht(l.price * l.qty)}</strong>
              <button type="button" className="line-remove" aria-label={`ลบ ${l.name}`} onClick={() => remove(l.key)}><Trash2 size={18} aria-hidden="true" /></button>
            </li>
          ))}
        </ul>

        <aside className="panel summary" aria-labelledby="summary-title">
          <div className="summary-top"><h2 id="summary-title">สรุปยอด</h2>{anyDemo && <DemoStamp />}</div>
          <fieldset className="contingency">
            <legend>เงินสำรองเผื่อราคาผันผวน</legend>
            <div className="seg">
              {CONTINGENCY.map(c => (
                <label key={c}><input type="radio" name="contingency" checked={contingency === c} onChange={() => setContingency(c)} /><span>{c}%</span></label>
              ))}
            </div>
          </fieldset>
          <label className="vat-toggle"><input type="checkbox" checked={vat} onChange={event => setVat(event.target.checked)} /><span>รวมภาษีมูลค่าเพิ่ม 7%</span></label>

          <dl className="sum">
            <div><dt>รวมค่าวัสดุ</dt><dd className="num">{formatBaht(totals.expected.base)}</dd></div>
            {contingency > 0 && <div><dt>เงินสำรอง {contingency}%</dt><dd className="num">{formatBaht(totals.expected.cont)}</dd></div>}
            {vat && <div><dt>ภาษีมูลค่าเพิ่ม 7%</dt><dd className="num">{formatBaht(totals.expected.vat)}</dd></div>}
          </dl>
          <div className="grand">
            <span>รวมทั้งสิ้น</span>
            <strong className="num">฿{formatBaht(totals.expected.total)}</strong>
            {hasRange && <small>ช่วงที่เป็นไปได้ ฿{formatBaht(totals.low.total, 0)} – {formatBaht(totals.high.total, 0)}</small>}
          </div>
          {anyDemo && <p className="fine warn">คำนวณจากข้อมูลตัวอย่าง ยังไม่ควรนำไปยื่นราคาจริง</p>}
          <div className="summary-actions">
            <button type="button" className="btn btn-secondary" onClick={exportCsv}><Download size={17} aria-hidden="true" />ดาวน์โหลด CSV</button>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()}><Printer size={17} aria-hidden="true" />พิมพ์</button>
          </div>
          <button type="button" className="btn btn-ghost btn-block" onClick={clearAll}>ล้างทั้งหมด</button>
        </aside>
      </div>
    </div>
  );
}
