import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { defaultMaterialId, getMaterialById } from "@/data.js";
import { IntroSplash } from "@/components/ui/intro-splash";
import { BottomNav, SiteFooter, SiteHeader, Toast, type ToastMessage } from "@/components/site/chrome";
import Home from "./pages/Home";
import { hashFor, routeFromHash } from "@/lib/routes";
import { materialTitle } from "@/lib/materialTitle";
import { usePersistentState } from "@/lib/storage";
import type { AddLine, EstimateLine, EstimateMeta, Go, Route } from "@/types";
import "./styles.css";

const SearchPage = lazy(() => import("./pages/Search"));
const MaterialPage = lazy(() => import("./pages/MaterialPage"));
const Estimate = lazy(() => import("./pages/Estimate"));

const DEFAULT_META: EstimateMeta = { project: "", customer: "", contingency: 0, vat: true };
const cleanLines = (saved: unknown): EstimateLine[] =>
  Array.isArray(saved) ? saved.filter(line => line && getMaterialById(line.materialId) && Number.isFinite(line.price) && Number.isFinite(line.qty)) : [];
const cleanMeta = (saved: unknown): EstimateMeta => {
  const s = (saved ?? {}) as Partial<EstimateMeta>;
  return {
    project: typeof s.project === "string" ? s.project : "",
    customer: typeof s.customer === "string" ? s.customer : "",
    contingency: [0, 3, 5, 10].includes(s.contingency as number) ? (s.contingency as number) : 0,
    vat: s.vat !== false,
  };
};
const cleanWatch = (saved: unknown): string[] => (Array.isArray(saved) ? saved.filter(id => typeof id === "string" && getMaterialById(id)) : []);

const titleOf = (id: string, fallback: string) => { const material = getMaterialById(id); return material ? materialTitle(material).title : fallback; };

function pageTitle(route: Route) {
  if (route.page === "search") return "ค้นหาราคาวัสดุ | THAI TAY";
  if (route.page === "material") { const material = getMaterialById(route.id); return `${material ? materialTitle(material).title : "วัสดุ"} | THAI TAY`; }
  if (route.page === "estimate") return "ใบประมาณราคา | THAI TAY";
  return "THAI TAY — รู้ราคาวัสดุก่อสร้างล่วงหน้า 3 เดือน";
}

function App() {
  const [selectedId, setSelectedId] = useState(defaultMaterialId);
  const [route, setRoute] = useState<Route>(() => routeFromHash(defaultMaterialId));
  const [lines, setLines] = usePersistentState<EstimateLine[]>("thai-tay-estimate-v1", [], cleanLines);
  const [meta, setMeta] = usePersistentState<EstimateMeta>("thai-tay-estimate-meta-v1", DEFAULT_META, cleanMeta);
  const [watch, setWatch] = usePersistentState<string[]>("thai-tay-watch-v1", [], cleanWatch);
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

  const go: Go = useCallback(next => {
    const hash = hashFor(next);
    if (window.location.hash === hash) setRoute(next);
    else window.location.hash = hash;
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  const addLine: AddLine = useCallback(line => {
    setLines(prev => [...prev, { ...line, key: `${line.materialId}-${line.month}-${Date.now()}` }]);
    setToast({ id: Date.now(), text: "เพิ่มลงใบประมาณราคาแล้ว", detail: `${titleOf(line.materialId, line.name)} · ${line.qty.toLocaleString("th-TH")} ${line.unit}`, action: "estimate" });
  }, [setLines]);

  // ติดตามวัสดุ: วัสดุที่ติดตามแสดงราคาและแนวโน้มที่หน้าแรก (บอกทางไปหน้าแรกเมื่อกดจากหน้าอื่น)
  const onHome = route.page === "home";
  const toggleWatch = useCallback((id: string) => {
    const watching = watch.includes(id);
    setWatch(watching ? watch.filter(x => x !== id) : [id, ...watch]);
    if (!watching && !onHome) setToast({ id: Date.now(), text: "ติดตามแล้ว ราคาจะแสดงที่หน้าแรก", detail: titleOf(id, ""), action: "home" });
  }, [watch, setWatch, onHome]);
  const watchProps = { watch, onToggleWatch: toggleWatch };

  return (
    <div className="site">
      <IntroSplash />
      <a href="#main-content" className="skip-link" onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>ข้ามไปยังเนื้อหา</a>
      <SiteHeader route={route} count={lines.length} />
      <main id="main-content" ref={mainRef} tabIndex={-1} className="site-main">
        <Suspense fallback={<div className="page-loading" role="status">กำลังเปิดหน้า…</div>}>
          {route.page === "home" && <Home selectedId={selectedId} onSelect={setSelectedId} go={go} {...watchProps} />}
          {route.page === "search" && <SearchPage key={`${route.q}|${route.cat}`} initialQuery={route.q} initialCategory={route.cat} />}
          {route.page === "material" && <MaterialPage key={route.id} id={route.id} go={go} addLine={addLine} {...watchProps} />}
          {route.page === "estimate" && <Estimate key={route.shared ?? "mine"} shared={route.shared} lines={lines} setLines={setLines} meta={meta} setMeta={setMeta} go={go} notify={setToast} />}
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
