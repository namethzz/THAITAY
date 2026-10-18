import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

const parse = (text: string) => Math.max(0, Number(text.replace(/,/g, "")) || 0);
const tidy = (n: number) => Math.max(0, Math.round(n * 100) / 100);

/** ช่องจำนวนพร้อมปุ่ม − / + : พิมพ์ทศนิยมได้ (เช่น 2.5 ตัน) ปุ่มเพิ่ม/ลดทีละ 1 */
export function QtyStepper({ value, onChange, label, id, size = "md" }: { value: number; onChange: (qty: number) => void; label: string; id?: string; size?: "md" | "sm" }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { if (parse(text) !== value) setText(String(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (next: number) => { const n = tidy(next); setText(String(n)); onChange(n); };
  return (
    <div className={`qty-stepper qty-${size}`}>
      <button type="button" aria-label={`ลด${label}`} onClick={() => set(value - 1)} disabled={value <= 0}><Minus size={size === "sm" ? 16 : 18} aria-hidden="true" /></button>
      <input
        id={id}
        inputMode="decimal"
        aria-label={id ? undefined : label}
        value={text}
        onChange={event => { const next = event.target.value.replace(/[^\d.,]/g, ""); setText(next); onChange(tidy(parse(next))); }}
        onBlur={() => setText(String(value))}
      />
      <button type="button" aria-label={`เพิ่ม${label}`} onClick={() => set(value + 1)}><Plus size={size === "sm" ? 16 : 18} aria-hidden="true" /></button>
    </div>
  );
}
