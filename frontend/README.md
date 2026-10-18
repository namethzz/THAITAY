# THAI TAY Frontend v0.10

React 18 + Vite 6 + TypeScript + Tailwind CSS 4 + shadcn/ui

พิมพ์ชื่อวัสดุงานโครงสร้าง แล้วเห็นราคาล่าสุดและราคาคาดการณ์ 1–3 เดือนทันที ใส่จำนวนแล้วได้ใบประมาณราคา ข้อมูลราคาตอนนี้เป็น **ข้อมูลตัวอย่าง (Demo)** ที่สร้างใน `src/services/priceService.ts` จนกว่าจะเชื่อม backend ผ่าน `VITE_API_BASE` (ดูหัวข้อ "ข้อมูลราคาและการเชื่อม backend")

## รันโครงการ

Node.js >=22.13:

```bash
npm ci
npm run dev
npm run build
npm run preview
```

build ตรวจ TypeScript ก่อนสร้างไฟล์ production `src/data.js` ยังเป็น JavaScript (มี `data.d.ts` กำกับชนิด) จึงเปิด allowJs และปิด checkJs ส่วนอื่นใช้ TSX

## Deploy

`base` ใน `vite.config.ts` เลือกให้อัตโนมัติ:

| ที่โฮสต์ | base | หมายเหตุ |
|---|---|---|
| Vercel | `/` | Vercel ตั้งตัวแปร `VERCEL` ตอน build ให้เอง ตั้ง Root Directory ของโปรเจกต์เป็น `frontend` |
| GitHub Pages (`npm run deploy`) | `/construction-price-intelligence/` | ค่าเริ่มต้นเมื่อ build ในเครื่อง |
| ที่อื่น | กำหนดเอง | `VITE_BASE=/ npm run build` |

ถ้า base ไม่ตรงกับ path ที่โฮสต์ หน้าเว็บจะขาวและ console แจ้ง 404 ของไฟล์ `index-*.css` / `index-*.js`

## หน้าในแอป

เว็บมี 3 หน้า routing ใช้ hash (`#...`) แปลง hash ↔ หน้าใน `src/lib/routes.ts` หน้าแรกโหลดพร้อมแอป หน้าอื่น lazy-load แยกไฟล์ (กราฟ recharts โหลดเฉพาะหน้าวัสดุ)

| hash | หน้า | ไฟล์ |
|---|---|---|
| ไม่มี hash / `#home` | หน้าแรก: หัวข้อ ช่องค้นหา การ์ดราคา วิธีใช้ ที่มาของราคา | `src/pages/Home.tsx` |
| `#search?q=…&cat=…` | ค้นหาวัสดุ: รายการทั้งหมดพร้อมราคา กรองตามหมวด (คำค้นเก็บใน URL) | `src/pages/Search.tsx` |
| `#m/<MAT-ID>` | หน้าวัสดุ (อยู่ในส่วน "ค้นหา"): ราคา คาดการณ์ คำแนะนำ กราฟ 12+3 เดือน คำนวณต้นทุน | `src/pages/MaterialPage.tsx` |
| `#estimate` | ใบประมาณราคา: ชื่อโครงการ/ลูกค้า จำนวน เงินสำรอง VAT 7% ยอดรวม ช่วงต่ำ–สูง ส่งทาง LINE คัดลอกลิงก์ พิมพ์ / PDF CSV | `src/pages/Estimate.tsx` |
| `#estimate?d=…` | ใบประมาณที่ส่งมาทางลิงก์ (อ่านอย่างเดียว ราคา ณ วันที่ส่ง) | `src/pages/Estimate.tsx` + `src/lib/shareEstimate.ts` |

ลิงก์ของ v0.8 ยังเปิดได้: `#overview` → หน้าแรก, `#prices` → ค้นหา, `#forecast` / `#analysis` → หน้าวัสดุที่ดูล่าสุด, `#cost` → ใบประมาณราคา hash ที่ไม่รู้จักเปิดหน้าแรก รหัสวัสดุที่ไม่มีเปิดหน้าค้นหา

จอใหญ่ (≥ 768px) มีเมนู 3 ลิงก์ด้านบน มือถือมีแถบล่าง 3 ปุ่ม ปุ่มกลางคือค้นหา

## ไฟล์หลัก

