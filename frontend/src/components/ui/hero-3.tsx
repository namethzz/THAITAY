import { ArrowRightIcon, Building2, Database, Layers, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Navigate } from "@/types";

export interface HeroSectionProps {
  navigate?: Navigate;
  materialCount?: number;
  categoryCount?: number;
}

export function HeroSection({ navigate, materialCount = 0, categoryCount = 0 }: HeroSectionProps) {
  const go = (page: "prices" | "forecast") => {
    if (navigate) navigate(page);
    else window.location.hash = page;
  };

  return (
    <section className="hero-section relative isolate mx-auto w-full overflow-hidden" aria-labelledby="hero-title">
      {/* Keep the supplied hero's radial shades scoped inside its own section. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className={cn("absolute inset-0 -z-10", "bg-[radial-gradient(ellipse_at_15%_0%,var(--hero-shade),transparent_65%)]")} />
      </div>
      <div className="hero-layout">
        <div className="relative z-10 flex min-w-0 flex-col items-start gap-5">
          <button type="button" className={cn("hero-badge group flex w-fit items-center gap-2 rounded-full border bg-card", "animate-in fade-in slide-in-from-bottom-5 fill-mode-both duration-700")} onClick={() => go("prices")}>
            <span className="hero-badge-dot" />
            <span>วัสดุงานโครงสร้าง · เลือกได้ตามหมวด</span>
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="hero-eyebrow">CONSTRUCTION PRICE INTELLIGENCE</div>
          <h1 id="hero-title" className={cn("hero-title text-balance font-medium text-foreground", "animate-in fade-in slide-in-from-bottom-5 fill-mode-both duration-700")} style={{ animationDelay: "100ms" }}>
            เลือกวัสดุงานโครงสร้าง<br /><span>เริ่มต้นอย่างเป็นระบบ</span>
          </h1>
          <p className={cn("hero-description text-muted-foreground", "animate-in fade-in slide-in-from-bottom-5 fill-mode-both duration-700")} style={{ animationDelay: "200ms" }}>
            ค้นหาวัสดุที่ต้องการ แยกหมวด ชื่อ และหน่วยให้ชัดเจน<br className="hidden xl:block" /> ดูแนวโน้มราคา พยากรณ์ล่วงหน้า 1–3 เดือน และคำนวณต้นทุน
          </p>
          <div className="hero-actions flex flex-wrap items-center gap-3 animate-in fade-in slide-in-from-bottom-5 fill-mode-both duration-700" style={{ animationDelay: "300ms" }}>
            <Button type="button" size="lg" className="hero-primary" onClick={() => go("prices")}>เลือกวัสดุโครงสร้าง<ArrowRightIcon className="ml-2 size-4" /></Button>
            <Button type="button" variant="outline" size="lg" className="hero-secondary" onClick={() => go("forecast")}><TrendingUp className="mr-2 size-4" />ดูหน้าพยากรณ์</Button>
          </div>
          <div className="hero-location"><Layers size={14} /><span>เฉพาะวัสดุหมวดงานโครงสร้าง</span></div>
        </div>
        <div className="hero-preview relative animate-in fade-in slide-in-from-bottom-5 fill-mode-both duration-1000" style={{ animationDelay: "200ms" }}>
          <div aria-hidden="true" className={cn("pointer-events-none absolute -inset-5 rounded-full blur-[50px]", "bg-[radial-gradient(ellipse_at_center,var(--hero-shade),transparent_70%)]")} />
          <div className="hero-image-frame relative overflow-hidden rounded-2xl border bg-background p-2 shadow-xl ring-1 ring-card">
            <img
              alt="อาคารสูงและโครงสร้างสถาปัตยกรรม ภาพประกอบโครงการก่อสร้าง"
              className="hero-image w-full rounded-xl object-cover"
              src={`${import.meta.env.BASE_URL}images/construction-architecture.jpg`}
              width="1200" height="900" fetchPriority="high"
            />
            <div className="hero-photo-overlay" />
            <div className="hero-image-label"><Building2 size={15} /><span>BUILD WITH BETTER INSIGHT.</span></div>
            <div className="hero-image-copy"><small>THAI เท / STRUCTURAL MATERIALS</small><p>ทุกการก่อสร้าง<br />เริ่มจากข้อมูลที่ดี</p></div>
          </div>
          <div className="hero-floating-card">
            <span className="hero-floating-icon"><Database size={19} /></span>
            <div><span>รายการวัสดุงานโครงสร้าง</span><strong>{materialCount.toLocaleString("th-TH")} <small>รายการ</small></strong><span>{categoryCount} หมวด · ชื่อ รหัส และหน่วย</span></div>
            <span className="hero-card-check" aria-label="ข้อมูลในระบบ">✓</span>
          </div>
        </div>
      </div>
    </section>
  );
}
