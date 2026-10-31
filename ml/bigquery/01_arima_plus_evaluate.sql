-- ขั้นที่ 1: วัดความแม่นก่อนใช้จริง
-- ฝึกด้วยข้อมูลถึง 3 เดือนก่อนเดือนล่าสุด แล้วให้ทาย 3 เดือนสุดท้ายที่รู้คำตอบอยู่แล้ว
-- เทียบตัวเลข mean_absolute_percentage_error กับตาราง "holdout" ใน out/backtest_summary.md
-- รัน:  bq query --use_legacy_sql=false < bigquery/01_arima_plus_evaluate.sql

DECLARE cutoff DATE DEFAULT (SELECT DATE_SUB(MAX(date), INTERVAL 3 MONTH) FROM thaitay.prices);

CREATE OR REPLACE MODEL thaitay.price_arima_eval
OPTIONS (
  model_type = 'ARIMA_PLUS',
  time_series_timestamp_col = 'date',
  time_series_data_col = 'price',
  time_series_id_col = 'material_id',   -- 1 โมเดลย่อยต่อวัสดุ 1 รายการ
  data_frequency = 'MONTHLY',
  horizon = 3,
  auto_arima = TRUE,
  clean_spikes_and_dips = TRUE,          -- ลดผลของราคาที่กระโดดผิดปกติ
  adjust_step_changes = TRUE
) AS
SELECT material_id, date, price
FROM thaitay.prices
WHERE date <= cutoff;

-- ผลรวมทุกวัสดุ
SELECT
  AVG(mean_absolute_percentage_error) AS mape_avg,
  APPROX_QUANTILES(mean_absolute_percentage_error, 2)[OFFSET(1)] AS mape_median,
  COUNT(*) AS materials
FROM ML.EVALUATE(
  MODEL thaitay.price_arima_eval,
  (SELECT material_id, date, price FROM thaitay.prices WHERE date > cutoff),
  STRUCT(TRUE AS perform_aggregation, 3 AS horizon)
);
