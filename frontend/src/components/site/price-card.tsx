import type { ReactNode, Ref } from "react";
import { Minus, Star, TrendingDown, TrendingUp } from "lucide-react";
import { ChangeChip, DemoStamp, useQuote } from "@/components/ui/price-widgets";
import { formatPrice, percentChange, trendVerdict } from "@/services/priceService";
import { materialTitle } from "@/lib/materialTitle";
import { pricePerBar, rebarSpec } from "@/lib/rebar";
import { CategoryIcon } from "@/components/site/category-icon";
import type { Material } from "@/types";

const VERDICT_ICON = { up: TrendingUp, down: TrendingDown, flat: Minus };

interface Props {
  material: Material;
  /** hero = การ์ดบนหน้าแรก (มีชื่อวัสดุ) · detail = หน้าวัสดุ (ชื่ออยู่ที่หัวหน้าแล้ว แสดงช่วงต่ำ–สูงเพิ่ม) */
  variant?: "hero" | "detail";
  titleRef?: Ref<HTMLHeadingElement>;
  /** ติดตามวัสดุ: ไม่ส่งมาก็ไม่แสดงปุ่มดาว */
  watched?: boolean;
  onToggleWatch?: () => void;
  children?: ReactNode;
}

/** การ์ดราคา: ราคาล่าสุดตัวใหญ่ + ราคาอีก 1, 2, 3 เดือน + คำแนะนำหนึ่งบรรทัด */
export function PriceCard({ material, variant = "hero", titleRef, watched = false, onToggleWatch, children }: Props) {
  const { data, loading, error } = useQuote(material);
  const latest = data?.latest;
  const forecast = data?.forecast ?? [];
  const last = forecast.at(-1);
  const verdict = latest && last ? trendVerdict(percentChange(latest.price, last.price)) : null;
  const VerdictIcon = verdict ? VERDICT_ICON[verdict.tone] : Minus;
  const { title, detail } = materialTitle(material);
  const bar = rebarSpec(material);

  return (
    <article className={`price-card price-card-${variant}`} aria-busy={loading}>
      <div className="pc-top">
        {variant === "hero" ? <span className="cat-pill"><CategoryIcon code={material.categoryCode} size={18} />{material.category}</span> : <h2 className="pc-heading">ราคาล่าสุดและคาดการณ์</h2>}
        <span className="pc-top-end">
          <DemoStamp />
          {onToggleWatch && (
            <button type="button" className="watch-btn" aria-pressed={watched} onClick={onToggleWatch} title={watched ? "เลิกติดตามวัสดุนี้" : "ติดตามวัสดุนี้ ราคาจะแสดงที่หน้าแรก"}>
              <Star size={17} strokeWidth={2.2} aria-hidden="true" fill={watched ? "currentColor" : "none"} />
              <span>{watched ? "ติดตามอยู่" : "ติดตาม"}</span>
            </button>
          )}
        </span>
      </div>
      {variant === "hero" && <h2 className="pc-name" ref={titleRef} tabIndex={-1}>{title}</h2>}
      {variant === "hero" && detail && <p className="pc-detail" title={detail}>{detail}</p>}

      <div className="pc-now">
        <span className="pc-label">ราคาล่าสุด{latest ? ` · ${latest.label}` : ""}</span>
        <p className="pc-price">
          <span className="num">{latest ? `฿${formatPrice(latest.price)}` : "—"}</span>
          <small>ต่อ {material.unit}</small>
        </p>
        {bar && latest && <p className="pc-perbar">≈ <strong className="num">฿{formatPrice(pricePerBar(latest.price, bar))}</strong> ต่อเส้น · ยาว {bar.length} ม. หนัก {bar.kgPerBar.toLocaleString("th-TH")} กก.</p>}
      </div>

      <div className="pc-ahead-title">ราคาคาดการณ์</div>
      <ol className="pc-ahead">
        {(forecast.length ? forecast : [null, null, null]).map((point, index) => (
          <li key={index}>
            <span className="pc-when">อีก {index + 1} เดือน{point && <small>{point.label}</small>}</span>
            <strong className="num">{point ? `฿${formatPrice(point.price)}` : "—"}</strong>
            {point && latest && <ChangeChip from={latest.price} to={point.price} short />}
            {variant === "detail" && point && <small className="pc-range">ช่วง {formatPrice(point.low)}–{formatPrice(point.high)}</small>}
          </li>
        ))}
      </ol>

      {verdict && (
        <p className={`pc-verdict ${verdict.tone}`}>
          <VerdictIcon size={20} aria-hidden="true" />
          <span><strong>{verdict.title}</strong>{verdict.advice}</span>
        </p>
      )}
      {error && <p className="inline-error" role="alert">โหลดราคาไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้ง</p>}
      {children}
    </article>
  );
}
