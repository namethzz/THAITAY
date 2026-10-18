/**
 * รูปจริงของเว็บ — วางไฟล์ไว้ใน frontend/public/photos/ แล้วใส่ชื่อไฟล์และคำอธิบายภาพตรงนี้
 * ถ้ายังเป็น null หน้าเว็บจะใช้ภาพวาดหน้างานก่อสร้างแทน
 *   hero: ภาพใหญ่ใต้ช่องค้นหาในหน้าแรก (แนะนำแนวนอน กว้าง 2000 px ขึ้นไป เช่น หน้างานเทคาน กองเหล็กเส้น)
 */
export const PHOTOS: { hero: { file: string; alt: string } | null } = {
  hero: null,
};

export const photoUrl = (file: string) => `${import.meta.env.BASE_URL}photos/${file}`;
