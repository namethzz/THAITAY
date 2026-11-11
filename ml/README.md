# โมเดลพยากรณ์ราคา (ml/)

ไฟล์ในโฟลเดอร์นี้พาข้อมูลราคาจาก สนค. ไปจนเป็นตัวเลขบนเว็บ ทำตามนี้ทีละขั้น:

```text
ไฟล์ราคา (.xlsx/.csv)
  → prepare_data.py   ตรวจและทำความสะอาดข้อมูล ได้รายงานว่าข้อมูลถูกต้องแค่ไหน
  → baseline.py       โมเดลพื้นฐานในเครื่อง ได้ "เกณฑ์ขั้นต่ำ" ที่โมเดลบน cloud ต้องชนะ
  → BigQuery ML / Vertex AI   โมเดลจริงบน Google Cloud
  → export_static.py  แปลงราคาเป็นไฟล์ JSON ใส่ในหน้าเว็บ push ขึ้น GitHub แล้ว Vercel deploy เอง
  (serve.py เป็น backend ทางเลือก ถ้าวันหนึ่งต้องคำนวณราคาสด)
```

## ควรใช้ตัวไหน

ข้อมูลของ THAI TAY เป็นราคารายเดือนของวัสดุราว 287 รายการ ถ้ามีย้อนหลัง 5 ปี จะได้ประมาณ 17,000 แถว ซึ่งถือว่าเล็ก ไม่ต้องใช้ของใหญ่ตั้งแต่แรก

| ลำดับ | ตัวเลือก | อยู่ที่ไหน | เหมาะกับ | ค่าใช้จ่าย |
|---|---|---|---|---|
| 1 | **โมเดลพื้นฐาน** (`baseline.py`) | ในเครื่อง | ตรวจข้อมูล และหาเกณฑ์ขั้นต่ำ | ฟรี |
| 2 | **BigQuery ML `ARIMA_PLUS`** ⭐ แนะนำ | Google Cloud | เขียน SQL 1 คำสั่ง ได้โมเดลแยกรายวัสดุพร้อมช่วงต่ำ–สูง | ต่ำมากสำหรับข้อมูลขนาดนี้ |
| 3 | **BigQuery `AI.FORECAST` (TimesFM)** | Google Cloud | โมเดลสำเร็จรูปของ Google ไม่ต้องฝึก เอาไว้เทียบกับ ARIMA_PLUS | ต่ำ |
| 4 | **Vertex AI AutoML Forecasting** | Google Cloud | ลองเมื่อข้อ 2–3 ยังแม่นไม่พอ เรียนจากทุกวัสดุพร้อมกัน ใส่ตัวแปรอื่นเพิ่มได้ | สูงสุด คิดตามชั่วโมงเครื่องที่ใช้ฝึก |

ทั้ง BigQuery ML และ Vertex AI อยู่ใน Google Cloud และใช้บัญชีเดียวกัน คำแนะนำคือเริ่มจากข้อ 2 ก่อน เพราะเรียนรู้ง่ายและถูกที่สุด แล้วค่อยขยับไป Vertex AI เมื่อมีตัวเลขยืนยันว่าคุ้ม

> ราคาวัสดุก่อสร้างรายเดือนมักเปลี่ยนช้า โมเดล "ใช้ราคาเดือนล่าสุด" (naive) จึงมักแม่นพอสมควรแล้ว โมเดลไหนแม่นไม่เกิน naive ก็ไม่ควรเอาขึ้นเว็บ

---

## ขั้นที่ 0: ติดตั้ง

ต้องมี Python 3.10 ขึ้นไป

