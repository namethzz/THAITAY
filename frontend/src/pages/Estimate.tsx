import { useMemo, type Dispatch, type SetStateAction } from "react";
import { ClipboardList, Download, Link2, Printer, Search, Send, Trash2 } from "lucide-react";
import { QtyStepper } from "@/components/site/qty-stepper";
import { CategoryIcon } from "@/components/site/category-icon";
import type { ToastMessage } from "@/components/site/chrome";
import { DemoStamp } from "@/components/ui/price-widgets";
import { formatBaht, formatPrice } from "@/services/priceService";
import { getMaterialById } from "@/data.js";
import { materialTitle } from "@/lib/materialTitle";
import { decodeEstimate, encodeEstimate, shareUrl } from "@/lib/shareEstimate";
import type { EstimateLine, EstimateMeta, Go } from "@/types";

const CONTINGENCY = [0, 3, 5, 10];
const VAT_RATE = 0.07;
const titleOf = (line: EstimateLine) => { const material = getMaterialById(line.materialId); return material ? materialTitle(material).title : line.name; };
const categoryOf = (line: EstimateLine) => getMaterialById(line.materialId)?.categoryCode ?? "STR-01";
const whenOf = (line: EstimateLine) => (line.month === 0 ? "ราคาล่าสุด" : `คาดการณ์ ${line.monthLabel}`);
const thaiDate = (iso?: string) => (iso ? new Date(`${iso}T00:00:00`) : new Date()).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });

function useTotals(lines: EstimateLine[], meta: EstimateMeta) {
  return useMemo(() => {
    const sum = (pick: (l: EstimateLine) => number) => lines.reduce((s, l) => s + pick(l) * l.qty, 0);
    const factor = 1 + meta.contingency / 100;
    const build = (base: number) => { const sub = base * factor; const tax = meta.vat ? sub * VAT_RATE : 0; return { base, cont: sub - base, vat: tax, total: sub + tax }; };
    return { expected: build(sum(l => l.price)), low: build(sum(l => l.low)), high: build(sum(l => l.high)) };
  }, [lines, meta.contingency, meta.vat]);
}
type Totals = ReturnType<typeof useTotals>;

interface Props {
  /** ใบประมาณที่ส่งมาทางลิงก์ (อ่านอย่างเดียว) */
  shared?: string;
  lines: EstimateLine[];
  setLines: Dispatch<SetStateAction<EstimateLine[]>>;
  meta: EstimateMeta;
  setMeta: Dispatch<SetStateAction<EstimateMeta>>;
  go: Go;
  notify: (message: ToastMessage) => void;
}

