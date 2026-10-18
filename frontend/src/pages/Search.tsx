import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Search, X } from "lucide-react";
import { materialCatalog, materialCategories, searchMaterials } from "@/data.js";
import { MaterialName, QuotePeek, SEARCH_HINTS } from "@/components/site/material-search";
import { CategoryIcon } from "@/components/site/category-icon";
import { CategoryFilter } from "@/components/site/category-filter";
import { DemoNote } from "@/components/ui/price-widgets";
import { hashFor } from "@/lib/routes";
import { FilterButton, ActiveFilters } from "@/components/site/search-filters";
import { NO_FILTERS, applyFilters, rebarGradeSize, useQuotes, type SearchFilters } from "@/lib/searchFilters";

const PAGE = 24;

export default function SearchPage({ initialQuery, initialCategory, initialFilters }: { initialQuery: string; initialCategory: string; initialFilters?: SearchFilters }) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(materialCategories.some(c => c.code === initialCategory) ? initialCategory : "all");
  const [limit, setLimit] = useState(PAGE);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferred = useDeferredValue(query);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters ?? NO_FILTERS);
  const matches = useMemo(() => searchMaterials(deferred, { category }), [deferred, category]);
  // ตัวเลือกในแผงตัวกรองมาจากผลที่ตรงคำค้นและหมวด (มีเฉพาะหน่วย/เกรด/ขนาดที่เจอจริง)
  const options = useMemo(() => {
    const specs = matches.map(rebarGradeSize).filter((s): s is NonNullable<typeof s> => Boolean(s));
    return {
      units: [...new Set(matches.map(m => m.unit))],
      grades: [...new Set(specs.map(s => s.grade))].sort((a, b) => (a < "SD" ? -1 : 0) - (b < "SD" ? -1 : 0) || a.localeCompare(b, "en", { numeric: true })), // SR24 ก่อน แล้ว SD30 → SD50
      sizes: [...new Set(specs.map(s => s.size))].sort((a, b) => Number(a) - Number(b)),
    };
  }, [matches]);
  const needQuotes = filters.trend !== "all" || filters.sort !== "relevance";
  const quotes = useQuotes(matches, needQuotes);
  const results = useMemo(() => applyFilters(matches, filters, needQuotes ? quotes : null), [matches, filters, needQuotes, quotes]);
  const shown = results.slice(0, limit);

  // เปิดหน้ามาเพื่อค้นหา: พร้อมพิมพ์เลย (กลับมาจากหน้าวัสดุพร้อมคำค้นเดิมไม่ต้องเด้งคีย์บอร์ดซ้ำ)
  useEffect(() => { if (!initialQuery) inputRef.current?.focus({ preventScroll: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => setLimit(PAGE), [deferred, category, filters]);
  // จำคำค้นไว้ใน URL (ไม่เพิ่มประวัติทุกตัวอักษร) กดย้อนกลับจากหน้าวัสดุแล้วผลค้นหายังอยู่
  useEffect(() => {
    window.history.replaceState(null, "", hashFor({ page: "search", q: query.trim(), cat: category, filters }));
  }, [query, category, filters]);

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

      <div className="search-tools">
        <div className="search-tools-start">
          <CategoryFilter value={category} onChange={c => { setCategory(c); if (c !== "STR-01" && c !== "all") setFilters(f => ({ ...f, grade: "all", size: "all" })); }} />
          <FilterButton value={filters} onChange={setFilters} options={options} resultCount={results.length} />
        </div>
        <p className="result-count" aria-live="polite">พบ <strong>{results.length.toLocaleString("th-TH")}</strong> รายการ</p>
      </div>
      <ActiveFilters value={filters} onChange={setFilters} />

      {results.length ? (
        <ul className="result-list">
          {shown.map(material => (
            <li key={material.id}>
              <a className="result-row" href={`#m/${material.id}`}>
                <CategoryIcon code={material.categoryCode} size={44} className="row-icon" />
                <MaterialName material={material} className="result-copy" />
                <QuotePeek material={material} showTrend={needQuotes} />
                <ChevronRight className="result-chevron" size={20} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        matches.length ? (
          <div className="empty-state">
            <h2>ไม่มีรายการที่ตรงกับตัวกรอง</h2>
            <p>พบ {matches.length.toLocaleString("th-TH")} รายการจากคำค้นและหมวดนี้ แต่ไม่มีรายการไหนผ่านตัวกรองที่เลือก</p>
            <div className="hint-chips"><button type="button" onClick={() => setFilters(NO_FILTERS)}>ล้างตัวกรอง</button></div>
          </div>
        ) : (
        <div className="empty-state">
          <h2>ไม่พบ “{query.trim()}”</h2>
          <p>ตอนนี้มีเฉพาะวัสดุงานโครงสร้าง: เหล็กเส้น เหล็กรูปพรรณ ตะแกรงเหล็ก ลวด คอนกรีต เสาเข็ม ทราย และหิน ลองพิมพ์สั้นลง หรือเลือกคำเหล่านี้</p>
          <div className="hint-chips">
            {SEARCH_HINTS.map(hint => <button type="button" key={hint} onClick={() => { setCategory("all"); setQuery(hint); }}>{hint}</button>)}
          </div>
        </div>
        )
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
