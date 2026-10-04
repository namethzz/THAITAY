import { ArrowRight, Boxes, Layers3 } from "lucide-react";
import { getMaterialById, materialCatalog, materialCategories, materialUnits } from "@/data.js";
import { HeroSection } from "@/components/ui/hero-3";
import { Button } from "@/components/ui/button";
import { MaterialCategories } from "@/components/ui/material-categories";
import { MaterialDetails, PricePlaceholder } from "@/components/ui/material-details";
import { Stat } from "@/components/ui/scope-layout";
import { SourceLinks } from "@/components/ui/price-widgets";
import MaterialPicker from "@/components/MaterialPicker.jsx";
import type { Navigate, SelectionProps } from "@/types";
export default function Overview({ navigate, selectedId, onSelect, onCategorySelect }: SelectionProps & { navigate: Navigate; onCategorySelect: (code: string) => void }) {
  const selected = getMaterialById(selectedId)!;
  return <div className="overview-page scope-overview frontend-overview">
    <HeroSection navigate={navigate} materialCount={materialCatalog.length} categoryCount={materialCategories.length} />
    <div className="scope-stats three"><Stat label="วัสดุงานโครงสร้าง" value={materialCatalog.length} unit="รายการ" note="ค้นหาได้ด้วยชื่อหรือรหัสวัสดุ" /><Stat label="หมวดวัสดุ" value={materialCategories.length} unit="หมวด" note="แบ่งประเภทเพื่อให้เลือกได้ง่าย" /><Stat label="หน่วยวัสดุ" value={materialUnits.length} unit="หน่วย" note="ระบุหน่วยของแต่ละรายการชัดเจน" /></div>
    <section className="catalog-categories-section" aria-labelledby="categories-title"><div className="section-heading"><div><span className="section-kicker">STRUCTURAL MATERIALS</span><h2 id="categories-title">เริ่มจากหมวดที่ต้องการ</h2><p>เหล็ก คอนกรีต ชิ้นส่วนสำเร็จรูป และวัสดุผสมคอนกรีต</p></div><Button variant="ghost" className="category-view-all" onClick={() => onCategorySelect("all")}>ดูวัสดุทั้งหมด<ArrowRight size={14} className="ml-2" /></Button></div><MaterialCategories onSelect={onCategorySelect} /></section>
    <section className="card scope-panel overview-material-selector"><div className="scope-panel-title"><div><span className="section-kicker">YOUR SELECTED MATERIAL</span><h2>เลือกวัสดุที่สนใจ</h2></div><span className="subtle-tag"><Layers3 size={13} />งานโครงสร้าง</span></div><MaterialPicker materials={materialCatalog} value={selectedId} onChange={onSelect} label="รายการวัสดุ" /><MaterialDetails material={selected} navigate={navigate} /></section>
    <section className="card scope-panel"><div className="scope-panel-title"><div><span className="section-kicker">PRICE INFORMATION</span><h2>พื้นที่แสดงข้อมูลราคา</h2></div><span className="subtle-tag">รอข้อมูล</span></div><PricePlaceholder>ราคาย้อนหลังและผลพยากรณ์ของวัสดุที่เลือกจะแสดงที่นี่เมื่อข้อมูลพร้อม</PricePlaceholder></section>
    <SourceLinks />
    <section className="quick-links"><button type="button" onClick={() => onCategorySelect("all")}><span className="quick-link-icon"><Boxes size={20} /></span><span><strong>เลือกวัสดุจากรายการทั้งหมด</strong><small>กรองหมวด ค้นหาชื่อหรือรหัส แล้วเลือกวัสดุ</small></span><ArrowRight size={17} /></button><button type="button" onClick={() => navigate("cost")}><span className="quick-link-icon"><Layers3 size={20} /></span><span><strong>พยากรณ์และคำนวณต้นทุน</strong><small>ดูราคาคาดการณ์ 1–3 เดือน แล้วประมาณราคาสั่งซื้อ</small></span><ArrowRight size={17} /></button></section>
  </div>;
}