export default function Estimate({ shared, lines: myLines, setLines, meta: myMeta, setMeta, go, notify }: Props) {
  const received = useMemo(() => (shared ? decodeEstimate(shared) : null), [shared]);
  const readOnly = Boolean(shared);
  const lines = received ? received.lines : myLines;
  const meta = received ? received.meta : myMeta;
  const totals = useTotals(lines, meta);
  const anyDemo = lines.some(l => l.demo);
  const hasRange = Math.round(totals.low.total) !== Math.round(totals.high.total);

  const setField = (patch: Partial<EstimateMeta>) => setMeta(prev => ({ ...prev, ...patch }));
  const setQty = (key: string, qty: number) => setLines(prev => prev.map(l => (l.key === key ? { ...l, qty } : l)));
  const remove = (key: string) => setLines(prev => prev.filter(l => l.key !== key));
  const clearAll = () => { if (window.confirm("ล้างรายการทั้งหมดในใบประมาณราคา?")) setLines([]); };

  const link = () => shareUrl(encodeEstimate(meta, lines));
  const lineText = () => `ใบประมาณราคาวัสดุ${meta.project.trim() ? ` ${meta.project.trim()}` : ""} (THAI TAY)\n${link()}`;
  const copyLink = () => {
    const url = link();
    const done = () => notify({ id: Date.now(), text: "คัดลอกลิงก์แล้ว", detail: "วางในแชต LINE หรืออีเมลได้เลย คนเปิดจะเห็นรายการและราคาเดียวกัน" });
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(done, () => window.prompt("คัดลอกลิงก์นี้", url));
    else window.prompt("คัดลอกลิงก์นี้", url);
  };
  const keepShared = () => {
    if (!received) return;
    if (myLines.length && !window.confirm(`แทนที่ใบประมาณเดิมของคุณ (${myLines.length} รายการ) ด้วยใบนี้?`)) return;
    setLines(received.lines.map((l, i) => ({ ...l, key: `${l.materialId}-${l.month}-${Date.now()}-${i}` })));
    setMeta(received.meta);
    go({ page: "estimate" });
    notify({ id: Date.now(), text: "บันทึกเป็นใบประมาณของคุณแล้ว", detail: "แก้จำนวนหรือเพิ่มรายการต่อได้" });
  };

  const exportCsv = () => {
    const head = ["วัสดุ", "ชื่อเต็ม", "รหัส", "ซื้อเมื่อ", "จำนวน", "หน่วย", "ราคาต่อหน่วย (บาท)", "รวม (บาท)"];
    const top: (string | number)[][] = [["ใบประมาณราคาวัสดุ THAI TAY"], ["โครงการ", meta.project], ["ลูกค้า", meta.customer], ["วันที่", thaiDate(received?.date)], []];
    const rows: (string | number)[][] = lines.map(l => [titleOf(l), l.name, l.materialId, whenOf(l), l.qty, l.unit, l.price, (l.price * l.qty).toFixed(2)]);
    const total = (label: string, value: number) => [label, "", "", "", "", "", "", value.toFixed(2)];
    rows.push([], total("รวมค่าวัสดุ", totals.expected.base), total(`เงินสำรอง ${meta.contingency}%`, totals.expected.cont), total(meta.vat ? "ภาษีมูลค่าเพิ่ม 7%" : "ไม่รวมภาษีมูลค่าเพิ่ม", totals.expected.vat), total("รวมทั้งสิ้น", totals.expected.total));
    if (anyDemo) rows.push([], ["หมายเหตุ: คำนวณจากข้อมูลตัวอย่าง ยังไม่ใช่ราคาจริง"]);
    const csv = "﻿" + [...top, head, ...rows].map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `ใบประมาณราคา-${meta.project.trim() || "THAI-TAY"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (shared && !received) {
    return (
      <div className="page estimate-page">
        <header className="page-head"><h1>ใบประมาณราคา</h1></header>
        <div className="empty-state big">
          <span className="empty-icon"><Link2 size={34} strokeWidth={1.6} aria-hidden="true" /></span>
          <h2>เปิดลิงก์นี้ไม่ได้</h2>
          <p>ลิงก์ใบประมาณราคาไม่ครบหรือถูกตัดระหว่างส่ง ลองขอลิงก์ใหม่จากคนส่งอีกครั้ง</p>
          <a className="btn btn-primary btn-lg" href="#estimate">ไปใบประมาณของฉัน</a>
        </div>
      </div>
    );
  }

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
      <div className="estimate-screen">
        <header className="page-head">
          <h1>{readOnly && meta.project ? meta.project : "ใบประมาณราคา"}</h1>
          <p>
            {readOnly && meta.customer ? `ลูกค้า ${meta.customer} · ` : ""}{lines.length} รายการ · รวมทั้งสิ้น <strong className="num">฿{formatBaht(totals.expected.total)}</strong>
            {readOnly ? "" : " · ปรับจำนวนแล้วยอดคำนวณใหม่ทันที"}
          </p>
        </header>

        {received && (
          <div className="shared-banner" role="note">
            <div>
              <strong>ใบประมาณราคาที่ส่งมา · ราคา ณ {thaiDate(received.date)}</strong>
              <p>ตัวเลขเป็นราคา ณ วันที่ส่ง ไม่เปลี่ยนตามราคาล่าสุด ใบประมาณของคุณเองไม่ถูกแตะ</p>
            </div>
            <div className="shared-actions">
              <button type="button" className="btn btn-primary" onClick={keepShared}>บันทึกเป็นใบของฉัน</button>
              <a className="btn btn-ghost" href="#estimate">ไปใบของฉัน</a>
            </div>
          </div>
        )}

        {!readOnly && (
          <div className="estimate-meta">
            <label>
              <span>ชื่อโครงการ</span>
              <input value={myMeta.project} maxLength={120} placeholder="เช่น บ้านคุณสมชาย ต่อเติมครัว" onChange={event => setField({ project: event.target.value })} />
            </label>
            <label>
              <span>ลูกค้า <small>(ไม่ใส่ก็ได้)</small></span>
              <input value={myMeta.customer} maxLength={120} placeholder="ชื่อลูกค้าหรือบริษัท" onChange={event => setField({ customer: event.target.value })} />
            </label>
          </div>
        )}

        <div className="estimate-grid">
          <ul className="line-list" aria-label="รายการวัสดุ">
            {lines.map(l => (
              <li className={`line ${readOnly ? "line-readonly" : ""}`} key={l.key}>
                <CategoryIcon code={categoryOf(l)} size={36} className="row-icon line-icon" />
                <div className="line-copy">
                  <a href={`#m/${l.materialId}`}>{titleOf(l)}</a>
                  <small>{whenOf(l)} · ฿{formatPrice(l.price)} ต่อ {l.unit}</small>
                </div>
                <div className="line-qty">
                  {readOnly
                    ? <span className="num line-qty-text">{l.qty.toLocaleString("th-TH")}</span>
                    : <QtyStepper size="sm" label={`จำนวน ${titleOf(l)} (${l.unit})`} value={l.qty} onChange={qty => setQty(l.key, qty)} />}
                  <span>{l.unit}</span>
                </div>
                <strong className="line-total num">฿{formatBaht(l.price * l.qty)}</strong>
                {!readOnly && <button type="button" className="line-remove" aria-label={`ลบ ${titleOf(l)}`} onClick={() => remove(l.key)}><Trash2 size={18} aria-hidden="true" /></button>}
              </li>
            ))}
          </ul>

          <aside className="panel summary" aria-labelledby="summary-title">
            <div className="summary-top"><h2 id="summary-title">สรุปยอด</h2>{anyDemo && <DemoStamp />}</div>
            {!readOnly && (
              <>
                <fieldset className="contingency">
                  <legend>เงินสำรองเผื่อราคาผันผวน</legend>
                  <div className="seg">
                    {CONTINGENCY.map(c => (
                      <label key={c}><input type="radio" name="contingency" checked={myMeta.contingency === c} onChange={() => setField({ contingency: c })} /><span>{c}%</span></label>
                    ))}
                  </div>
                </fieldset>
                <label className="vat-toggle"><input type="checkbox" checked={myMeta.vat} onChange={event => setField({ vat: event.target.checked })} /><span>รวมภาษีมูลค่าเพิ่ม 7%</span></label>
              </>
            )}

            <dl className="sum">
              <div><dt>รวมค่าวัสดุ</dt><dd className="num">{formatBaht(totals.expected.base)}</dd></div>
              {meta.contingency > 0 && <div><dt>เงินสำรอง {meta.contingency}%</dt><dd className="num">{formatBaht(totals.expected.cont)}</dd></div>}
              {meta.vat && <div><dt>ภาษีมูลค่าเพิ่ม 7%</dt><dd className="num">{formatBaht(totals.expected.vat)}</dd></div>}
            </dl>
            <div className="grand">
              <span>รวมทั้งสิ้น</span>
              <strong className="num">฿{formatBaht(totals.expected.total)}</strong>
              {hasRange && <small>ช่วงที่เป็นไปได้ ฿{formatBaht(totals.low.total, 0)} – {formatBaht(totals.high.total, 0)}</small>}
            </div>
            {anyDemo && <p className="fine warn">คำนวณจากข้อมูลตัวอย่าง ยังไม่ควรนำไปยื่นราคาจริง</p>}

            <div className="summary-actions">
              {!readOnly && (
                <>
                  <a className="btn btn-secondary" href={`https://line.me/R/share?text=${encodeURIComponent(lineText())}`} target="_blank" rel="noopener noreferrer"><Send size={17} aria-hidden="true" />ส่งทาง LINE<span className="sr-only"> (เปิดในแท็บใหม่)</span></a>
                  <button type="button" className="btn btn-secondary" onClick={copyLink}><Link2 size={17} aria-hidden="true" />คัดลอกลิงก์</button>
                </>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}><Printer size={17} aria-hidden="true" />พิมพ์ / PDF</button>
              <button type="button" className="btn btn-secondary" onClick={exportCsv}><Download size={17} aria-hidden="true" />CSV</button>
            </div>
            {!readOnly && <button type="button" className="btn btn-ghost btn-block" onClick={clearAll}>ล้างทั้งหมด</button>}
          </aside>
        </div>
      </div>

      <PrintSheet lines={lines} meta={meta} totals={totals} date={thaiDate(received?.date)} anyDemo={anyDemo} hasRange={hasRange} />
    </div>
  );
}