```bash
cd ml
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## ขั้นที่ 1: ตรวจข้อมูล (ข้อมูลของผมถูกต้องไหม)

1. เอาไฟล์ราคามาไว้ใน `ml/data/` ซึ่งไม่ถูก commit ขึ้น git ทำได้ 2 ทาง
   - ดึงจากเว็บ สนค. โดยตรง (ได้ถึงเดือนล่าสุดที่ สนค. เผยแพร่):

     ```bash
     python fetch_tpso.py
     ```
   - หรือคัดลอกไฟล์ที่เตรียมไว้ใน Google Drive มาใส่
2. รันคำสั่งนี้ ใส่หลายไฟล์พร้อมกันได้ และอ่านทุกชีตใน Excel

```bash
python prepare_data.py data/ไฟล์ราคา.xlsx
```

script เดารูปแบบไฟล์ให้เอง ใช้ได้ทั้งแบบ 1 แถวต่อ 1 เดือน (`รหัสสินค้า | เดือน | ราคา`) และแบบมีเดือนเป็นคอลัมน์ (`รหัสสินค้า | ม.ค. 67 | ก.พ. 67 | ...`) อ่านเดือนได้ทั้ง พ.ศ. และ ค.ศ. ถ้าเดาชื่อคอลัมน์ผิด ให้ระบุเอง:

```bash
python prepare_data.py data/prices.csv --id-col "รหัสสินค้า" --date-col "เดือน" --price-col "ราคา"
```

ผลลัพธ์อยู่ที่ `out/data_report.md` ให้อ่านทีละหัวข้อ:

| หัวข้อในรายงาน | ถ้าเจอ ให้ทำอะไร |
|---|---|
| เลขแบบ `1.01E+14` | Excel ตัดหลักของรหัสทิ้งไปแล้ว ให้ดึงข้อมูลใหม่โดยตั้งคอลัมน์รหัสเป็น Text |
| ข้อมูลซ้ำที่ราคาไม่ตรงกัน | ดูว่ามาจากคนละไฟล์หรือคนละจังหวัดหรือไม่ ถ้าเป็นเพราะคนละจังหวัด ต้องเลือกว่าจะใช้ราคาไหน (script ใช้ค่าเฉลี่ย) |
| หน่วยไม่ตรงกับแคตตาล็อก | สำคัญมาก ถ้าไฟล์เป็นบาท/กก. แต่เว็บแสดงบาท/ตัน ตัวเลขจะผิด 1,000 เท่า |
| วัสดุบนเว็บที่ไม่มีราคาเลย | วัสดุเหล่านี้จะขึ้นข้อความ error บนเว็บ ให้หาข้อมูลเพิ่ม หรือเอาออกจาก `structural-materials.json` |
| น้อยกว่า 12–24 เดือน | ข้อมูลน้อยเกินกว่าจะพยากรณ์ได้ดี |
| ราคาเท่าเดิมทุกเดือน | มักเป็นราคาที่ไม่ได้อัปเดตจริง |
| ราคากระโดดเกิน 25% | ดูทีละจุดว่าพิมพ์ผิด เปลี่ยนหน่วย หรือราคาขึ้นจริง ถ้าผิดให้แก้ในไฟล์ต้นฉบับแล้วรันใหม่ |

script ทำ 2 อย่างให้อัตโนมัติด้วย:

- **เชื่อมรหัสที่ สนค. เปลี่ยน**: สินค้าสเปกเดียวกันที่รหัสเก่าหยุดและรหัสใหม่เริ่มต่อภายใน 3 เดือน ราคาห่างไม่เกิน 15% จะถูกนำประวัติมาต่อกัน รายการคู่อยู่ใน `out/series_links.csv` (ปิดได้ด้วย `--no-link`)
- **แยกวัสดุที่เลิกเก็บราคา**: ไม่มีราคาเกิน 3 เดือน (`--stale`) จะไม่ถูกพยากรณ์

ผลตรวจข้อมูลจริงรอบล่าสุดอยู่ใน [`DATA_REVIEW.md`](DATA_REVIEW.md)

แก้ไฟล์ต้นฉบับแล้วรันซ้ำจนรายงานไม่มีอะไรน่าสงสัย จะได้ `data/prices_clean.csv` ที่ใช้ในขั้นต่อไปทั้งหมด

## ขั้นที่ 2: โมเดลพื้นฐานในเครื่อง

```bash
python baseline.py
```

ใช้เวลาประมาณ 1 นาที ผลที่ได้มีดังนี้:

- `out/backtest_summary.md` บอกว่าแต่ละโมเดลทายผิดเฉลี่ยกี่ % (MAPE) ที่ 1, 2 และ 3 เดือน ให้จดตาราง **holdout** ไว้เทียบกับ cloud
- `out/forecast.csv` ราคาคาดการณ์ 1–3 เดือนพร้อม low/high ใช้ขึ้นเว็บได้ทันทีถ้ายังไม่พร้อมใช้ cloud

วิธีวัด: script ย้อนกลับไปยืนที่แต่ละเดือนในช่วง 12 เดือนล่าสุด ให้โมเดลทายโดยเห็นเฉพาะข้อมูลก่อนเดือนนั้น แล้วเทียบกับราคาจริงที่เกิดขึ้น

## ขั้นที่ 3: เตรียม Google Cloud (ทำครั้งเดียว)

1. สร้างโปรเจกต์ที่ https://console.cloud.google.com แล้วผูกบัญชีเรียกเก็บเงิน (Billing)
2. **ตั้ง Budget alert ก่อนเลย** ที่ Billing → Budgets & alerts เช่นแจ้งเตือนที่ 300 บาท/เดือน
3. ติดตั้ง [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) แล้วรัน:

```bash
gcloud auth login
```

```bash
gcloud auth application-default login
```

```bash
gcloud config set project YOUR_PROJECT_ID
```

```bash
gcloud services enable bigquery.googleapis.com aiplatform.googleapis.com run.googleapis.com
```

4. สร้าง dataset ไว้ที่สิงคโปร์ (ใกล้ไทยที่สุด) แล้วโหลดข้อมูลเข้าไป:

```bash
bq mk --location=asia-southeast1 --dataset thaitay
```

```bash
bq load --replace --source_format=CSV --skip_leading_rows=1 thaitay.prices data/prices_clean.csv material_id:STRING,date:DATE,price:FLOAT64,unit:STRING,categoryCode:STRING,familyCode:STRING
```

## ขั้นที่ 4ก: BigQuery ML ARIMA_PLUS (แนะนำ)

ARIMA_PLUS สร้างโมเดลแยกให้วัสดุแต่ละรายการโดยอัตโนมัติ และจัดการแนวโน้ม ฤดูกาล และราคาที่กระโดดผิดปกติให้เอง

```bash
bq query --use_legacy_sql=false < bigquery/01_arima_plus_evaluate.sql
```

ได้ `mape_avg` ของการทาย 3 เดือนสุดท้าย ให้เอาไปเทียบกับตาราง holdout ใน `out/backtest_summary.md` ถ้าแม่นกว่า naive ให้รันต่อ:

```bash
bq query --use_legacy_sql=false < bigquery/02_arima_plus_forecast.sql
```

```bash
./export_forecast.sh
```

`out/forecast.csv` จะเปลี่ยนเป็นผลจาก ARIMA_PLUS (ช่วง low/high คือช่วงความเชื่อมั่น 80%)

## ขั้นที่ 4ข: TimesFM ผ่าน AI.FORECAST (ทางเลือก)

```bash
bq query --use_legacy_sql=false < bigquery/03_timesfm_forecast.sql
```

```bash
./export_forecast.sh forecast_timesfm
```

## ขั้นที่ 4ค: Vertex AI AutoML Forecasting (เมื่อต้องการมากกว่านี้)

ข้อดีคือโมเดลเดียวเรียนจากทุกวัสดุพร้อมกัน และเพิ่มตัวแปรภายนอกได้ภายหลัง เช่น ราคาเหล็กโลก ราคาน้ำมัน หรือดัชนี CMI ข้อเสียคือแพงกว่าและใช้เวลาฝึกนานหลายชั่วโมง

```bash
python vertex/train_automl_forecast.py --project YOUR_PROJECT_ID --region asia-southeast1 --budget 1000
```

- ดูความแม่นได้ที่ Vertex AI → Model Registry → `thaitay-price-forecast` → Evaluate (ดูค่า MAPE)
- ผลพยากรณ์ถูกเขียนลงตารางใน dataset `thaitay` ให้เปิดดูชื่อคอลัมน์ แล้วแปลงเป็น `material_id, month, date, price, low, high, model` ก่อน export

ถ้าจะทำผ่านหน้าเว็บแทนโค้ด ก็ทำได้: Vertex AI → Datasets → Create → Tabular → Forecasting → เลือกตาราง `thaitay.prices` → ตั้ง Series identifier = `material_id`, Timestamp = `date`, Target = `price`, Granularity = Monthly, Horizon = 3

## เลือกโมเดลที่จะขึ้นเว็บ

จดผลไว้ในตารางเดียวกัน ทุกตัวต้องวัดที่ 3 เดือนสุดท้ายเหมือนกัน (holdout):

| โมเดล | MAPE 1 เดือน | MAPE 3 เดือน | หมายเหตุ |
|---|---|---|---|
| naive (baseline.py) | | | เกณฑ์ขั้นต่ำ |
| ets (baseline.py) | | | |
| ARIMA_PLUS | | | |
| TimesFM | | | |
| Vertex AI AutoML | | | |

เลือกตัวที่ MAPE ต่ำกว่า naive อย่างชัดเจน ถ้าทุกตัวสูสีกัน ให้เลือกตัวที่ถูกและดูแลง่ายที่สุด

## ขั้นที่ 5: เอาราคาขึ้นเว็บ

ราคาบนเว็บมาจากไฟล์ใน `api_data/` ซึ่ง commit ไว้แล้ว (ราคาถึง ก.ย. 2569 และผลพยากรณ์จาก `baseline.py`) เมื่อรันโมเดลใหม่ ให้คัดลอกผลมาทับ:

```bash
cp data/prices_clean.csv api_data/prices.csv
```

```bash
cp out/forecast.csv api_data/forecast.csv
```

แล้วรัน `python update_catalog_status.py` เพื่อให้หน้าเว็บรู้ว่าวัสดุไหนเลิกเก็บราคา (ซ่อนจากการค้นหา) และรหัสเก่าไหนมีรหัสใหม่แทน

แปลงราคาเป็นไฟล์ที่หน้าเว็บอ่านเอง (`frontend/public/data/prices/{materialId}.json` วัสดุละไฟล์ ข้อมูลเหมือนที่ `serve.py` ตอบ):

```bash
python export_static.py
```

ลองดูในเครื่องด้วย `cd ../frontend && npm run dev` แล้ว commit ไฟล์ใน `frontend/public/data/prices/` push ขึ้น GitHub Vercel จะ build และ deploy เอง ไม่ต้องมี backend

### ทางเลือก: backend `serve.py` บน Cloud Run

ใช้เมื่อต้องคำนวณราคาสดแทนไฟล์สำเร็จรูป ลองในเครื่องก่อน:

```bash
uvicorn serve:app --reload --port 8080
```

เปิด http://localhost:8080/prices/MAT-0101010107200000/forecast ควรเห็น JSON ตอบกลับ จากนั้นรันหน้าเว็บโดยชี้มาที่ backend นี้:

```bash
cd ../frontend && VITE_API_BASE=http://localhost:8080 npm run dev
```

ถ้าทุกอย่างถูกต้อง ให้ deploy backend ขึ้น Cloud Run:

```bash
gcloud run deploy thaitay-api --source . --region asia-southeast1 --allow-unauthenticated
```

ได้ URL แบบ `https://thaitay-api-xxxx.a.run.app` แล้วทำต่อดังนี้:

