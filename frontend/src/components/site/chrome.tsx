import { useEffect } from "react";
import { AlertCircle, ChartColumn, Check, ClipboardList, Home, LogIn, LogOut, Search } from "lucide-react";
import { BrandMark } from "@/components/ui/brand-mark";
import { isDemoData } from "@/services/priceService";
import type { Route } from "@/types";
import type { AuthUser } from "@/context/AuthContext";

type Section = "home" | "search" | "dashboard" | "estimate";
const sectionOf = (route: Route): Section => {
  if (route.page === "material") return "search";
  if (route.page === "login" || route.page === "register") return "home";
  return route.page;
};

const CountBadge = ({ count }: { count: number }) =>
  count > 0 ? <span className="count-badge" aria-label={`${count} รายการ`}>{count > 99 ? "99+" : count}</span> : null;

export function SiteHeader({ route, count, user, authLoading, onLogout }: {
  route: Route;
  count: number;
  user: AuthUser | null;
  authLoading: boolean;
  onLogout: () => void;
}) {
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
          {link("dashboard", "ภาพรวมราคา")}
          {link("estimate", "ใบประมาณราคา")}
        </nav>
        <div className="header-account">
          {authLoading ? <span className="header-auth-status" role="status">กำลังตรวจสอบบัญชี…</span> : user ? (
            <>
              <span className="header-greeting">สวัสดี, {user.name}</span>
              <button type="button" className="header-auth-button" onClick={onLogout}>
                <LogOut size={18} aria-hidden="true" /><span>ออกจากระบบ</span>
              </button>
            </>
          ) : (
            <a className="header-auth-button" href="#login">
              <LogIn size={18} aria-hidden="true" /><span>เข้าสู่ระบบ</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}

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
      <a href="#dashboard" className="bn-item" aria-current={current === "dashboard" ? "page" : undefined}>
        <span className="bn-icon"><ChartColumn size={22} aria-hidden="true" /></span><span>ภาพรวมราคา</span>
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
          ข้อมูลเพื่อประกอบการวางแผน ไม่ใช่ใบเสนอราคาจากผู้ขาย{isDemoData ? " · ตอนนี้ราคาทั้งหมดเป็นข้อมูลตัวอย่าง" : ""} · v0.10
        </p>
      </div>
    </footer>
  );
}

export interface ToastMessage { id: number; text: string; detail?: string; action?: "estimate" | "home"; tone?: "error" }

/** แจ้งเตือนสั้น ๆ (เพิ่มรายการ, ติดตามวัสดุ, คัดลอกลิงก์) พร้อมลิงก์ไปที่ที่เกี่ยวข้อง */
export function Toast({ message, onDone, count }: { message: ToastMessage | null; onDone: () => void; count: number }) {
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(onDone, 5000);
    return () => window.clearTimeout(timer);
  }, [message, onDone]);
  return (
    <div className="toast-region" role={message?.tone === "error" ? "alert" : "status"} aria-live={message?.tone === "error" ? "assertive" : "polite"}>
      {message && (
        <div className={`toast${message.tone === "error" ? " toast-error" : ""}`} key={message.id}>
          <span className="toast-icon" aria-hidden="true">{message.tone === "error" ? <AlertCircle size={18} /> : <Check size={18} strokeWidth={2.6} />}</span>
          <span className="toast-copy"><strong>{message.text}</strong>{message.detail && <small>{message.detail}</small>}</span>
          {message.action === "estimate" && <a href="#estimate" onClick={onDone}>ดูใบประมาณ ({count})</a>}
          {message.action === "home" && <a href="#home" onClick={onDone}>ดูหน้าแรก</a>}
        </div>
      )}
    </div>
  );
}
