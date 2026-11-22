"""Direct TPSO price forecasts using two LightGBM models per horizon."""
import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from lightgbm import LGBMClassifier, LGBMRegressor

from bands import CHOSEN, bands_at, history
from shadow_forecasts import write_changed

ROOT = Path(__file__).resolve().parent
MODEL = "tpso_direct_lightgbm_t50_v1"


def prepare(raw):
    panel = raw.pivot(index="date", columns="material_id", values="price").asfreq("MS")
    family = raw.drop_duplicates("material_id").set_index("material_id").familyCode
    prices = panel.ffill()
    returns = prices.pct_change(fill_method=None)
    features = {}
    for lag in (1, 2, 3, 6, 12):
        features[f"return_{lag}"] = prices.pct_change(lag, fill_method=None)
    for window in (3, 12):
        features[f"volatility_{window}"] = returns.rolling(window, min_periods=1).std()
        features[f"frequency_{window}"] = returns.ne(0).where(returns.notna()).rolling(window,min_periods=1).mean()
    features["family_return"] = returns.T.groupby(family).transform("median").T
    features["reported"] = panel.notna().astype(int)
    features["month"] = pd.DataFrame(np.broadcast_to(panel.index.month.to_numpy()[:,None], panel.shape),index=panel.index,columns=panel.columns)
    x = pd.DataFrame({k:v.stack() for k,v in features.items()})
    return panel, prices, x


def predict_components(panel, prices, x, ids, origin, h):
    target = (panel.shift(-h) / prices - 1).stack().rename("target")
    cutoff = origin - pd.DateOffset(months=h)
    train = x.join(target).dropna(subset=["target"])
    train = train.loc[train.index.get_level_values(0) <= cutoff]
    # Require a report at each training origin to avoid stale discontinued series.
    train = train[train.reported == 1]
    opts = dict(n_estimators=100,num_leaves=15,min_child_samples=50,learning_rate=.04,
                random_state=42,n_jobs=2,verbosity=-1)
    inputs = train[x.columns]
    moves = train.target.ne(0)
    classifier = LGBMClassifier(**opts).fit(inputs, moves)
    reg = LGBMRegressor(objective="regression_l1", **opts).fit(inputs.loc[moves], train.target[moves])
    test = x.loc[origin].reindex(ids)
    prob = classifier.predict_proba(test)[:,1]
    predicted_change = reg.predict(test)
    base = prices.loc[origin,ids].to_numpy()
    return base, prob, predicted_change


def predict(panel, prices, x, ids, origin, h):
    base, prob, predicted_change = predict_components(panel, prices, x, ids, origin, h)
    forecast = np.round(base * (1 + np.where(prob >= .5, predicted_change, 0)),2)
    if not np.isfinite(forecast).all() or (forecast <= 0).any():
        raise ValueError("Missing or invalid model price")
    return base, prob, forecast


def publish(raw, catalog, signal_file=None):
    panel, prices, features = prepare(raw)
    ids = [item["id"] for item in catalog["materials"] if not item.get("discontinued")]
    origin = panel.index[-1]
    meta = raw.drop_duplicates("material_id").set_index("material_id").loc[ids]
    last = raw.groupby("material_id").date.max().loc[ids]
    lag = (origin.year - last.dt.year) * 12 + origin.month - last.dt.month
    past = history(raw)
    frames = []
    for h in (1, 2, 3):
        _, _, price = predict(panel, prices, features, ids, origin, h)
        frame = meta[["categoryCode", "familyCode"]].copy()
        frame["hb"] = (lag + h).clip(upper=3)
        lo, hi = bands_at(past, origin, frame, CHOSEN, h_col="hb")
        frame["month"] = h
        frame["date"] = (origin + pd.DateOffset(months=h)).strftime("%Y-%m-%d")
        frame["price"] = price
        frame["low"] = np.round(price * np.exp(lo), 2)
        frame["high"] = np.round(price * np.exp(hi), 2)
        frame["model"] = MODEL
        frames.append(frame[["month", "date", "price", "low", "high", "model"]].reset_index())
    result = pd.concat(frames).sort_values(["material_id", "month"])
    if not (result.low.gt(0) & result.low.le(result.price) & result.price.le(result.high)).all():
        raise ValueError("Invalid forecast bounds")
    if signal_file:
        keys = ["material_id", "month", "date"]
        signals = pd.read_csv(signal_file, usecols=keys + ["change_prob"])
        result = result.merge(signals, on=keys, how="left", validate="one_to_one")
        if set(map(tuple, result[keys].to_numpy())) != set(map(tuple, signals[keys].to_numpy())):
            raise ValueError("Signal dates differ from the forecast dates")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--prices", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--keep-signals", type=Path)
    args = parser.parse_args()
    catalog = json.loads((ROOT.parent / "frontend/src/data/structural-materials.json").read_text(encoding="utf8"))
    result = publish(pd.read_csv(args.prices, parse_dates=["date"]), catalog, args.keep_signals)
    write_changed(args.output, result.to_csv(index=False, lineterminator="\n"))