| ไฟล์ | หน้าที่ |
|---|---|
| `src/data/structural-materials.json` | รายชื่อวัสดุ หมวด รหัส และหน่วย ไม่มีราคา |
| `src/data.js` | ส่งออก catalog และ `searchMaterials()`: ไม่สนตัวพิมพ์ จุด ช่องว่าง ขีด ("sd40" เจอ "SD.40") เข้าใจคำหน้างานใน `ALIASES` (ปูน, ไวร์เมช, เอชบีม, ลวดอัดแรง) และขนาด DB12 / RB9 / "4 หุน" / "12 มม" เรียงชื่อที่ขึ้นต้นด้วยคำค้นก่อน |
| `src/lib/materialTitle.ts` | ชื่อสั้นจากสเปก เช่น "เหล็กข้ออ้อย SD40 · 16 มม." (ชื่อเต็มเป็นบรรทัดรอง) |
| `src/lib/rebar.ts` | น้ำหนักต่อเส้นของเหล็กเส้น (0.00617 × ศก.² กก./ม. × ความยาว) และราคาต่อเส้นจากราคาต่อตัน |
| `src/lib/shareEstimate.ts` | เข้ารหัส/อ่านใบประมาณในลิงก์ (`#estimate?d=` base64url JSON v1) ข้อมูลเสียหรือรหัสวัสดุที่ไม่มีจะถูกข้าม |
| `src/lib/searchFilters.ts` + `src/components/site/search-filters.tsx` | ตัวกรองหน้าค้นหา: เรียงตาม, แนวโน้ม 3 เดือน, หน่วย, เกรด/ขนาดเหล็กเส้น (เก็บใน URL) |
| `src/components/site/category-filter.tsx` | ปุ่มเลือกหมวดแบบเดียวในหน้าค้นหา (กล่องลอยบนจอใหญ่ / แผ่นจากด้านล่างบนมือถือ) |
| `src/lib/storage.ts` | `usePersistentState` จำค่าใน localStorage (บันทึกไม่ได้ก็ใช้งานต่อได้) |
| `src/components/site/category-icon.tsx` + `public/icons/categories/STR-0X.webp` | icon 9 หมวดจากชุดของเจ้าของเว็บ (ไฟล์ `.webp.json` ข้าง ๆ คือที่มาของภาพ) |
| `src/services/priceService.ts` | ชั้นข้อมูลราคา: Demo หรือเรียก API เมื่อตั้ง `VITE_API_BASE`, `getQuote()` (ราคาล่าสุด + คาดการณ์ 3 เดือน มีแคช), `trendVerdict()` คำแนะนำซื้อตอนนี้/รอ |
| `src/services/demoPrices.ts` | ระดับราคาตั้งต้นของข้อมูลตัวอย่างตามสเปก (เกรด ขนาด น้ำหนัก กำลังอัด หน้าตัด) ไม่ถูกใช้เมื่อเชื่อม API |
| `src/main.tsx` | state ร่วม (วัสดุที่ดูล่าสุด, ใบประมาณราคา, แจ้งเตือน) และสลับหน้า |
| `src/lib/routes.ts` | hash ↔ หน้า และลิงก์เก่า |
| `src/components/site/chrome.tsx` | แถบบน แถบล่างมือถือ ท้ายเว็บ และแจ้งเตือนหลังเพิ่มรายการ |
| `src/components/site/material-search.tsx` | ช่องค้นหาแบบ combobox: รายการพร้อมราคา ลูกศร/Enter/Esc คำแนะนำเมื่อไม่พบ |
| `src/components/site/price-card.tsx` | การ์ดราคา: ราคาล่าสุดตัวใหญ่ + อีก 1–3 เดือน + คำแนะนำ (แบบหน้าแรก / แบบหน้าวัสดุมีช่วงต่ำ–สูง) |
| `src/components/site/qty-stepper.tsx` | ช่องจำนวน − / + พิมพ์ทศนิยมได้ |
| `src/components/site/site-art.tsx` + `src/config/photos.ts` | ภาพใต้ช่องค้นหา: รูปจริงจาก `public/photos/` ถ้าตั้งไว้ ไม่งั้นเป็นภาพวาดหน้างาน |
| `src/components/ui/price-widgets.tsx` | ป้าย/หมายเหตุข้อมูลตัวอย่าง ป้ายแพงขึ้น/ถูกลง ลิงก์แหล่งที่มา hook โหลดราคา |
| `src/components/ui/brand-mark.tsx` | โลโก้ THAI TAY CONSTRUCT (รูปอาคาร + ชื่อเป็นตัวอักษรจริง) |
| `src/config/sources.ts` | แหล่งที่มาราคา (ลิงก์เปิดเว็บต้นทาง) |
| `src/config/chartColors.ts` | สีกราฟ (ราคาจริง charcoal, คาดการณ์ส้มเข้ม, ช่วงส้มอ่อน) |
| `public/brand/` | รูปอาคารของโลโก้ (`thai-tay-mark.png` พื้น Warm White) และ favicon / apple-touch-icon ตัดจาก brand board |
| `src/components/ui/intro-splash.tsx` + `intro-splash-overlay.tsx` + `apple-hello-effect.tsx` | หน้าต้อนรับ "hello" ครั้งแรกที่เปิดแท็บ (motion โหลดแยกเฉพาะตอนแสดง) |
| `src/components/ui/saa-s-template.tsx` + `src/components/demo-saas-template.tsx` | component landing ที่แนบมาใน v0.6 ยังเก็บไว้ แต่ไม่ได้ใช้ |
| `src/components/ui/button.tsx` | shadcn Button (หน้าใหม่ใช้ class `.btn` ใน CSS) |
| `src/lib/utils.ts` | cn() จาก clsx และ tailwind-merge |
| `src/styles.css` | style entry, ฟอนต์ Prompt และ Tailwind theme |
| `src/styles/base.css` | reset |
| `src/styles/app.css` | token สี (`:root`), ปุ่ม, แถบบน/ล่าง, ท้ายเว็บ, แจ้งเตือน, หน้าต้อนรับ |
| `src/styles/site.css` | ช่องค้นหา การ์ดราคา และทั้ง 3 หน้า + responsive + พิมพ์ |
| `components.json` | การตั้งค่า shadcn CLI |

