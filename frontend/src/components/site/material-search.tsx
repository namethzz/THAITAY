import { useDeferredValue, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { searchMaterials } from "@/data.js";
import { useQuote } from "@/components/ui/price-widgets";
import { formatPrice } from "@/services/priceService";
import type { Material } from "@/types";

const MAX_OPTIONS = 6;
export const SEARCH_HINTS = ["เหล็กเส้น", "เหล็ก H-Beam", "คอนกรีต", "เสาเข็ม", "ทราย"];

/** ราคาล่าสุดในแถวผลค้นหา: พิมพ์แล้วเห็นราคาเลยโดยไม่ต้องกดเข้าไป */
export function QuotePeek({ material }: { material: Material }) {
  const { data } = useQuote(material);
  return (
    <span className="peek">
      <strong className="num">{data ? `฿${formatPrice(data.latest.price)}` : "—"}</strong>
      <small>ต่อ {material.unit}</small>
    </span>
  );
}

interface Props {
  /** เลือกวัสดุจากรายการ */
  onPick: (material: Material) => void;
  /** ไปหน้าผลค้นหาทั้งหมด */
  onShowAll: (query: string) => void;
  size?: "hero" | "compact";
  label?: string;
}

/**
 * ช่องค้นหาวัสดุแบบ combobox: พิมพ์แล้วขึ้นรายการพร้อมราคา ใช้ลูกศรขึ้น/ลง + Enter ได้
 * Enter โดยยังไม่เลือกแถว: ถ้าเจอรายการเดียวเปิดรายการนั้น ถ้าเจอหลายรายการไปหน้าผลค้นหาทั้งหมด
 */
export function MaterialSearch({ onPick, onShowAll, size = "hero", label = "ค้นหาวัสดุ" }: Props) {
  const id = useId();
  const listId = `${id}-list`;
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const deferred = useDeferredValue(query);
  const all = useMemo(() => (deferred.trim() ? searchMaterials(deferred) : []), [deferred]);
  const options = all.slice(0, MAX_OPTIONS);
  const hasMore = all.length > options.length;
  const optionCount = options.length + (hasMore ? 1 : 0);
  const expanded = open && query.trim() !== "";

  useEffect(() => setActive(-1), [deferred]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const pick = (material: Material) => { setOpen(false); setQuery(""); onPick(material); };
  const showAll = () => { setOpen(false); onShowAll(query.trim()); };

  const submit = () => {
    if (active >= 0 && active < options.length) pick(options[active]);
    else if (active === options.length && hasMore) showAll();
    else if (all.length === 1) pick(all[0]);
    else if (all.length > 1) showAll();
    else if (!query.trim()) inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && optionCount) { event.preventDefault(); setOpen(true); setActive(i => Math.min(i + 1, optionCount - 1)); }
    else if (event.key === "ArrowUp" && optionCount) { event.preventDefault(); setActive(i => Math.max(i - 1, -1)); }
    else if (event.key === "Escape") { if (expanded) setOpen(false); else setQuery(""); }
  };

  return (
    <form
      ref={rootRef}
      role="search"
      className={`msearch msearch-${size} ${expanded ? "is-open" : ""}`}
      onSubmit={event => { event.preventDefault(); submit(); }}
      onBlur={event => { if (!rootRef.current?.contains(event.relatedTarget as Node)) setOpen(false); }}
    >
      <div className="msearch-field">
        <Search className="msearch-icon" size={size === "hero" ? 22 : 18} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={label}
          aria-expanded={expanded}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={expanded && active >= 0 ? `${id}-opt-${active}` : undefined}
          autoComplete="off"
          enterKeyHint="search"
          placeholder="เช่น เหล็กเส้น SD40"
          value={query}
          onChange={event => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => {
            setOpen(true);
            // มือถือ: เลื่อนช่องค้นหาขึ้นไปบนจอ ให้มีที่แสดงรายการเหนือคีย์บอร์ด
            if (size === "hero" && window.matchMedia("(max-width: 767px)").matches) {
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              rootRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
            }
          }}
          onKeyDown={onKeyDown}
        />
        {query && (
          <button type="button" className="msearch-clear" aria-label="ล้างคำค้นหา" onClick={() => { setQuery(""); inputRef.current?.focus(); }}>
            <X size={18} aria-hidden="true" />
          </button>
        )}
        <button type="submit" className="msearch-go">
          <Search size={18} strokeWidth={2.4} aria-hidden="true" /><span>ค้นหา</span>
        </button>
      </div>

      <div className="msearch-panel" hidden={!expanded}>
        {options.length > 0 ? (
          <ul role="listbox" id={listId} aria-label="วัสดุที่ตรงกับคำค้นหา">
            {options.map((material, index) => (
              <li
                key={material.id}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={index === active}
                className="msearch-option"
                onPointerDown={event => event.preventDefault()}
                onPointerEnter={() => setActive(index)}
                onClick={() => pick(material)}
              >
                <span className="msearch-option-copy">
                  <strong>{material.name}</strong>
                  <small>{material.category}</small>
                </span>
                <QuotePeek material={material} />
              </li>
            ))}
            {hasMore && (
              <li
                id={`${id}-opt-${options.length}`}
                role="option"
                aria-selected={active === options.length}
                className="msearch-option msearch-all"
                onPointerDown={event => event.preventDefault()}
                onPointerEnter={() => setActive(options.length)}
                onClick={showAll}
              >
                ดูผลทั้งหมด {all.length.toLocaleString("th-TH")} รายการ<ArrowRight size={16} aria-hidden="true" />
              </li>
            )}
          </ul>
        ) : (
          <div className="msearch-empty" id={listId}>
            <p>ไม่พบ “{query.trim()}” ในวัสดุงานโครงสร้าง ลองคำเหล่านี้</p>
            <div className="hint-chips">
              {SEARCH_HINTS.map(hint => (
                <button type="button" key={hint} onClick={() => { setQuery(hint); setOpen(true); inputRef.current?.focus(); }}>{hint}</button>
              ))}
            </div>
          </div>
        )}
      </div>
      <span className="sr-only" aria-live="polite">{expanded ? (all.length ? `พบ ${all.length} รายการ` : "ไม่พบรายการ") : ""}</span>
    </form>
  );
}
