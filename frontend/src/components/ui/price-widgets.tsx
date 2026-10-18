import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ExternalLink, Minus } from "lucide-react";
import { PRICE_SOURCES } from "@/config/sources";
import { isDemoData, getHistory, getQuote, percentChange, type PriceSeries, type Quote } from "@/services/priceService";
import type { Material } from "@/types";

/** ป้าย "ข้อมูลตัวอย่าง" ติดทุกที่ที่มีตัวเลขราคา จนกว่าจะเชื่อม backend */
export function DemoStamp() {
  if (!isDemoData) return null;
  return <span className="demo-stamp" title="ตัวเลขสร้างขึ้นเพื่อสาธิต ยังไม่ใช่ราคาจริง">ข้อมูลตัวอย่าง</span>;
}

/** แถบอธิบายว่าเป็นข้อมูลตัวอย่าง (ท้ายหน้าที่มีราคา) */
export function DemoNote() {
  if (!isDemoData) return null;
  return (
    <p className="demo-note" role="note">
      <DemoStamp />
      ราคาบนเว็บนี้ยังเป็นตัวเลขตัวอย่างเพื่อสาธิตการใช้งาน ไม่ใช่ราคาจริงหรือผลจากโมเดลพยากรณ์ จะเปลี่ยนเป็นข้อมูลจริงเมื่อเชื่อมระบบหลังบ้าน
    </p>
  );
}

/** ป้ายบอกว่าแพงขึ้น / ถูกลงกี่ % (บอกด้วยคำและลูกศร ไม่ใช้สีอย่างเดียว) */
export function ChangeChip({ from, to, short = false }: { from: number; to: number; short?: boolean }) {
  const change = percentChange(from, to);
  const flat = Math.abs(change) < 0.05;
  const tone = flat ? "flat" : change > 0 ? "up" : "down";
  const Icon = flat ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  const word = flat ? "เท่าเดิม" : change > 0 ? "แพงขึ้น" : "ถูกลง";
  return (
    <span className={`change-chip ${tone}`}>
      <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
      {short ? <span className="sr-only">{word} </span> : <span>{word} </span>}
      {!flat && <span className="num">{Math.abs(change).toFixed(1)}%</span>}
    </span>
  );
}

/** แหล่งที่มาของราคา — กดแล้วเปิดเว็บไซต์ต้นทางในแท็บใหม่ */
export function SourceLinks() {
  return (
    <ul className="source-list" aria-label="แหล่งที่มาของข้อมูลราคา">
      {PRICE_SOURCES.map(source => (
        <li key={source.id}>
          <a href={source.url} target="_blank" rel="noopener noreferrer">
            <span>
              <strong>{source.name}</strong>
              <small>{source.owner}</small>
            </span>
            <ExternalLink size={16} aria-hidden="true" />
            <span className="sr-only"> (เปิดในแท็บใหม่)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; loading: boolean; error: boolean }>({ data: null, loading: true, error: false });
  useEffect(() => {
    let alive = true;
    setState(s => ({ ...s, loading: true, error: false }));
    load().then(data => alive && setState({ data, loading: false, error: false })).catch(() => alive && setState({ data: null, loading: false, error: true }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export const useHistory = (material: Material, months: number) => useAsync<PriceSeries>(() => getHistory(material, months), [material.id, months]);
export const useQuote = (material: Material) => useAsync<Quote>(() => getQuote(material), [material.id]);