1. Vercel → Project → Settings → Environment Variables → เพิ่ม `VITE_API_BASE` = URL ที่ได้
2. Redeploy เว็บ (ค่า `VITE_*` ถูกใส่ตอน build จึงต้อง build ใหม่)
3. ถ้าใช้โดเมนอื่นนอกจาก `thaitay.vercel.app` ให้ deploy ใหม่พร้อม `--set-env-vars ALLOW_ORIGINS=https://โดเมนของคุณ`

## อัปเดตทุกเดือน

เมื่อ สนค. ออกราคาเดือนใหม่:

1. `python fetch_tpso.py`
2. `python prepare_data.py data/tpso_prices.csv`
3. `python baseline.py` (หรือ BigQuery: `bq load` → `02_arima_plus_forecast.sql` → `./export_forecast.sh`)
4. คัดลอก `data/prices_clean.csv` และ `out/forecast.csv` เข้า `api_data/` แล้ว `python update_catalog_status.py`
5. `python build_factors.py data/raw` (ไฟล์ดิบเดือนใหม่จาก Drive "New Data") แล้ว `python change_signal.py` เพื่อเติมโอกาสที่ราคาจะเปลี่ยนลง `api_data/forecast.csv`
6. `python bands.py` ถ้าต้องการตรวจช่วงราคาใหม่ (`baseline.py` ใช้วิธีเดียวกันอยู่แล้ว)
7. `python export_static.py` แล้ว commit ไฟล์ที่เปลี่ยนทั้งหมด (`api_data/`, `frontend/public/data/prices/`, `frontend/src/data/structural-materials.json`) push ขึ้น GitHub Vercel deploy เอง