`@/` ชี้ไปที่ `src/` ดังนั้น `/components/ui` คือ `frontend/src/components/ui` ซึ่งเป็นตำแหน่งที่ shadcn CLI เพิ่ม component ให้ จึงเก็บ component ที่ใช้ซ้ำไว้ที่นี่

## ระบบสี / ตัวอักษร (สีแบรนด์ THAI TAY CONSTRUCT)

ธีมสว่าง พื้น Warm White การ์ดขาว ไม่มีหน้ามืด แก้ค่าได้ที่ `:root` ใน `src/styles/app.css`

| token | ค่า | ใช้กับ |
|---|---|---|
| `--ground` | `#F3F0EA` Warm White | พื้นเว็บ แถบบน พื้นหลังโลโก้ |
| `--surface` `--warm-50` | `#FFFFFF` `#F8F6F1` | การ์ด ช่องกรอก / ช่องราคาในการ์ด |
| `--sunken` `--line` | `#E9E4DA` `#DCD6CB` | ป้ายหมวด เส้นขอบ |
| `--ink` `--ink-2` `--ink-3` | `#242A2D` Charcoal และ 2 ระดับรอง | ตัวอักษร ราคาจริง ชิปที่เลือก focus ring |
| `--concrete` | `#747D80` Concrete Gray | ขอบช่องกรอก (4.2:1) ห้ามใช้กับตัวหนังสือเล็ก |
| `--tag` `--tag-tint` | `#E8753B` Orange / `#FBE3D4` | ปุ่มหลัก ปุ่มค้นหา สิ่งที่เลือก (ตัวหนังสือบนส้มเป็น charcoal เท่านั้น) / พื้นเน้น |
| `--forecast` | `#A84B1A` | ตัวเลขราคาคาดการณ์ และเส้นคาดการณ์ในกราฟ |
| `--up` `--down` | `#9E1B3C` `#2F6F55` | แพงขึ้น / ถูกลง (มีคำและลูกศรกำกับเสมอ) |
| `--stamp` | `#C0301E` | ป้าย "ข้อมูลตัวอย่าง" |

ฟอนต์ Prompt ทั้งเว็บ ทุกคู่สีที่เป็นตัวหนังสือผ่าน WCAG AA (≥ 4.5:1)

โลโก้: รูปอาคารมีผนังสีเดียวกับพื้น Warm White จึงวางบนพื้น `#F3F0EA` เท่านั้น (แถบบนและท้ายเว็บใช้สีนี้) ถ้ามีไฟล์โลโก้ต้นฉบับความละเอียดสูง วางทับ `public/brand/thai-tay-mark.png` ได้เลย

ลำดับ CSS: `base.css` → `app.css` → `site.css`

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

หน้าค้นหา: ไม่พิมพ์อะไรจะเรียงตามหมวด (เหล็กเส้นก่อน) แสดงทีละ 24 รายการ ค้นได้ด้วยชื่อ รหัส ขนาด หน่วย

## ข้อมูลราคาและการเชื่อม backend

ทุกหน้าเรียกข้อมูลราคาผ่าน `src/services/priceService.ts` เท่านั้น

- ไม่ได้ตั้ง `VITE_API_BASE`: ใช้ข้อมูลตัวอย่าง (Demo) ที่สร้างจากรหัสวัสดุ (วัสดุเดียวกันได้ตัวเลขเดียวกันทุกหน้า) มีป้าย "ข้อมูลตัวอย่าง" บนการ์ดราคาและหมายเหตุท้ายหน้า
- ตั้ง `VITE_API_BASE` (เช่นในไฟล์ `.env`): เรียก API ตาม contract ด้านล่าง ป้าย Demo หายเอง
  - `GET /prices/{materialId}/history?months=1..12` → `{ unit, points: [{ date, price }] }` (การ์ดราคาใช้ 1 เดือนล่าสุด กราฟใช้ 12)
  - `GET /prices/{materialId}/forecast?months=1..3` → `{ unit, points: [{ month, date, price, low, high }] }`
