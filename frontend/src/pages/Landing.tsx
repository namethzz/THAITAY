import { ArrowRight, Boxes, Building2, Calculator, Layers3, TrendingUp } from "lucide-react";
import SaaSTemplate from "@/components/ui/saa-s-template";
import { materialCatalog, materialCategories } from "@/data.js";
import { isDemoData } from "@/services/priceService";
import type { Navigate } from "@/types";

const highlights = [
  { icon: Boxes, value: materialCatalog.length.toLocaleString("th-TH"), label: "รายการวัสดุงานโครงสร้าง" },
  { icon: Layers3, value: materialCategories.length.toString(), label: "หมวดวัสดุ แยกชื่อ รหัส และหน่วย" },
  { icon: TrendingUp, value: "1–3", label: "เดือน พยากรณ์ราคาล่วงหน้า" },
  { icon: Calculator, value: "VAT 7%", label: "คำนวณต้นทุนพร้อมสำรองผันผวน" },
];

export default function Landing({ navigate }: { navigate: Navigate }) {
  return (
    <SaaSTemplate
      brand={<span className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-lg bg-[#7a4a26] text-[#fffaf2]"><Building2 size={19} strokeWidth={1.8} /></span><span className="font-[Inter] tracking-[-0.04em]">THAI <b className="font-semibold text-[#d9c3a0]">เท</b></span></span>}
      brandHref="#home"
      navLinks={[
        { label: "รายการวัสดุ", href: "#prices" },
        { label: "วิเคราะห์ราคา", href: "#analysis" },
        { label: "พยากรณ์ 1–3 เดือน", href: "#forecast" },
        { label: "คำนวณต้นทุน", href: "#cost" },
      ]}
      secondaryAction={{ label: "ค้นหาวัสดุ", onClick: () => navigate("prices") }}
      primaryAction={{ label: "เข้าสู่พื้นที่ทำงาน", onClick: () => navigate("overview") }}
      announcement={{ text: "ใหม่: หน้าคำนวณต้นทุน รวม VAT 7% และดาวน์โหลด CSV", linkLabel: "ลองใช้", href: "#cost" }}
      title={<><span className="inline-block">เลือกวัสดุ</span> <span className="inline-block">ดูแนวโน้มราคา</span><br /><span className="inline-block">วางแผนต้นทุน</span><span className="inline-block">งานโครงสร้าง</span></>}
      description={<>ค้นหาวัสดุงานโครงสร้าง {materialCatalog.length.toLocaleString("th-TH")} รายการใน {materialCategories.length} หมวด <br className="hidden md:block" />ดูราคาย้อนหลัง พยากรณ์ล่วงหน้า 1–3 เดือน แล้วคำนวณต้นทุนได้ในที่เดียว</>}
      cta={{ label: <>เริ่มเลือกวัสดุ<ArrowRight size={18} aria-hidden="true" /></>, onClick: () => navigate("prices") }}
      previewImage={{ src: `${import.meta.env.BASE_URL}images/app-preview.jpg`, alt: "ตัวอย่างหน้าภาพรวมของ THAI เท: หมวดวัสดุ สถิติ และตัวเลือกวัสดุ", width: 1600, height: 1000 }}
    >
      <div className="mx-auto max-w-5xl px-6 lg:px-0">
      <section aria-label="ความสามารถหลัก" className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-stone-800 bg-stone-800 md:grid-cols-4">
        {highlights.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col gap-2 bg-stone-950 p-5 md:p-6">
            <Icon size={18} className="text-[#d9c3a0]" aria-hidden="true" />
            <strong className="font-[Inter] text-2xl font-semibold tracking-[-0.03em] text-white">{value}</strong>
            <span className="text-xs leading-relaxed text-stone-400">{label}</span>
          </div>
        ))}
      </section>
      <footer className="mt-16 flex flex-col gap-2 border-t border-stone-800 py-8 text-xs text-stone-500 md:flex-row md:items-center md:justify-between">
        <span>THAI เท · Construction Price Intelligence</span>
        <span>{isDemoData ? "ราคาที่แสดงตอนนี้เป็นข้อมูลตัวอย่าง (Demo) ใช้เพื่อประกอบการวางแผนเท่านั้น" : "ข้อมูลเพื่อประกอบการวางแผน"}</span>
      </footer>
      </div>
    </SaaSTemplate>
  );
}
