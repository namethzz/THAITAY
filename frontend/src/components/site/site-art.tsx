import { PHOTOS, photoUrl } from "@/config/photos";

const FLOORS = [410, 350, 290];
const COLUMNS = [150, 260, 370];

/**
 * ภาพหน้างานก่อสร้าง (โครงเสา-คาน + ทาวเวอร์เครนยกเหล็กเส้นขึ้นชั้นบน) ใช้แทนรูปจริงจนกว่าจะมีรูปใน src/config/photos.ts
 * ทุกอย่างที่สำคัญอยู่ซีกซ้าย (x < 690) เพราะบนจอใหญ่การ์ดราคาวางทับซีกขวา
 */
function ConstructionArt() {
  return (
    <svg className="site-art-svg" viewBox="0 0 1200 560" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="art-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8f1e8" />
          <stop offset="1" stopColor="#efdccb" />
        </linearGradient>
        <pattern id="art-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#e6d6c6" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="1200" height="560" fill="url(#art-sky)" />
      <rect width="1200" height="470" fill="url(#art-grid)" opacity=".7" />
      <circle cx="930" cy="160" r="120" fill="#fbe3d4" />

      {/* scaffold */}
      <g stroke="#cbbfb0" strokeWidth="3">
        {[515, 555].map(x => <line key={x} x1={x} y1="470" x2={x} y2="276" />)}
        {[440, 410, 380, 350, 320, 290].map(y => <line key={y} x1="515" y1={y} x2="555" y2={y} />)}
        <path d="M515 470L555 440L515 410L555 380L515 350L555 320L515 290" fill="none" strokeWidth="2" />
      </g>

      {/* columns, slabs and the floor still being built */}
      <g fill="#8b9396">
        {COLUMNS.map(x => <rect key={x} x={x - 9} y="230" width="18" height="240" />)}
        <rect x="471" y="290" width="18" height="180" />
      </g>
      <g fill="#747d80">
        {FLOORS.map(y => <rect key={y} x="126" y={y - 7} width="380" height="14" rx="2" />)}
      </g>
      <rect x="126" y="223" width="270" height="14" rx="2" fill="none" stroke="#a7a093" strokeWidth="2" strokeDasharray="8 6" />
      <g stroke="#e8753b" strokeWidth="3" strokeLinecap="round">
        {[...COLUMNS.map(x => [x, 230]), [480, 290]].flatMap(([x, top]) => [-5, 0, 5].map(d => <line key={`${x}${d}`} x1={x + d} y1={top} x2={x + d} y2={top - 24} />))}
      </g>

      {/* tower crane: jib reaches back over the building, lifting a bundle of rebar to the top floor */}
      <g stroke="#c55f2a" strokeWidth="3" fill="none">
        <line x1="588" y1="470" x2="588" y2="112" />
        <line x1="612" y1="470" x2="612" y2="112" />
        <path d="M588 470L612 440L588 410L612 380L588 350L612 320L588 290L612 260L588 230L612 200L588 170L612 140L588 116" strokeWidth="2" />
        <line x1="236" y1="104" x2="690" y2="104" />
        <line x1="236" y1="118" x2="690" y2="118" />
        <path d="M236 118L256 104L276 118L296 104L316 118L336 104L356 118L376 104L396 118L416 104L436 118L456 104L476 118L496 104L516 118L536 104L556 118L576 104L588 112M612 112L632 104L652 118L672 104L690 118" strokeWidth="2" />
        <path d="M600 104V62M600 62L250 104M600 62L686 104" strokeWidth="2.5" />
      </g>
      <rect x="648" y="118" width="42" height="30" rx="3" fill="#474e51" />
      <rect x="612" y="118" width="28" height="24" rx="3" fill="#e8753b" />
      <rect x="418" y="116" width="24" height="10" rx="2" fill="#474e51" />
      <line x1="430" y1="126" x2="430" y2="150" stroke="#474e51" strokeWidth="2" />
      <path d="M430 150L386 162M430 150L474 162" stroke="#474e51" strokeWidth="2" fill="none" />
      <g stroke="#a84b1a" strokeWidth="5" strokeLinecap="round">
        {[163, 171, 179].map(y => <line key={y} x1="362" y1={y} x2="498" y2={y} />)}
      </g>

      {/* ground and a stack of bars waiting on site */}
      <rect y="470" width="1200" height="90" fill="#e4d8c8" />
      <g fill="#8b9396" stroke="#5a6266" strokeWidth="1.5">
        {[0, 1, 2, 3, 4, 5].map(i => <circle key={`a${i}`} cx={760 + i * 22} cy="459" r="10" />)}
        {[0, 1, 2, 3, 4].map(i => <circle key={`b${i}`} cx={771 + i * 22} cy="440" r="10" />)}
        {[0, 1, 2, 3].map(i => <circle key={`c${i}`} cx={782 + i * 22} cy="421" r="10" />)}
      </g>
    </svg>
  );
}

export function SiteArt({ className = "" }: { className?: string }) {
  const photo = PHOTOS.hero;
  return (
    <div className={`site-art ${className}`}>
      {photo ? <img src={photoUrl(photo.file)} alt={photo.alt} loading="eager" decoding="async" /> : <ConstructionArt />}
    </div>
  );
}
