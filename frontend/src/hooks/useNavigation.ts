import { useCallback, useEffect, useRef, useState } from "react";
import { defaultMaterialId } from "@/data.js";
import { useAuth } from "@/context/AuthContext";
import { hashFor, pageTitle, routeFromHash } from "@/lib/routes";
import type { Go, Route } from "@/types";

export function useNavigation(clearToast: () => void) {
  const { user, loading: authLoading } = useAuth();
  const [selectedId, setSelectedId] = useState(defaultMaterialId);
  const [route, setRoute] = useState<Route>(() => routeFromHash(defaultMaterialId));
  const authHasBeenVisited = useRef(route.page === "login" || route.page === "register");
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
  const title = pageTitle(route);
  useEffect(() => {
    document.title = title;
    clearToast();
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!mainRef.current?.contains(document.activeElement))
      mainRef.current?.focus({ preventScroll: true });
  }, [pageKey, title, clearToast]);

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

  return { route, go, selectedId, setSelectedId, authHasBeenVisited, mainRef };
}
