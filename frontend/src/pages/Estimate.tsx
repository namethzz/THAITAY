import { lazy, Suspense, useMemo, type Dispatch, type SetStateAction } from "react";
import { ClipboardList, Download, Link2, Printer, Search, Send, Trash2 } from "lucide-react";
import { QtyStepper } from "@/components/site/qty-stepper";
import { CategoryIcon } from "@/components/site/category-icon";
import type { ToastMessage } from "@/components/site/chrome";
import { DemoStamp } from "@/components/ui/price-widgets";
import { formatBaht, formatPrice } from "@/services/priceService";
import { getMaterialById } from "@/data.js";
import { PrintSheet } from "@/components/estimate/PrintSheet";
import { calculateEstimateTotals } from "@/lib/estimateTotals";
import { thaiDate, titleOf, whenOf } from "@/lib/estimateLabels";
import { exportEstimateCsv } from "@/lib/exportEstimateCsv";
import { decodeEstimate, encodeEstimate, shareUrl } from "@/lib/shareEstimate";
import type { EstimateLine, EstimateMeta, Go } from "@/types";

const CONTINGENCY = [0, 3, 5, 10];
const CostBreakdown = lazy(() => import("@/components/site/cost-breakdown"));
const categoryOf = (line: EstimateLine) =>
  getMaterialById(line.materialId)?.categoryCode ?? "STR-01";

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

