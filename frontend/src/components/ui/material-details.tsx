import { ArrowRight, Check, PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Material, Navigate } from "@/types";
export function MaterialDetails({ material, navigate }: { material: Material; navigate?: Navigate }) {
  return <section className="selected-material-card" aria-label="รายละเอียดวัสดุที่เลือก"><div className="selected-material-heading"><span><Check size={15} />วัสดุที่เลือก</span><span className="subtle-tag">งานโครงสร้าง</span></div><h2>{material.name}</h2><dl><div><dt>รหัสวัสดุ</dt><dd>{material.id}</dd></div><div><dt>หมวด</dt><dd>{material.category}</dd></div><div><dt>หน่วย</dt><dd>{material.unit}</dd></div></dl>{navigate && <div className="selected-material-actions"><Button variant="outline" onClick={() => navigate("analysis")}>ดูหน้าวิเคราะห์<ArrowRight size={14} className="ml-2" /></Button><Button onClick={() => navigate("forecast")}>ไปหน้าพยากรณ์<ArrowRight size={14} className="ml-2" /></Button></div>}</section>;
}
export function PricePlaceholder({ title = "รอข้อมูลราคา", children }: { title?: string; children: React.ReactNode }) {
  return <div className="frontend-price-placeholder"><span><PackageSearch size={28} strokeWidth={1.5} /></span><h3>{title}</h3><p>{children}</p></div>;
}
