import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { getMaterialById, materialCatalog, materialCategories } from "@/data.js";
import { Button } from "@/components/ui/button";
import { MaterialCategories } from "@/components/ui/material-categories";
import { MaterialDetails } from "@/components/ui/material-details";
import { PageHeading } from "@/components/ui/scope-layout";
import { PaintDot } from "@/components/ui/brand-mark";
import type { Navigate, SelectionProps } from "@/types";
const PAGE_SIZE = 12;
export default function Materials({ selectedId, onSelect, category, onCategoryChange, navigate }: SelectionProps & { category: string; onCategoryChange: (code: string) => void; navigate: Navigate }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [category, query]);
  const matching = useMemo(() => {
    const terms = query.trim().toLocaleLowerCase("th-TH").split(/\s+/).filter(Boolean);
    return materialCatalog.filter(material => (category === "all" || material.categoryCode === category) && terms.every(term => [material.id, material.name, material.unit, material.category].join(" ").toLocaleLowerCase("th-TH").includes(term)));
  }, [category, query]);
  const groups = materialCategories.map(group => ({ ...group, items: matching.filter(item => item.categoryCode === group.code) })).filter(group => group.items.length);
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const selected = getMaterialById(selectedId)!;
  return <div className="scope-page materials-page"><PageHeading title="รายการวัสดุ">กรองตามหมวด ค้นด้วยชื่อ ขนาด หน่วย หรือรหัสสินค้า แล้วเลือกวัสดุเพื่อดูราคาและพยากรณ์ต่อ</PageHeading>
    <section aria-label="เลือกหมวดวัสดุ"><MaterialCategories selected={category} onSelect={onCategoryChange} includeAll /></section>
    <section className="card catalog-search"><label htmlFor="catalog-query"><Search size={18} /><input id="catalog-query" aria-label="ค้นหารายการวัสดุ" value={query} onChange={event => setQuery(event.target.value)} placeholder="ค้นหาชื่อ รหัส ขนาด หรือหน่วยวัสดุ" />{query && <button type="button" aria-label="ล้างคำค้นหา" onClick={() => setQuery("")}><X size={16} /></button>}</label></section>
    <div className="catalog-result-heading" role="status"><p>พบ <strong>{matching.length}</strong> รายการ{category !== "all" && ` ในหมวด${materialCategories.find(group => group.code === category)?.name}`}</p>{(query || category !== "all") && <Button size="sm" variant="ghost" onClick={() => { setQuery(""); onCategoryChange("all"); }}>ล้างตัวกรอง<X size={13} className="ml-1" /></Button>}</div>
    <div className="catalog-results-grid"><div className="catalog-result-groups">{groups.map(group => { const rows = category === "all" ? group.items.slice(0, 6) : group.items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE); return <section className="card scope-panel material-group" key={group.code} aria-label={`วัสดุหมวด${group.name}`}><div className="material-group-heading"><div><h2><PaintDot code={group.code} />{group.name}</h2><span>{group.items.length} รายการ{category === "all" && group.items.length > 6 ? " · แสดง 6 รายการแรก" : ""}</span></div>{category === "all" && <Button variant="ghost" size="sm" onClick={() => onCategoryChange(group.code)}>ดูหมวดนี้<ChevronRight size={15} className="ml-1" /></Button>}</div><div className="catalog-material-list">{rows.map(material => <button type="button" key={material.id} data-material-id={material.id} className={`catalog-material-row ${selectedId === material.id ? "selected" : ""}`} aria-pressed={selectedId === material.id} onClick={() => onSelect(material.id)}><span className="material-select-indicator">{selectedId === material.id && <Check size={15} />}</span><span className="catalog-material-copy"><strong>{material.name}</strong><small>{material.id}</small></span><span className="catalog-material-unit"><small>หน่วย</small><b>{material.unit}</b></span><span className="material-select-label">{selectedId === material.id ? "เลือกแล้ว" : "เลือก"}</span></button>)}</div>{category !== "all" && pageCount > 1 && <div className="catalog-pagination"><Button size="sm" variant="outline" disabled={currentPage <= 1} onClick={() => setPage(value => value - 1)}><ChevronLeft size={14} />ก่อนหน้า</Button><span>หน้า {currentPage} / {pageCount}</span><Button size="sm" variant="outline" disabled={currentPage >= pageCount} onClick={() => setPage(value => value + 1)}>ถัดไป<ChevronRight size={14} /></Button></div>}</section>; })}
    {!matching.length && <div className="catalog-empty"><Search size={27} /><h2>ไม่พบวัสดุที่ค้นหา</h2><p>ลองเปลี่ยนคำค้นหรือเลือกหมวดอื่น</p><Button variant="outline" onClick={() => { setQuery(""); onCategoryChange("all"); }}>ล้างตัวกรอง</Button></div>}
    </div><aside className="catalog-selection"><MaterialDetails material={selected} navigate={navigate} /></aside></div>
  </div>;
}