export default function Estimate({
  shared,
  lines: myLines,
  setLines,
  meta: myMeta,
  setMeta,
  go,
  notify,
}: Props) {
  const received = useMemo(() => (shared ? decodeEstimate(shared) : null), [shared]);
  const readOnly = Boolean(shared);
  const lines = received ? received.lines : myLines;
  const meta = received ? received.meta : myMeta;
  const totals = useMemo(
    () => calculateEstimateTotals(lines, meta.contingency, meta.vat),
    [lines, meta.contingency, meta.vat],
  );
  const anyDemo = lines.some((l) => l.demo);
  const hasRange = Math.round(totals.low.total) !== Math.round(totals.high.total);

  const setField = (patch: Partial<EstimateMeta>) => setMeta((prev) => ({ ...prev, ...patch }));
  const setQty = (key: string, qty: number) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty } : l)));
  const remove = (key: string) => setLines((prev) => prev.filter((l) => l.key !== key));
  const clearAll = () => {
    if (window.confirm("ล้างรายการทั้งหมดในใบประมาณราคา?")) setLines([]);
  };

  const link = () => shareUrl(encodeEstimate(meta, lines));
  const lineText = () =>
    `ใบประมาณราคาวัสดุ${meta.project.trim() ? ` ${meta.project.trim()}` : ""} (THAI TAY)\n${link()}`;
  const copyLink = () => {
    const url = link();
    const done = () =>
      notify({
        id: Date.now(),
        text: "คัดลอกลิงก์แล้ว",
        detail: "วางในแชต LINE หรืออีเมลได้เลย คนเปิดจะเห็นรายการและราคาเดียวกัน",
      });
    if (navigator.clipboard?.writeText)
      navigator.clipboard.writeText(url).then(done, () => window.prompt("คัดลอกลิงก์นี้", url));
    else window.prompt("คัดลอกลิงก์นี้", url);
  };
  const keepShared = () => {
    if (!received) return;
    if (
      myLines.length &&
      !window.confirm(`แทนที่ใบประมาณเดิมของคุณ (${myLines.length} รายการ) ด้วยใบนี้?`)
    )
      return;
    setLines(
      received.lines.map((l, i) => ({
        ...l,
        key: `${l.materialId}-${l.month}-${Date.now()}-${i}`,
      })),
    );
    setMeta(received.meta);
    go({ page: "estimate" });
    notify({
      id: Date.now(),
      text: "บันทึกเป็นใบประมาณของคุณแล้ว",
      detail: "แก้จำนวนหรือเพิ่มรายการต่อได้",
    });
  };

  if (shared && !received) {
    return (
      <div className="page estimate-page">
        <header className="page-head">
          <h1>ใบประมาณราคา</h1>
        </header>
        <div className="empty-state big">
          <span className="empty-icon">
            <Link2 size={34} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <h2>เปิดลิงก์นี้ไม่ได้</h2>
          <p>ลิงก์ใบประมาณราคาไม่ครบหรือถูกตัดระหว่างส่ง ลองขอลิงก์ใหม่จากคนส่งอีกครั้ง</p>
          <a className="btn btn-primary btn-lg" href="#estimate">
            ไปใบประมาณของฉัน
          </a>
        </div>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="page estimate-page">
        <header className="page-head">
          <h1>ใบประมาณราคา</h1>
        </header>
        <div className="empty-state big">
          <span className="empty-icon">
            <ClipboardList size={36} strokeWidth={1.6} aria-hidden="true" />
          </span>
          <h2>ยังไม่มีรายการ</h2>
          <p>
            ค้นหาวัสดุ เลือกว่าจะซื้อเมื่อไหร่ ใส่จำนวน แล้วกด “เพิ่มลงใบประมาณราคา”
            รายการจะมารวมยอดที่นี่
          </p>
          <a className="btn btn-primary btn-lg" href="#search">
            <Search size={18} aria-hidden="true" />
            ค้นหาวัสดุ
          </a>
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
            {readOnly && meta.customer ? `ลูกค้า ${meta.customer} · ` : ""}
            {lines.length} รายการ · รวมทั้งสิ้น{" "}
            <strong className="num">฿{formatBaht(totals.expected.total)}</strong>
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
              <button type="button" className="btn btn-primary" onClick={keepShared}>
                บันทึกเป็นใบของฉัน
              </button>
              <a className="btn btn-ghost" href="#estimate">
                ไปใบของฉัน
              </a>
            </div>
          </div>
        )}

        {!readOnly && (
          <div className="estimate-meta">
            <label>
              <span>ชื่อโครงการ</span>
              <input
                value={myMeta.project}
                maxLength={120}
                placeholder="เช่น บ้านคุณสมชาย ต่อเติมครัว"
                onChange={(event) => setField({ project: event.target.value })}
              />
            </label>
            <label>
              <span>
                ลูกค้า <small>(ไม่ใส่ก็ได้)</small>
              </span>
              <input
                value={myMeta.customer}
                maxLength={120}
                placeholder="ชื่อลูกค้าหรือบริษัท"
                onChange={(event) => setField({ customer: event.target.value })}
              />
            </label>
          </div>
        )}

        <div className="estimate-grid">
          <ul className="line-list" aria-label="รายการวัสดุ">
            {lines.map((l) => (
              <li className={`line ${readOnly ? "line-readonly" : ""}`} key={l.key}>
                <CategoryIcon code={categoryOf(l)} size={36} className="row-icon line-icon" />
                <div className="line-copy">
                  <a href={`#m/${l.materialId}`}>{titleOf(l)}</a>
                  <small>
                    {whenOf(l)} · ฿{formatPrice(l.price)} ต่อ {l.unit}
                  </small>
                </div>
                <div className="line-qty">
                  {readOnly ? (
                    <span className="num line-qty-text">{l.qty.toLocaleString("th-TH")}</span>
                  ) : (
                    <QtyStepper
                      size="sm"
                      label={`จำนวน ${titleOf(l)} (${l.unit})`}
                      value={l.qty}
                      onChange={(qty) => setQty(l.key, qty)}
                    />
                  )}
                  <span>{l.unit}</span>
                </div>
                <strong className="line-total num">฿{formatBaht(l.price * l.qty)}</strong>
                {!readOnly && (
                  <button
                    type="button"
                    className="line-remove"
                    aria-label={`ลบ ${titleOf(l)}`}
                    onClick={() => remove(l.key)}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          <aside className="panel summary" aria-labelledby="summary-title">
            <div className="summary-top">
              <h2 id="summary-title">สรุปยอด</h2>
              {anyDemo && <DemoStamp />}
            </div>
            {!readOnly && (
              <>
                <fieldset className="contingency">
                  <legend>เงินสำรองเผื่อราคาผันผวน</legend>
                  <div className="seg">
                    {CONTINGENCY.map((c) => (
                      <label key={c}>
                        <input
                          type="radio"
                          name="contingency"
                          checked={myMeta.contingency === c}
                          onChange={() => setField({ contingency: c })}
                        />
                        <span>{c}%</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="vat-toggle">
                  <input
                    type="checkbox"
                    checked={myMeta.vat}
                    onChange={(event) => setField({ vat: event.target.checked })}
                  />
                  <span>รวมภาษีมูลค่าเพิ่ม 7%</span>
                </label>
              </>
            )}

            <dl className="sum">
              <div>
                <dt>รวมค่าวัสดุ</dt>
                <dd className="num">{formatBaht(totals.expected.base)}</dd>
              </div>
              {meta.contingency > 0 && (
                <div>
                  <dt>เงินสำรอง {meta.contingency}%</dt>
                  <dd className="num">{formatBaht(totals.expected.cont)}</dd>
                </div>
              )}
              {meta.vat && (
                <div>
                  <dt>ภาษีมูลค่าเพิ่ม 7%</dt>
                  <dd className="num">{formatBaht(totals.expected.vat)}</dd>
                </div>
              )}
            </dl>
            <div className="grand">
              <span>รวมทั้งสิ้น</span>
              <strong className="num">฿{formatBaht(totals.expected.total)}</strong>
              {hasRange && (
                <small>
                  ช่วงที่เป็นไปได้ ฿{formatBaht(totals.low.total, 0)} –{" "}
                  {formatBaht(totals.high.total, 0)}
                </small>
              )}
            </div>
            {anyDemo && (
              <p className="fine warn">คำนวณจากข้อมูลตัวอย่าง ยังไม่ควรนำไปยื่นราคาจริง</p>
            )}

            <div className="summary-actions">
              {!readOnly && (
                <>
                  <a
                    className="btn btn-secondary"
                    href={`https://line.me/R/share?text=${encodeURIComponent(lineText())}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Send size={17} aria-hidden="true" />
                    ส่งทาง LINE<span className="sr-only"> (เปิดในแท็บใหม่)</span>
                  </a>
                  <button type="button" className="btn btn-secondary" onClick={copyLink}>
                    <Link2 size={17} aria-hidden="true" />
                    คัดลอกลิงก์
                  </button>
                </>
              )}
              <button type="button" className="btn btn-secondary" onClick={() => window.print()}>
                <Printer size={17} aria-hidden="true" />
                พิมพ์ / PDF
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => exportEstimateCsv(lines, meta, totals, anyDemo, received?.date)}
              >
                <Download size={17} aria-hidden="true" />
                CSV
              </button>
            </div>
            {!readOnly && (
              <button type="button" className="btn btn-ghost btn-block" onClick={clearAll}>
                ล้างทั้งหมด
              </button>
            )}
          </aside>
        </div>
      </div>

      <Suspense fallback={<p role="status">กำลังโหลดกราฟต้นทุน…</p>}>
        <CostBreakdown lines={lines} />
      </Suspense>
      <PrintSheet
        lines={lines}
        meta={meta}
        totals={totals}
        date={thaiDate(received?.date)}
        anyDemo={anyDemo}
        hasRange={hasRange}
      />
    </div>
  );
}
