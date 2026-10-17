# THAI เท Frontend v0.5

React 18 + Vite 6 + TypeScript + Tailwind CSS 4 + shadcn/ui

งานเวอร์ชันนี้คือเลือกวัสดุและแบ่งหมวดงานโครงสร้างบน frontend ส่วนแสดงราคาย้อนหลังและผลพยากรณ์เตรียมเป็น placeholder ไม่มีการประมวลผลราคา ฝึกโมเดล เขียน backend หรือเรียก API

## รันโครงการ

Node.js >=22.13:

```bash
npm ci
npm run dev
npm run build
npm run preview
```

build ตรวจ TypeScript ก่อนสร้างไฟล์ production โครงการมี JSX เดิมบางส่วน จึงเปิด allowJs และปิด checkJs หน้าใหม่ใช้ TSX

Vite base คง `/construction-price-intelligence/` หากโฮสต์ที่ root ให้แก้ base ใน vite.config.ts เป็น `/` แล้ว build ใหม่

## ไฟล์หลัก

| ไฟล์ | หน้าที่ |
|---|---|
| `src/data/structural-materials.json` | รายชื่อวัสดุ หมวด รหัส และหน่วย ไม่มีราคา |
| `src/data.js` | ส่งออก catalog และเมนู frontend |
| `src/main.tsx` | routing และเก็บวัสดุที่เลือกไว้ร่วมกันทุกหน้า |
| `src/pages/Overview.tsx` | Hero หมวดวัสดุ และตัวเลือกวัสดุ |
| `src/pages/Materials.tsx` | ค้นหา กรองหมวด แบ่งหน้า และเลือกรายการ |
| `src/pages/Analysis.tsx` | เลือกวัสดุและพื้นที่รอกราฟราคา |
| `src/pages/Forecast.tsx` | เลือกวัสดุและการ์ดระยะ 1, 2, 3 เดือนที่รอข้อมูล |
| `src/components/MaterialPicker.jsx` | ค้นหาและเลือกวัสดุจาก dropdown แสดงหน่วยแทนราคา |
| `src/pages/Landing.tsx` | หน้าแรก (`#home` หรือไม่มี hash) ใช้ saa-s-template ใส่เนื้อหา THAI เท |
| `src/components/ui/saa-s-template.tsx` | Navigation + Hero แบบ landing (component ที่แนบมา ปรับให้รับ props) |
| `src/components/demo-saas-template.tsx` | demo ของ saa-s-template ตามค่าเริ่มต้น |
| `src/components/ui/hero-3.tsx` | Hero ที่ปรับจาก component ที่แนบมา |
| `src/components/ui/header-3.tsx` | Header สำหรับแอป เนื่องจากไม่ได้แนบซอร์ส header-3 |
| `src/components/ui/button.tsx` | shadcn Button ตามโค้ดที่แนบมา |
| `src/components/ui/material-categories.tsx` | ปุ่มหมวดวัสดุพร้อมจำนวนรายการ |
| `src/components/ui/material-details.tsx` | รายละเอียดวัสดุที่เลือกและ placeholder ราคา |
| `src/lib/utils.ts` | cn() จาก clsx และ tailwind-merge |
| `src/styles.css` | style entry, font และ Tailwind theme |
| `src/styles/app.css` | layout / สีแอป |
| `src/styles/structural.css` | หน้า catalog การเลือกวัสดุ และ placeholder |
| `components.json` | การตั้งค่า shadcn CLI |

`@/` ชี้ไปที่ `src/` ดังนั้น `/components/ui` ตามคำขอคือ `frontend/src/components/ui` เดิมมี component ใน src/components จึงสร้าง ui ไว้ให้ component ที่ใช้ซ้ำอยู่ด้วยกันและตรงกับตำแหน่งที่ shadcn CLI เพิ่มไฟล์

## รายการวัสดุในขอบเขต

| หมวด | รายการ |
|---|---:|
| เหล็กเส้นเสริมคอนกรีต | 74 |
| เหล็กรูปพรรณ | 43 |
| ตะแกรงเหล็กเสริมคอนกรีต | 38 |
| ลวดผูกเหล็ก | 2 |
| ลวดอัดแรง | 11 |
| คอนกรีตผสมเสร็จ | 9 |
| คอนกรีตหยาบ | 1 |
| เสาเข็มและชิ้นส่วนคอนกรีตสำเร็จรูป | 106 |
| มวลรวมคอนกรีต | 3 |
| รวม | 287 |

