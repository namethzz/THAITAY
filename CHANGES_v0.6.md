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
