import { ArrowUpRight } from "lucide-react";
import { materialCategories } from "@/data.js";
import { PaintDot } from "@/components/ui/brand-mark";

const total = materialCategories.reduce((sum, category) => sum + category.count, 0);

/** Category tiles (overview) or, with includeAll, a compact chip filter (catalog). */
export function MaterialCategories({ selected = "all", onSelect, includeAll = false }: { selected?: string; onSelect: (code: string) => void; includeAll?: boolean }) {
  if (includeAll) {
    return <div className="category-chips" role="group" aria-label="กรองตามหมวดวัสดุ">
      <button type="button" className={`category-chip ${selected === "all" ? "selected" : ""}`} aria-pressed={selected === "all"} onClick={() => onSelect("all")}>
        <span className="bundle-dots" aria-hidden="true">{materialCategories.map(category => <PaintDot key={category.code} code={category.code} size={5} />)}</span>ทุกหมวด<small>{total}</small>
      </button>
      {materialCategories.map(category => <button type="button" key={category.code} className={`category-chip ${selected === category.code ? "selected" : ""}`} aria-pressed={selected === category.code} onClick={() => onSelect(category.code)}>
        <PaintDot code={category.code} size={16} />{category.name}<small>{category.count}</small>
      </button>)}
    </div>;
  }
  return <div className="material-category-grid" aria-label="หมวดวัสดุงานโครงสร้าง">
    {materialCategories.map(category => <button type="button" key={category.code} className="material-category-card" onClick={() => onSelect(category.code)}>
      <PaintDot code={category.code} size={24} />
      <span><strong>{category.name}</strong><small>{category.count} รายการ</small></span><ArrowUpRight size={16} aria-hidden="true" />
    </button>)}
  </div>;
}