Catalog ใช้เฉพาะ identity metadata ของรายการที่ `scope_status=included` ในขอบเขตโครงสร้าง ไม่ใช้ราคา วันที่ ประวัติ Scaling / Split หรือ ML readiness ใน frontend จึงเลือกวัสดุในขอบเขตได้โดยไม่ขึ้นกับสถานะการฝึกโมเดล 5 รายการรอทบทวนขอบเขตแยกออกจากรายการที่เลือก

Material มี `id`, `name`, `unit`, `categoryCode`, `category`, `familyCode` เก็บ MAT-ID ตาม catalog ค้นด้วยรหัสตัวเลข 16 หลักได้ ไม่เปลี่ยนชื่อหรือหน่วยของรายการเอง

หน้า “รายการวัสดุ” ใช้ hash `#prices` เดิมเพื่อรองรับลิงก์เก่า มุมมองทุกหมวดแบ่งหัวข้อชัดเจนและแสดง 6 รายการแรกต่อหมวด กด “ดูหมวดนี้” เพื่อดูทั้งหมวด แบ่งหน้า 12 รายการ และค้นหาได้ด้วยชื่อ รหัส ขนาด หน่วย

## State และข้อมูลราคา

App เก็บ selectedId ใน React state แล้วส่งให้ Overview / Materials / Analysis / Forecast วัสดุที่เลือกตามไปเมื่อเปลี่ยนหน้า ไม่มี provider หรือ dependency จัดการ state เพิ่ม เมื่อ reload จะเริ่มจากรายการตั้งต้น

การ์ดแสดงราคาเป็น `—` พร้อมข้อความรอข้อมูล ไม่สร้างกราฟหรือราคาอนาคตขึ้นเอง `priceData` และ `forecastData` เป็น array ว่าง ไม่มีงวดราคา ไม่มีการคำนวณเดือนเป้าหมายจากวันที่คอมพิวเตอร์หรือชุดข้อมูล

เวอร์ชันนี้ไม่มี CSV ราคา, snapshot ราคาย้อนหลัง, scaled data, notebook, training code หรือสัญญา API / ผลโมเดล จัดทำเฉพาะ frontend ตามขอบเขตปัจจุบัน

เมนูหลักมี 4 หน้า: ภาพรวม, รายการวัสดุ, วิเคราะห์ย้อนหลัง, พยากรณ์ 1–3 เดือน หน้าเตรียมข้อมูล / ประเมินโมเดลที่เพิ่มในเวอร์ชันก่อนนำออกจาก frontend แล้ว BOQ / ต้นทุนรวมเป็นงานต่อยอด โค้ดเดิมอยู่ใน src/future และไม่ได้โหลดในแอป

## Dependencies / shadcn

ติดตั้งแล้ว: lucide-react, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, Tailwind Vite plugin, TypeScript / type packages และ tw-animate-css

เพิ่ม UI component ต่อ:

```bash
npx shadcn@latest add input
```

ไม่ต้อง init ซ้ำกับ ZIP นี้ หากเริ่มใน React/Vite project อื่นที่ยังไม่มี ให้ตั้ง TypeScript, Tailwind Vite plugin และ alias @/ ก่อน แล้วรัน shadcn init:

```bash
npm install -D typescript @types/react @types/react-dom @types/node
npm install -D tailwindcss @tailwindcss/vite
npm install lucide-react @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npx shadcn@latest init
```

เพิ่ม tailwindcss() ใน Vite plugins, import Tailwind ใน CSS entry และตั้ง @/* ให้ชี้ src/* ทั้ง tsconfig / Vite ดู [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite) และ [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite)

## Responsive / assets

Sidebar ยุบเป็นเมนูบนมือถือ รายการวัสดุและรายละเอียดปรับเป็นแนวตั้ง กรองหมวดและเลือกด้วยคีย์บอร์ดได้ หน้า catalog มีรายละเอียดวัสดุด้านข้างบน desktop และด้านบนของผลค้นหาบนจอเล็ก

ใช้ lucide-react สำหรับไอคอน ภาพ Unsplash เก็บที่ public/images/construction-architecture.jpg และ font bundle ใน project จึงไม่ต้องเรียกบริการภาพหรือ font ภายนอกเมื่อเปิดเว็บ

ผลตรวจและภาพตัวอย่างอยู่ที่ `../preview/verification.md`
