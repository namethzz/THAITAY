# THAI TAY Auth API

Express API สำหรับสมัครสมาชิก เข้าสู่ระบบ และออกจากระบบ โดยเก็บบัญชีใน MongoDB

## รันในเครื่อง

ต้องมี Node.js และ MongoDB Atlas หรือ MongoDB ที่เข้าถึงได้จากเครื่อง

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

แก้ `backend/.env`:

- `MONGODB_URI`: connection string ของ MongoDB และชื่อ database
- `JWT_SECRET`: สุ่มค่าอย่างน้อย 32 ตัวอักษร ห้ามใช้ค่าตัวอย่าง
- `CLIENT_ORIGIN`: origin ของ frontend เช่น `http://localhost:5173`
- `PORT`: พอร์ต API (ค่าเริ่มต้น 5000)

สำหรับ MongoDB Atlas ให้เพิ่ม IP ของเครื่องใน Network Access และสร้าง database user ที่มีสิทธิ์เฉพาะ database นี้ ถ้ารหัสผ่านมีอักขระพิเศษต้อง URL-encode ก่อนใส่ connection string อย่า commit หรือส่งไฟล์ `.env`; ไฟล์นี้อยู่ใน `.gitignore`

```powershell
npm run dev
```

ตรวจ backend ได้ที่ `http://localhost:5000/api/health` จากนั้นเปิด frontend ในอีก terminal:

```powershell
cd frontend
npm run dev
```

Vite proxy `/api` ไป backend ในเครื่องให้อยู่แล้ว หน้าเว็บใช้ `#login` และ `#register`

## API

| Method | Path | ข้อมูล |
|---|---|---|
| POST | `/api/auth/register` | `name`, `email`, `password` — สร้างบัญชีและเข้าสู่ระบบ |
| POST | `/api/auth/login` | `email`, `password` |
| POST | `/api/auth/logout` | ลบ session cookie |
| GET | `/api/auth/me` | ข้อมูลบัญชีของ session ปัจจุบัน |

รหัสผ่านต้องไม่เว้นว่าง แต่กำหนดความยาวได้โดยไม่มีขั้นต่ำหรือเพดานในฟอร์ม (ตัว API จำกัดขนาด request ที่ 1 MB) ระบบแฮช SHA-256 แบบมี domain separation ก่อนนำไป hash ด้วย bcrypt จึงรองรับรหัสผ่านยาวเกินข้อจำกัด 72 ไบต์ของ bcrypt และยังตรวจรูปแบบ bcrypt เดิมเพื่อให้บัญชีที่มีอยู่ล็อกอินได้ เอกสาร MongoDB เก็บชื่อ อีเมล (ไม่ซ้ำ) และ hash เท่านั้น ส่วน JWT เก็บใน cookie แบบ `httpOnly`, `SameSite=Lax` อายุ 7 วัน

## Deploy

ตั้ง `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` และ `NODE_ENV=production` ใน environment ของ backend แล้วให้บริการผ่าน HTTPS ตั้ง `VITE_AUTH_API_BASE` ตอน build frontend ให้ชี้ไปที่ `/api/auth` บนโดเมนเดียวกันหรือ API ที่อยู่ภายใต้ same-site domain เพื่อให้ cookie ทำงานได้ และตั้ง `CLIENT_ORIGIN` เป็น origin ของ frontend อย่างตรงตัว ห้ามใส่ credentials ใน `VITE_*` เพราะค่าฝั่ง frontend จะถูกเผยแพร่ให้ browser
