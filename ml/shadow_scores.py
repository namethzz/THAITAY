"""Score frozen Naive and ML forecasts against the same observed monthly price."""

from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from statistics import fmean

import pandas as pd


SCORE_COLUMNS = [
    "origin_month", "issued_at_utc", "month", "date", "material_id", "unit",
    "timing", "observed_at_utc", "naive_price", "ml_price", "actual_price",
    "naive_abs_error", "ml_abs_error", "naive_ape_pct", "ml_ape_pct", "winner",
]
TIMING_LABELS = {
    "before_target_month": "ก่อนเริ่มเดือน",
    "during_target_month": "ระหว่างเดือน",
    "after_target_month": "หลังสิ้นเดือน (งดวัดผล)",
}


def _utc(timestamp):
    stamp = pd.Timestamp(timestamp)
    if pd.isna(stamp) or stamp.tzinfo is None:
        raise ValueError("Issue and observation timestamps must include a timezone")
    return stamp.tz_convert("UTC")


def _bangkok_month(stamp):
    return stamp.tz_convert("Asia/Bangkok").date().replace(day=1)


def _timing(issue_month, target):
    if issue_month < target:
        return "before_target_month"
    if issue_month == target:
        return "during_target_month"
    return "after_target_month"


def _baht(value):
    try:
        amount = Decimal(str(value))
        if amount.is_finite() and amount > 0:
            amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            if amount > 0:
                return amount
    except InvalidOperation:
        pass
    return None


def score_issued(issues, prices, observed_at):
    """Return eligible matched pairs. Each score uses the same item, unit and month."""
    observed_at = _utc(observed_at)
    observed_month = _bangkok_month(observed_at)
    dates = pd.to_datetime(prices["date"])
    if dates.isna().any() or not dates.dt.is_month_start.all():
        raise ValueError("Actual prices must have calendar month-start dates")
    observed = prices.assign(date=dates.dt.date).set_index(["material_id", "date"])
    if not observed.index.is_unique:
        raise ValueError("Duplicate actual price for a material and month")
    actuals = observed[["unit", "price"]].to_dict(orient="index")
    results = []
    for issue in issues:
        issued_at = _utc(issue["issued_at_utc"])
        if observed_at <= issued_at:
            continue
        issue_month = _bangkok_month(issued_at)
        for row in issue["forecasts"]:
            target = pd.Timestamp(row["date"]).date()
            timing = _timing(issue_month, target)
            if (row["status"] != "paired" or timing == "after_target_month"
                    or target > observed_month):
                continue
            observed_price = actuals.get((row["material_id"], target))
            if (observed_price is None or not isinstance(row["unit"], str)
                    or not row["unit"].strip() or pd.isna(observed_price["unit"])
                    or observed_price["unit"] != row["unit"]):
                continue
            actual = _baht(observed_price["price"])
            naive = _baht(row["naive_price"])
            ml = _baht(row["ml_price"])
            if None in (actual, naive, ml):
                continue
            naive_error, ml_error = abs(naive - actual), abs(ml - actual)
            winner = "tie"
            if naive_error != ml_error:
                winner = "ml" if ml_error < naive_error else "naive"
            results.append({
                "origin_month": issue["origin_month"], "issued_at_utc": issue["issued_at_utc"],
                "month": int(row["month"]), "date": target.isoformat(),
                "material_id": row["material_id"], "unit": row["unit"], "timing": timing,
                "observed_at_utc": observed_at.isoformat(),
                "naive_price": float(naive), "ml_price": float(ml), "actual_price": float(actual),
                "naive_abs_error": float(naive_error), "ml_abs_error": float(ml_error),
                "naive_ape_pct": float(100 * naive_error / actual),
                "ml_ape_pct": float(100 * ml_error / actual), "winner": winner,
            })
    return results


def summary_text(issues, scores):
    """Summarize each origin and horizon, including forecasts still awaiting actuals."""
    grouped_scores = defaultdict(list)
    for score in scores:
        key = (pd.Timestamp(score["origin_month"]).date(), int(score["month"]))
        grouped_scores[key].append(score)
    lines = [
        "# ผลเทียบราคาพยากรณ์ Naive และ ML", "",
        "หน้าเว็บใช้ราคา Naive ตารางนี้วัดผลย้อนหลังเมื่อมีราคาจริงของวัสดุ เดือน และหน่วยเดียวกัน "
        "MAPE คือเปอร์เซ็นต์ความคลาดเคลื่อนเฉลี่ย ยิ่งต่ำยิ่งแม่น", "",
        "| เดือนราคาตั้งต้น | ระยะ (เดือน) | เดือนเป้าหมาย | ออกคำทำนาย | "
        "รายการทั้งหมด | มีคำทำนายทั้งคู่ | วัดผลแล้ว | Naive MAPE | ML MAPE | ML ชนะ | เสมอ | Naive ชนะ |",
        "|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for issue in sorted(issues, key=lambda item: item["origin_month"]):
        origin = pd.Timestamp(issue["origin_month"]).date()
        issue_month = _bangkok_month(_utc(issue["issued_at_utc"]))
        forecasts = defaultdict(list)
        for row in issue["forecasts"]:
            forecasts[int(row["month"])].append(row)
        for horizon, rows in sorted(forecasts.items()):
            target = pd.Timestamp(rows[0]["date"]).date()
            timing = TIMING_LABELS[_timing(issue_month, target)]
            paired_count = sum(row["status"] == "paired" for row in rows)
            evaluated = grouped_scores[origin, horizon]
            counts = Counter(row["winner"] for row in evaluated)
            mape = ["—", "—"]
            if evaluated:
                mape = [f"{fmean(float(row[key]) for row in evaluated):.3f}%"
                        for key in ("naive_ape_pct", "ml_ape_pct")]
            lines.append(
                f"| {origin:%Y-%m} | {horizon} | {target:%Y-%m} | {timing} | "
                f"{len(rows)} | {paired_count} | {len(evaluated)} | {mape[0]} | {mape[1]} | "
                f"{counts['ml']} | {counts['tie']} | {counts['naive']} |"
            )
    return "\n".join(lines) + "\n"
