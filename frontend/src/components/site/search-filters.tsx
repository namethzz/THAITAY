import { useEffect, useId, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { NO_FILTERS, SORTS, TRENDS, filterCount, type SearchFilters } from "@/lib/searchFilters";

interface Options { units: string[]; grades: string[]; sizes: string[] }

/** กลุ่มตัวเลือกแบบชิป (radio): เลือกได้ทีละค่า */
function ChipGroup({ legend, name, value, options, onChange, note }: { legend: string; name: string; value: string; options: { key: string; label: string }[]; onChange: (v: string) => void; note?: string }) {
  return (
    <fieldset className="fgroup">
      <legend>{legend}</legend>
      <div className="fchips">
        {options.map(o => (
          <label key={o.key}>
            <input type="radio" name={name} checked={value === o.key} onChange={() => onChange(o.key)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      {note && <p className="fnote">{note}</p>}
    </fieldset>
  );
}

/**
 * ปุ่ม "ตัวกรอง" + แผงตัวเลือก: เรียงตาม, แนวโน้มราคา 3 เดือน, หน่วย และสเปกเหล็กเส้น (เกรด/ขนาด เมื่อมีเหล็กเส้นในผลค้นหา)
 * เลือกแล้วผลเปลี่ยนทันที จอใหญ่เป็นกล่องใต้ปุ่ม มือถือเป็นแผ่นจากด้านล่าง
 */
export function FilterButton({ value, onChange, options, resultCount }: { value: SearchFilters; onChange: (f: SearchFilters) => void; options: Options; resultCount: number }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const count = filterCount(value) + (value.sort !== "relevance" ? 1 : 0);
  const set = (patch: Partial<SearchFilters>) => onChange({ ...value, ...patch });
  const close = () => { setOpen(false); buttonRef.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLInputElement>("input:checked")?.focus({ preventScroll: true });
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", esc); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const all = { key: "all", label: "ทั้งหมด" };
  return (
    <div className="cat-filter filter-wrap" ref={rootRef}>
      <button ref={buttonRef} type="button" className={`cat-filter-btn filter-btn ${count ? "is-set" : ""}`} aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(o => !o)}>
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span>ตัวกรอง</span>
        {count > 0 && <span className="count-badge" aria-label={`เปิดอยู่ ${count} อย่าง`}>{count}</span>}
      </button>

      {open && (
        <>
          <div className="cat-filter-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="cat-filter-panel filter-panel" id={`${id}-panel`} ref={panelRef} role="dialog" aria-label="ตัวกรองและการเรียง">
            <div className="cat-filter-head">
              <strong>ตัวกรอง</strong>
              <button type="button" className="msearch-clear" aria-label="ปิด" onClick={close}><X size={18} aria-hidden="true" /></button>
            </div>
            <div className="filter-body">
              <ChipGroup legend="เรียงตาม" name={`${id}-sort`} value={value.sort} options={SORTS} onChange={v => set({ sort: v as SearchFilters["sort"] })}
                note={(value.sort === "priceAsc" || value.sort === "priceDesc") && value.unit === "all" && options.units.length > 1 ? "ราคาเทียบกันได้เฉพาะหน่วยเดียวกัน จึงจัดกลุ่มตามหน่วยก่อน" : undefined} />
              <ChipGroup legend="แนวโน้มราคา 3 เดือน" name={`${id}-trend`} value={value.trend} options={TRENDS} onChange={v => set({ trend: v as SearchFilters["trend"] })} />
              {options.units.length > 1 && (
                <ChipGroup legend="หน่วยที่ขาย" name={`${id}-unit`} value={value.unit} options={[all, ...options.units.map(u => ({ key: u, label: u }))]} onChange={v => set({ unit: v })} />
              )}
              {options.grades.length > 0 && (
                <>
                  <ChipGroup legend="เหล็กเส้น: เกรด" name={`${id}-grade`} value={value.grade} options={[all, ...options.grades.map(g => ({ key: g, label: g }))]} onChange={v => set({ grade: v })} />
                  <ChipGroup legend="เหล็กเส้น: ขนาด (มม.)" name={`${id}-size`} value={value.size} options={[all, ...options.sizes.map(s => ({ key: s, label: s }))]} onChange={v => set({ size: v })} />
                </>
              )}
            </div>
            <div className="filter-foot">
              <button type="button" className="btn btn-ghost" onClick={() => onChange(NO_FILTERS)} disabled={!count}>ล้างทั้งหมด</button>
              <button type="button" className="btn btn-primary" onClick={close}>ดู {resultCount.toLocaleString("th-TH")} รายการ</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/** ชิปของตัวกรองที่เปิดอยู่ ใต้แถบเครื่องมือ กด ✕ เพื่อเอาออกทีละอย่าง */
export function ActiveFilters({ value, onChange }: { value: SearchFilters; onChange: (f: SearchFilters) => void }) {
  const chips: { label: string; reset: Partial<SearchFilters> }[] = [];
  if (value.sort !== "relevance") chips.push({ label: `เรียง: ${SORTS.find(s => s.key === value.sort)?.label}`, reset: { sort: "relevance" } });
  if (value.trend !== "all") chips.push({ label: TRENDS.find(t => t.key === value.trend)?.label ?? "", reset: { trend: "all" } });
  if (value.unit !== "all") chips.push({ label: `ต่อ ${value.unit}`, reset: { unit: "all" } });
  if (value.grade !== "all") chips.push({ label: value.grade, reset: { grade: "all" } });
  if (value.size !== "all") chips.push({ label: `${value.size} มม.`, reset: { size: "all" } });
  if (!chips.length) return null;
  return (
    <ul className="active-filters" aria-label="ตัวกรองที่เปิดอยู่">
      {chips.map(c => (
        <li key={c.label}>
          <button type="button" onClick={() => onChange({ ...value, ...c.reset })} aria-label={`เอาตัวกรอง ${c.label} ออก`}>
            {c.label}<X size={14} aria-hidden="true" />
          </button>
        </li>
      ))}
    </ul>
  );
}
