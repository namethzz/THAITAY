# โมเดลพยากรณ์ราคา (ml/)

โฟลเดอร์นี้ดึงราคาจาก สนค. คำนวณราคาคาดการณ์ ช่วงราคา และป้าย แล้วเขียนเป็นไฟล์ JSON ให้หน้าเว็บอ่าน งานประจำมีคำสั่งเดียวคือ `bash monthly_update.sh` เดือนละครั้ง

```text
สนค. (index.tpso.go.th)
  → fetch_tpso.py, prepare_data.py      ดึงราคาและทำความสะอาด ได้ data/prices_clean.csv
  → build_factors.py                    ปัจจัยภายนอกย้อนหลังจากไฟล์ทีมใน Google Drive
  → baseline.py (ใช้ bands.py)          ราคาคาดการณ์ 1–3 เดือนแบบ Naive พร้อมช่วงต่ำ–สูง → api_data/
  → update_catalog_status.py            บอกหน้าเว็บว่าวัสดุไหน สนค. เลิกเก็บราคา
  → fetch_factors.py                    ต่อปัจจัยภายนอกถึงเดือนล่าสุด (Yahoo Finance, ปตท.)
  → change_signal.py                    ป้าย "ราคามีโอกาสเปลี่ยน" (LightGBM) เติมลง api_data/forecast.csv
  → export_static.py                    ไฟล์ JSON ของเว็บใน ../frontend/public/data/prices/
  → live_check.py                       สอบคำทายเดือนก่อนกับราคาจริง
```

ไม่มี backend หน้าเว็บอ่านไฟล์ JSON เอง เพราะราคาเปลี่ยนเดือนละครั้ง ตอนผู้ใช้เปิดเว็บจึงไม่มีอะไรต้องคำนวณ Vercel ส่งไฟล์ไปพร้อมหน้าเว็บ (`serve.py` เป็นทางเลือก ดูท้ายไฟล์)

## ใช้อะไรบนเว็บ

| ส่วนบนเว็บ | ใช้อะไร | ผลทดสอบ 12 เดือนล่าสุด |
|---|---|---|
| ราคาคาดการณ์ 1 / 2 / 3 เดือน | Naive: ราคาเดือนหน้า = ราคาล่าสุด | ทายผิดเฉลี่ย 1.75 / 3.47 / 5.06% |
| ช่วงราคาต่ำ–สูง | `bands.py`: การเปลี่ยนราคาจริงในอดีตของแต่ละหมวด ตัดหัวท้าย 2.5% | ครอบราคาจริง 87 / 87 / 83% |
| ป้าย "ราคามีโอกาสเปลี่ยน" | `change_signal.py`: LightGBM ขึ้นป้ายเมื่อโอกาส 70% ขึ้นไป | ขึ้นป้ายแล้วเปลี่ยนจริง 80% |

ทดลองไป 16 แบบ (LightGBM, Random Forest, LSTM, Linear Regression, ETS และอื่น ๆ) ไม่มีแบบไหนทายราคาแม่นกว่า Naive ได้ทั้งช่วง Validation (2562–2568) และ Test (12 เดือนล่าสุด) จึงใช้ Naive ทายราคา และใช้ ML กับป้ายเท่านั้น รายละเอียดทุกการทดลองอยู่ใน [`DATA_REVIEW.md`](DATA_REVIEW.md) และ notebook [`colab/THAITAY_ML.ipynb`](colab/THAITAY_ML.ipynb)

## ขั้นที่ 0: ติดตั้ง

ต้องมี Python 3.10 ขึ้นไป (ทดสอบล่าสุดกับ 3.13) บน Windows ให้รันคำสั่งใน Git Bash หรือ WSL เพราะ `monthly_update.sh` เป็นสคริปต์ bash

```bash
cd ml
python -m venv .venv
source .venv/bin/activate          # Windows (Git Bash): source .venv/Scripts/activate
pip install pandas numpy openpyxl statsmodels lightgbm scikit-learn
```

เท่านี้พอสำหรับงานรายเดือน ถ้าจะรันการทดลองซ้ำ (LSTM, กราฟ, backend) ให้ลงครบด้วย `pip install -r requirements.txt`

## ขั้นที่ 1: อัปเดตราคาทุกเดือน

สนค. ออกราคาเดือนใหม่ราววันที่ 9 รันจากโฟลเดอร์ `ml/`:

```bash
bash monthly_update.sh
```

