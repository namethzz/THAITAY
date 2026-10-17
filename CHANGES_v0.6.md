# THAI เท v0.6 — สิ่งที่แก้ไข

1. **โทนสี**: เปลี่ยนจากเขียวเป็นน้ำตาล / ครีม / ทราย (โทนวัสดุก่อสร้าง) แก้ที่ตัวแปรสีใน `src/styles/app.css` (บล็อก `:root`)
2. **วิเคราะห์ / พยากรณ์**: ตัวเลือกเหลือเฉพาะ 1 / 2 / 3 เดือน (ไม่มีปีแล้ว) ลบไฟล์เก่า `Forecast.jsx`, `Analysis.jsx`, `Prices.jsx`, `DataStats.jsx`, `CostPlanner.jsx` ใน pages ที่ชื่อซ้ำกับไฟล์ .tsx
3. **หน้าใหม่ "คำนวณต้นทุน"** (`src/pages/CostCalculator.tsx`): เลือกวัสดุ → เลือกวันนี้/อีก 1–3 เดือน → ใส่จำนวน → ได้ราคาต่อหน่วยและยอดรวม เพิ่มได้หลายรายการ ใส่สำรองผันผวน/VAT 7% ดาวน์โหลด CSV / พิมพ์ได้
4. **แหล่งที่มาราคา** (`src/config/sources.ts`): กดแล้วเปิดเว็บต้นทางในแท็บใหม่ แสดงทุกหน้าหลัก

## เชื่อม backend
ทุกหน้าเรียกข้อมูลผ่าน `src/services/priceService.ts` ตอนนี้เป็น **ข้อมูลตัวอย่าง (Demo)** และมีแถบเตือนในหน้า
เมื่อพร้อม ตั้ง `VITE_API_BASE` (เช่น ในไฟล์ `.env`) แล้วทำ endpoint ตามนี้:

- `GET /prices/{materialId}/history?months=1..3` → `{ unit, points: [{ date, price }] }`
- `GET /prices/{materialId}/forecast?months=3` → `{ unit, points: [{ month, date, price, low, high }] }`

แถบ Demo จะหายเองเมื่อมี `VITE_API_BASE`

## อัปเดต: ช่วงย้อนหลังหน้าวิเคราะห์
เลือกได้ 3 เดือน / 6 เดือน / 1 ปี / 3 ปี / 5 ปี / 10 ปี (หน้าพยากรณ์และคำนวณต้นทุนยังเป็น 1–3 เดือน)
- ถ้าข้อมูลจริงย้อนหลังได้ไม่ถึง 10 ปี ตั้ง `VITE_MAX_HISTORY_MONTHS` (เช่น 60) ตัวเลือกที่ยาวกว่านั้นจะถูกปิดอัตโนมัติ
- API: `GET /prices/{materialId}/history?months=3..120`

## อัปเดต: หน้าต้อนรับ "hello" (apple-hello-effect)
- `src/components/ui/apple-hello-effect.tsx` — component ตามที่ให้มา (ติดตั้ง dependency `motion` แล้ว)
- `src/components/ui/intro-splash.tsx` — ครอบเป็นหน้าต้อนรับ ใช้ใน `main.tsx`
- แสดงครั้งเดียวต่อแท็บ, ข้ามได้ (ปุ่ม/Esc/Enter/Space/คลิก), ปิดอัตโนมัติ, ไม่แสดงถ้าผู้ใช้ตั้ง "ลดการเคลื่อนไหว"
- ปิดฟีเจอร์นี้: ลบ `<IntroSplash />` ออกจาก `main.tsx`

