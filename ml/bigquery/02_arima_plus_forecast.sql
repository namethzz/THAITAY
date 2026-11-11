-- ขั้นที่ 2: ฝึกด้วยข้อมูลทั้งหมด แล้วพยากรณ์ 1–3 เดือนข้างหน้า พร้อมช่วงต่ำ–สูง 80%
-- ผลอยู่ในตาราง thaitay.forecast คอลัมน์ตรงกับ out/forecast.csv ที่ serve.py อ่าน
-- รัน:  bq query --use_legacy_sql=false < bigquery/02_arima_plus_forecast.sql

CREATE OR REPLACE MODEL thaitay.price_arima
OPTIONS (
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'date',
  time_series_data_col = 'price',
  time_series_id_col = 'material_id',
  data_frequency = 'MONTHLY',
  horizon = 3,
  auto_arima = TRUE,
  clean_spikes_and_dips = TRUE,
  adjust_step_changes = TRUE
) AS
SELECT material_id, date, price FROM thaitay.prices;

CREATE OR REPLACE TABLE thaitay.forecast AS
SELECT
  material_id,
  ROW_NUMBER() OVER (PARTITION BY material_id ORDER BY forecast_timestamp) AS month,
  DATE(forecast_timestamp) AS date,
  ROUND(forecast_value, 2) AS price,
  ROUND(prediction_interval_lower_bound, 2) AS low,
  ROUND(prediction_interval_upper_bound, 2) AS high,
  'arima_plus' AS model
FROM ML.FORECAST(MODEL thaitay.price_arima, STRUCT(3 AS horizon, 0.8 AS confidence_level));

SELECT * FROM thaitay.forecast ORDER BY material_id, month LIMIT 12;
