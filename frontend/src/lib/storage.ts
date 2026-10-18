import { useEffect, useState } from "react";

/**
 * state ที่จำไว้ในเบราว์เซอร์ (localStorage) — อ่าน/เขียนไม่ได้ (private mode, ถูกบล็อก) ก็ใช้งานต่อได้ตามปกติ แค่ไม่จำ
 * `clean` กรองค่าที่อ่านกลับมา: ข้อมูลเก่าหรือเสียจะกลายเป็นค่าเริ่มต้นแทนที่จะทำให้หน้าพัง
 */
export function usePersistentState<T>(key: string, initial: T, clean: (saved: unknown) => T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : clean(JSON.parse(raw));
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ใช้งานต่อได้แม้บันทึกไม่ได้ */ }
  }, [key, value]);
  return [value, setValue] as const;
}
