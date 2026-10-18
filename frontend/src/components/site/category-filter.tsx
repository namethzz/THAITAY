import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, LayoutGrid, X } from "lucide-react";
import { materialCatalog, materialCategories } from "@/data.js";
import { CategoryIcon } from "@/components/site/category-icon";

/** ชื่อหมวดแบบสั้นสำหรับปุ่มกรอง (ชื่อเต็มยาวเกินจะทำให้ปุ่มล้นหลายบรรทัด) */
export const SHORT_CATEGORY: Record<string, string> = {
  "STR-01": "เหล็กเส้น",
  "STR-02": "เหล็กรูปพรรณ",
  "STR-03": "ตะแกรงเหล็ก",
  "STR-04": "ลวดผูกเหล็ก",
  "STR-05": "ลวดอัดแรง",
  "STR-06": "คอนกรีตผสมเสร็จ",
  "STR-07": "คอนกรีตหยาบ",
  "STR-08": "เสาเข็ม · สำเร็จรูป",
  "STR-09": "หิน · ทราย",
};

const OPTIONS = [{ code: "all", name: "ทุกหมวด", count: materialCatalog.length }, ...materialCategories.map(c => ({ code: c.code, name: SHORT_CATEGORY[c.code] ?? c.name, count: c.count }))];

/**
 * ตัวกรองหมวดแบบปุ่มเดียว: หน้าค้นหาเหลือช่องค้นหา + ปุ่มนี้ กดแล้วเลือกหมวดจากรายการพร้อม icon และจำนวน
 * จอใหญ่เปิดเป็นกล่องใต้ปุ่ม มือถือเปิดเป็นแผ่นจากด้านล่าง ใช้ลูกศรขึ้น/ลง Enter และ Esc ได้
 */
export function CategoryFilter({ value, onChange }: { value: string; onChange: (code: string) => void }) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const current = OPTIONS.find(o => o.code === value) ?? OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    setActive(Math.max(0, OPTIONS.findIndex(o => o.code === value)));
    listRef.current?.focus();
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (code: string) => { onChange(code); setOpen(false); buttonRef.current?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive(i => Math.min(i + 1, OPTIONS.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive(i => Math.max(i - 1, 0)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(OPTIONS.length - 1); }
    else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(OPTIONS[active].code); }
    else if (event.key === "Escape" || event.key === "Tab") { setOpen(false); if (event.key === "Escape") buttonRef.current?.focus(); }
  };

  return (
    <div className="cat-filter" ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`cat-filter-btn ${value !== "all" ? "is-set" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        onClick={() => setOpen(o => !o)}
      >
        {value !== "all" && <CategoryIcon code={value} size={24} />}
        <span><small>หมวด</small>{current.name}</span>
        <ChevronDown size={18} aria-hidden="true" />
      </button>
      {value !== "all" && (
        <button type="button" className="cat-filter-clear" aria-label="ดูทุกหมวด" onClick={() => onChange("all")}><X size={16} aria-hidden="true" /></button>
      )}

      {open && (
        <>
          <div className="cat-filter-backdrop" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="cat-filter-panel">
            <div className="cat-filter-head">
              <strong id={`${id}-label`}>เลือกหมวดวัสดุ</strong>
              <button type="button" className="msearch-clear" aria-label="ปิด" onClick={() => setOpen(false)}><X size={18} aria-hidden="true" /></button>
            </div>
            <ul
              ref={listRef}
              id={`${id}-list`}
              role="listbox"
              tabIndex={-1}
              aria-labelledby={`${id}-label`}
              aria-activedescendant={`${id}-opt-${active}`}
              onKeyDown={onKeyDown}
            >
              {OPTIONS.map((o, i) => (
                <li
                  key={o.code}
                  id={`${id}-opt-${i}`}
                  role="option"
                  aria-selected={o.code === value}
                  className={`cat-option ${i === active ? "is-active" : ""}`}
                  onPointerMove={() => setActive(i)}
                  onClick={() => choose(o.code)}
                >
                  {o.code === "all" ? <span className="cat-option-all" aria-hidden="true"><LayoutGrid size={18} /></span> : <CategoryIcon code={o.code} size={36} />}
                  <span className="cat-option-copy"><strong>{o.name}</strong><small>{o.count.toLocaleString("th-TH")} รายการ</small></span>
                  {o.code === value && <Check size={18} strokeWidth={2.6} aria-hidden="true" />}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
