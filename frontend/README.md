# THAI TAY Frontend v0.8

React 18 + Vite 6 + TypeScript + Tailwind CSS 4 + shadcn/ui

Frontend สำหรับเลือกวัสดุงานโครงสร้าง ดูราคาย้อนหลัง พยากรณ์ราคา 1–3 เดือน และคำนวณต้นทุน ข้อมูลราคาตอนนี้เป็น **ข้อมูลตัวอย่าง (Demo)** ที่สร้างใน `src/services/priceService.ts` จนกว่าจะเชื่อม backend ผ่าน `VITE_API_BASE` (ดูหัวข้อ "ข้อมูลราคาและการเชื่อม backend")

## รันโครงการ

Node.js >=22.13:

```bash
npm ci
npm run dev
npm run build
npm run preview
```

build ตรวจ TypeScript ก่อนสร้างไฟล์ production โครงการมี JSX เดิมบางส่วน (`MaterialPicker.jsx`, `data.js`) จึงเปิด allowJs และปิด checkJs หน้าใหม่ใช้ TSX

## Deploy

`base` ใน `vite.config.ts` เลือกให้อัตโนมัติ:

| ที่โฮสต์ | base | หมายเหตุ |
|---|---|---|
| Vercel | `/` | Vercel ตั้งตัวแปร `VERCEL` ตอน build ให้เอง ตั้ง Root Directory ของโปรเจกต์เป็น `frontend` |
| GitHub Pages (`npm run deploy`) | `/construction-price-intelligence/` | ค่าเริ่มต้นเมื่อ build ในเครื่อง |
| ที่อื่น | กำหนดเอง | `VITE_BASE=/ npm run build` |

ถ้า base ไม่ตรงกับ path ที่โฮสต์ หน้าเว็บจะขาวและ console แจ้ง 404 ของไฟล์ `index-*.css` / `index-*.js`

## หน้าในแอป

routing ใช้ hash (`#...`) เก็บใน `src/main.tsx` ทุกหน้า lazy-load แยกไฟล์ เปิดหน้าไหนก็โหลดเฉพาะหน้านั้น

| hash | หน้า | ไฟล์ |
|---|---|---|
| ไม่มี hash / `#home` | หน้าแรก (landing) | `src/pages/Landing.tsx` |
| `#overview` | ภาพรวม | `src/pages/Overview.tsx` |
| `#prices` | รายการวัสดุ (ชื่อ hash เดิมเพื่อรองรับลิงก์เก่า) | `src/pages/Materials.tsx` |
| `#analysis` | วิเคราะห์การเปลี่ยนแปลงราคา (3 เดือน – 10 ปี) | `src/pages/Analysis.tsx` |
| `#forecast` | พยากรณ์ราคา 1–3 เดือน | `src/pages/Forecast.tsx` |
| `#cost` | คำนวณต้นทุน (VAT 7%, สำรองผันผวน, CSV, พิมพ์) | `src/pages/CostCalculator.tsx` |

หน้าแรกไม่มี sidebar กดโลโก้ใน sidebar เพื่อกลับหน้าแรก hash ที่ไม่รู้จักจะเปิดหน้าภาพรวม

## ไฟล์หลัก

