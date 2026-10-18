/** icon ประจำหมวดวัสดุ (จากชุด icon ของเจ้าของเว็บ, public/icons/categories/) ตกแต่งอย่างเดียว ชื่อหมวดอยู่ข้าง ๆ เสมอ */
export function CategoryIcon({ code, size = 40, className = "" }: { code: string; size?: number; className?: string }) {
  return (
    <img
      className={`cat-icon ${className}`}
      src={`${import.meta.env.BASE_URL}icons/categories/${code}.webp`}
      width={Math.round((size * 220) / 192)}
      height={size}
      alt=""
      decoding="async"
    />
  );
}
