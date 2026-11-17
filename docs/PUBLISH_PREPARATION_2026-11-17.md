# จัดชุดงานก่อนส่ง GitHub — 17 พ.ย. 2569

ฐาน: `fb1ea4e` จาก `origin/main`; branch รวมงาน: `chore/prepare-reviewed-updates`

## ชุด commit

1. ระบบป้ายแจ้งเตือน: แยก calibration/test ตามเวลา ใช้ปัจจัยที่ยืนยันเส้นทางอัปเดตได้ 5 ตัว เพิ่ม regression tests และเก็บผลประเมิน/manifest พร้อม probability สำหรับเว็บ ราคาคาดการณ์และช่วงต่ำ–สูงคงค่าเดิม
2. Frontend: เพิ่มกราฟราคาจริงและต้นทุน ค้นหาวัสดุเปรียบเทียบด้วยการพิมพ์ แก้หน้าจอมือถือ/แนวนอน และอัปเดต dependency พร้อม lockfile
3. เอกสารและหลักฐาน: คู่มือตรวจงาน ภาพหน้าจอ ผลตรวจมือถือ และกฎกันไฟล์ตั้งค่าส่วนตัว/cache/log ออกจาก Git

งาน ML ในชุดนี้เป็นการจัดเก็บงานเดิมที่ทำไว้แล้ว ไม่ได้ฝึกหรือทดลองโมเดลใหม่ในรอบเตรียม push

## คำสั่งตรวจซ้ำ

จาก root ของ repository:

```powershell
ml/.venv/Scripts/python.exe -X utf8 -m unittest discover -s ml/tests -v
npm --prefix frontend run build
npm --prefix frontend run test:charts
npm --prefix frontend audit
git diff --check
```

เครื่องใหม่ติดตั้ง Python dependencies ตาม `ml/requirements-monthly.txt` และใช้ `npm --prefix frontend ci` ก่อน build ไฟล์ข้อมูลกราฟสร้างจาก `ml/api_data/prices.csv` ที่อยู่ใน repository โดยไม่ต้องติดต่อ API ภายนอก

ผลตรวจรอบจัดชุด: Python 10 tests และกราฟ 8 tests ผ่าน; TypeScript/production build ผ่าน; npm audit พบ 0 ช่องโหว่; Bash syntax และ diff whitespace ผ่าน ตรวจเทียบกับฐานแล้วราคาคาดการณ์ วันที่ ช่วงต่ำ–สูง และประวัติ JSON ไม่เปลี่ยน มีเพียงความน่าจะเป็นของป้ายที่เปลี่ยน คำสั่ง Python บน Windows ระบุ `-X utf8` เพื่อให้พิมพ์ข้อความไทยผ่าน terminal ที่ค่าเริ่มต้นเป็น cp1252 ได้

## ขอบเขตการเผยแพร่

ส่งงานไป branch แยกสำหรับตรวจ ไม่ merge เข้า `main` ในรอบนี้ งานทดสอบบนมือถือจริงและประวัติการ deploy ภายนอกยังมีข้อจำกัดตาม [รายงานมือถือ](MOBILE_AUDIT_2026-11-17.md) และ [รายงานป้าย](SIGNAL_REVISION_2026-11-17.md)

ไฟล์ build log เก็บในเครื่องแต่ไม่รวม commit ส่วนภาพหน้าจอและผลประเมินที่ใช้อ้างอิงเก็บใน `docs/` ตามหัวข้องาน