| ไฟล์ | หน้าที่ |
|---|---|
| `src/data/structural-materials.json` | รายชื่อวัสดุ หมวด รหัส และหน่วย ไม่มีราคา |
| `src/data.js` | ส่งออก catalog ฟังก์ชันค้นหา และเมนู sidebar |
| `src/services/priceService.ts` | ชั้นข้อมูลราคา: Demo หรือเรียก API เมื่อตั้ง `VITE_API_BASE` |
| `src/config/sources.ts` | แหล่งที่มาราคา (ลิงก์เปิดเว็บต้นทาง) |
| `src/main.tsx` | routing และ state ร่วม (วัสดุที่เลือก, หมวด, รายการคำนวณต้นทุน) |
| `src/components/MaterialPicker.jsx` | ค้นหาและเลือกวัสดุจาก dropdown |
| `src/pages/Landing.tsx` + `src/styles/landing.css` | หน้าแรก: ป้ายเหล็กเส้นแขวนลวด เลือกวัสดุบนป้ายได้ พลิกดูที่มาของตัวเลข |
| `src/components/ui/brand-mark.tsx` | โลโก้ THAI TAY CONSTRUCT (รูปอาคาร + ชื่อเป็นตัวอักษรจริง) และ `PaintDot` |
| `public/brand/` | รูปอาคารของโลโก้ (`thai-tay-mark.png` พื้น Warm White) และ favicon / apple-touch-icon ตัดจาก brand board |
| `src/config/chartColors.ts` | สีกราฟ (ราคาจริง charcoal, คาดการณ์ส้ม) |
| `src/config/categoryPaint.ts` | สีประจำ 9 หมวดวัสดุ (แบบสีทาปลายมัดเหล็ก) |
| `src/components/ui/header-3.tsx` | แถบบนของพื้นที่ทำงาน |
| `src/components/ui/saa-s-template.tsx` + `src/components/demo-saas-template.tsx` | component landing ที่แนบมาใน v0.6 ยังเก็บไว้ แต่หน้าแรก v0.7 ไม่ได้ใช้แล้ว |
| `src/components/ui/button.tsx` | shadcn Button |
| `src/components/ui/price-widgets.tsx` | แถบ Demo, ตัวเลือกช่วงเวลา, ลิงก์แหล่งที่มา |
| `src/components/ui/material-categories.tsx` | ปุ่มหมวดวัสดุพร้อมจำนวนรายการ |
| `src/components/ui/material-details.tsx` | รายละเอียดวัสดุที่เลือก |
| `src/components/ui/scope-layout.tsx` | หัวข้อหน้าและการ์ดสถิติ |
| `src/components/ui/intro-splash.tsx` | ตัดสินว่าจะแสดงหน้าต้อนรับหรือไม่ (โหลดทันที ขนาดเล็ก) |
| `src/components/ui/intro-splash-overlay.tsx` + `apple-hello-effect.tsx` | หน้าต้อนรับ "hello" ใช้ motion โหลดแยกเฉพาะตอนที่ต้องแสดง |
| `src/lib/utils.ts` | cn() จาก clsx และ tailwind-merge |
| `src/styles.css` | style entry, ฟอนต์ Prompt และ Tailwind theme |
| `src/styles/base.css` | reset และ layout พื้นฐาน (ส่วนที่ยังใช้จาก CSS รุ่นแรก) |
| `src/styles/app.css` | token สีทั้งหมด (`:root`), browser surfaces, sidebar / topbar |
| `src/styles/structural.css` | หน้าในพื้นที่ทำงาน: ภาพรวม, รายการวัสดุ, ราคา/พยากรณ์, คำนวณต้นทุน, หน้าต้อนรับ |
| `components.json` | การตั้งค่า shadcn CLI |

`@/` ชี้ไปที่ `src/` ดังนั้น `/components/ui` คือ `frontend/src/components/ui` ซึ่งเป็นตำแหน่งที่ shadcn CLI เพิ่ม component ให้ จึงเก็บ component ที่ใช้ซ้ำไว้ที่นี่

## ระบบสี / ตัวอักษร (v0.8: สีแบรนด์ THAI TAY CONSTRUCT)

ธีมสว่าง พื้น Warm White ไม่มีหน้ามืด แก้ค่าได้ที่ `:root` ใน `src/styles/app.css`

