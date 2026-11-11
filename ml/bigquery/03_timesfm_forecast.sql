-- ทางเลือก: TimesFM (โมเดลพยากรณ์สำเร็จรูปของ Google) ผ่าน AI.FORECAST
-- ไม่ต้องฝึกโมเดล ใช้ได้ทันที เหมาะลองเทียบกับ ARIMA_PLUS
-- ชื่อพารามิเตอร์และคอลัมน์ผลลัพธ์อาจเปลี่ยนตามเวอร์ชัน ตรวจที่เอกสาร "AI.FORECAST" ของ BigQuery ก่อนรัน
-- รัน:  bq query --use_legacy_sql=false < bigquery/03_timesfm_forecast.sql

-- (ก) วัดความแม่น: ทาย 3 เดือนสุดท้ายจากข้อมูลก่อนหน้า
DECLARE cutoff DATE DEFAULT (SELECT DATE_SUB(MAX(date), INTERVAL 3 MONTH) FROM thaitay.prices);

CREATE TEMP TABLE fc AS
SELECT *
FROM AI.FORECAST(
  (SELECT material_id, TIMESTAMP(date) AS ts, price FROM thaitay.prices WHERE date <= cutoff),
  data_col => 'price',
  timestamp_col => 'ts',
  id_cols => ['material_id'],
  horizon => 3,
  confidence_level => 0.8
);

SELECT
  ROUND(AVG(ABS(f.forecast_value - p.price) / p.price) * 100, 2) AS mape,
  COUNT(DISTINCT p.material_id) AS materials
FROM fc f
JOIN thaitay.prices p
  ON p.material_id = f.material_id AND p.date = DATE(f.forecast_timestamp);

-- (ข) พยากรณ์จริงจากข้อมูลทั้งหมด
CREATE OR REPLACE TABLE thaitay.forecast_timesfm AS
SELECT
  material_id,
  ROW_NUMBER() OVER (PARTITION BY material_id ORDER BY forecast_timestamp) AS month,
  DATE(forecast_timestamp) AS date,
  ROUND(forecast_value, 2) AS price,
  ROUND(prediction_interval_lower_bound, 2) AS low,
  ROUND(prediction_interval_upper_bound, 2) AS high,
  'timesfm' AS model
FROM AI.FORECAST(
  (SELECT material_id, TIMESTAMP(date) AS ts, price FROM thaitay.prices),
  data_col => 'price',
  timestamp_col => 'ts',
  id_cols => ['material_id'],
  horizon => 3,
  confidence_level => 0.8
);
