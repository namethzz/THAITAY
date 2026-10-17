import { ArrowUpRight, CalendarDays, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Navigate, PageId } from "@/types";

interface HeaderProps {
  page?: PageId;
  title?: string;
  period?: string;
  navigate?: Navigate;
  onMenu?: () => void;
}

export function Header({ page = "overview", title = "ภาพรวม", period, navigate, onMenu }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="header-start">
        {onMenu && (
          <Button type="button" variant="ghost" size="icon" className="mobile-menu" onClick={onMenu} aria-label="เปิดเมนู" aria-controls="primary-navigation" aria-haspopup="dialog">
            <Menu size={21} />
          </Button>
        )}
        <div className="breadcrumb">
          <span>พื้นที่ทำงาน</span><span className="breadcrumb-slash">/</span><strong>{title}</strong>
        </div>
      </div>
      <div className="header-actions">
        <button type="button" className="header-search" onClick={() => navigate ? navigate("prices") : (window.location.hash = "prices")} aria-label="ค้นหาวัสดุ">
          <Search size={16} /><span>ค้นหาวัสดุ...</span><ArrowUpRight size={14} />
        </button>
        {period && <span className="header-period"><CalendarDays size={15} /><span>{period}</span></span>}
      </div>
      <span className="sr-only">หน้าปัจจุบัน: {page}</span>
    </header>
  );
}
