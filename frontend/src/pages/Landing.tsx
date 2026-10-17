import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Calculator, ExternalLink, LineChart, PackageSearch, RotateCcw } from "lucide-react";
import { getMaterialById, materialCatalog, materialCategories } from "@/data.js";
import MaterialPicker from "@/components/MaterialPicker.jsx";
import { BrandMark, PaintDot } from "@/components/ui/brand-mark";
import { useForecast, useHistory } from "@/components/ui/price-widgets";
import { PRICE_SOURCES, PRIMARY_SOURCE } from "@/config/sources";
import { formatBaht, isDemoData } from "@/services/priceService";
import type { Navigate, SelectionProps } from "@/types";
import "@/styles/landing.css";

const FLOW = [
  { title: "เลือกวัสดุ", body: "ค้นจากชื่อ ขนาด หรือรหัสสินค้า 16 หลักของกระทรวงพาณิชย์ แยกไว้ 9 หมวด", action: "เปิดรายการวัสดุ", page: "prices", Icon: PackageSearch },
  { title: "ดูแนวโน้มและราคาคาดการณ์", body: "ราคาย้อนหลังตั้งแต่ 3 เดือนถึง 10 ปี และราคาคาดการณ์ 1–3 เดือนพร้อมช่วงต่ำ–สูง", action: "ดูพยากรณ์", page: "forecast", Icon: LineChart },
  { title: "คำนวณต้นทุนสั่งซื้อ", body: "ใส่จำนวน เลือกเดือนที่จะซื้อ บวกสำรองราคาผันผวนและ VAT 7% แล้วดาวน์โหลด CSV หรือพิมพ์", action: "คำนวณต้นทุน", page: "cost", Icon: Calculator },
] as const;

const AUDIENCES = [
  { who: "ผู้รับเหมาและฝ่ายจัดซื้อ", what: "ดูว่าควรสั่งของตอนนี้หรือรออีก 1–3 เดือน แล้วทำใบประมาณราคาให้ลูกค้าจากราคาเดียวกัน" },
  { who: "วิศวกรและ QS", what: "ได้ราคาต่อหน่วยพร้อมรหัสสินค้า หน่วย และแหล่งที่มา ใช้อ้างอิงตอนประมาณต้นทุนโครงการ" },
  { who: "เจ้าของบ้าน", what: "รู้ราคาคร่าว ๆ ของวัสดุหลักก่อนคุยกับผู้รับเหมา อ่านเข้าใจได้โดยไม่ต้องเป็นช่าง" },
];

/** Steel grommet the wire runs through: flat, drawn, no faked depth. */
function Grommet() {
  return (
    <svg className="grommet" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="17" fill="#c9d1d7" stroke="#5f6c77" strokeWidth="1.5" />
      <circle cx="18" cy="18" r="12.6" fill="none" stroke="#8d99a4" strokeWidth="1.4" />
      <circle cx="18" cy="18" r="8.6" fill="var(--ground)" stroke="#5f6c77" strokeWidth="1.5" />
    </svg>
  );
}

