# แผนเดิมบน Google Cloud (ไม่ได้ใช้บนเว็บ)

ช่วงแรกของโปรเจกต์วางแผนให้ BigQuery ML และ Vertex AI ทายราคา แต่ไม่ได้ใช้จริง เพราะต้องผูกบัญชีจ่ายเงินกับ Google Cloud และการทดลองในเครื่องพบว่ายังไม่มีโมเดลไหนแม่นกว่า Naive (ดู `../DATA_REVIEW.md`) ไฟล์ในโฟลเดอร์นี้ `../vertex/` และ `../export_forecast.sh` เก็บไว้เผื่อมีคนอยากลอง

ถ้าจะลอง ต้องวัดด้วย walk-forward แบบเดียวกับ `../compare_models.py` และชนะ Naive ทั้งช่วง Validation และ Test ก่อนเอาขึ้นเว็บ ทุกคำสั่งด้านล่างรันจากโฟลเดอร์ `ml/`

## เตรียม Google Cloud (ทำครั้งเดียว)

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
gcloud services enable bigquery.googleapis.com aiplatform.googleapis.com
```

4. สร้าง dataset ไว้ที่สิงคโปร์ (ใกล้ไทยที่สุด) แล้วโหลดข้อมูลเข้าไป:

```bash
bq mk --location=asia-southeast1 --dataset thaitay
```

```bash
bq load --replace --source_format=CSV --skip_leading_rows=1 thaitay.prices data/prices_clean.csv material_id:STRING,date:DATE,price:FLOAT64,unit:STRING,categoryCode:STRING,familyCode:STRING
```

## BigQuery ML ARIMA_PLUS

สร้างโมเดลแยกให้วัสดุแต่ละรายการ จัดการแนวโน้ม ฤดูกาล และราคาที่กระโดดผิดปกติให้เอง

```bash
bq query --use_legacy_sql=false < bigquery/01_arima_plus_evaluate.sql
```

ได้ `mape_avg` ของการทาย 3 เดือนสุดท้าย ถ้าแม่นกว่า naive ให้รันต่อ:

```bash
bq query --use_legacy_sql=false < bigquery/02_arima_plus_forecast.sql
```

```bash
./export_forecast.sh
```

`out/forecast.csv` จะเปลี่ยนเป็นผลจาก ARIMA_PLUS (ช่วง low/high คือช่วงความเชื่อมั่น 80%)

## TimesFM ผ่าน AI.FORECAST

```bash
bq query --use_legacy_sql=false < bigquery/03_timesfm_forecast.sql
```

```bash
./export_forecast.sh forecast_timesfm
```

## Vertex AI AutoML Forecasting

โมเดลเดียวเรียนจากทุกวัสดุพร้อมกัน แต่แพงกว่าและใช้เวลาฝึกหลายชั่วโมง

```bash
python vertex/train_automl_forecast.py --project YOUR_PROJECT_ID --region asia-southeast1 --budget 1000
```

- ดูความแม่นได้ที่ Vertex AI → Model Registry → `thaitay-price-forecast` → Evaluate (ดูค่า MAPE)
- ผลพยากรณ์ถูกเขียนลงตารางใน dataset `thaitay` ให้แปลงเป็นคอลัมน์ `material_id, month, date, price, low, high, model` ก่อน export
