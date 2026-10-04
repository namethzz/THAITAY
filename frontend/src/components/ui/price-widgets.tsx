import { useEffect, useState } from "react";
import { ExternalLink, Info, Database } from "lucide-react";
import { PRICE_SOURCES } from "@/config/sources";
import { HISTORY_RANGES, HORIZONS, MAX_HISTORY_MONTHS, isDemoData, getForecast, getHistory, type ForecastSeries, type Horizon, type PriceSeries } from "@/services/priceService";
import type { Material } from "@/types";

/** ปุ่มเลือก 1 / 2 / 3 เดือน (ไม่มีตัวเลือกเป็นปี) */
export function MonthTabs({ value, onChange, label = "ช่วงเวลา", prefix = "" }: { value: Horizon; onChange: (h: Horizon) => void; label?: string; prefix?: string }) {
  return (
    <div className="month-tabs" role="radiogroup" aria-label={label}>
      {HORIZONS.map(h => (
        <button type="button" key={h} role="radio" aria-checked={value === h} className={value === h ? "active" : ""} onClick={() => onChange(h)}>
          {prefix}{h} เดือน
        </button>
      ))}
    </div>
  );
}

/** ปุ่มเลือกช่วงย้อนหลัง 3 เดือน – 10 ปี (หน้าวิเคราะห์) */
export function RangeTabs({ value, onChange }: { value: number; onChange: (months: number) => void }) {
  return (
    <div className="month-tabs" role="radiogroup" aria-label="ช่วงย้อนหลัง">
      {HISTORY_RANGES.map(r => {
        const disabled = r.months > MAX_HISTORY_MONTHS;
        return (
          <button type="button" key={r.months} role="radio" aria-checked={value === r.months} disabled={disabled} title={disabled ? "ยังไม่มีข้อมูลย้อนหลังถึงช่วงนี้" : undefined} className={value === r.months ? "active" : ""} onClick={() => onChange(r.months)}>
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

/** แถบเตือนว่าเป็นข้อมูลตัวอย่างจนกว่าจะเชื่อม backend */
export function DemoBanner() {
  if (!isDemoData) return null;
  return (
    <div className="demo-banner" role="note">
      <Info size={16} />
      <p><strong>ข้อมูลตัวอย่าง (Demo)</strong> — ตัวเลขในหน้านี้สร้างขึ้นเพื่อแสดงรูปแบบการใช้งาน ยังไม่ใช่ราคาจริงหรือผลจากโมเดล จะเปลี่ยนเป็นข้อมูลจริงเมื่อเชื่อมต่อ backend</p>
    </div>
  );
}

/** แหล่งที่มาของราคา — กดแล้วเปิดเว็บไซต์ต้นทางในแท็บใหม่ */
export function SourceLinks({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`source-links ${compact ? "compact" : ""}`} aria-label="แหล่งที่มาของข้อมูลราคา">
      <div className="source-links-title"><Database size={15} /><span>แหล่งที่มาของข้อมูลราคา</span></div>
      <ul>
        {PRICE_SOURCES.map(source => (
          <li key={source.id}>
            <a href={source.url} target="_blank" rel="noopener noreferrer">
              <span className="source-links-copy">
                <strong>{source.name}</strong>
                <small>{source.owner}</small>
                {!compact && <em>{source.description}</em>}
              </span>
              <ExternalLink size={15} aria-hidden="true" />
              <span className="sr-only"> (เปิดในแท็บใหม่)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
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
export const useForecast = (material: Material) => useAsync<ForecastSeries>(() => getForecast(material, 3), [material.id]);
