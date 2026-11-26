import type { EstimateLine, EstimateMeta } from "@/types";
import type { EstimateTotals } from "@/lib/estimateTotals";
import { titleOf, whenOf } from "@/lib/estimateLabels";
import { formatBaht } from "@/services/priceService";

/** หน้ากระดาษตอนพิมพ์ / บันทึก PDF: หน้าตาเป็นใบเสนอราคา ไม่มีปุ่มและเมนู (บนจอซ่อนไว้) */
export function PrintSheet({
  lines,
  meta,
  totals,
  date,
  anyDemo,
  hasRange,
}: {
  lines: EstimateLine[];
  meta: EstimateMeta;
  totals: EstimateTotals;
  date: string;
  anyDemo: boolean;
  hasRange: boolean;
}) {
  const row = (label: string, value: number, className = "") => (
    <tr className={className}>
      <td colSpan={6}>{label}</td>
      <td className="r num">{formatBaht(value)}</td>
    </tr>
  );
  return (
    <section className="print-sheet">
      <header className="ps-head">
        <div className="ps-brand">
          <strong>THAI TAY</strong>
          <span>CONSTRUCT</span>
        </div>
        <div className="ps-title">
          <h2>ใบประมาณราคาวัสดุ</h2>
          <p>วันที่ {date}</p>
          {anyDemo && <p className="ps-stamp">ข้อมูลตัวอย่าง ไม่ใช่ราคาจริง</p>}
        </div>
      </header>
      {(meta.project || meta.customer) && (
        <dl className="ps-meta">
          {meta.project && (
            <div>
              <dt>โครงการ</dt>
              <dd>{meta.project}</dd>
            </div>
          )}
          {meta.customer && (
            <div>
              <dt>ลูกค้า</dt>
              <dd>{meta.customer}</dd>
            </div>
          )}
        </dl>
      )}
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>รายการ</th>
            <th>ราคาที่ใช้</th>
            <th className="r">จำนวน</th>
            <th>หน่วย</th>
            <th className="r">ราคา/หน่วย</th>
            <th className="r">รวม (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.key}>
              <td>{i + 1}</td>
              <td>
                <strong>{titleOf(l)}</strong>
                {titleOf(l) !== l.name && <small>{l.name}</small>}
              </td>
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
          {meta.contingency > 0 &&
            row(`เงินสำรองเผื่อราคาผันผวน ${meta.contingency}%`, totals.expected.cont)}
          {meta.vat && row("ภาษีมูลค่าเพิ่ม 7%", totals.expected.vat)}
          {row("รวมทั้งสิ้น", totals.expected.total, "ps-grand")}
        </tfoot>
      </table>
      {hasRange && (
        <p className="ps-range">
          ช่วงที่เป็นไปได้ของยอดรวม: {formatBaht(totals.low.total, 0)} –{" "}
          {formatBaht(totals.high.total, 0)} บาท (ราคาคาดการณ์มีช่วงต่ำ–สูง)
        </p>
      )}
      <p className="ps-note">
        ราคาประกอบการวางแผน ไม่ใช่ใบเสนอราคาจากผู้ขาย
        {anyDemo ? " · คำนวณจากข้อมูลตัวอย่าง ยังไม่ใช่ราคาจริง" : ""} · จัดทำด้วย THAI TAY
      </p>
    </section>
  );
}
