/**
 * THAI TAY CONSTRUCT lockup: the owner's building mark (public/brand/thai-tay-mark.png, cut from the brand board)
 * with the wordmark set as live text so it stays sharp. The mark's ground is the brand Warm White #F3F0EA, so it is
 * only ever placed on that colour (the page ground or the header).
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
