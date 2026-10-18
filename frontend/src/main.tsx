import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultMaterialId, getMaterialById } from "@/data.js";
import { IntroSplash } from "@/components/ui/intro-splash";
import { BottomNav, SiteFooter, SiteHeader, Toast, type ToastMessage } from "@/components/site/chrome";
import Home from "./pages/Home";
import { hashFor, routeFromHash } from "@/lib/routes";
import type { AddLine, EstimateLine, Go, Route } from "@/types";
import "./styles.css";

const SearchPage = lazy(() => import("./pages/Search"));
const MaterialPage = lazy(() => import("./pages/MaterialPage"));
const Estimate = lazy(() => import("./pages/Estimate"));

const ESTIMATE_KEY = "thai-tay-estimate-v1";

function loadLines(): EstimateLine[] {
  try {
    const saved = JSON.parse(localStorage.getItem(ESTIMATE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter(line => line && getMaterialById(line.materialId) && Number.isFinite(line.price) && Number.isFinite(line.qty)) : [];
  } catch {
    return [];
  }
}

function pageTitle(route: Route) {
  if (route.page === "search") return "ค้นหาราคาวัสดุ | THAI TAY";
  if (route.page === "material") return `${getMaterialById(route.id)?.name ?? "วัสดุ"} | THAI TAY`;
  if (route.page === "estimate") return "ใบประมาณราคา | THAI TAY";
  return "THAI TAY — รู้ราคาวัสดุก่อสร้างล่วงหน้า 3 เดือน";
}

function App() {
  const [selectedId, setSelectedId] = useState(defaultMaterialId);
  const [route, setRoute] = useState<Route>(() => routeFromHash(defaultMaterialId));
  const [lines, setLines] = useState<EstimateLine[]>(loadLines);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash(selectedId));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [selectedId]);

  useEffect(() => {
    if (route.page === "material") setSelectedId(route.id);
  }, [route]);

  // เปลี่ยนหน้าแล้วกลับไปบนสุด และย้าย focus ไปที่เนื้อหา ให้โปรแกรมอ่านหน้าจอเริ่มอ่านหน้าใหม่ (ไม่ทำตอนเปิดเว็บครั้งแรก)
  const pageKey = route.page === "material" ? `m/${route.id}` : route.page;
  useEffect(() => {
    document.title = pageTitle(route);
    setToast(null);
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!mainRef.current?.contains(document.activeElement)) mainRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  useEffect(() => {
    try { localStorage.setItem(ESTIMATE_KEY, JSON.stringify(lines)); } catch { /* ใช้งานต่อได้แม้บันทึกไม่ได้ */ }
  }, [lines]);

  const go: Go = useCallback(next => {
    const hash = hashFor(next);
    if (window.location.hash === hash) setRoute(next);
    else window.location.hash = hash;
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const addLine: AddLine = useCallback(line => {
    setLines(prev => [...prev, { ...line, key: `${line.materialId}-${line.month}-${Date.now()}` }]);
    setToast({ id: Date.now(), text: "เพิ่มลงใบประมาณราคาแล้ว", detail: `${line.name} · ${line.qty.toLocaleString("th-TH")} ${line.unit}` });
  }, []);

  return (
    <div className="site">
      <IntroSplash />
      <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>ข้ามไปยังเนื้อหา</a>
      <SiteHeader route={route} count={lines.length} />
      <main id="main-content" ref={mainRef} tabIndex={-1} className="site-main">
        <Suspense fallback={<div className="page-loading" role="status">กำลังเปิดหน้า…</div>}>
          {route.page === "home" && <Home selectedId={selectedId} onSelect={setSelectedId} go={go} />}
          {route.page === "search" && <SearchPage key={`${route.q}|${route.cat}`} initialQuery={route.q} initialCategory={route.cat} />}
          {route.page === "material" && <MaterialPage key={route.id} id={route.id} go={go} addLine={addLine} />}
          {route.page === "estimate" && <Estimate lines={lines} setLines={setLines} />}
        </Suspense>
      </main>
      <SiteFooter />
      <BottomNav route={route} count={lines.length} />
      <Toast message={toast} onDone={clearToast} count={lines.length} />
    </div>
  );
}

const root = document.getElementById("root");
if (!root) throw new Error("Root element is missing");
createRoot(root).render(<App />);
