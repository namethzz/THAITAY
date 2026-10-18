import type { Material } from "@/types";

/**
 * ระดับราคาตั้งต้นของข้อมูลตัวอย่าง (DEMO ไม่ใช่ราคาจริง) — ให้ตัวเลขดูสมเหตุสมผลกับคนในวงการ:
 * เหล็กเส้นเกรดสูงแพงกว่า เส้นเล็กแพงกว่าต่อตัน, เหล็กรูปพรรณคิดจากน้ำหนักต่อท่อน, คอนกรีตตามกำลังอัด,
 * เสาเข็มตามหน้าตัดและความยาว ราคาจริงมาจาก API เมื่อตั้ง VITE_API_BASE ไฟล์นี้จะไม่ถูกใช้
 */
const num = (text: string) => parseFloat(text.replace(/,/g, ""));
const known = (n: number) => Number.isFinite(n);

function diameterMm(name: string) {
  const m = name.match(/(?:ศก\.?|เส้นผ่านศูนย์กลาง)\s*(\d+(?:\.\d+)?)\s*มม/);
  return m ? num(m[1]) : NaN;
}
function lengthM(name: string) {
  const m = name.match(/ยาว\s*(\d+(?:\.\d+)?)\s*(?:ม\.|เมตร)/);
  return m ? num(m[1]) : NaN;
}
function weightKg(name: string) {
  const m = name.match(/(?:นน\.?|น้ำหนัก)\s*(\d[\d.,]*)(?:\s*-\s*(\d[\d.,]*))?\s*กก/);
  if (!m) return NaN;
  return m[2] ? (num(m[1]) + num(m[2])) / 2 : num(m[1]);
}
/** พื้นที่หน้าตัดโดยประมาณ (ตร.ม.) ของเสาเข็ม/ชิ้นส่วนคอนกรีต */
function sectionM2(name: string) {
  let m = name.match(/(0\.\d+)\s*x\s*(0\.\d+)/);
  if (m) return num(m[1]) * num(m[2]);
  m = name.match(/(\d+)\s*x\s*(\d+)\s*ซม/);
  if (m) return (num(m[1]) * num(m[2])) / 1e4;
  m = name.match(/ศก\.?\s*(0\.\d+)\s*ม\./);
  if (m) return 0.6 * Math.PI * num(m[1]) ** 2 / 4; // กลมกลวง ~60% ของหน้าตัดตัน
  m = name.match(/ขนาด\s*(\d+)\s*ซม/);
  if (m) return 0.8 * (num(m[1]) / 100) ** 2;
  return NaN;
}

export function demoBasePrice(material: Material): number {
  const name = material.name;
  switch (material.categoryCode) {
    case "STR-01": { // เหล็กเส้น บาท/ตัน
      const grade = /SD\.?\s*50/i.test(name) ? 23400 : /SD\.?\s*40/i.test(name) ? 22600 : /SD\.?\s*30/i.test(name) ? 22100 : 21600;
      const d = diameterMm(name);
      return grade * (1 + Math.max(0, 20 - (known(d) ? d : 16)) * 0.005);
    }
    case "STR-02": { // เหล็กรูปพรรณ บาท/ท่อน ≈ 31 บาท/กก.
      const w = weightKg(name);
      return (known(w) ? w : 60) * 31;
    }
    case "STR-03": { // ตะแกรงเหล็ก บาท/ตร.ม. = น้ำหนักเหล็กต่อ ตร.ม. × ~34 บาท/กก.
      const d = diameterMm(name);
      const spacing = name.match(/ตาราง\s*(0\.\d+)/);
      return 0.00617 * (known(d) ? d : 6) ** 2 * (2 / (spacing ? num(spacing[1]) : 0.2)) * 34 + 8;
    }
    case "STR-04":
      return material.unit === "ม้วน" ? 118 : 46;
    case "STR-05": { // ลวดอัดแรง บาท/ตัน
      const d = diameterMm(name);
      return 36500 * (1 + Math.max(0, 9 - (known(d) ? d : 7)) * 0.012);
    }
    case "STR-06": { // คอนกรีตผสมเสร็จ บาท/ลบ.ม. ตามกำลังอัดลูกบาศก์
      const ksc = name.match(/ลูกบาศก์\s*(\d+)/);
      return 1250 + (ksc ? num(ksc[1]) : 240) * 4.2;
    }
    case "STR-07":
      return 1850;
    case "STR-08": { // เสาเข็มและชิ้นส่วนสำเร็จรูป
      if (material.unit === "ตร.ม.") {
        const thick = name.match(/หนา\s*(\d+)\s*ซม/);
        return 300 + (thick ? num(thick[1]) : 15) * 38;
      }
      const area = sectionM2(name);
      const weight = weightKg(name);
      const length = lengthM(name);
      if (!known(area) && known(weight)) return weight * 4.5;
      const perMeter = (known(area) ? area : /คาน/.test(name) ? 0.012 : 0.03) * 6200 + 25;
      return material.unit === "เมตร" ? perMeter : perMeter * (known(length) ? length : 3);
    }
    case "STR-09":
      return /ทราย/.test(name) ? 520 : /เบอร์\s*2/.test(name) ? 640 : 610;
    default:
      return 500;
  }
}
