#!/usr/bin/env bash
# อัปเดตราคาเดือนใหม่ครบทุกขั้น ตั้งแต่ดึงข้อมูลจนได้ไฟล์ที่เว็บใช้ รันได้จากเครื่องเปล่า (ไม่ต้องมี data/ มาก่อน)
#
#   ./monthly_update.sh
#
# ต้องเข้าเว็บได้: index.tpso.go.th, drive.usercontent.google.com, query1.finance.yahoo.com, orapiweb.pttor.com
# ต้องมี Python ที่ลง pandas numpy statsmodels lightgbm scikit-learn openpyxl (ตั้ง PYTHON=... ถ้าไม่ใช่ python)
#
# ผลลัพธ์: api_data/, ../frontend/public/data/prices/, ../frontend/src/data/structural-materials.json
#          out/live_check.md (สอบจริงเดือนก่อน), out/factors_update.md, out/backtest_summary.md
# exit 3 = สนค. ยังไม่ประกาศราคาเดือนใหม่ (ไม่ได้เปลี่ยนไฟล์ใด ๆ ใน api_data/)
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
if [ "$after" \< "$before" ] || [ "$after" = "$before" ]; then
  echo "NO_NEW_MONTH: สนค. ยังไม่ประกาศราคาเดือนใหม่"
  exit 3
fi
cp api_data/forecast.csv out/forecast_published_before.csv

echo "== 2/8 ไฟล์ดิบปัจจัยภายนอกของทีม (Google Drive) สำหรับประวัติย้อนหลัง"
while read -r name id; do
  curl -sSfL --retry 3 --max-time 120 -o "data/raw/$name" "https://drive.usercontent.google.com/download?id=$id&export=download&confirm=t"
done <<'EOF'
Brent_Crude_prices.csv 1I0-9IgrF3M7pvGlw-PyUntrMqqgn9hyR
Fuels_prices.csv 1qX3rLGiRtOmbItPQkMf2Ji_j_pbH-vSm
fx_cny_thb.csv 1Av4gFErdLvwUVimzjgayrzFhRuIjKkIx
fx_usd_thb.csv 15aJ6J640W15mLAYi0vzf4t1DvVvNmduS
Iron_Ore_prices.csv 1LIg_3bPhmQstNjYRAdtKCwIOM0lfEaBl
newcastle_coal_usd-prices_ton.csv 1xN2QqiwMlZTx5M_EohQI4amNSkpdzvh7
scrap_metal_prices.csv 1iNEfG5H54hKKWdJMZjfSPFsxajTfgwSr
Steel_Futures_prices.csv 1Df5_AsPNTyomz2ZKDrzTJxRJtnB_N3jB
EOF
"$PY" build_factors.py data/raw > out/build_factors.log

echo "== 3/8 ราคาคาดการณ์และช่วงราคา"
"$PY" baseline.py > out/baseline.log
cp data/prices_clean.csv api_data/prices.csv
cp out/forecast.csv api_data/forecast.csv

echo "== 4/8 วัสดุที่เลิกเก็บราคา"
"$PY" update_catalog_status.py

echo "== 5/8 ปัจจัยภายนอกถึงเดือนล่าสุด"
"$PY" fetch_factors.py > /dev/null
cat out/factors_update.md | grep "^- " || true

echo "== 6/8 ป้าย ราคามีโอกาสเปลี่ยน"
"$PY" change_signal.py > out/change_signal.log

echo "== 7/8 ไฟล์ราคาของเว็บ"
"$PY" export_static.py

echo "== 8/8 สอบจริงคำทายเดือนก่อน"
"$PY" live_check.py out/forecast_published_before.csv
echo "DONE: ราคาถึง $after"