- ไม่ต้องมีไฟล์ข้อมูลมาก่อน สคริปต์ดึงเองทั้งหมด ต้องเข้าเว็บได้: `index.tpso.go.th`, `drive.usercontent.google.com`, `query1.finance.yahoo.com`, `orapiweb.pttor.com`
- ถ้า สนค. ยังไม่ประกาศเดือนใหม่ สคริปต์หยุดด้วย exit 3 และไม่เปลี่ยนไฟล์ใน `api_data/`
- ถ้าเรียก Python ด้วยชื่ออื่น ให้ตั้ง `PYTHON` เช่น `PYTHON=python3 bash monthly_update.sh`

ไฟล์ที่เปลี่ยนและต้อง commit:

- `api_data/prices.csv` และ `api_data/forecast.csv`
- `../frontend/public/data/prices/*.json`
- `../frontend/src/data/structural-materials.json` (ช่องวัสดุที่เลิกเก็บราคา)

ก่อน merge ให้อ่าน `out/live_check.md` ทายผิดเฉลี่ยควรอยู่ราว 0.7–1.8% และราคาจริงควรอยู่ในช่วงต่ำ–สูงเกือบทั้งหมด ถ้าหลุดไปมาก ให้ดูก่อนว่าเกิดอะไร พอ merge เข้า `main` แล้ว Vercel deploy เอง

ตอนนี้มีงานตั้งเวลาใน Claude รันขั้นนี้ทุกวันที่ 10 เวลา 09:39 (เวลาไทย) แล้วเปิด PR รอคนตรวจ ไม่ merge เอง งานนี้อยู่ในบัญชี Claude ของผู้ดูแลโปรเจกต์ ถ้างานไม่ทำงาน ให้รันเองตามด้านบน

ข้างในสคริปต์มี 8 ขั้น จะรันทีละขั้นก็ได้ คำสั่งเต็มดูใน `monthly_update.sh`

| ขั้น | สคริปต์ | ทำอะไร |
|---|---|---|
| 1 | `fetch_tpso.py`, `prepare_data.py` | ดึงราคาจาก สนค. และทำความสะอาด ได้ `data/prices_clean.csv` |
| 2 | `build_factors.py` | โหลดไฟล์ดิบปัจจัยภายนอก 8 ไฟล์ของทีมจาก Google Drive (ID ไฟล์อยู่ในสคริปต์) ได้ `data/factors_monthly.csv` |
| 3 | `baseline.py` | ราคาคาดการณ์และช่วงต่ำ–สูง แล้วคัดลอกผลเข้า `api_data/` |
| 4 | `update_catalog_status.py` | เขียนว่าวัสดุไหนเลิกเก็บราคา และรหัสเก่าไหนมีรหัสใหม่แทน |
| 5 | `fetch_factors.py` | ต่อปัจจัยภายนอกถึงเดือนล่าสุด รายงานอยู่ที่ `out/factors_update.md` |
| 6 | `change_signal.py` | ป้าย "ราคามีโอกาสเปลี่ยน" |
| 7 | `export_static.py` | ไฟล์ JSON ของเว็บ วัสดุละ 1 ไฟล์ (ลบไฟล์เก่าในโฟลเดอร์ก่อนเขียน) |
| 8 | `live_check.py` | สอบคำทายเดือนก่อนกับราคาจริง เขียน `out/live_check.md` |

- ไฟล์ทีมใน Drive ต้องเปิดแชร์แบบ "ทุกคนที่มีลิงก์" ไว้ ถ้าแทนด้วยไฟล์ใหม่ ต้องแก้ ID ใน `monthly_update.sh`
- ถ่านหิน เศษเหล็ก และเหล็กฟิวเจอร์ส ยังไม่มีแหล่งอัตโนมัติ `fetch_factors.py` ใช้ค่าเดือนล่าสุดที่มีแทน และบอกไว้ในรายงาน

## ตรวจข้อมูลราคา (`prepare_data.py`)

`monthly_update.sh` รันขั้นนี้ให้แล้ว อ่านส่วนนี้เมื่อรายงานเจอปัญหา หรือเมื่อจะใช้ไฟล์ราคาจากที่อื่น

```bash
python prepare_data.py data/tpso_prices.csv
```

ใส่หลายไฟล์พร้อมกันได้ และอ่านทุกชีตใน Excel script เดารูปแบบไฟล์ให้เอง ใช้ได้ทั้งแบบ 1 แถวต่อ 1 เดือน (`รหัสสินค้า | เดือน | ราคา`) และแบบมีเดือนเป็นคอลัมน์ (`รหัสสินค้า | ม.ค. 67 | ก.พ. 67 | ...`) อ่านเดือนได้ทั้ง พ.ศ. และ ค.ศ. ถ้าเดาชื่อคอลัมน์ผิด ให้ระบุเอง:

