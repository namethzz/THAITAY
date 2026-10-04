import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Layers3,
  PackageSearch,
  Search,
  X,
} from "lucide-react";

const INITIAL_LIMIT = 60;
const LOAD_MORE_COUNT = 60;

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase("th-TH");
}


export default function MaterialPicker({
  materials = [],
  value,
  onChange,
  label = "วัสดุที่เลือก",
  placeholder = "ค้นหาชื่อ รหัส หมวด หรือหน่วย",
}) {
  const rootRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_LIMIT);
  const [activeIndex, setActiveIndex] = useState(0);

  const selected = useMemo(
    () => materials.find((item) => String(item?.id) === String(value)) ?? null,
    [materials, value]
  );

  const searchIndex = useMemo(
    () =>
      materials.map((material) => ({
        material,
        text: normalize(
          [material?.id, material?.name, material?.category, material?.unit].join(" ")
        ),
      })),
    [materials]
  );

  const categories = useMemo(() => {
    const counts = new Map();
    materials.forEach((material) => {
      const name = String(material?.category || "ไม่ระบุหมวด");
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "th"));
  }, [materials]);

  const filtered = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    return searchIndex
      .filter(({ material, text }) => {
        const categoryMatched =
          category === "all" || String(material?.category || "ไม่ระบุหมวด") === category;
        return categoryMatched && terms.every((term) => text.includes(term));
      })
      .map(({ material }) => material);
  }, [searchIndex, query, category]);

  const visibleResults = useMemo(
    () => filtered.slice(0, visibleLimit),
    [filtered, visibleLimit]
  );

  useEffect(() => {
    setVisibleLimit(INITIAL_LIMIT);
    setActiveIndex(0);
  }, [query, category]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => searchRef.current?.focus(), 20);
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const choose = (material) => {
    onChange?.(String(material.id), material);
    setOpen(false);
  };

  const handleSearchKeyDown = (event) => {
    if (!visibleResults.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleResults.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(visibleResults[activeIndex] ?? visibleResults[0]);
    }
  };

  return (
    <div className="mp-root" ref={rootRef}>
      <style>{MATERIAL_PICKER_STYLES}</style>
      <button
        type="button"
        className={`mp-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="mp-trigger-icon"><PackageSearch size={19} /></span>
        <span className="mp-trigger-copy">
          <small>{label}</small>
          <strong>{selected?.name || "ยังไม่มีรายการวัสดุ"}</strong>
          <em>
            {selected
              ? `${selected.id} • ${selected.category} • ${selected.unit}`
              : "เลือกวัสดุจากรายการงานโครงสร้าง"}
          </em>
        </span>
        <span className="mp-trigger-unit">
          <small>หน่วย</small>
          <strong>{selected?.unit || "—"}</strong>
        </span>
        <ChevronDown className="mp-chevron" size={18} />
      </button>

      {open && (
        <div className="mp-popover">
          <div className="mp-popover-head">
            <div>
              <strong>เลือกวัสดุงานโครงสร้าง</strong>
              <span>{materials.length.toLocaleString("th-TH")} รายการ • {categories.length} หมวด</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="ปิดตัวเลือก">
              <X size={18} />
            </button>
          </div>

          <div className="mp-filters">
            <label className="mp-search">
              <Search size={17} />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={placeholder}
                role="combobox"
                aria-label="ค้นหารายการวัสดุ"
                aria-controls="material-picker-results"
                aria-expanded={open}
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} aria-label="ล้างคำค้นหา">
                  <X size={15} />
                </button>
              )}
            </label>

            <label className="mp-category">
              <Layers3 size={17} />
              <select aria-label="กรองตามหมวดวัสดุ" value={category} onChange={(event) => setCategory(event.target.value)}>
                <option value="all">ทุกหมวด ({materials.length.toLocaleString("th-TH")})</option>
                {categories.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name} ({item.count.toLocaleString("th-TH")})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mp-result-summary">
            <span>พบ {filtered.length.toLocaleString("th-TH")} รายการ</span>
            {(query || category !== "all") && (
              <button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <div id="material-picker-results" className="mp-list" role="listbox">
            {visibleResults.map((material, index) => {
              const isSelected = String(material.id) === String(selected?.id);
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  key={material.id}
                  className={`${isSelected ? "selected" : ""} ${index === activeIndex ? "active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(material)}
                >
                  <span className="mp-item-code">{material.id}</span>
                  <span className="mp-item-copy">
                    <strong>{material.name}</strong>
                    <small>{material.category} • {material.unit}</small>
                  </span>
                  <span className="mp-item-unit">{material.unit}</span>
                  <span className="mp-item-check">{isSelected && <Check size={16} />}</span>
                </button>
              );
            })}

            {!visibleResults.length && (
              <div className="mp-empty">
                <PackageSearch size={25} />
                <strong>ไม่พบวัสดุที่ค้นหา</strong>
                <span>ลองค้นด้วยรหัส 16 หลัก ชื่อสินค้า หมวด หรือหน่วย</span>
              </div>
            )}
          </div>

          {visibleLimit < filtered.length && (
            <button
              type="button"
              className="mp-load-more"
              onClick={() => setVisibleLimit((limit) => limit + LOAD_MORE_COUNT)}
            >
              แสดงเพิ่มอีก {Math.min(LOAD_MORE_COUNT, filtered.length - visibleLimit).toLocaleString("th-TH")} รายการ
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const MATERIAL_PICKER_STYLES = `
  .mp-root { position:relative; width:100%; min-width:0; font:inherit; }
  .mp-trigger { width:100%; min-height:72px; display:grid; grid-template-columns:auto minmax(0,1fr) auto auto; align-items:center; gap:12px; padding:11px 13px; border:1px solid rgba(148,163,184,.22); border-radius:15px; background:linear-gradient(180deg,rgba(255,255,255,.92),rgba(248,250,252,.76)); color:inherit; text-align:left; cursor:pointer; box-shadow:0 8px 28px rgba(15,23,42,.045); transition:border-color .18s ease,box-shadow .18s ease,transform .18s ease; }
  .mp-trigger:hover,.mp-trigger.open { border-color:rgba(112,68,26,.48); box-shadow:0 12px 34px rgba(112,68,26,.1); } .mp-trigger:active { transform:translateY(1px); }
  .mp-trigger-icon { width:40px; height:40px; display:grid; place-items:center; border-radius:12px; color:#70441a; background:linear-gradient(145deg,rgba(112,68,26,.14),rgba(128,83,41,.06)); }
  .mp-trigger-copy { min-width:0; } .mp-trigger-copy small,.mp-trigger-copy strong,.mp-trigger-copy em,.mp-trigger-unit small,.mp-trigger-unit strong { display:block; }
  .mp-trigger-copy small,.mp-trigger-unit small { margin-bottom:3px; font-size:11px; font-weight:750; letter-spacing:.03em; opacity:.62; }
  .mp-trigger-copy strong { overflow:hidden; font-size:13px; line-height:1.4; text-overflow:ellipsis; white-space:nowrap; }
  .mp-trigger-copy em { margin-top:3px; overflow:hidden; font-size:11px; font-style:normal; opacity:.62; text-overflow:ellipsis; white-space:nowrap; }
  .mp-trigger-unit { min-width:105px; text-align:right; } .mp-trigger-unit strong { font-size:14px; color:#523215; }
  .mp-chevron { opacity:.45; transition:transform .18s ease; } .mp-trigger.open .mp-chevron { transform:rotate(180deg); }
  .mp-popover { position:absolute; z-index:120; top:calc(100% + 9px); left:0; width:min(760px,calc(100vw - 34px)); overflow:hidden; border:1px solid rgba(148,163,184,.22); border-radius:17px; background:rgba(255,255,255,.985); color:#0f172a; box-shadow:0 26px 70px rgba(15,23,42,.2); -webkit-backdrop-filter:blur(18px); backdrop-filter:blur(18px); }
  .mp-popover-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:15px 16px 12px; border-bottom:1px solid rgba(148,163,184,.14); }
  .mp-popover-head strong,.mp-popover-head span { display:block; } .mp-popover-head strong { font-size:14px; } .mp-popover-head span { margin-top:3px; font-size:11px; color:#64748b; }
  .mp-popover-head button,.mp-search button { width:34px; height:34px; display:grid; place-items:center; flex:0 0 auto; border:0; border-radius:9px; background:#f1f5f9; color:#64748b; cursor:pointer; }
  .mp-filters { display:grid; grid-template-columns:minmax(0,1.5fr) minmax(220px,.7fr); gap:9px; padding:12px 14px 8px; }
  .mp-search,.mp-category { min-height:43px; display:flex; align-items:center; gap:8px; padding:0 10px; border:1px solid #e2e8f0; border-radius:11px; background:#f8fafc; }
  .mp-search > svg,.mp-category > svg { flex:0 0 auto; color:#64748b; } .mp-search input,.mp-category select { width:100%; min-width:0; border:0; outline:0; background:transparent; color:#0f172a; font:inherit; font-size:12px; }
  .mp-search button { width:28px; height:28px; background:transparent; }
  .mp-result-summary { min-height:44px; display:flex; align-items:center; justify-content:space-between; gap:10px; padding:0 16px; color:#64748b; font-size:11px; }
  .mp-result-summary button { border:0; background:transparent; color:#70441a; cursor:pointer; font:inherit; font-weight:750; }
  .mp-list { max-height:370px; overflow:auto; padding:4px 8px 8px; overscroll-behavior:contain; scrollbar-width:thin; }
  .mp-list > button { width:100%; min-height:50px; display:grid; grid-template-columns:112px minmax(0,1fr) 105px 24px; align-items:center; gap:10px; padding:10px; border:0; border-radius:11px; background:transparent; color:#0f172a; text-align:left; cursor:pointer; }
  .mp-list > button:hover,.mp-list > button.active { background:#f1f5f9; } .mp-list > button.selected { background:rgba(112,68,26,.08); }
  .mp-item-code { width:max-content; max-width:112px; padding:5px 7px; overflow:hidden; border-radius:7px; background:#eef2ff; color:#3730a3; font-size:11px; font-weight:800; text-overflow:ellipsis; white-space:nowrap; }
  .mp-item-copy { min-width:0; } .mp-item-copy strong,.mp-item-copy small { display:block; } .mp-item-copy strong { overflow:hidden; font-size:13px; line-height:1.4; text-overflow:ellipsis; white-space:nowrap; } .mp-item-copy small { margin-top:3px; overflow:hidden; color:#64748b; font-size:11px; text-overflow:ellipsis; white-space:nowrap; }
  .mp-item-unit { text-align:right; color:#0f172a; font-size:12px; font-weight:800; } .mp-item-check { color:#70441a; }
  .mp-empty { min-height:160px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px; color:#64748b; text-align:center; } .mp-empty strong { color:#334155; font-size:13px; } .mp-empty span { font-size:12px; }
  .mp-load-more { width:100%; min-height:46px; border:0; border-top:1px solid #e2e8f0; background:#f8fafc; color:#70441a; cursor:pointer; font:inherit; font-size:12px; font-weight:800; }
  .mp-trigger,.mp-popover button,.mp-popover select,.mp-popover input { touch-action:manipulation; -webkit-tap-highlight-color:transparent; }
  .mp-trigger:focus-visible,.mp-popover button:focus-visible,.mp-popover select:focus-visible,.mp-popover input:focus-visible { outline:3px solid rgba(112,68,26,.24); outline-offset:2px; }
  @media (max-width:620px) {
    .mp-trigger { grid-template-columns:auto minmax(0,1fr) auto; min-height:70px; } .mp-trigger-unit { display:none; }
    .mp-popover { position:fixed; top:max(70px,calc(env(safe-area-inset-top) + 12px)); right:max(12px,env(safe-area-inset-right)); bottom:max(12px,env(safe-area-inset-bottom)); left:max(12px,env(safe-area-inset-left)); width:auto; display:flex; flex-direction:column; max-height:none; border-radius:16px; overscroll-behavior:contain; }
    .mp-filters { grid-template-columns:1fr; } .mp-search input,.mp-category select { font-size:16px; }
    .mp-popover-head button,.mp-search button { width:44px; height:44px; }
    .mp-search,.mp-category { min-height:48px; }
    .mp-list { max-height:none; flex:1; } .mp-list > button { min-height:58px; grid-template-columns:minmax(86px,105px) minmax(0,1fr) 24px; }
    .mp-item-unit { display:none; }
  }
  @media (max-width:390px) { .mp-trigger-icon { width:36px; height:36px; } .mp-trigger { gap:9px; padding:10px; } .mp-trigger-copy strong { font-size:13px; } }
  @media (prefers-reduced-motion:reduce) { .mp-root * { scroll-behavior:auto !important; transition-duration:.01ms !important; animation-duration:.01ms !important; } }
`;