- รายการค้นหาแสดงราคาทุกแถวที่เห็น (สูงสุด 24 แถวต่อครั้ง) แต่ละวัสดุเรียก API ครั้งเดียวแล้วเก็บแคช ถ้าจะลดจำนวน request ทำ endpoint รวมหลายรหัสแล้วแก้ `getQuote()` ที่เดียว

## State

`main.tsx` เก็บวัสดุที่ดูล่าสุด (การ์ดหน้าแรกแสดงวัสดุนี้) รายการในใบประมาณราคา หัวใบประมาณ วัสดุที่ติดตาม และแจ้งเตือน ค่าที่จำไว้ใน `localStorage`: `thai-tay-estimate-v1` (รายการ), `thai-tay-estimate-meta-v1` (โครงการ ลูกค้า เงินสำรอง VAT), `thai-tay-watch-v1` (วัสดุที่ติดตาม) ถ้าเบราว์เซอร์บันทึกไม่ได้ก็ใช้งานต่อได้ตามปกติ ไม่มี provider หรือ state library เพิ่ม

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

ตรวจทุกหน้าที่ 1440, 1024, 768, 390 และ 320 px ไม่มีหน้าล้นแนวนอน ต่ำกว่า 768px เมนูบนซ่อนและใช้แถบล่าง ต่ำกว่า 960px หน้าวัสดุและใบประมาณราคาเรียงเป็นคอลัมน์เดียว

ใช้ lucide-react สำหรับไอคอน รูปภาพ:

- `public/brand/*`: โลโก้และไอคอนจาก brand board ของเจ้าของ (ฝังที่มาไว้ในไฟล์)
- `public/icons/categories/*`: icon 9 หมวดจากชุดที่เจ้าของส่งมา (ที่มาอยู่ในไฟล์ `.webp.json` ข้าง ๆ)
- `public/photos/*`: รูปจริงของเว็บ (ยังไม่มี) ตั้งชื่อไฟล์ใน `src/config/photos.ts` ถ้ายังไม่ตั้ง ภาพใต้ช่องค้นหาเป็นภาพวาด SVG ใน `site-art.tsx`
- `public/images/construction-architecture.jpg`: ภาพจาก Unsplash ของ `saa-s-template` (ไม่ได้ใช้)

font bundle อยู่ใน project จึงไม่ต้องเรียกบริการภาพหรือ font ภายนอกเมื่อเปิดเว็บ ลิงก์ภายนอกมีเฉพาะลิงก์แหล่งที่มาราคาที่ผู้ใช้กดเอง

## โค้ดที่นำออกใน v0.9

หน้าและ component ของ v0.8 ที่รวมเป็น 3 หน้าใหม่ กู้คืนได้จาก git (commit `2be6dd7`): `src/pages/Landing.tsx`, `Overview.tsx`, `Materials.tsx`, `Analysis.tsx`, `Forecast.tsx`, `CostCalculator.tsx`, `src/components/MaterialPicker.jsx`, `src/components/ui/header-3.tsx`, `material-categories.tsx`, `material-details.tsx`, `scope-layout.tsx`, `src/config/categoryPaint.ts`, `src/styles/landing.css`, `src/styles/structural.css`

```bash
git show 2be6dd7:frontend/src/pages/Analysis.tsx > Analysis.tsx
```

## โค้ดที่นำออกใน v0.6

นำออกเพราะไม่ได้ใช้ในแอปแล้ว ยังกู้คืนได้จาก git (commit `9c0c9cd`):

- `src/future/CostPlanner.jsx`, `src/components/Shared.jsx`: BOQ / ต้นทุนรวมรุ่นเก่า (หน้าคำนวณต้นทุนใหม่ใช้แทน) พร้อม dependency `pdfjs-dist`, `xlsx`
- `make-data.cjs`, `legacy/make-data.cjs`: script รุ่นเก่าที่เขียนทับ `src/data.js` ด้วยรูปแบบเดิม (ถ้ารันจะทำให้แอปพัง) ปัจจุบันแก้ catalog ที่ `src/data/structural-materials.json`
- `src/components/demo.tsx`: demo ของ hero-3 / header-3

```bash
git show 9c0c9cd:frontend/src/future/CostPlanner.jsx > CostPlanner.jsx
```

ผลตรวจและภาพตัวอย่างอยู่ที่ `../preview/verification.md`