```bash
python prepare_data.py data/prices.csv --id-col "รหัสสินค้า" --date-col "เดือน" --price-col "ราคา"
```

ผลลัพธ์อยู่ที่ `out/data_report.md` ให้อ่านทีละหัวข้อ:

| หัวข้อในรายงาน | ถ้าเจอ ให้ทำอะไร |
|---|---|
| เลขแบบ `1.01E+14` | Excel ตัดหลักของรหัสทิ้งไปแล้ว ให้ดึงข้อมูลใหม่โดยตั้งคอลัมน์รหัสเป็น Text |
| ข้อมูลซ้ำที่ราคาไม่ตรงกัน | ดูว่ามาจากคนละไฟล์หรือคนละจังหวัดหรือไม่ ถ้าเป็นเพราะคนละจังหวัด ต้องเลือกว่าจะใช้ราคาไหน (script ใช้ค่าเฉลี่ย) |
| หน่วยไม่ตรงกับแคตตาล็อก | สำคัญมาก ถ้าไฟล์เป็นบาท/กก. แต่เว็บแสดงบาท/ตัน ตัวเลขจะผิด 1,000 เท่า |
| วัสดุบนเว็บที่ไม่มีราคาเลย | ไม่มีไฟล์ราคา หน้าเว็บจะใช้ราคาตัวอย่างพร้อมป้าย "ข้อมูลตัวอย่าง" แทน ให้หาข้อมูลเพิ่ม หรือเอาออกจาก `structural-materials.json` |
| น้อยกว่า 12–24 เดือน | ข้อมูลน้อยเกินกว่าจะพยากรณ์ได้ดี |
| ราคาเท่าเดิมทุกเดือน | มักเป็นราคาที่ไม่ได้อัปเดตจริง |
| ราคากระโดดเกิน 25% | ดูทีละจุดว่าพิมพ์ผิด เปลี่ยนหน่วย หรือราคาขึ้นจริง ถ้าผิดให้แก้ในไฟล์ต้นฉบับแล้วรันใหม่ |

script ทำ 2 อย่างให้อัตโนมัติด้วย:

- **เชื่อมรหัสที่ สนค. เปลี่ยน**: สินค้าสเปกเดียวกันที่รหัสเก่าหยุดและรหัสใหม่เริ่มต่อภายใน 3 เดือน ราคาห่างไม่เกิน 15% จะถูกนำประวัติมาต่อกัน รายการคู่อยู่ใน `out/series_links.csv` (ปิดได้ด้วย `--no-link`)
- **แยกวัสดุที่เลิกเก็บราคา**: ไม่มีราคาเกิน 3 เดือน (`--stale`) จะไม่ถูกพยากรณ์

## ราคาคาดการณ์และการวัดผล (`baseline.py`)

```bash
python baseline.py
```

ใช้เวลาประมาณ 1 นาที script เทียบ naive, drift, seasonal naive และ ETS ด้วยการย้อนไปยืนที่แต่ละเดือนในช่วง 12 เดือนล่าสุด ให้โมเดลทายโดยเห็นเฉพาะข้อมูลก่อนเดือนนั้น แล้วเทียบกับราคาจริง จากนั้นใช้ตัวที่ทายผิดน้อยที่สุด ซึ่งตอนนี้คือ naive

- `out/backtest_summary.md` ทายผิดเฉลี่ย (MAPE) ของแต่ละโมเดลที่ 1, 2 และ 3 เดือน
- `out/forecast.csv` ราคาคาดการณ์ 1–3 เดือน พร้อมช่วงต่ำ–สูงจาก `bands.py`

## สคริปต์ทดลองเทียบโมเดล

ไม่ต้องรันทุกเดือน ผลทั้งหมดอยู่ใน [`DATA_REVIEW.md`](DATA_REVIEW.md)

