"""Price-only LightGBM challenger for paired, unpublished monthly forecasts."""
import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor

from change_signal import fit_p
from global_model import H, PARAMS, build_panel, feature_cols
from train_best import EPS, add_features


def _monthly_prices(series):
    # Keep gaps missing in both features and labels.
    return series.asfreq("MS")


def _predict_prices(train, current, horizon, cols):
    """Use half the predicted signed log change only above the fixed 70% gate."""
    probability = fit_p(train, current, horizon, cols, threads=4)
    move = probability > 0.70
    predicted = current["price"].to_numpy(dtype=float, copy=True)
    if move.any():
        target = train[f"y{horizon}"]
        changes = target[target.abs() > EPS]
        if changes.nunique() == 1:
            size = changes.iloc[0]
        else:
            regressor = LGBMRegressor(**PARAMS, n_jobs=4, objective="l1", random_state=7)
            regressor.fit(train.loc[changes.index, cols], changes)
            size = regressor.predict(current.loc[move, cols])
        predicted[move] *= np.exp(size / 2)
    predicted = predicted.round(2)
    if not (np.isfinite(predicted) & (predicted > 0)).all():
        raise ValueError("Invalid shadow price")
    return pd.Series(predicted, index=current.material_id)


def shadow_predictions(prices, catalog, forecasts):
    """Pair every published Naive price with an H1–H3 challenger where possible."""
    prices = prices.copy()
    prices["date"] = pd.to_datetime(prices["date"])
    identifiers = prices.material_id.unique()
    if (prices.empty or not all(isinstance(mid, str) and mid.strip() for mid in identifiers) or
            prices.duplicated(["material_id", "date"]).any() or
            not prices.date.dt.to_period("M").dt.to_timestamp().eq(prices.date).all()):
        raise ValueError("Invalid monthly price keys")
    if prices.price.isna().any() or not (np.isfinite(prices.price) & prices.price.gt(0)).all():
        raise ValueError("Observed prices must be finite and positive")
    if not catalog.index.is_unique or not prices.material_id.isin(catalog.index).all():
        raise ValueError("Missing or ambiguous material metadata")
    if (not all(isinstance(unit, str) and unit.strip() for unit in prices.unit.unique()) or
            prices.groupby("material_id").unit.nunique().ne(1).any()):
        raise ValueError("Missing or inconsistent material unit")
    origin = prices.date.max()
    last = prices.sort_values("date").drop_duplicates("material_id", keep="last").set_index("material_id")
    out = forecasts[["material_id", "month", "date", "price"]].rename(columns={"price": "naive_price"}).copy()
    horizons = range(1, H + 1)
    if (out.empty or out.isna().any().any() or not forecasts["model"].isin(["naive"]).all() or
            not out.material_id.isin(last.index).all() or not out.month.isin(horizons).all() or
            out.duplicated(["material_id", "month"]).any() or
            out.groupby("material_id").size().ne(H).any()):
        raise ValueError("Expected one published Naive forecast per material and horizon")
    out["month"] = out.month.astype(int)
    targets = {h: origin + pd.DateOffset(months=h) for h in horizons}
    if not pd.to_datetime(out.date).eq(out.month.map(targets)).all():
        raise ValueError("Published targets do not match the price origin")
    out["date"] = out.month.map(targets).dt.strftime("%Y-%m-%d")
    if not out.naive_price.eq(out.material_id.map(last.price).round(2)).all():
        raise ValueError("Published Naive price differs from the last observed price")
    out["unit"] = out.material_id.map(last.unit)
    out["ml_price"] = np.nan
    out["status"] = np.where(out.material_id.map(last.date).eq(origin), "insufficient_history", "missing_origin")
    replaced = catalog.index[catalog["replacedBy"].notna()] if "replacedBy" in catalog else []
    history = prices.loc[~prices.material_id.isin(replaced)]
    # build_panel omits single-observation series. They keep their explicit status.
    if history.groupby("material_id").size().gt(1).any():
        panel = add_features(build_panel(history, catalog, None, monthly_fn=_monthly_prices), None)
        panel = panel.loc[panel.price.notna()]
        current = panel.loc[panel.date.eq(origin) & panel.material_id.isin(out.material_id)]
        cols = feature_cols(panel)
        for h in horizons:
            train = panel.loc[(panel.date + pd.DateOffset(months=h) <= origin) & panel[f"y{h}"].notna()]
            if train.empty or current.empty:
                continue
            predictions = _predict_prices(train, current, h, cols)
            paired = out.month.eq(h) & out.material_id.isin(predictions.index)
            out.loc[paired, "ml_price"] = out.loc[paired, "material_id"].map(predictions)
            out.loc[paired, "status"] = "paired"
    return out[["material_id", "month", "date", "unit", "naive_price", "ml_price", "status"]].reset_index(drop=True)
