#!/usr/bin/env bash
# อัปเดตราคาเดือนใหม่ครบทุกขั้น ตั้งแต่ดึงข้อมูลจนได้ไฟล์ที่เว็บใช้ รันได้จากเครื่องเปล่า (ไม่ต้องมี data/ มาก่อน)
#
#   ./monthly_update.sh
#
# ต้องเข้าเว็บได้: index.tpso.go.th, drive.usercontent.google.com, query1.finance.yahoo.com, orapiweb.pttor.com
# ต้องมี Python ที่ลง pandas numpy statsmodels lightgbm scikit-learn openpyxl (ตั้ง PYTHON=... ถ้าไม่ใช่ python)
#
# ผลลัพธ์: shadow/, api_data/, ../frontend/public/data/prices/, ../frontend/src/data/structural-materials.json
#          out/live_check.md (สอบจริงเดือนก่อน), out/factors_update.md, out/backtest_summary.md
# exit 3 = ไม่มีเดือนใหม่และไม่มีผลเปรียบเทียบใหม่
set -euo pipefail
cd "$(dirname "$0")"
PY=${PYTHON:-python}
mkdir -p data/raw out
latest() { "$PY" -c "import pandas as pd, sys; print(pd.read_csv(sys.argv[1])['date'].max())" "$1"; }

echo "== 1/8 ราคาจาก สนค."
"$PY" fetch_tpso.py
"$PY" prepare_data.py data/tpso_prices.csv > out/prepare_data.log
before=$(latest api_data/prices.csv)
after=$(latest data/prices_clean.csv)
echo "ราคาบนเว็บถึง $before · ราคาใหม่ถึง $after"
if [ "$after" \< "$before" ]; then
  echo "ข้อมูลที่ดึงได้เก่ากว่าราคาที่เผยแพร่แล้ว"
  exit 3
fi
if [ "$after" = "$before" ]; then
  echo "NO_NEW_MONTH: ตรวจคำทำนายคู่และราคาจริงที่อาจมาเพิ่ม"
  "$PY" shadow_forecasts.py --prices data/prices_clean.csv --forecast api_data/forecast.csv --signal-unchanged
  exit 0
fi

# ถ้ารอบก่อนหยุดหลังคัดลอก forecast ใหม่ ให้เก็บคำทำนายเดิมไว้สำหรับ live_check
forecast_origin() { "$PY" -c "import pandas as pd, sys; f=pd.read_csv(sys.argv[1]); print((pd.Timestamp(f.loc[f.month.eq(1), 'date'].max()) - pd.DateOffset(months=1)).date())" "$1"; }
previous=out/forecast_published_before.csv
if [ "$(forecast_origin api_data/forecast.csv)" = "$before" ]; then
  cp api_data/forecast.csv "$previous"
elif [ ! -s "$previous" ] || [ "$(forecast_origin "$previous")" != "$before" ]; then
  echo "ไม่พบคำทำนายเดิมของรอบ $before สำหรับตรวจเทียบ" >&2
  exit 1
fi

echo "== 2/8 วัสดุที่เลิกเก็บราคา"
"$PY" update_catalog_status.py

echo "== 3/8 LightGBM สำหรับเว็บ และ Naive สำหรับเปรียบเทียบ"
"$PY" baseline.py --select naive > out/baseline.log
"$PY" shadow_forecasts.py --prices data/prices_clean.csv --forecast out/forecast.csv
"$PY" direct_price_model.py --prices data/prices_clean.csv --output out/forecast_ml.csv

echo "== 4/8 ปัจจัยที่มีแหล่งอัปเดต 5 ไฟล์ (Google Drive) สำหรับประวัติย้อนหลัง"
while read -r name id; do
  curl -sSfL --retry 3 --max-time 120 -o "data/raw/$name" "https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t"
done <<'EOF'
Brent_Crude_prices.csv 1I0-9IgrF3M7pvGlw-PyUntrMqqgn9hyR
Fuels_prices.csv 1qX3rLGiRtOmbItPQkMf2Ji_j_pbH-vSm
fx_cny_thb.csv 1Av4gFErdLvwUVimzjgayrzFhRuIjKkIx
fx_usd_thb.csv 15aJ6J640W15mLAYi0vzf4t1DvVvNmduS
Iron_Ore_prices.csv 1LIg_3bPhmQstNjYRAdtKCwIOM0lfEaBl
EOF
"$PY" build_factors.py data/raw > out/build_factors.log

echo "== 5/8 ปัจจัยภายนอกถึงเดือนล่าสุด"
"$PY" fetch_factors.py > /dev/null
cat out/factors_update.md | grep "^- " || true

echo "== 6/8 ป้าย ราคามีโอกาสเปลี่ยน"
cp out/forecast_ml.csv api_data/forecast.csv
"$PY" change_signal.py --apply > out/change_signal.log

echo "== 7/8 ไฟล์ราคาของเว็บ"
"$PY" export_static.py --prices data/prices_clean.csv

echo "== 8/8 สอบจริงคำทายเดือนก่อน"
"$PY" live_check.py "$previous"
# เลื่อนเดือนเผยแพร่เมื่อทุกขั้นสำเร็จ เพื่อให้รันซ้ำรอบที่หยุดกลางทางได้
cp data/prices_clean.csv api_data/prices.csv.tmp
mv -f api_data/prices.csv.tmp api_data/prices.csv
echo "DONE: ราคาถึง $after"