| สคริปต์ | ทำอะไร | เวลา (4 คอร์) |
|---|---|---|
| `global_model.py` | LightGBM ตัวเดียวทุกวัสดุ ทายว่าราคาจะเปลี่ยนกี่ % (มีฟังก์ชัน `md` ที่สคริปต์อื่นใช้ด้วย) | ไม่ได้จับเวลา |
| `train_best.py` | หาโมเดลที่แม่นที่สุดโดยไม่ใช้ข้อมูลอนาคต | ~5 นาที |
| `tune.py` | ค้นหาค่า hyperparameter ของ LightGBM | ~40 นาที |
| `two_stage_model.py` | ขยับจาก naive เฉพาะตอนที่มั่นใจว่าราคาจะเปลี่ยน | ไม่ได้จับเวลา |
| `compare_models.py` | เทียบ Naive, LightGBM, Random Forest, LSTM แบบ walk-forward (หยุดกลางทางแล้วรันต่อได้) | ~15 นาที |
| `final_experiments.py` | เพิ่ม Seasonal naive, Drift, ETS, Linear Regression, LightGBM ค่าเริ่มต้น และจูน Random Forest กับ LSTM บนจุดเริ่มชุดเดียวกัน | ~25 นาที |
| `classify_signal.py` | วัดป้าย "ราคามีโอกาสเปลี่ยน" ด้วย Precision, Recall, F1, Confusion Matrix เทียบ Logistic Regression | ~90 นาที |
| `residuals.py` | กราฟ residual ช่วง Test (ต้องรัน `compare_models.py` ก่อน) | ไม่ถึง 1 นาที |
| `bands.py` | เลือกวิธีตั้งช่วงราคาต่ำ–สูงด้วย Validation แล้ววัดบน Test (`baseline.py` ใช้ค่าที่เลือกใน `bands.CHOSEN`) | ไม่ถึง 1 นาที |

กราฟทั้งหมดอยู่ใน `report_figures/` notebook ที่อธิบายทุกการทดลองแบบอ่านง่ายอยู่ใน `colab/THAITAY_ML.ipynb` ถ้าจะรันซ้ำบน Colab ใช้ไฟล์ `thaitay_colab.zip` ใน Google Drive ของทีม หรือสร้างใหม่ด้วย `colab/make_bundle.sh` (ต้องรันสคริปต์ทดลองให้ได้ผลใน `out/` ก่อน)

อย่ารันสคริปต์ทดลอง 2 ตัวพร้อมกัน เพราะแย่ง CPU กันจนช้าลงหลายสิบเท่า

## ทางเลือก: backend `serve.py`

ใช้เมื่อวันหนึ่งต้องคำนวณราคาสดแทนไฟล์สำเร็จรูป ต้องลง `fastapi` และ `uvicorn` (อยู่ใน `requirements.txt`) ลองในเครื่องก่อน:

```bash
uvicorn serve:app --reload --port 8080
```

เปิด http://localhost:8080/prices/MAT-0101010107200000/forecast ควรเห็น JSON ตอบกลับ จากนั้นรันหน้าเว็บโดยชี้มาที่ backend นี้:

```bash
cd ../frontend && VITE_API_BASE=http://localhost:8080 npm run dev
```

ถ้าจะขึ้น Cloud Run (ต้องมีบัญชี Google Cloud ที่ผูกบัญชีจ่ายเงิน):

```bash
gcloud run deploy thaitay-api --source . --region asia-southeast1 --allow-unauthenticated
```

ได้ URL แบบ `https://thaitay-api-xxxx.a.run.app` แล้วทำต่อดังนี้:

1. Vercel → Project → Settings → Environment Variables → เพิ่ม `VITE_API_BASE` = URL ที่ได้
2. Redeploy เว็บ (ค่า `VITE_*` ถูกใส่ตอน build จึงต้อง build ใหม่)
3. ถ้าใช้โดเมนอื่นนอกจาก `thaitay.vercel.app` ให้ deploy ใหม่พร้อม `--set-env-vars ALLOW_ORIGINS=https://โดเมนของคุณ`

## แผนเดิมบน Google Cloud (ไม่ได้ใช้)

ช่วงแรกวางแผนให้ BigQuery ML และ Vertex AI ทายราคา ไฟล์ยังอยู่ใน `bigquery/`, `vertex/` และ `export_forecast.sh` แต่ไม่ได้ใช้บนเว็บ ขั้นตอนถ้าจะลองอยู่ใน [`bigquery/README.md`](bigquery/README.md)

## ข้อควรจำ

- อย่าแก้ไฟล์ใน `api_data/` และ `../frontend/public/data/prices/` ด้วยมือ สคริปต์เขียนทับทุกเดือน
- ไฟล์ใน `data/` และ `out/` ไม่ถูก commit ขึ้น git สคริปต์สร้างใหม่ทุกครั้ง clone ใหม่แล้วรันได้เลย
- หน้าเว็บไม่แสดงตัวเลขความแม่นยำของโมเดล (ตามหลักใน `frontend/PRODUCT.md`) ถ้าจะแสดง ให้ใช้ผลทดสอบจริงจาก `DATA_REVIEW.md` เท่านั้น
