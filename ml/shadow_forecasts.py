"""Issue paired TPSO price forecasts and score previously issued pairs as actuals arrive."""
from __future__ import annotations

import argparse
from contextlib import closing
import csv
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import sqlite3
import tempfile

import lightgbm
import pandas as pd

from global_model import CATALOG
from shadow_model import shadow_predictions
from shadow_scores import SCORE_COLUMNS, score_issued, summary_text

HERE = Path(__file__).resolve().parent
BANGKOK = timezone(timedelta(hours=7))
MODEL = "tpso_price_only_lightgbm_t70_half_v1"


def write_changed(path, content):
    data = content.encode("utf-8")
    if path.exists() and path.read_bytes() == data:
        return False
    with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".pending-", delete=False) as f:
        temp = Path(f.name)
        try:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        except BaseException:
            f.close()
            temp.unlink(missing_ok=True)
            raise
    try:
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)
    return True


def issue_snapshot(prices, price_bytes, forecast_path, catalog_path, origin):
    forecast_bytes = forecast_path.read_bytes()
    catalog_bytes = catalog_path.read_bytes()
    forecast = pd.read_csv(io.BytesIO(forecast_bytes))
    catalog = pd.DataFrame(json.loads(catalog_bytes)["materials"]).set_index("id")
    predictions = shadow_predictions(prices, catalog, forecast)
    issued = datetime.now(timezone.utc)
    return {
        "origin_month": origin.date().isoformat(),
        "issued_at_utc": issued.isoformat(timespec="microseconds"),
        "model": MODEL,
        "lightgbm_version": lightgbm.__version__,
        "prices_sha256": hashlib.sha256(price_bytes).hexdigest(),
        "baseline_file_sha256": hashlib.sha256(forecast_bytes).hexdigest(),
        "catalog_sha256": hashlib.sha256(catalog_bytes).hexdigest(),
        "forecasts": json.loads(predictions.to_json(orient="records", force_ascii=False)),
    }


def score_key(row):
    return (row["origin_month"], int(row["month"]), row["date"], row["material_id"])


def update_ledger(prices_path, forecast_path, catalog_path, directory):
    directory.mkdir(parents=True, exist_ok=True)
    issue_dir = directory / "issues"
    issue_dir.mkdir(exist_ok=True)
    # SQLite's process lock serializes competing runs and is released even after a crash.
    # The versioned records themselves are human-readable JSON and CSV.
    with closing(sqlite3.connect(directory / ".lock", timeout=60)) as lock:
        lock.execute("BEGIN IMMEDIATE")
        price_bytes = prices_path.read_bytes()
        prices = pd.read_csv(io.BytesIO(price_bytes), parse_dates=["date"])
        if prices.empty or prices.date.isna().any():
            raise ValueError("A price snapshot with observed months is required")
        origin = prices.date.max()
        now = datetime.now(timezone.utc)
        current_month = pd.Timestamp(now.astimezone(BANGKOK).date()).replace(day=1)
        if origin > current_month:
            raise ValueError("Price origin is in the future")
        month_key = origin.strftime("%Y-%m")
        issues = []
        for path in sorted(issue_dir.glob("*.json")):
            issue = json.loads(path.read_text(encoding="utf-8"))
            if issue["origin_month"] != f"{path.stem}-01":
                raise ValueError(f"Issue origin does not match its filename: {path.name}")
            issues.append(issue)
        if issues and issues[-1]["origin_month"] > origin.date().isoformat():
            raise ValueError("Price snapshot is older than the latest issued origin")
        new_issue = not issues or issues[-1]["origin_month"] != origin.date().isoformat()
        if new_issue:
            if origin + pd.DateOffset(months=3) < current_month:
                raise ValueError("All target months have ended; cannot issue a new forecast")
            issue = issue_snapshot(prices, price_bytes, forecast_path, catalog_path, origin)
            text = json.dumps(issue, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
            write_changed(issue_dir / f"{month_key}.json", text)
            issues.append(issue)

        scores_path = directory / "scores.csv"
        old_scores = []
        if scores_path.exists():
            with scores_path.open(encoding="utf-8", newline="") as file:
                reader = csv.DictReader(file)
                if list(reader.fieldnames or ()) != list(SCORE_COLUMNS):
                    raise ValueError("Unrecognized shadow score columns")
                old_scores = list(reader)
        by_key = {score_key(row): row for row in old_scores}
        if len(by_key) != len(old_scores):
            raise ValueError("Duplicate scores in shadow ledger")
        # Retain the first actual observed for each pair even if TPSO revises it later.
        for row in score_issued(issues, prices, now):
            by_key.setdefault(score_key(row), row)
        scores = [by_key[key] for key in sorted(by_key)]
        buffer = io.StringIO(newline="")
        writer = csv.DictWriter(buffer, fieldnames=SCORE_COLUMNS, lineterminator="\n")
        writer.writeheader()
        writer.writerows(scores)
        changed_scores = write_changed(scores_path, buffer.getvalue())
        changed_report = write_changed(directory / "summary.md", summary_text(issues, scores))
        print(f"Shadow {month_key}: {len(issues)} issues, {len(scores)} scored pairs")
        return new_issue or changed_scores or changed_report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prices", type=Path, default=HERE / "api_data/prices.csv")
    parser.add_argument("--forecast", type=Path, default=HERE / "api_data/forecast.csv")
    parser.add_argument("--catalog", type=Path, default=CATALOG)
    parser.add_argument("--output", type=Path, default=HERE / "shadow" / MODEL)
    parser.add_argument("--signal-unchanged", action="store_true",
                        help="Return 3 when this run produced no changes")
    args = parser.parse_args()
    changed = update_ledger(args.prices, args.forecast, args.catalog, args.output)
    return 3 if args.signal_unchanged and not changed else 0


if __name__ == "__main__":
    raise SystemExit(main())
