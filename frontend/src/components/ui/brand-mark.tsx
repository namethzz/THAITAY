import { paintFor } from "@/config/categoryPaint";

/**
 * THAI TAY wordmark with a placeholder bundle-tag glyph.
 * The owner has prepared a logo: replace the <svg> below (or the whole span) with it, nothing else references the glyph.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-mark ${className}`}>
      <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true">
        <rect x="1" y="1" width="28" height="20" rx="4" fill="var(--tag)" stroke="var(--ink)" strokeWidth="1.5" />
        <circle cx="7.5" cy="11" r="3" fill="var(--ground)" stroke="var(--ink)" strokeWidth="1.5" />
        <path d="M14 8h10M14 14h7" stroke="var(--ink)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="brand-word">THAI TAY</span>
    </span>
  );
}

/** Cut end of a painted bar (two longitudinal ribs either side): the category's paint code. Decorative; the name always sits beside it. */
export function PaintDot({ code, size = 18 }: { code: string; size?: number }) {
  return (
    <svg className="paint-dot" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="1" y="10.2" width="22" height="3.6" rx="1.4" fill="#7d8a95" />
      <circle cx="12" cy="12" r="8.8" fill={paintFor(code)} stroke="rgba(27,44,62,.6)" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1.2" />
    </svg>
  );
}
