import { ArrowRight, Calculator, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaintDot } from "@/components/ui/brand-mark";
import type { Material, Navigate } from "@/types";
export function MaterialDetails({ material, navigate }: { material: Material; navigate?: Navigate }) {
  return <section className="material-tag tag-panel" aria-label="วัสดุที่เลือก">
    <p className="material-tag-category"><PaintDot code={material.categoryCode} />{material.category}</p>
    <h2>{material.name}</h2>
    <dl>
      <div><dt>รหัสสินค้า</dt><dd className="num">{material.id}</dd></div>
      <div><dt>หน่วย</dt><dd>{material.unit}</dd></div>
    </dl>
    {navigate && <div className="material-tag-actions">
      <Button onClick={() => navigate("forecast")}>ดูพยากรณ์ 1–3 เดือน<ArrowRight size={15} className="ml-2" /></Button>
      <Button variant="outline" onClick={() => navigate("analysis")}><LineChart size={15} className="mr-2" />ราคาย้อนหลัง</Button>
      <Button variant="outline" onClick={() => navigate("cost")}><Calculator size={15} className="mr-2" />คำนวณต้นทุน</Button>
    </div>}
  </section>;
}
