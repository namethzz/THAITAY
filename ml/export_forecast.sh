#!/usr/bin/env bash
# ดึงผลพยากรณ์จาก BigQuery มาเป็น out/forecast.csv ให้ serve.py ใช้
#   ./export_forecast.sh                  # ตาราง thaitay.forecast (ARIMA_PLUS)
#   ./export_forecast.sh forecast_timesfm # ตาราง TimesFM
set -euo pipefail
cd "$(dirname "$0")"
TABLE="thaitay.${1:-forecast}"
mkdir -p out
bq query --use_legacy_sql=false --format=csv --max_rows=100000 \
  "SELECT material_id, month, date, price, GREATEST(low, 0) AS low, high, model FROM ${TABLE} ORDER BY material_id, month" > out/forecast.csv
echo "เขียน out/forecast.csv แล้ว $(($(wc -l < out/forecast.csv) - 1)) แถว"
