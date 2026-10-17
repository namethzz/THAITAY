import { ArrowRight, Calculator, LineChart, TrendingUp } from "lucide-react";
import { getMaterialById, materialCatalog, materialCategories } from "@/data.js";
import MaterialPicker from "@/components/MaterialPicker.jsx";
import { Button } from "@/components/ui/button";
import { MaterialCategories } from "@/components/ui/material-categories";
import { PageHeading } from "@/components/ui/scope-layout";
import { DemoBanner, SourceLinks, useForecast, useHistory } from "@/components/ui/price-widgets";
import { formatBaht } from "@/services/priceService";
import type { Navigate, SelectionProps } from "@/types";

export default function Overview({ navigate, selectedId, onSelect, onCategorySelect }: SelectionProps & { navigate: Navigate; onCategorySelect: (code: string) => void }) {
  const material = getMaterialById(selectedId)!;
  const history = useHistory(material, 3);
  const forecast = useForecast(material);
  const latest = history.data?.points.at(-1);
  const ahead = forecast.data?.points.find(point => point.month === 3);
  const delta = latest && ahead ? ((ahead.price - latest.price) / latest.price) * 100 : null;

  return <div className="scope-page overview-page">
    <PageHeading title="ภาพรวม">วัสดุงานโครงสร้าง {materialCatalog.length.toLocaleString("th-TH")} รายการ ใน {materialCategories.length} หมวด เลือกวัสดุแล้วดูราคาล่าสุด ราคาคาดการณ์ และคำนวณต้นทุนต่อได้จากที่นี่</PageHeading>
    <DemoBanner />

    <section className="overview-focus" aria-labelledby="focus-title">
      <div className="overview-focus-pick">
        <h2 id="focus-title">วัสดุที่กำลังดู</h2>
        <MaterialPicker materials={materialCatalog} value={selectedId} onChange={onSelect} label="กดเพื่อเปลี่ยนวัสดุ" />
      </div>
      <dl className="overview-numbers" aria-busy={history.loading || forecast.loading}>
        <div className="is-measured">
          <dt>ราคาล่าสุด{latest ? ` · ${latest.label}` : ""}</dt>
          <dd><span className="num">{latest ? formatBaht(latest.price) : "—"}</span><small>บาท / {material.unit}</small></dd>
        </div>
        <div className="is-forecast">
          <dt>คาดการณ์อีก 3 เดือน{ahead ? ` · ${ahead.label}` : ""}</dt>
          <dd><span className="num">{ahead ? formatBaht(ahead.price) : "—"}</span><small>บาท / {material.unit}</small></dd>
          {ahead && <p>ช่วงที่เป็นไปได้ {formatBaht(ahead.low)} – {formatBaht(ahead.high)}</p>}
        </div>
        {delta !== null && <div className="is-delta">
          <dt>เทียบกับราคาล่าสุด</dt>
          <dd><span className={`delta-chip ${delta >= 0 ? "up" : "down"}`}>{delta >= 0 ? "แพงขึ้น" : "ถูกลง"} {Math.abs(delta).toFixed(2)}%</span></dd>
        </div>}
      </dl>
      <div className="overview-actions">
        <Button onClick={() => navigate("forecast")}><TrendingUp size={16} className="mr-2" />ดูพยากรณ์ 1–3 เดือน</Button>
        <Button variant="outline" onClick={() => navigate("analysis")}><LineChart size={16} className="mr-2" />ราคาย้อนหลัง</Button>
        <Button variant="outline" onClick={() => navigate("cost")}><Calculator size={16} className="mr-2" />คำนวณต้นทุน</Button>
      </div>
    </section>

    <section aria-labelledby="categories-title">
      <div className="section-heading">
        <div><h2 id="categories-title">เลือกจากหมวดวัสดุ</h2><p>สีที่ปลายเหล็กบอกหมวด กดเพื่อดูรายการทั้งหมดในหมวดนั้น</p></div>
        <Button variant="ghost" onClick={() => onCategorySelect("all")}>ดูวัสดุทั้งหมด<ArrowRight size={15} className="ml-2" /></Button>
      </div>
      <MaterialCategories onSelect={onCategorySelect} />
    </section>

    <SourceLinks />
  </div>;
}
