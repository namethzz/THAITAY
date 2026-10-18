import { getMaterialById } from "@/data.js";
import type { Route } from "@/types";

export function hashFor(route: Route) {
  if (route.page === "search") {
    const params = new URLSearchParams();
    if (route.q) params.set("q", route.q);
    if (route.cat && route.cat !== "all") params.set("cat", route.cat);
    const query = params.toString();
    return `#search${query ? `?${query}` : ""}`;
  }
  if (route.page === "material") return `#m/${route.id}`;
  if (route.page === "estimate" && route.shared) return `#estimate?d=${route.shared}`;
  return `#${route.page}`;
}

// ลิงก์เก่า (#overview, #prices, #forecast, #analysis, #cost) ยังเปิดได้ โดยพาไปยังหน้าใหม่ที่ทำหน้าที่เดียวกัน
export function routeFromHash(lastMaterialId: string): Route {
  const [path, query = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  const params = new URLSearchParams(query);
  if (path === "search" || path === "prices") return { page: "search", q: params.get("q") ?? "", cat: params.get("cat") ?? "all" };
  if (path.startsWith("m/")) {
    const id = decodeURIComponent(path.slice(2));
    return getMaterialById(id) ? { page: "material", id } : { page: "search", q: "", cat: "all" };
  }
  if (path === "forecast" || path === "analysis") return { page: "material", id: lastMaterialId };
  if (path === "estimate" || path === "cost") return params.get("d") ? { page: "estimate", shared: params.get("d")! } : { page: "estimate" };
  return { page: "home" };
}
