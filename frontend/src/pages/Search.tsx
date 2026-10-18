import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { materialCatalog, materialCategories, searchMaterials } from "@/data.js";
import { QuotePeek, SEARCH_HINTS } from "@/components/site/material-search";
import { DemoNote } from "@/components/ui/price-widgets";
import { hashFor } from "@/lib/routes";

const PAGE = 24;

export default function SearchPage({ initialQuery, initialCategory }: { initialQuery: string; initialCategory: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(materialCategories.some(c => c.code === initialCategory) ? initialCategory : "all");
  const [limit, setLimit] = useState(PAGE);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(query);
  const results = useMemo(() => searchMaterials(deferred, { category }), [deferred, category]);
  const shown = results.slice(0, limit);

  // เปิดหน้ามาเพื่อค้นหา: พร้อมพิมพ์เลย (กลับมาจากหน้าวัสดุพร้อมคำค้นเดิมไม่ต้องเด้งคีย์บอร์ดซ้ำ)
  useEffect(() => { if (!initialQuery) inputRef.current?.focus({ preventScroll: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setLimit(PAGE), [deferred, category]);
  // จำคำค้นไว้ใน URL (ไม่เพิ่มประวัติทุกตัวอักษร) กดย้อนกลับจากหน้าวัสดุแล้วผลค้นหายังอยู่
  useEffect(() => {
    window.history.replaceState(null, "", hashFor({ page: "search", q: query.trim(), cat: category }));
  }, [query, category]);

  return (
    <div className="page search-page">
      <header className="page-head">
        <h1>ค้นหาราคาวัสดุ</h1>
        <p>วัสดุงานโครงสร้าง {materialCatalog.length} รายการ กดที่รายการเพื่อดูราคาคาดการณ์ กราฟ และคำนวณต้นทุน</p>
      </header>

      <form role="search" className="list-search" onSubmit={event => { event.preventDefault(); inputRef.current?.blur(); }}>
        <Search size={22} aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          aria-label="ค้นหาวัสดุ"
          placeholder="เช่น เหล็กเส้น SD40"
          autoComplete="off"
          enterKeyHint="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        {query && <button type="button" className="msearch-clear" aria-label="ล้างคำค้นหา" onClick={() => { setQuery(""); inputRef.current?.focus(); }}><X size={18} aria-hidden="true" /></button>}
      </form>

      <div className="cat-chips" role="group" aria-label="กรองตามหมวดวัสดุ">
        <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>ทั้งหมด</button>
        {materialCategories.map(c => (
          <button type="button" key={c.code} aria-pressed={category === c.code} onClick={() => setCategory(c.code)}>{c.name}</button>
        ))}
      </div>

      <p className="result-count" aria-live="polite">พบ <strong>{results.length.toLocaleString("th-TH")}</strong> รายการ</p>

      {results.length ? (
        <ul className="result-list">
          {shown.map(material => (
            <li key={material.id}>
              <a className="result-row" href={`#m/${material.id}`}>
                <span className="result-copy">
                  <strong>{material.name}</strong>
                  <small>{material.category}</small>
                </span>
                <QuotePeek material={material} />
                <ChevronRight className="result-chevron" size={20} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>ไม่พบ “{query.trim()}”</h2>
          <p>ตอนนี้มีเฉพาะวัสดุงานโครงสร้าง ลองพิมพ์สั้นลง หรือเลือกคำเหล่านี้</p>
          <div className="hint-chips">
            {SEARCH_HINTS.map(hint => <button type="button" key={hint} onClick={() => { setCategory("all"); setQuery(hint); }}>{hint}</button>)}
          </div>
        </div>
      )}

      {results.length > shown.length && (
        <button type="button" className="btn btn-secondary btn-block more-btn" onClick={() => setLimit(n => n + PAGE)}>
          แสดงเพิ่ม (เหลืออีก {(results.length - shown.length).toLocaleString("th-TH")} รายการ)
        </button>
      )}
      <DemoNote />
    </div>
  );
}