## สคริปต์ทดลองเทียบโมเดล (ผลอยู่ใน `DATA_REVIEW.md`)

| สคริปต์ | ทำอะไร | เวลา (4 คอร์) |
|---|---|---|
| `tune.py` | ค้นหาค่า hyperparameter ของ LightGBM | ~40 นาที |
| `compare_models.py` | เทียบ Naive, LightGBM, Random Forest, LSTM แบบ walk-forward (หยุดกลางทางแล้วรันต่อได้) | ~15 นาที |
| `final_experiments.py` | เพิ่ม Seasonal naive, Drift, ETS, Linear Regression, LightGBM ค่าเริ่มต้นทุกแบบ และจูน Random Forest กับ LSTM บนจุดเริ่มชุดเดียวกัน | ~25 นาที |
| `classify_signal.py` | วัดป้าย "ราคามีโอกาสเปลี่ยน" ด้วย Precision, Recall, F1, Confusion Matrix เทียบ Logistic Regression | ~90 นาที |
| `residuals.py` | กราฟ residual ช่วง Test (ต้องรัน `compare_models.py` ก่อน) | ไม่ถึง 1 นาที |
| `bands.py` | ค้นหาวิธีตั้งช่วงราคาต่ำ–สูงด้วย Validation วัดบน Test แล้วเขียนช่วงลง `api_data/forecast.csv` (`baseline.py` ใช้ค่าที่เลือกใน `bands.CHOSEN` อยู่แล้ว) | ไม่ถึง 1 นาที |

กราฟทั้งหมดอยู่ใน `report_figures/` บทสรุปทุกการทดลองแบบอ่านง่ายอยู่ใน `colab/THAITAY_ML.ipynb` (สร้างไฟล์ข้อมูลประกอบด้วย `colab/make_bundle.sh`) อย่ารัน 2 สคริปต์พร้อมกัน เพราะแย่ง CPU กันจนช้าลงหลายสิบเท่า

## ข้อควรจำ

- หน้าเว็บยังไม่แสดงตัวเลขความแม่นยำ (ตามหลักใน `frontend/PRODUCT.md`) ให้ใส่ได้เมื่อมีผล backtest จากข้อมูลจริงแล้วเท่านั้น
- ไฟล์ใน `data/` และ `out/` ไม่ถูก commit ขึ้น git ถ้า repo เป็น public ข้อมูลจะไม่หลุดออกไป
