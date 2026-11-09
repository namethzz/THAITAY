#!/usr/bin/env bash
# สร้าง colab/thaitay_colab.zip ไฟล์ข้อมูลและโค้ดที่ notebook ขอตอนรันบน Colab
# ต้องมีผลใน out/ ก่อน (compare_models.py, classify_signal.py, tune.py) และฟอนต์ Loma (แพ็กเกจ fonts-tlwg-loma-otf)
# zip นี้มีข้อมูลจาก data/ จึงไม่ commit ขึ้น git
set -euo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
B=$TMP/thaitay_colab
mkdir -p "$B/ml/data" "$B/ml/out" "$B/frontend/src/data" "$B/fonts"
cp baseline.py global_model.py train_best.py tune.py compare_models.py classify_signal.py residuals.py "$B/ml/"
cp data/prices_clean.csv data/factors_monthly.csv "$B/ml/data/"
cp out/compare_preds_cv.csv out/compare_preds_test.csv out/classify_preds.csv \
   out/tune_results.csv out/tune_screen.csv out/series_links.csv "$B/ml/out/"
cp ../frontend/src/data/structural-materials.json "$B/frontend/src/data/"
cp /usr/share/fonts/opentype/tlwg/Loma.otf /usr/share/fonts/opentype/tlwg/Loma-Bold.otf "$B/fonts/"
cat > "$B/README.txt" <<'TXT'
ไฟล์ประกอบ notebook THAITAY_ML.ipynb
ml/        โค้ดจาก repo THAITAY (โฟลเดอร์ ml) ข้อมูลราคา สนค. ปัจจัยภายนอก และผลการทดลองที่บันทึกไว้
frontend/  รายชื่อวัสดุบนเว็บ (ใช้ดูว่ารหัสไหนถูกแทนด้วยรหัสใหม่)
fonts/     ฟอนต์ Loma จาก Thai Linux Working Group (TLWG) สัญญาอนุญาต GPL พร้อมข้อยกเว้นสำหรับฟอนต์ ใช้แสดงภาษาไทยในกราฟ
TXT
rm -f colab/thaitay_colab.zip
(cd "$TMP" && zip -qr - thaitay_colab) > colab/thaitay_colab.zip
rm -rf "$TMP"
echo "สร้าง colab/thaitay_colab.zip แล้ว"