| token | ค่า | ใช้กับ |
|---|---|---|
| `--ground` | `#F3F0EA` Warm White | พื้นเว็บ, sidebar, พื้นหลังโลโก้ |
| `--panel` `--sunken` `--line` | `#FCFBF8` `#E9E4DA` `#DCD6CB` | แผ่นเนื้อหา พื้นยุบ เส้นแบ่ง |
| `--ink` `--ink-2` `--ink-3` | `#242A2D` Charcoal และ 2 ระดับรอง | ตัวอักษร ราคาจริง focus ring |
| `--concrete` | `#747D80` Concrete Gray | โลโก้ ตัวอักษรใหญ่ ของตกแต่ง (ห้ามใช้กับตัวเล็ก 3.7:1) |
| `--tag` | `#E8753B` Orange | ป้ายหน้าแรก ปุ่มหลัก สิ่งที่เลือก เมนูที่เปิดอยู่ (ตัวหนังสือบนส้มเป็น charcoal เท่านั้น) |
| `--forecast` / `--forecast-line` | `#A84B1A` / `#E8753B` | ตัวเลขราคาคาดการณ์ / เส้นและช่วงในกราฟ |
| `--up` `--down` | `#A3302A` `#2F6F55` | ราคาแพงขึ้น / ถูกลง |
| `--stamp` | `#C0301E` | ตราประทับ "ข้อมูลตัวอย่าง" บนพื้นสว่าง (บนป้ายส้มใช้หมึก charcoal) |

ฟอนต์ Prompt ทั้งเว็บ (หัวเรื่อง ตัวเลข เนื้อหา) เข้ากับตัวอักษรเรขาคณิตในโลโก้ ทุกคู่สีที่เป็นตัวหนังสือผ่าน WCAG AA (≥ 4.5:1)

โลโก้: รูปอาคารมีผนังสีเดียวกับพื้น Warm White จึงวางได้บนพื้น `#F3F0EA` เท่านั้น บนพื้นสีอื่น (เช่นป้ายส้ม) ให้วางในฉลากสีขาวอุ่น ถ้ามีไฟล์โลโก้ต้นฉบับความละเอียดสูง วางทับ `public/brand/thai-tay-mark.png` ได้เลย

ลำดับ CSS: `base.css` → `app.css` → `structural.css` ไฟล์หลังชนะเมื่อ selector เท่ากัน ใน v0.6 ได้ลบ declaration ที่ถูกไฟล์หลังทับเสมอ และ rule ของ class ที่ไม่มีในโค้ดแล้วออกจากทั้งสามไฟล์ (ตรวจด้วยภาพหน้าจอทุกหน้า 5 ขนาดจอ ได้ผลเหมือนเดิมทุก pixel)

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

Catalog ใช้เฉพาะ identity metadata ของรายการที่ `scope_status=included` ในขอบเขตโครงสร้าง 5 รายการที่รอทบทวนขอบเขตแยกออกจากรายการที่เลือก

Material มี `id`, `name`, `unit`, `categoryCode`, `category`, `familyCode` เก็บ MAT-ID ตาม catalog ค้นด้วยรหัสตัวเลข 16 หลักได้

หน้ารายการวัสดุ: มุมมองทุกหมวดแบ่งหัวข้อและแสดง 6 รายการแรกต่อหมวด กด "ดูหมวดนี้" เพื่อดูทั้งหมวด แบ่งหน้า 12 รายการ ค้นหาได้ด้วยชื่อ รหัส ขนาด หน่วย

## ข้อมูลราคาและการเชื่อม backend

ทุกหน้าเรียกข้อมูลราคาผ่าน `src/services/priceService.ts` เท่านั้น

- ไม่ได้ตั้ง `VITE_API_BASE`: ใช้ข้อมูลตัวอย่าง (Demo) ที่สร้างจากรหัสวัสดุ (วัสดุเดียวกันได้ชุดตัวเลขเดียวกัน) และแสดงแถบเตือน Demo ในหน้า
- ตั้ง `VITE_API_BASE` (เช่นในไฟล์ `.env`): เรียก API ตาม contract ด้านล่าง แถบ Demo หายเอง
  - `GET /prices/{materialId}/history?months=3..120` → `{ unit, points: [{ date, price }] }`
  - `GET /prices/{materialId}/forecast?months=1..3` → `{ unit, points: [{ month, date, price, low, high }] }`
- ข้อมูลย้อนหลังจริงไม่ถึง 10 ปี: ตั้ง `VITE_MAX_HISTORY_MONTHS` (เช่น 60) ตัวเลือกช่วงที่ยาวกว่าจะถูกปิด

