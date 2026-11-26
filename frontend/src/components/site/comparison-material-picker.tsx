import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { searchMaterials } from "@/data.js";
import { materialTitle } from "@/lib/materialTitle";
import type { Material } from "@/types";

export default function ComparisonMaterialPicker({selected, onPick, eligible}: {selected: string[]; onPick: (material: Material) => void; eligible?: ReadonlySet<string>}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const disabled = selected.length >= 5;
  const matches = useMemo(() => searchMaterials(query).filter(m => !selected.includes(m.id) && (!eligible || eligible.has(m.id))), [query, selected, eligible]);
  const options = matches.slice(0, 8);
  const expanded = open && !disabled;
  const pick = (material: Material) => {
    if (disabled || selected.includes(material.id)) return;
    onPick(material); setQuery(""); setOpen(false); setActive(-1); input.current?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, options.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive(i => Math.max(i - 1, 0)); }
    else if (event.key === "Escape") { event.preventDefault(); setOpen(false); setActive(-1); }
    else if (event.key === "Enter") {
      event.preventDefault();
      if (expanded && active >= 0 && options[active]) pick(options[active]);
      else if (options.length === 1) pick(options[0]);
      else setOpen(true);
    }
  };
  return <div ref={root} className="compare-picker" onFocus={event => {
    if (event.target === input.current && window.matchMedia("(max-width: 767px)").matches) root.current?.scrollIntoView({block: "start", behavior: "instant"});
  }} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget as Node)) {setOpen(false); setActive(-1);}}}>
    <label htmlFor={id}>เลือกวัสดุสำหรับกราฟ (สูงสุด 5 รายการ)</label>
    <div className="compare-picker-field">
      <Search size={18} aria-hidden="true" />
      <input id={id} ref={input} type="text" role="combobox" aria-label="ค้นหาวัสดุเพื่อเปรียบเทียบ" aria-autocomplete="list" aria-expanded={expanded} aria-controls={`${id}-options`} aria-activedescendant={expanded && active >= 0 && options[active] ? `${id}-option-${active}` : undefined} autoComplete="off" placeholder={disabled ? "เลือกครบ 5 รายการแล้ว" : "พิมพ์ชื่อวัสดุ เช่น SD40 คอนกรีต DB12"} disabled={disabled} value={query} onChange={e => {setQuery(e.target.value); setOpen(true); setActive(-1);}} onFocus={() => setOpen(true)} onClick={() => setOpen(true)} onKeyDown={onKeyDown} />
      {query && !disabled && <button type="button" aria-label="ล้างคำค้นหาวัสดุเปรียบเทียบ" onMouseDown={e => e.preventDefault()} onClick={() => {setQuery(""); setActive(-1); setOpen(true); input.current?.focus();}}><X size={16} aria-hidden="true" /></button>}
    </div>
    {expanded && <div className="compare-picker-menu">
      <ul id={`${id}-options`} role="listbox" aria-label="วัสดุสำหรับเพิ่มในกราฟ">
        {options.map((material, i) => <li key={material.id} id={`${id}-option-${i}`} role="option" aria-selected={i === active} onPointerDown={e => e.preventDefault()} onPointerMove={() => setActive(i)} onClick={() => pick(material)}>
          <strong>{materialTitle(material).title}</strong><small>{material.name}</small><span>{material.unit}</span>
        </li>)}
      </ul>
      {!options.length && <p className="chart-note">ไม่พบวัสดุที่เพิ่มได้ ลองเปลี่ยนคำค้นหา วัสดุที่เลือกแล้วจะไม่แสดงซ้ำ</p>}
      {matches.length > 8 && <p className="chart-note">พบ {matches.length} รายการ แสดง 8 รายการแรก · พิมพ์ชื่อหรือขนาดเพิ่มเพื่อจำกัดผล</p>}
    </div>}
    {disabled && <p className="chart-note">นำวัสดุออกจากกราฟก่อน เพื่อเลือกวัสดุใหม่</p>}
  </div>;
}
