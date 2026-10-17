import { lazy, Suspense, useState } from "react";

export const SEEN_KEY = "thai-te-intro-seen";

// The overlay pulls in motion (the largest dependency), so it is only downloaded when the splash will show.
const IntroSplashOverlay = lazy(() => import("@/components/ui/intro-splash-overlay"));

function alreadySeen() {
  try { return sessionStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
}
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * หน้าต้อนรับตอนเปิดเว็บ: ตัวเขียน "hello" เขียนเองทีละเส้น แล้วเฟดเข้าสู่หน้าเว็บ
 * - แสดงครั้งเดียวต่อการเปิดแท็บ (กดรีเฟรชแล้วไม่ขึ้นซ้ำ)
 * - ข้ามได้ด้วยปุ่ม "ข้าม" หรือกด Esc / Enter / Space
 * - ผู้ใช้ที่ตั้งค่าลดการเคลื่อนไหวในระบบ จะไม่เห็นหน้านี้ และไม่ต้องโหลด motion
 */
export function IntroSplash() {
  const [show] = useState(() => !alreadySeen() && !prefersReducedMotion());
  if (!show) return null;
  // Fallback paints the same backdrop so the page underneath never flashes while the overlay loads.
  return <Suspense fallback={<div className="intro-splash" aria-hidden="true" />}><IntroSplashOverlay /></Suspense>;
}