export default function Landing({ navigate, selectedId, onSelect, onCategorySelect }: SelectionProps & { navigate: Navigate; onCategorySelect: (code: string) => void }) {
  const material = getMaterialById(selectedId)!;
  const history = useHistory(material, 3);
  const forecast = useForecast(material);
  const points = history.data?.points ?? [];
  const latest = points.at(-1);
  const ahead = forecast.data?.points ?? [];
  const [flipped, setFlipped] = useState(false);
  const [turning, setTurning] = useState(false);
  const turnTimer = useRef<number>();
  const flip = (next: boolean) => {
    window.clearTimeout(turnTimer.current);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTurning(true);
      turnTimer.current = window.setTimeout(() => setTurning(false), 850);
    }
    setFlipped(next);
  };
  useEffect(() => () => window.clearTimeout(turnTimer.current), []);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const firstFlip = useRef(true);

  // Only the face turned towards the visitor is reachable; focus follows the turn.
  useEffect(() => {
    if (frontRef.current) frontRef.current.inert = flipped;
    if (backRef.current) backRef.current.inert = !flipped;
    if (firstFlip.current) { firstFlip.current = false; return; }
    const target = flipped ? backRef.current?.querySelector<HTMLElement>("h2") : frontRef.current?.querySelector<HTMLElement>(".tag-flip");
    target?.focus({ preventScroll: true });
  }, [flipped]);

  const scrollToSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="landing">
      <div className="tag-stage">
        <svg className="tag-wire" viewBox="0 0 26 120" preserveAspectRatio="none" aria-hidden="true">
          <path d="M9 0 C 17 10, 3 18, 11 28 S 4 46, 12 56 S 3 74, 11 84 S 5 100, 12 112" />
          <path d="M15 0 C 7 10, 21 18, 13 28 S 20 46, 12 56 S 21 74, 13 84 S 19 100, 14 112" />
        </svg>
        <article className={`big-tag ${flipped ? "is-flipped" : ""} ${turning ? "is-turning" : ""}`} aria-label="ป้ายวัสดุ THAI TAY">
          <div className="big-tag-inner">
            <div className="tag-face tag-front" ref={frontRef}>
              <header className="tag-header">
                <Grommet />
                <BrandMark />
                <nav className="tag-nav" aria-label="ในหน้านี้">
                  <button type="button" onClick={() => scrollToSection("how")}>วิธีใช้งาน</button>
                  <button type="button" onClick={() => scrollToSection("categories")}>หมวดวัสดุ</button>
                  <button type="button" onClick={() => scrollToSection("who")}>เหมาะกับใคร</button>
                </nav>
                <button type="button" className="tag-ws" onClick={() => navigate("overview")}>เข้าพื้นที่ทำงาน<ArrowUpRight size={16} aria-hidden="true" /></button>
              </header>

              <div className="tag-body">
                <div className="tag-title">
                  <h1>รู้ราคาวัสดุโครงสร้าง<br /><span className="phrase">ล่วงหน้า 1–3 เดือน</span> <span className="phrase">ก่อนสั่งซื้อ</span></h1>
                  <p>เลือกวัสดุจาก {materialCatalog.length.toLocaleString("th-TH")} รายการที่อ้างอิงรหัสสินค้ากระทรวงพาณิชย์ ดูราคาล่าสุด ราคาคาดการณ์พร้อมช่วงต่ำ–สูง แล้วนำไปคำนวณต้นทุนต่อได้ทันที</p>
                </div>

                <div className="tag-fields">
                  <div className="field field-material">
                    <span className="field-label">วัสดุ · ลองเปลี่ยนดู</span>
                    <MaterialPicker materials={materialCatalog} value={selectedId} onChange={onSelect} label={material.category} />
                  </div>
                  <div className="field">
                    <span className="field-label">รหัสสินค้า (พณ.)</span>
                    <span className="stamped code">{material.id.replace("MAT-", "")}</span>
                  </div>
                  <div className="field">
                    <span className="field-label">หน่วย</span>
                    <span className="stamped">{material.unit}</span>
                  </div>
                  <div className="field field-price is-latest">
                    <span className="field-label">ราคาล่าสุด{latest ? ` · ${latest.label}` : ""}</span>
                    <span className="stamped big" key={`l-${material.id}`}>{latest ? formatBaht(latest.price) : "—"}</span>
                    <small>บาท / {material.unit}</small>
                  </div>
                  {[1, 2, 3].map(month => {
                    const point = ahead.find(p => p.month === month);
                    return (
                      <div className="field field-price" key={month}>
                        <span className="field-label">อีก {month} เดือน{point ? ` · ${point.label}` : ""}</span>
                        <span className="stamped big" key={`${month}-${material.id}`}>{point ? formatBaht(point.price) : "—"}</span>
                        <small>{point ? `ช่วง ${formatBaht(point.low, 0)} – ${formatBaht(point.high, 0)}` : "กำลังคำนวณ"}</small>
                      </div>
                    );
                  })}
                  {isDemoData && <span className="inspector-stamp on-fields" aria-hidden="true">ข้อมูลตัวอย่าง</span>}
                </div>

                <div className="tag-actions">
                  <button type="button" className="tag-primary" onClick={() => navigate("forecast")}>เปิดพยากรณ์ฉบับเต็ม<ArrowRight size={18} aria-hidden="true" /></button>
                  <button type="button" className="tag-flip" aria-pressed={flipped} onClick={() => flip(true)}><RotateCcw size={16} aria-hidden="true" />ตัวเลขนี้มาจากไหน?</button>
                  {isDemoData && <span className="inspector-stamp in-actions">ข้อมูลตัวอย่าง</span>}
                  {isDemoData && <p className="tag-note">ราคาบนป้ายเป็นข้อมูลตัวอย่าง จนกว่าจะเชื่อมโมเดลพยากรณ์จริง</p>}
                </div>
              </div>
            </div>

            <div className="tag-face tag-back" ref={backRef}>
              <header className="tag-header">
                <Grommet />
                <BrandMark />
                <span className="tag-back-label">ด้านหลังป้าย</span>
              </header>
              <div className="tag-body">
                <h2 tabIndex={-1}>ตัวเลขบนป้ายมาจากไหน</h2>
                <ol className="provenance">
                  <li><strong>ราคาจริงรายเดือน</strong><p>ใช้ราคาวัสดุก่อสร้างรายเดือนจากข้อมูลเปิดของ{PRIMARY_SOURCE.owner.split("·")[0].trim()} แยกตามรหัสสินค้า 16 หลัก ราคาของแต่ละรายการจึงไม่ปนกับรายการอื่น</p></li>
                  <li><strong>โมเดลพยากรณ์รายรายการ</strong><p>โมเดลเรียนรู้จากราคาย้อนหลังของวัสดุนั้น แล้วคาดการณ์ราคาอีก 1, 2 และ 3 เดือน ตอนนี้อยู่ระหว่างพัฒนา ตัวเลขที่เห็นจึงเป็นตัวอย่าง</p></li>
                  <li><strong>ช่วงต่ำ–สูง ไม่ใช่ตัวเลขเดียว</strong><p>ทุกราคาคาดการณ์มาพร้อมช่วงที่เป็นไปได้ ยิ่งมองไกล ช่วงยิ่งกว้าง ใช้ตั้งงบเผื่อได้ตรงกว่าราคาเดียว</p></li>
                </ol>
                <div className="price-trace" aria-label={`เส้นทางราคาของ ${material.name}`}>
                  <div className="trace-group is-measured">
                    <span className="trace-head">ราคาจริง 3 เดือนล่าสุด</span>
                    <ol>{points.slice(-3).map(point => <li key={point.date}><small>{point.label}</small><span className="stamped">{formatBaht(point.price, 0)}</span></li>)}</ol>
                  </div>
                  <span className="trace-arrow" aria-hidden="true"><ArrowRight size={20} /></span>
                  <div className="trace-group is-forecast">
                    <span className="trace-head">โมเดลคาดการณ์ (ตัวอย่าง)</span>
                    <ol>{ahead.map(point => <li key={point.month}><small>{point.label}</small><span className="stamped">{formatBaht(point.price, 0)}</span><em>{formatBaht(point.low, 0)}–{formatBaht(point.high, 0)}</em></li>)}</ol>
                  </div>
                </div>
                <dl className="trace-row">
                  <div><dt>ป้ายนี้</dt><dd>{material.name}</dd></div>
                  <div><dt>รหัสสินค้า</dt><dd className="stamped code">{material.id.replace("MAT-", "")}</dd></div>
                  <div><dt>หน่วย</dt><dd className="stamped">{material.unit}</dd></div>
                </dl>
                <ul className="back-sources">
                  {PRICE_SOURCES.map(source => (
                    <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}<ExternalLink size={14} aria-hidden="true" /><span className="sr-only"> (เปิดในแท็บใหม่)</span></a><small>{source.owner}</small></li>
                  ))}
                </ul>
                <div className="tag-actions">
                  <button type="button" className="tag-flip" onClick={() => flip(false)}><RotateCcw size={16} aria-hidden="true" />พลิกกลับด้านหน้า</button>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <section id="how" className="landing-section" aria-labelledby="how-title">
        <div className="section-head">
          <h2 id="how-title">จากวัสดุ ถึงต้นทุน</h2>
          <p>ใช้งานได้ใน 3 ขั้น ทุกขั้นจำวัสดุที่เลือกไว้ให้ ไม่ต้องเลือกใหม่</p>
        </div>
        <ol className="flow-rail">
          {FLOW.map(({ title, body, action, page, Icon }, index) => (
            <li key={page}>
              <span className="flow-no" aria-hidden="true">{index + 1}</span>
              <h3>{title}</h3>
              <p>{body}</p>
              <button type="button" onClick={() => navigate(page)}><Icon size={16} aria-hidden="true" />{action}<ArrowRight size={15} aria-hidden="true" /></button>
            </li>
          ))}
        </ol>
      </section>

      <section id="categories" className="landing-section" aria-labelledby="cat-title">
        <div className="section-head">
          <h2 id="cat-title">วัสดุ {materialCategories.length} หมวด {materialCatalog.length.toLocaleString("th-TH")} รายการ</h2>
          <p>สีที่ปลายเหล็กบอกหมวด แบบเดียวกับที่โรงงานทาสีปลายมัดเหล็กเพื่อแยกเกรด</p>
        </div>
        <div className="bundle-grid">
          {materialCategories.map(category => (
            <button type="button" key={category.code} onClick={() => onCategorySelect(category.code)}>
              <PaintDot code={category.code} size={34} />
              <span><strong>{category.name}</strong><small>{category.count} รายการ</small></span>
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section id="who" className="landing-section" aria-labelledby="who-title">
        <div className="section-head">
          <h2 id="who-title">เหมาะกับใคร</h2>
          <p>อ่านได้ทั้งมืออาชีพและคนที่กำลังสร้างบ้านหลังแรก ทุกตัวเลขบอกหน่วยและรหัสสินค้าเสมอ</p>
        </div>
        <dl className="audience-list">
          {AUDIENCES.map(({ who, what }) => <div key={who}><dt>{who}</dt><dd>{what}</dd></div>)}
        </dl>
        <div className="closing">
          <p>เริ่มจากวัสดุที่คุณกำลังจะสั่ง แล้วดูว่าอีก 3 เดือนราคาน่าจะอยู่ตรงไหน</p>
          <button type="button" className="tag-primary" onClick={() => navigate("overview")}>เข้าพื้นที่ทำงาน<ArrowRight size={18} aria-hidden="true" /></button>
        </div>
      </section>

      <footer className="landing-footer">
        <BrandMark />
        <p>{isDemoData ? "ราคาที่แสดงตอนนี้เป็นข้อมูลตัวอย่าง ใช้เพื่อดูการทำงานของระบบเท่านั้น" : "ข้อมูลเพื่อประกอบการวางแผน ไม่ใช่ใบเสนอราคาจากผู้ขาย"}</p>
        <ul>{PRICE_SOURCES.map(source => <li key={source.id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}<span className="sr-only"> (เปิดในแท็บใหม่)</span></a></li>)}</ul>
      </footer>
    </div>
  );
}