/** หน้ากระดาษตอนพิมพ์ / บันทึก PDF: หน้าตาเป็นใบเสนอราคา ไม่มีปุ่มและเมนู (บนจอซ่อนไว้) */
function PrintSheet({ lines, meta, totals, date, anyDemo, hasRange }: { lines: EstimateLine[]; meta: EstimateMeta; totals: Totals; date: string; anyDemo: boolean; hasRange: boolean }) {
  const row = (label: string, value: number, className = "") => (
    <tr className={className}><td colSpan={6}>{label}</td><td className="r num">{formatBaht(value)}</td></tr>
  );
  return (
    <section className="print-sheet">
      <header className="ps-head">
        <div className="ps-brand"><strong>THAI TAY</strong><span>CONSTRUCT</span></div>
        <div className="ps-title"><h2>ใบประมาณราคาวัสดุ</h2><p>วันที่ {date}</p></div>
      </header>
      {(meta.project || meta.customer) && (
        <dl className="ps-meta">
          {meta.project && <div><dt>โครงการ</dt><dd>{meta.project}</dd></div>}
          {meta.customer && <div><dt>ลูกค้า</dt><dd>{meta.customer}</dd></div>}
        </dl>
      )}
      <table>
        <thead>
          <tr><th>#</th><th>รายการ</th><th>ราคาที่ใช้</th><th className="r">จำนวน</th><th>หน่วย</th><th className="r">ราคา/หน่วย</th><th className="r">รวม (บาท)</th></tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.key}>
              <td>{i + 1}</td>
              <td><strong>{titleOf(l)}</strong>{titleOf(l) !== l.name && <small>{l.name}</small>}</td>
              <td>{whenOf(l)}</td>
              <td className="r num">{l.qty.toLocaleString("th-TH")}</td>
              <td>{l.unit}</td>
              <td className="r num">{formatBaht(l.price)}</td>
              <td className="r num">{formatBaht(l.price * l.qty)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {row("รวมค่าวัสดุ", totals.expected.base)}
          {meta.contingency > 0 && row(`เงินสำรองเผื่อราคาผันผวน ${meta.contingency}%`, totals.expected.cont)}
          {meta.vat && row("ภาษีมูลค่าเพิ่ม 7%", totals.expected.vat)}
          {row("รวมทั้งสิ้น", totals.expected.total, "ps-grand")}
        </tfoot>
      </table>
      {hasRange && <p className="ps-range">ช่วงที่เป็นไปได้ของยอดรวม: {formatBaht(totals.low.total, 0)} – {formatBaht(totals.high.total, 0)} บาท (ราคาคาดการณ์มีช่วงต่ำ–สูง)</p>}
      <p className="ps-note">ราคาประกอบการวางแผน ไม่ใช่ใบเสนอราคาจากผู้ขาย{anyDemo ? " · คำนวณจากข้อมูลตัวอย่าง ยังไม่ใช่ราคาจริง" : ""} · จัดทำด้วย THAI TAY</p>
    </section>
  );
}