## State

App เก็บวัสดุที่เลือก หมวดที่กรอง และรายการในหน้าคำนวณต้นทุนใน React state ของ `main.tsx` แล้วส่งเป็น props ให้แต่ละหน้า ค่าเหล่านี้ตามไปเมื่อเปลี่ยนหน้า แต่ reload แล้วจะเริ่มใหม่ ไม่มี provider หรือ state library เพิ่ม

## Dependencies / shadcn

ติดตั้งแล้ว: lucide-react, @radix-ui/react-slot, class-variance-authority, clsx, tailwind-merge, motion (หน้าต้อนรับ), recharts (กราฟ), @fontsource (Prompt), Tailwind Vite plugin, tw-animate-css และ TypeScript / type packages

เพิ่ม UI component ต่อ:

```bash
npx shadcn@latest add input
```

ไม่ต้อง init ซ้ำ หากเริ่มใน React/Vite project อื่นที่ยังไม่มี ให้ตั้ง TypeScript, Tailwind Vite plugin และ alias @/ ก่อน แล้วรัน shadcn init:

```bash
npm install -D typescript @types/react @types/react-dom @types/node
npm install -D tailwindcss @tailwindcss/vite
npm install lucide-react @radix-ui/react-slot class-variance-authority clsx tailwind-merge
npx shadcn@latest init
```

เพิ่ม tailwindcss() ใน Vite plugins, import Tailwind ใน CSS entry และตั้ง @/* ให้ชี้ src/* ทั้ง tsconfig / Vite ดู [shadcn Vite setup](https://ui.shadcn.com/docs/installation/vite) และ [Tailwind Vite](https://tailwindcss.com/docs/installation/using-vite)

## Responsive / assets

Sidebar ยุบเป็นเมนูบนจอกว้างไม่เกิน 1100px หน้าแรกเปลี่ยนเป็นเมนูมือถือที่ต่ำกว่า 1024px ทุกหน้าตรวจที่ 1440, 1024, 768, 390 และ 320 px ไม่มีหน้าล้นแนวนอน

ใช้ lucide-react สำหรับไอคอน ภาพเก็บใน `public/images`:

- `construction-architecture.jpg`: ภาพจาก Unsplash ใช้เป็นภาพตั้งต้นของ `saa-s-template` (หน้าในแอปไม่ได้ใช้)

- `public/brand/*`: โลโก้และไอคอนจาก brand board ของเจ้าของ (ฝังที่มาไว้ในไฟล์)

นอกจากโลโก้ หน้าในแอปไม่ใช้รูปภาพ: ป้าย ห่วงตาไก่ ลวด และจุดสีหมวด วาดด้วย CSS / SVG ขนาดเล็ก

font bundle อยู่ใน project จึงไม่ต้องเรียกบริการภาพหรือ font ภายนอกเมื่อเปิดเว็บ ลิงก์ภายนอกมีเฉพาะลิงก์แหล่งที่มาราคาที่ผู้ใช้กดเอง

## โค้ดที่นำออกใน v0.6

นำออกเพราะไม่ได้ใช้ในแอปแล้ว ยังกู้คืนได้จาก git (commit `9c0c9cd`):

- `src/future/CostPlanner.jsx`, `src/components/Shared.jsx`: BOQ / ต้นทุนรวมรุ่นเก่า (หน้าคำนวณต้นทุนใหม่ใช้แทน) พร้อม dependency `pdfjs-dist`, `xlsx`
- `make-data.cjs`, `legacy/make-data.cjs`: script รุ่นเก่าที่เขียนทับ `src/data.js` ด้วยรูปแบบเดิม (ถ้ารันจะทำให้แอปพัง) ปัจจุบันแก้ catalog ที่ `src/data/structural-materials.json`
- `src/components/demo.tsx`: demo ของ hero-3 / header-3

```bash
git show 9c0c9cd:frontend/src/future/CostPlanner.jsx > CostPlanner.jsx
```

ผลตรวจและภาพตัวอย่างอยู่ที่ `../preview/verification.md`
