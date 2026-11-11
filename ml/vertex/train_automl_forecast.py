"""
ทางเลือกที่ใหญ่ที่สุด: Vertex AI AutoML Forecasting
ฝึกโมเดลเดียวที่เรียนจากทุกวัสดุพร้อมกัน (วัสดุในหมวดเดียวกันช่วยกันเรียนได้) แล้วทายราคา 1–3 เดือน
พร้อม quantile 10% / 50% / 90% ใช้เป็น low / price / high

ใช้หลังจากโหลดข้อมูลเข้า BigQuery แล้ว (ตาราง thaitay.prices ดู ml/README.md)
ค่าใช้จ่ายคิดตามชั่วโมงเครื่องที่ใช้ฝึก (budget_milli_node_hours) แพงกว่า BigQuery ML มาก
ตั้ง budget alert ในโปรเจกต์ก่อนรัน และดูราคาล่าสุดที่หน้า Vertex AI pricing

    pip install google-cloud-aiplatform
    gcloud auth application-default login
    python vertex/train_automl_forecast.py --project YOUR_PROJECT --region asia-southeast1

ขั้นตอนในไฟล์นี้
  1. สร้าง TimeSeriesDataset จากตาราง BigQuery
  2. ฝึก AutoMLForecastingTrainingJob (มี holdout ของมันเอง ผลความแม่นดูได้ในหน้า Vertex AI > Models > Evaluate)
  3. batch predict 3 เดือนข้างหน้า เขียนผลกลับเข้า BigQuery
"""
from __future__ import annotations

import argparse

from google.cloud import aiplatform, bigquery


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--region", default="asia-southeast1")
    ap.add_argument("--dataset", default="thaitay")
    ap.add_argument("--budget", type=int, default=1000, help="milli node hours (1000 = 1 ชั่วโมงเครื่อง)")
    ap.add_argument("--skip-train", metavar="MODEL_RESOURCE_NAME", help="ใช้โมเดลที่ฝึกไว้แล้ว ข้ามไปขั้น predict")
    args = ap.parse_args()

    aiplatform.init(project=args.project, location=args.region)
    bq = bigquery.Client(project=args.project)
    table = f"{args.project}.{args.dataset}.prices"

    if args.skip_train:
        model = aiplatform.Model(args.skip_train)
    else:
        ds = aiplatform.TimeSeriesDataset.create(display_name="thaitay-prices", bq_source=f"bq://{table}")
        job = aiplatform.AutoMLForecastingTrainingJob(
            display_name="thaitay-price-forecast",
            optimization_objective="minimize-quantile-loss",  # ต้องใช้ตัวนี้ถึงจะได้ quantile (ช่วงต่ำ–สูง)
        )
        model = job.run(
            dataset=ds,
            target_column="price",
            time_column="date",
            time_series_identifier_column="material_id",
            time_series_attribute_columns=["categoryCode", "familyCode"],  # ข้อมูลคงที่ของวัสดุ
            unavailable_at_forecast_columns=["price"],
            available_at_forecast_columns=["date"],
            forecast_horizon=3,
            data_granularity_unit="month",
            data_granularity_count=1,
            context_window=12,          # ดูย้อนหลัง 12 เดือนตอนทาย
            quantiles=[0.1, 0.5, 0.9],
            budget_milli_node_hours=args.budget,
            model_display_name="thaitay-price-forecast",
            sync=True,
        )
        print("model:", model.resource_name)

    # ตารางสำหรับ predict: ประวัติทั้งหมด + 3 เดือนข้างหน้าที่ price เป็น NULL
    bq.query(f"""
        CREATE OR REPLACE TABLE `{args.project}.{args.dataset}.predict_input` AS
        WITH last AS (SELECT material_id, ANY_VALUE(categoryCode) categoryCode, ANY_VALUE(familyCode) familyCode, MAX(date) d
                      FROM `{table}` GROUP BY material_id)
        SELECT material_id, date, price, categoryCode, familyCode FROM `{table}`
        UNION ALL
        SELECT material_id, DATE_ADD(d, INTERVAL m MONTH), NULL, categoryCode, familyCode
        FROM last, UNNEST([1, 2, 3]) m
    """).result()

    batch = model.batch_predict(
        job_display_name="thaitay-price-forecast-batch",
        bigquery_source=f"bq://{args.project}.{args.dataset}.predict_input",
        bigquery_destination_prefix=f"bq://{args.project}.{args.dataset}",
        instances_format="bigquery",
        predictions_format="bigquery",
        sync=True,
    )
    print("predictions table:", batch.output_info.bigquery_output_table)
    print("ขั้นต่อไป: เปิดตารางผลลัพธ์ใน BigQuery ดูชื่อคอลัมน์ predicted_price (ค่ากลางและ quantile)")
    print("แล้วแปลงเป็นคอลัมน์ material_id, month, date, price, low, high ตาม out/forecast.csv")


if __name__ == "__main__":
    main()
