import { useRef } from "react";
import { ArrowRight, Search } from "lucide-react";
import { getMaterialById, materialCatalog, searchMaterials } from "@/data.js";
import { MaterialSearch } from "@/components/site/material-search";
import { PriceCard } from "@/components/site/price-card";
import { SiteArt } from "@/components/site/site-art";
import { DemoNote, SourceLinks } from "@/components/ui/price-widgets";
import type { Go, Material } from "@/types";

// ปุ่มลัดใต้ช่องค้นหา: กดแล้วการ์ดราคาเปลี่ยนเป็นวัสดุนั้นทันที
const QUICK_PICKS = [
  { label: "เหล็กเส้น SD40", query: "เหล็กเส้น sd40" },
  { label: "คอนกรีตผสมเสร็จ", query: "คอนกรีตผสมเสร็จ 240" },
  { label: "เหล็ก H-Beam", query: "h-beam" },
  { label: "ลวดผูกเหล็ก", query: "ลวดผูกเหล็ก" },
  { label: "ทรายหยาบ", query: "ทรายหยาบ" },
]
  .map(pick => ({ ...pick, material: searchMaterials(pick.query, { limit: 1 })[0] }))
  .filter((pick): pick is { label: string; query: string; material: Material } => Boolean(pick.material));

const STEPS = [
  { title: "ค้นหาวัสดุ", text: `พิมพ์ชื่อ เช่น เหล็กเส้น SD40 คอนกรีต หรือเสาเข็ม จากวัสดุงานโครงสร้าง ${materialCatalog.length} รายการ` },
  { title: "ดูราคาล่าสุดและอีก 1–3 เดือน", text: "รู้ว่าราคาจะขึ้นหรือลง พร้อมช่วงต่ำ–สูงที่เป็นไปได้ ตัดสินใจได้ว่าควรซื้อตอนนี้หรือรอ" },
  { title: "ใส่จำนวน ได้ใบประมาณราคา", text: "ระบบรวมภาษีและเงินสำรองให้ ดาวน์โหลดเป็นไฟล์หรือพิมพ์แนบใบเสนอราคาได้" },
];

export default function Home({ selectedId, onSelect, go }: { selectedId: string; onSelect: (id: string) => void; go: Go }) {
  const material = getMaterialById(selectedId)!;
  const cardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // เลือกวัสดุแล้วการ์ดราคาเปลี่ยนตาม เลื่อนให้เห็นการ์ด และย้าย focus ไปที่ชื่อวัสดุบนการ์ด
  const show = (next: Material) => {
    onSelect(next.id);
    window.requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cardRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      titleRef.current?.focus({ preventScroll: true });
    });
  };

  return (
    <div className="home">
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">รู้ราคาวัสดุก่อสร้าง<br /><span className="hl">ล่วงหน้า 3 เดือน</span></h1>
        <p className="hero-sub">พิมพ์ชื่อวัสดุงานโครงสร้าง เช่น <span className="nowrap">เหล็กเส้น</span> คอนกรีต เสาเข็ม <span className="nowrap">แล้วเห็นราคาล่าสุด</span>กับราคา<span className="nowrap">อีก 1–3 เดือน</span>ทันที ไม่ต้องสมัครสมาชิก</p>
        <MaterialSearch onPick={show} onShowAll={q => go({ page: "search", q, cat: "all" })} />
        <div className="quick-picks" role="group" aria-label="ตัวอย่างวัสดุ">
          <span>ลองดู</span>
          {QUICK_PICKS.map(pick => (
            <button type="button" key={pick.label} aria-pressed={pick.material.id === selectedId} onClick={() => show(pick.material)}>{pick.label}</button>
          ))}
        </div>
      </section>

      <section className="stage" aria-label="ราคาวัสดุที่เลือก">
        <SiteArt className="stage-art" />
        <div className="stage-card" ref={cardRef}>
          <PriceCard material={material} titleRef={titleRef}>
            <a className="btn btn-primary btn-block" href={`#m/${material.id}`}>ดูกราฟ และคำนวณต้นทุน<ArrowRight size={18} aria-hidden="true" /></a>
          </PriceCard>
        </div>
      </section>

      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title">ใช้งานง่าย 3 ขั้นตอน</h2>
        <p className="section-sub">ไม่ต้องโทรถามราคาทีละร้าน ไม่ต้องเดาว่าเดือนหน้าราคาจะเป็นเท่าไหร่</p>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="step-no" aria-hidden="true">{index + 1}</span>
              <div><h3>{step.title}</h3><p>{step.text}</p></div>
            </li>
          ))}
        </ol>
        <a className="btn btn-primary btn-lg" href="#search"><Search size={18} aria-hidden="true" />เริ่มค้นหาราคา</a>
      </section>

      <section className="trust" aria-labelledby="trust-title">
        <div className="trust-copy">
          <h2 id="trust-title">ราคามาจากไหน</h2>
          <p>THAI TAY ใช้ราคาวัสดุรายเดือนจากหน่วยงานรัฐ แล้วให้โมเดลคาดการณ์ราคา 1–3 เดือนข้างหน้า พร้อมช่วงต่ำ–สูงที่เป็นไปได้ ยิ่งมองไกล ช่วงยิ่งกว้าง</p>
          <DemoNote />
        </div>
        <SourceLinks />
      </section>
    </div>
  );
}
