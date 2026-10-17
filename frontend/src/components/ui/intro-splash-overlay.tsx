import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppleHelloEnglishEffect } from "@/components/ui/apple-hello-effect";
import { SEEN_KEY } from "@/components/ui/intro-splash";

/** ส่วนแสดงผลของหน้าต้อนรับ (ใช้ motion) — โหลดแยกจาก intro-splash.tsx เฉพาะตอนที่ต้องแสดง */
export default function IntroSplashOverlay() {
  const [show, setShow] = useState(true);

  const close = useCallback(() => {
    try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  }, []);

  useEffect(() => {
    if (!show) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (["Escape", "Enter", " "].includes(e.key)) { e.preventDefault(); close(); } };
    window.addEventListener("keydown", onKey);
    const safety = window.setTimeout(close, 7000); // กันค้าง
    return () => { document.body.style.overflow = oldOverflow; window.removeEventListener("keydown", onKey); window.clearTimeout(safety); };
  }, [show, close]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="intro-splash"
          role="dialog"
          aria-label="ยินดีต้อนรับสู่ THAI TAY"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          onClick={close}
        >
          <div className="intro-splash-inner">
            <AppleHelloEnglishEffect speed={0.9} className="intro-hello" onAnimationComplete={() => window.setTimeout(close, 900)} />
            <motion.div className="intro-caption" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2, duration: 0.8 }}>
              <strong>ยินดีต้อนรับสู่ THAI TAY</strong>
              <span>ติดตามราคาวัสดุก่อสร้าง · พยากรณ์ 1–3 เดือน · คำนวณต้นทุน</span>
            </motion.div>
          </div>
          <button type="button" className="intro-skip" onClick={e => { e.stopPropagation(); close(); }}>ข้าม</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
