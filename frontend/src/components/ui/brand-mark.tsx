import { paintFor } from "@/config/categoryPaint";

/**
 * THAI TAY CONSTRUCT lockup: the owner's building mark (public/brand/thai-tay-mark.png, cut from the brand board)
 * with the wordmark set as live text so it stays sharp. The mark's ground is the brand Warm White #F3F0EA, so it is
 * only ever placed on that colour (the page ground, or the warm-white label on the landing tag).
 */
export function BrandMark({ className = "", sub = true }: { className?: string; sub?: boolean }) {
  return (
    <span className={`brand-mark ${className}`}>
      <img src={`${import.meta.env.BASE_URL}brand/thai-tay-mark.png`} width={498} height={312} alt="" />
      <span className="brand-words">
        <span className="brand-word">THAI TAY</span>
        {sub && <span className="brand-sub-word">CONSTRUCT</span>}
      </span>
    </span>
  );
}

/** Cut end of a painted bar (two longitudinal ribs either side): the category's paint code. Decorative; the name always sits beside it. */
export function PaintDot({ code, size = 18 }: { code: string; size?: number }) {
  return (
    <svg className="paint-dot" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="10.2" width="22" height="3.6" rx="1.4" fill="#8a8f90" />
      <circle cx="12" cy="12" r="8.8" fill={paintFor(code)} stroke="rgba(36,42,45,.6)" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.2" />
    </svg>
  );
}