## อัปเดต: หน้าแรกแบบ Landing (saa-s-template)
- `src/components/ui/saa-s-template.tsx` — component ตามที่ให้มา ปรับดังนี้
  - ไอคอนใช้ lucide-react แทน SVG ที่เขียนเอง
  - ตัด `* { font-family: Poppins }` และการโหลด Google Fonts ออก (เดิมจะทับฟอนต์ไทยทั้งเว็บ)
  - ข้อความ ลิงก์ ปุ่ม และภาพรับผ่าน props (ค่าเริ่มต้นยังเป็นข้อความเดิมของ template)
  - เมนูกลางใช้ flex แทน absolute center เพื่อไม่ให้ทับปุ่มเมื่อข้อความไทยยาว และเปลี่ยน breakpoint เป็น `lg`
  - เมนูมือถือมี `aria-expanded` / `aria-controls` และปิดด้วย Esc
  - หัวข้อ gradient ใช้ line-height 1.3 เพื่อไม่ให้สระบน/ล่างภาษาไทยถูกตัด (background-clip: text)
  - ภาพพื้นหลังเรืองแสงจาก CDN ภายนอกเปลี่ยนเป็น CSS gradient โทนน้ำตาล/ทราย
- `src/pages/Landing.tsx` — หน้าแรก: เปิดเว็บโดยไม่มี hash หรือ `#home` จะเห็นหน้านี้ ลิงก์เดิม (`#overview`, `#prices` ฯลฯ) ใช้ได้เหมือนเดิม
- ภาพตัวอย่างใต้ Hero คือภาพหน้าจอจริงของหน้าภาพรวม `public/images/app-preview.jpg` (ถ้าแก้หน้าภาพรวม ควรถ่ายใหม่)
- กดโลโก้ใน sidebar เพื่อกลับหน้าแรก
- ภาพตัวอย่าง: `preview/landing-desktop.png`, `preview/landing-mobile.png`

## อัปเดต: เก็บงานหลังตรวจโปรเจกต์
- เวอร์ชันตรงกันเป็น 0.6 ทั้ง `package.json`, sidebar, README และ START_HERE
- README / START_HERE เขียนใหม่ตามแอปปัจจุบัน (6 หน้า, ข้อมูลราคา Demo, การเชื่อม backend)
- ภาพใน `preview/` ถ่ายใหม่จาก build v0.6 ทั้งหมด และ `verification.md` / `frontend-ui-results.json` เป็นผลตรวจรอบใหม่
- นำโค้ดที่ไม่ได้ใช้ออก: `src/future`, `Shared.jsx`, `demo.tsx`, `make-data.cjs` (ทั้งสองไฟล์), export `priceData` / `forecastData` และ dependency `pdfjs-dist`, `xlsx` (กู้คืนได้จาก commit `9c0c9cd` ดู `frontend/README.md`)
- CSS: `legacy.css` เปลี่ยนเป็น `base.css` ลบ declaration ที่ถูก `app.css` / `structural.css` ทับเสมอ และ rule ของ class ที่ไม่มีในโค้ดแล้วออกจากทั้งสามไฟล์ (CSS ใน build เล็กลงจาก ~114 KB เหลือ ~96 KB) หน้าเว็บแสดงผลเหมือนเดิมทุก pixel

## อัปเดต: โหลดเร็วขึ้น และแก้หน้าคำนวณต้นทุน
- JavaScript หลักที่โหลดทุกครั้งลดจาก 468 KB เหลือ 301 KB (gzip 122 → 68 KB)
  - `motion` ซึ่งใหญ่ที่สุดใช้แค่หน้าต้อนรับ จึงแยกเป็น `intro-splash-overlay.tsx` โหลดเฉพาะตอนที่หน้าต้อนรับจะแสดง (ครั้งแรกของแท็บ) ผู้ที่เคยเห็นแล้ว หรือตั้ง "ลดการเคลื่อนไหว" ไม่ต้องโหลด
  - หน้าภาพรวม lazy-load เหมือนหน้าอื่น หน้าแรกจึงไม่ต้องโหลดโค้ดหน้าภาพรวม
- หน้าคำนวณต้นทุน: ไอคอนในกล่อง "ยังไม่มีรายการ" อยู่กลาง และข้อความไม่อ้าง "ทางซ้าย" แล้ว (บนมือถือฟอร์มอยู่ด้านบน)
