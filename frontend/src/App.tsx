import { lazy, Suspense, useCallback, useState } from "react";
import {
  BottomNav,
  SiteFooter,
  SiteHeader,
  Toast,
  type ToastMessage,
} from "@/components/site/chrome";
import { IntroSplash } from "@/components/ui/intro-splash";
import { useAuth } from "@/context/AuthContext";
import { useEstimate } from "@/hooks/useEstimate";
import { useNavigation } from "@/hooks/useNavigation";
import { useWatchlist } from "@/hooks/useWatchlist";
import { hashFor } from "@/lib/routes";
import AuthPage from "@/pages/AuthPage";
import Home from "@/pages/Home";
import Watchlist from "@/pages/Watchlist";

const SearchPage = lazy(() => import("./pages/Search"));
const MaterialPage = lazy(() => import("./pages/MaterialPage"));
const Estimate = lazy(() => import("./pages/Estimate"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

export default function App() {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <p className="page-loading" role="status">
        กำลังโหลดข้อมูลบัญชี…
      </p>
    );
  return <AccountApp key={user?.id ?? "guest"} />;
}

function AccountApp() {
  const { user, loading: authLoading, logout } = useAuth();
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const clearToast = useCallback(() => setToast(null), []);
  const { route, go, selectedId, setSelectedId, mainRef, authHasBeenVisited } =
    useNavigation(clearToast);
  const {
    lines,
    setLines,
    meta,
    setMeta,
    addLine,
    saving,
    saveError,
    saveBeforeLogout,
    syncEstimate,
  } = useEstimate(setToast);
  const { watch, toggleWatch, unsavedCount, importDeviceWatch } = useWatchlist(
    route.page === "home",
    setToast,
  );
  const watchProps = { watch, onToggleWatch: toggleWatch };

  const onLogout = useCallback(async () => {
    try {
      await saveBeforeLogout();
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
  }, [saveBeforeLogout, logout, go]);
  const onAuthSuccess = useCallback(() => go({ page: "home" }), [go]);
  const authPage = route.page === "login" || route.page === "register";

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
        {(saveError || (saving && route.page === "estimate")) && (
          <div
            className="watch-import"
            style={{ width: "var(--wrap)", marginInline: "auto" }}
            role="status"
          >
            {saveError || "กำลังบันทึกใบประมาณราคา…"}
            {saveError && (
              <button
                className="btn btn-secondary"
                onClick={() => void syncEstimate().catch(() => {})}
              >
                ลองบันทึกอีกครั้ง
              </button>
            )}
          </div>
        )}
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
            <Watchlist watch={watch} unsavedCount={unsavedCount} onImport={importDeviceWatch} />
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
