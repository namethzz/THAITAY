import { useEffect } from "react";
import { Check, ClipboardList, Home, Search } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { isDemoData } from "@/services/priceService";
import type { Route } from "@/types";

type Section = "home" | "search" | "estimate";
const sectionOf = (route: Route): Section => (route.page === "material" ? "search" : route.page);

const CountBadge = ({ count }: { count: number }) =>
  count > 0 ? <span className="count-badge" aria-label={`${count} รายการ`}>{count > 99 ? "99+" : count}</span> : null;

/** แถบบน: โลโก้ + ลิงก์ 3 หน้า (จอใหญ่) / โลโก้อย่างเดียว (มือถือ ใช้แถบล่างแทน) */
export function SiteHeader({ route, count }: { route: Route; count: number }) {
  const current = sectionOf(route);
  const link = (section: Section, label: string) => (
    <a href={`#${section}`} aria-current={current === section ? "page" : undefined}>
      {label}{section === "estimate" && <CountBadge count={count} />}
    </a>
  );
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a href="#home" className="brand-link" aria-label="THAI TAY หน้าแรก"><BrandMark /></a>
        <nav className="top-nav" aria-label="เมนูหลัก">
          {link("home", "หน้าแรก")}
          {link("search", "ค้นหาวัสดุ")}
          {link("estimate", "ใบประมาณราคา")}
        </nav>
      </div>
    </header>
  );
}

/** แถบล่างบนมือถือ 3 ปุ่ม ปุ่มกลางคือการค้นหา (งานหลักของเว็บ) */
export function BottomNav({ route, count }: { route: Route; count: number }) {
  const current = sectionOf(route);
  return (
    <nav className="bottom-nav" aria-label="เมนูหลัก">
      <a href="#home" className="bn-item" aria-current={current === "home" ? "page" : undefined}>
        <span className="bn-icon"><Home size={22} strokeWidth={2} aria-hidden="true" /></span><span>หน้าแรก</span>
      </a>
      <a href="#search" className="bn-item bn-main" aria-current={current === "search" ? "page" : undefined}>
        <span className="bn-fab"><Search size={24} strokeWidth={2.4} aria-hidden="true" /></span><span>ค้นหาราคา</span>
      </a>
      <a href="#estimate" className="bn-item" aria-current={current === "estimate" ? "page" : undefined}>
        <span className="bn-icon"><ClipboardList size={22} strokeWidth={2} aria-hidden="true" /><CountBadge count={count} /></span><span>ใบประมาณ</span>
      </a>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <BrandMark />
        <p>ราคาวัสดุงานโครงสร้าง ล่าสุดและล่วงหน้า 1–3 เดือน สำหรับผู้รับเหมา QS และเจ้าของบ้าน</p>
        <p className="site-footer-fine">
          ข้อมูลเพื่อประกอบการวางแผน ไม่ใช่ใบเสนอราคาจากผู้ขาย{isDemoData ? " · ตอนนี้ราคาทั้งหมดเป็นข้อมูลตัวอย่าง" : ""} · v0.9
        </p>
      </div>
    </footer>
  );
}

export interface ToastMessage { id: number; text: string; detail?: string }

/** แจ้งเตือนสั้น ๆ หลังเพิ่มรายการ พร้อมลิงก์ไปใบประมาณราคา */
export function Toast({ message, onDone, count }: { message: ToastMessage | null; onDone: () => void; count: number }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDone, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onDone]);
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {message && (
        <div className="toast" key={message.id}>
          <span className="toast-icon" aria-hidden="true"><Check size={18} strokeWidth={2.6} /></span>
          <span className="toast-copy"><strong>{message.text}</strong>{message.detail && <small>{message.detail}</small>}</span>
          <a href="#estimate" onClick={onDone}>ดูใบประมาณ ({count})</a>
        </div>
      )}
    </div>
  );
}
