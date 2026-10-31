# backend สำหรับ Cloud Run: gcloud run deploy thaitay-api --source . --region asia-southeast1 --allow-unauthenticated
FROM python:3.12-slim
WORKDIR /app
RUN pip install --no-cache-dir pandas fastapi uvicorn
COPY serve.py .
COPY data/prices_clean.csv data/
COPY out/forecast.csv out/
CMD exec uvicorn serve:app --host 0.0.0.0 --port ${PORT:-8080}
