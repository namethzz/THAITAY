"""Build the one-month alert from observed, consecutive monthly price pairs."""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "frontend/src/data"
CATEGORY_WEIGHT = 12
ALERT_SCORE = 0.55


def make_alerts(prices, catalog):
    categories = {m["id"]: m["categoryCode"] for m in catalog if not m.get("replacedBy")}
    rows = prices[prices.material_id.isin(categories)].sort_values(["material_id", "date"]).copy()
    if rows.empty or rows.duplicated(["material_id", "date"]).any():
        raise ValueError("Missing or duplicate monthly price observations")
    if not (rows.date.dt.is_month_start.all() and np.isfinite(rows.price).all() and (rows.price > 0).all()):
        raise ValueError("Invalid monthly price observations")
    origin = rows.date.max()
    rows["category"] = rows.material_id.map(categories)
    previous = rows.groupby("material_id")[["date", "price"]].shift()
    pairs = rows.loc[previous.date + pd.offsets.MonthBegin() == rows.date].copy()
    pairs["moved"] = (np.log(pairs.price) - np.log(previous.price.loc[pairs.index])).abs() > 1e-6
    if pairs.empty:
        raise ValueError("No observed monthly price pairs")
    history = pairs.groupby("material_id").moved.agg(["sum", "count"])
    category_rate = pairs.groupby("category").moved.mean()
    current = rows.loc[rows.date.eq(origin)].set_index("material_id").join(history)
    prior = current.category.map(category_rate).fillna(pairs.moved.mean())
    scores = (current["sum"].fillna(0) + CATEGORY_WEIGHT * prior) / (current["count"].fillna(0) + CATEGORY_WEIGHT)
    return {"origin": origin.strftime("%Y-%m-%d"),
            "target": (origin + pd.offsets.MonthBegin()).strftime("%Y-%m-%d"),
            "alerts": sorted(scores.index[scores >= ALERT_SCORE])}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prices", type=Path, default=HERE / "api_data/prices.csv")
    args = parser.parse_args()
    prices = pd.read_csv(args.prices, parse_dates=["date"])
    catalog = json.loads((DATA / "structural-materials.json").read_text(encoding="utf-8"))["materials"]
    result = make_alerts(prices, catalog)
    (DATA / "item-history-alerts.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
