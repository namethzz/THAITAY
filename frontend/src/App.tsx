import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { defaultMaterialId, getMaterialById } from "@/data.js";
import { IntroSplash } from "@/components/ui/intro-splash";
import {
  BottomNav,
  SiteFooter,
  SiteHeader,
  Toast,
  type ToastMessage,
} from "@/components/site/chrome";
import { DEFAULT_META, cleanLines, cleanMeta, cleanWatch } from "@/lib/savedState";
import { WatchList } from "@/components/site/watch-list";
import Home from "./pages/Home";
import { hashFor, routeFromHash } from "@/lib/routes";
import { materialTitle } from "@/lib/materialTitle";
import { usePersistentState } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import AuthPage from "@/pages/AuthPage";
import type { AddLine, EstimateLine, EstimateMeta, Go, Route } from "@/types";

const SearchPage = lazy(() => import("./pages/Search"));
const MaterialPage = lazy(() => import("./pages/MaterialPage"));
const Estimate = lazy(() => import("./pages/Estimate"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

const titleOf = (id: string, fallback: string) => {
  const material = getMaterialById(id);
  return material ? materialTitle(material).title : fallback;
};

function pageTitle(route: Route) {
  if (route.page === "watchlist") return "วัสดุที่ติดตาม | THAI TAY";
  if (route.page === "dashboard") return "ภาพรวมราคา | THAI TAY";
  if (route.page === "login") return "เข้าสู่ระบบ | THAI TAY";
  if (route.page === "register") return "สมัครสมาชิก | THAI TAY";
  if (route.page === "search") return "ค้นหาราคาวัสดุ | THAI TAY";
  if (route.page === "material") {
    const material = getMaterialById(route.id);
    return `${material ? materialTitle(material).title : "วัสดุ"} | THAI TAY`;
  }
  if (route.page === "estimate") return "ใบประมาณราคา | THAI TAY";
  return "THAI TAY — รู้ราคาวัสดุก่อสร้างล่วงหน้า 3 เดือน";
}

export default function App() {
  const { user, loading: authLoading, saveWatch, logout } = useAuth();
  const [selectedId, setSelectedId] = useState(defaultMaterialId);
  const [route, setRoute] = useState<Route>(() => routeFromHash(defaultMaterialId));
  const authHasBeenVisited = useRef(route.page === "login" || route.page === "register");
  const [lines, setLines] = usePersistentState<EstimateLine[]>(
    "thai-tay-estimate-v1",
    [],
    cleanLines,
  );
  const [meta, setMeta] = usePersistentState<EstimateMeta>(
    "thai-tay-estimate-meta-v1",
    DEFAULT_META,
    cleanMeta,
  );
  const [deviceWatch, setDeviceWatch] = usePersistentState<string[]>("thai-tay-watch-v1", [], cleanWatch);
  const watch = user ? cleanWatch(user.watchlist).reverse() : deviceWatch;
  const pendingWatch = useRef(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash(selectedId));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [selectedId]);

  useEffect(() => {
    if (route.page === "login" || route.page === "register") authHasBeenVisited.current = true;
  }, [route.page]);

  useEffect(() => {
    if (route.page === "material") setSelectedId(route.id);
  }, [route]);

  // เปลี่ยนหน้าแล้วกลับไปบนสุด และย้าย focus ไปที่เนื้อหา ให้โปรแกรมอ่านหน้าจอเริ่มอ่านหน้าใหม่ (ไม่ทำตอนเปิดเว็บครั้งแรก)
  const pageKey = route.page === "material" ? `m/${route.id}` : route.page;
  useEffect(() => {
    document.title = pageTitle(route);
    setToast(null);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!mainRef.current?.contains(document.activeElement))
      mainRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const go: Go = useCallback((next) => {
    const hash = hashFor(next);
    if (window.location.hash === hash) setRoute(next);
    else window.location.hash = hash;
  }, []);

  useEffect(() => {
    if (!authLoading && user && (route.page === "login" || route.page === "register")) {
      go({ page: "home" });
    }
  }, [authLoading, user, route.page, go]);

  const clearToast = useCallback(() => setToast(null), []);
  const onLogout = useCallback(async () => {
    try {
      await logout();
      go({ page: "login" });
    } catch (error) {
      setToast({
        id: Date.now(),
        text: "ออกจากระบบไม่สำเร็จ",
        detail: error instanceof Error ? error.message : "กรุณาลองอีกครั้ง",
        tone: "error",
      });
    }
  }, [logout, go]);
  const onAuthSuccess = useCallback(() => go({ page: "home" }), [go]);
  const authPage = route.page === "login" || route.page === "register";

  const addLine: AddLine = useCallback(
    (line) => {
      setLines((prev) => [
        ...prev,
        { ...line, key: `${line.materialId}-${line.month}-${Date.now()}` },
      ]);
      setToast({
        id: Date.now(),
        text: "เพิ่มลงใบประมาณราคาแล้ว",
        detail: `${titleOf(line.materialId, line.name)} · ${line.qty.toLocaleString("th-TH")} ${line.unit}`,
        action: "estimate",
      });
    },
    [setLines],
  );

  // ติดตามวัสดุ: วัสดุที่ติดตามแสดงราคาและแนวโน้มที่หน้าแรก (บอกทางไปหน้าแรกเมื่อกดจากหน้าอื่น)
  const onHome = route.page === "home";
  const persistWatch = useCallback(async (ids: string[], following: boolean) => {
    if (pendingWatch.current) return false;
    pendingWatch.current = true;
    try {
      await saveWatch(ids, following);
      return true;
    } catch (cause) {
      setToast({ id: Date.now(), tone: "error", text: "บันทึกรายการติดตามไม่สำเร็จ",
        detail: cause instanceof Error ? cause.message : "กรุณาลองอีกครั้ง" });
      return false;
    } finally {
      pendingWatch.current = false;
    }
  }, [saveWatch]);
  const toggleWatch = useCallback(
    async (id: string) => {
      if (authLoading || pendingWatch.current) return;
      const watching = watch.includes(id);
      if (user) {
        if (!(await persistWatch([id], !watching))) return;
      } else {
        setDeviceWatch(watching ? watch.filter(x => x !== id) : [id, ...watch]);
      }
      if (!watching && !onHome)
        setToast({
          id: Date.now(),
          text: "ติดตามแล้ว ราคาจะแสดงที่หน้าแรก",
          detail: titleOf(id, ""),
          action: "home",
        });
    },
    [watch, setDeviceWatch, user, authLoading, persistWatch, onHome],
  );
  const unsavedWatch = user ? deviceWatch.filter(id => !watch.includes(id)) : [];
  async function importDeviceWatch() {
    if (await persistWatch([...unsavedWatch].reverse(), true)) setDeviceWatch([]);
  }

  const watchProps = { watch, onToggleWatch: toggleWatch };

  return (
    <div className={authPage ? "site auth-site" : "site"}>
      {!authPage && !authHasBeenVisited.current && <IntroSplash />}
      {!authPage && (
        <a
          href="#main-content"
          className="skip-link"
          onClick={(event) => {
            event.preventDefault();
            mainRef.current?.focus();
          }}
        >
          ข้ามไปยังเนื้อหา
        </a>
      )}
      {!authPage && (
        <SiteHeader
          route={route}
          count={lines.length}
          user={user}
          authLoading={authLoading}
          onLogout={() => {
            void onLogout();
          }}
        />
      )}
      <main id="main-content" ref={mainRef} tabIndex={-1} className="site-main">
        <Suspense
          fallback={
            <div className="page-loading" role="status">
              กำลังเปิดหน้า…
            </div>
          }
        >
          {authPage && authLoading && (
            <div className="auth-page">
              <p className="auth-checking" role="status">
                กำลังตรวจสอบบัญชี…
              </p>
            </div>
          )}
          {authPage && !authLoading && <AuthPage mode={route.page} onSuccess={onAuthSuccess} />}
          {route.page === "home" && (
            <Home selectedId={selectedId} onSelect={setSelectedId} go={go} {...watchProps} />
          )}
          {route.page === "watchlist" && (
            <div className="page watch-page">
              <header className="page-head"><h1>วัสดุที่ติดตาม</h1></header>
              {!authLoading && unsavedWatch.length > 0 && (
                <div className="watch-import">
                  <p>มีวัสดุที่ติดตามไว้ในเครื่องนี้อีก {unsavedWatch.length} รายการ</p>
                  <button type="button" className="btn btn-secondary" onClick={importDeviceWatch}>
                    บันทึกเข้าบัญชี
                  </button>
                </div>
              )}
              {authLoading ? <p role="status">กำลังโหลดรายการติดตาม…</p> : watch.length ? (
                <WatchList watch={watch} />
              ) : (
                <div className="empty-state">
                  <p>ยังไม่มีวัสดุที่ติดตาม กดรูปดาวบนการ์ดวัสดุเพื่อเก็บไว้ดูราคาที่นี่</p>
                  <a className="btn btn-primary" href="#search">ค้นหาวัสดุ</a>
                </div>
              )}
            </div>
          )}
          {route.page === "dashboard" && <Dashboard />}
          {route.page === "search" && (
            <SearchPage
              key={hashFor(route)}
              initialQuery={route.q}
              initialCategory={route.cat}
              initialFilters={route.filters}
            />
          )}
          {route.page === "material" && (
            <MaterialPage key={route.id} id={route.id} go={go} addLine={addLine} {...watchProps} />
          )}
          {route.page === "estimate" && (
            <Estimate
              key={route.shared ?? "mine"}
              shared={route.shared}
              lines={lines}
              setLines={setLines}
              meta={meta}
              setMeta={setMeta}
              go={go}
              notify={setToast}
            />
          )}
        </Suspense>
      </main>
      {!authPage && <SiteFooter />}
      {!authPage && <BottomNav route={route} count={lines.length} />}
      <Toast message={toast} onDone={clearToast} count={lines.length} />
    </div>
  );
}
