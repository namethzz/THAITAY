import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, ArrowUpRight, Building2, Database, Sparkles, X } from "lucide-react";
import { defaultMaterialId, getMaterialById, navItems } from "@/data.js";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/ui/header-3";
import { IntroSplash } from "@/components/ui/intro-splash";
import Overview from "@/pages/Overview";
import type { EstimateLine, Navigate, PageId } from "@/types";
import "./styles.css";

const Materials = lazy(() => import("./pages/Materials"));
const Forecast = lazy(() => import("./pages/Forecast"));
const Analysis = lazy(() => import("./pages/Analysis"));
const CostCalculator = lazy(() => import("./pages/CostCalculator"));
const Landing = lazy(() => import("./pages/Landing"));

function validPage(id: string): id is PageId {
  return id === "home" || navItems.some(([pageId]) => pageId === id);
}

function pageFromHash(): PageId {
  const hash = window.location.hash.replace(/^#\/?/, "");
  if (!hash) return "home";
  return validPage(hash) ? hash : "overview";
}

function App() {
  const [page, setPage] = useState<PageId>(pageFromHash);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(defaultMaterialId);
  const [category, setCategory] = useState("all");
  const [estimateLines, setEstimateLines] = useState<EstimateLine[]>([]);
  const sidebarRef = useRef<HTMLElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const title = navItems.find(([id]) => id === page)?.[1] || "ภาพรวม";
  const selectMaterial = (id: string) => { if (getMaterialById(id)) setSelectedId(id); };

  useEffect(() => {
    const handleHash = () => { setPage(pageFromHash()); setMobileOpen(false); window.scrollTo({ top: 0, behavior: "instant" }); };
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  useEffect(() => { document.title = page === "home" ? "THAI เท — Construction Price Intelligence" : `${title} | THAI เท`; }, [page, title]);

  useEffect(() => {
    if (!mobileOpen) return;
    const oldOverflow = document.body.style.overflow;
    const trigger = document.querySelector<HTMLButtonElement>(".mobile-menu");
    document.body.style.overflow = "hidden";
    if (mainRef.current) mainRef.current.inert = true;
    sidebarRef.current?.querySelector<HTMLButtonElement>(".mobile-close")?.focus();
    const closeOnDesktop = () => { if (window.innerWidth > 1100) setMobileOpen(false); };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;
      const items = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]") || []);
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      document.body.style.overflow = oldOverflow;
      if (mainRef.current) mainRef.current.inert = false;
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("resize", closeOnDesktop);
      trigger?.focus();
    };
  }, [mobileOpen]);

  const navigate: Navigate = (nextPage) => {
    setPage(nextPage);
    setMobileOpen(false);
    if (pageFromHash() !== nextPage) window.location.hash = nextPage;
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "instant" }));
  };

  if (page === "home") {
    return (
      <>
        <IntroSplash />
        <Suspense fallback={<div className="min-h-dvh bg-stone-950" role="status" aria-label="กำลังเปิดหน้า" />}>
          <Landing navigate={navigate} />
        </Suspense>
      </>
    );
  }

  return (
    <div className="app">
      <IntroSplash />
      <a href="#main-content" className="skip-link" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>ข้ามไปยังเนื้อหา</a>
      <aside id="primary-navigation" ref={sidebarRef} className={`sidebar ${mobileOpen ? "open" : ""}`} aria-label="เมนูหลัก" role={mobileOpen ? "dialog" : undefined} aria-modal={mobileOpen ? true : undefined}>
        <div className="brand">
          <a href="#home" className="brand-link" aria-label="THAI เท หน้าแรก" onClick={(event) => { event.preventDefault(); navigate("home"); }}>
            <span className="brand-mark"><Building2 size={24} strokeWidth={1.7} /></span>
            <span className="brand-copy"><span className="brand-name">THAI <b>เท</b></span><span className="brand-sub">Construction intelligence</span></span>
          </a>
          <Button type="button" variant="ghost" size="icon" className="mobile-close" aria-label="ปิดเมนู" onClick={() => setMobileOpen(false)}><X size={20} /></Button>
        </div>
        <div className="nav-label">พื้นที่ทำงาน <span>WORKSPACE</span></div>
        <nav>
          {navItems.map(([id, label, Icon]) => (
            <button type="button" key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => navigate(id)} aria-current={page === id ? "page" : undefined}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>{page === id && <span className="nav-active-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-promo">
          <span className="sidebar-promo-icon"><Sparkles size={17} /></span>
          <strong>ประมาณราคาล่วงหน้า</strong>
          <p>เลือกวัสดุ ดูราคาล่วงหน้า 1–3 เดือน<br />แล้วคำนวณต้นทุนได้ทันที</p>
          <button type="button" onClick={() => navigate("cost")}>เปิดหน้าคำนวณต้นทุน<ArrowUpRight size={15} /></button>
        </div>
        <div className="sidebar-bottom">
          <div className="system-status"><span className="dot" />วัสดุหมวดงานโครงสร้าง</div>
          <button type="button" className="sidebar-source" onClick={() => navigate("prices")}><Database size={13} />เลือกรายการวัสดุ<ArrowRight size={13} /></button>
          <div className="version">THAI เท · Frontend v0.5</div>
        </div>
      </aside>
      {mobileOpen && <button type="button" className="mobile-overlay" tabIndex={-1} onClick={() => setMobileOpen(false)} aria-label="ปิดเมนู" />}
      <main className="main" ref={mainRef}>
        <Header page={page} title={title} navigate={navigate} onMenu={() => setMobileOpen(true)} />
        <div id="main-content" className="content" tabIndex={-1}>
          <Suspense fallback={<div className="page-loading" role="status">กำลังเปิดหน้า...</div>}>
            {page === "overview" && <Overview navigate={navigate} selectedId={selectedId} onSelect={selectMaterial} onCategorySelect={code => { setCategory(code); navigate("prices"); }} />}
            {page === "prices" && <Materials selectedId={selectedId} onSelect={selectMaterial} category={category} onCategoryChange={setCategory} navigate={navigate} />}
            {page === "forecast" && <Forecast selectedId={selectedId} onSelect={selectMaterial} navigate={navigate} />}
            {page === "cost" && <CostCalculator selectedId={selectedId} onSelect={selectMaterial} lines={estimateLines} setLines={setEstimateLines} />}
            {page === "analysis" && <Analysis selectedId={selectedId} onSelect={selectMaterial} />}
          </Suspense>
          <footer className="workspace-footer"><span>THAI เท <span className="footer-dot">·</span> Construction Price Intelligence</span><span>ข้อมูลเพื่อประกอบการวางแผน</span></footer>
        </div>
      </main>
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");
createRoot(root).render(<App />);
