import type { CSSProperties } from "react";
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

/** End-on view of a painted bar: the category's paint code. Decorative; the category name always sits beside it. */
export function PaintDot({ code, size = 18 }: { code: string; size?: number }) {
  return <span className="paint-dot" aria-hidden="true" style={{ "--paint": paintFor(code), width: size, height: size } as CSSProperties} />;
}
