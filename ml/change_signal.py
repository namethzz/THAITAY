"""Chronological calibration and evaluation of monthly change probabilities.

Default: five supported factors, one-calendar-month factor lag, report only.
Use --apply to update change_prob; price forecasts and intervals are unchanged.
--factor-set legacy is a diagnostic comparator and cannot be applied.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import time

import numpy as np
import pandas as pd

from factor_policy import SUPPORTED_FACTORS, EXCLUDED_FACTORS
from global_model import CATALOG, H, PARAMS, build_panel, feature_cols, md
from train_best import EPS, add_features

HERE = Path(__file__).resolve().parent
BINS = np.array([0, .3, .5, .7, .85, 1.0001])
SHOW_AT = .7
MIN_BIN = 30


def prepare_panel(prices, cat, factors, factor_set="supported"):
    """Keep observed labels only. Factor lag is one calendar month for both variants."""
    prices = prices.copy()
    if prices.duplicated(["material_id", "date"]).any():
        raise ValueError("Duplicate price calendar keys")
    if not prices.date.dt.day.eq(1).all():
        raise ValueError("Price dates must be calendar month starts")
    if not (np.isfinite(prices.price) & prices.price.gt(0)).all():
        raise ValueError("Observed prices must be finite and positive")
    replaced = set(cat.index[cat["replacedBy"].notna()]) if "replacedBy" in cat else set()
    prices = prices[~prices.material_id.isin(replaced)]
    selected = list(SUPPORTED_FACTORS) + (list(EXCLUDED_FACTORS) if factor_set == "legacy" else [])
    F = factors.set_index("month_date").sort_index()
    if F.index.duplicated().any() or not (F.index.day == 1).all():
        raise ValueError("Invalid factor calendar keys")
    if not set(selected).issubset(F.columns):
        raise ValueError("Required factor columns missing")
    F = F[selected].asfreq("MS")
    if (((F <= 0) | ~np.isfinite(F)) & F.notna()).any().any():
        raise ValueError("Factor values must be positive or missing")
    # No negative date shift: helper features at t use factors at t-1 or earlier.
    F = F.reset_index().rename(columns={"month_date": "date"})
    # Preserve calendar gaps as NaN. baseline.monthly interpolates using a future
    # observation and may discard old segments after seeing later gaps.
    primary = [c for c in selected if c not in ("steel_futures_unverified", "scrap_metal_ppi_index")]
    P = add_features(build_panel(prices, cat, F[["date", *primary]], monthly_fn=lambda s: s.asfreq("MS")), F)
    observed = pd.MultiIndex.from_frame(prices[["material_id", "date"]])
    keys = pd.MultiIndex.from_frame(P[["material_id", "date"]])
    P = P.loc[keys.isin(observed)].copy()
    for h in range(1, H + 1):
        targets = pd.MultiIndex.from_arrays([P.material_id, P.date + pd.DateOffset(months=h)])
        P.loc[~targets.isin(observed), f"y{h}"] = np.nan
    return P.reset_index(drop=True)


def fit_p(train, test, h, cols, threads=4):
    import lightgbm as lgb
    y = (train[f"y{h}"].abs() > EPS).astype(int)
    if y.empty:
        raise ValueError("No matured training labels")
    if y.nunique() == 1:
        return np.repeat(float(y.iloc[0]), len(test))
    return lgb.LGBMClassifier(**PARAMS, n_jobs=threads, random_state=7).fit(train[cols], y).predict_proba(test[cols])[:, 1]


def bin_ids(values):
    values = np.asarray(values, dtype=float)
    if not (np.isfinite(values).all() and ((values >= 0) & (values <= 1)).all()):
        raise ValueError("Probability outside [0, 1]")
    return np.clip(np.searchsorted(BINS, values, side="right") - 1, 0, len(BINS) - 2)


def fit_calibrator(calibration):
    """Only accepts calibration rows. Test labels are never passed to this function."""
    if calibration.empty:
        raise ValueError("Empty calibration set")
    prior = float(calibration.moved.mean())
    x = calibration.assign(bin=bin_ids(calibration.p))
    bins = x.groupby("bin").moved.agg(["mean", "size"])
    rates = {int(k): float(row["mean"]) if row["size"] >= MIN_BIN else prior for k, row in bins.iterrows()}
    categories = calibration.groupby("categoryCode", observed=True).moved.mean().to_dict()
    return {"prior": prior, "rates": rates, "categories": categories,
            "bins": [{"bin": int(k), "count": int(row["size"]), "observed_rate": float(row["mean"]), "applied_rate": rates[int(k)]} for k, row in bins.iterrows()]}


def calibrated(values, calibration):
    return np.array([calibration["rates"].get(int(k), calibration["prior"]) for k in bin_ids(values)])


def metrics(actual, probability):
    y = np.asarray(actual, dtype=bool)
    p = np.asarray(probability, dtype=float)
    flag = p >= SHOW_AT
    tp, fp, fn = int((flag & y).sum()), int((flag & ~y).sum()), int((~flag & y).sum())
    return {"samples": len(y), "actual_changes": int(y.sum()), "flags": int(flag.sum()),
            "tp": tp, "fp": fp, "fn": fn,
            "precision": tp / (tp + fp) if tp + fp else None,
            "recall": tp / (tp + fn) if tp + fn else None,
            "f1": 2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else None,
            "brier": float(np.mean((p - y.astype(float)) ** 2))}


def partition_rows(rows, test_start):
    calibration = rows[(rows.origin < test_start) & (rows.target <= test_start)].copy()
    test = rows[rows.origin >= test_start].copy()
    if calibration.empty or test.empty:
        raise ValueError("Insufficient chronological calibration/test history")
    if calibration.target.max() > test.origin.min():
        raise ValueError("Calibration outcomes not known at first test origin")
    return calibration, test


def publish(fc, probabilities, origin):
    result = fc.copy()
    if result.duplicated(["material_id", "month"]).any():
        raise ValueError("Duplicate published forecast keys")
    for h in (1, 2, 3):
        expected = (origin + pd.DateOffset(months=h)).strftime("%Y-%m-%d")
        if not result.loc[result.month.eq(h), "date"].eq(expected).all():
            raise ValueError("Forecast dates do not match the current price origin")
    lookup = probabilities.set_index(["material_id", "month"]).change_prob
    result["change_prob"] = [lookup.get((r.material_id, r.month), np.nan) for r in result.itertuples()]
    if not result.change_prob.dropna().between(0, 1).all():
        raise ValueError("Published probability outside [0, 1]")
    pd.testing.assert_frame_equal(fc.drop(columns="change_prob", errors="ignore"), result.drop(columns="change_prob"))
    return result


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--factor-set", choices=["supported", "legacy"], default="supported")
    ap.add_argument("--factors-csv", type=Path, default=HERE / "data/factors_monthly.csv")
    ap.add_argument("--output-dir", type=Path, default=HERE / "out/signal_supported")
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--threads", type=int, default=4)
    args = ap.parse_args()
    if args.apply and args.factor_set != "supported":
        ap.error("Unverified factors are diagnostic only and cannot be applied")
    out = args.output_dir
    out.mkdir(parents=True, exist_ok=True)
    prices_path, cat_path = HERE / "data/prices_clean.csv", CATALOG
    prices = pd.read_csv(prices_path, parse_dates=["date"])
    factors = pd.read_csv(args.factors_csv, parse_dates=["month_date"])
    cat = pd.DataFrame(json.loads(cat_path.read_text(encoding="utf-8"))["materials"]).set_index("id")
    latest = prices.date.max()
    test_start = latest - pd.DateOffset(months=12)
    protocol = {"started_at_utc": datetime.now(timezone.utc).isoformat(), "factor_set": args.factor_set, "excluded_factors": list(EXCLUDED_FACTORS) if args.factor_set == "supported" else [],
                "factor_lag_months": 1, "latest": latest.strftime("%Y-%m-%d"), "test_origin_start": test_start.strftime("%Y-%m-%d"),
                "calibration_origin_frequency": "3MS from 2019-01", "test_origin_frequency": "MS", "threshold": SHOW_AT,
                "bins": BINS.tolist(), "min_bin": MIN_BIN, "threads": args.threads,
                "publication_timing_verified": False, "fresh_holdout": False,
                "inputs_sha256": {str(p): digest(p) for p in (prices_path, args.factors_csv, cat_path)},
                "code_sha256": {p.name: digest(p) for p in (Path(__file__), HERE / "factor_policy.py", HERE / "global_model.py", HERE / "train_best.py", HERE / "baseline.py")},
                "python": platform.python_version(), "params": PARAMS}
    (out / "protocol.json").write_text(json.dumps(protocol, indent=2), encoding="utf-8")
    P = prepare_panel(prices, cat, factors, args.factor_set)
    cols = feature_cols(P)
    if args.factor_set == "supported" and any(factor in col for factor in EXCLUDED_FACTORS for col in cols):
        raise ValueError("Excluded factor leaked into predictors")
    origins = list(pd.date_range("2019-01-01", test_start - pd.DateOffset(months=1), freq="3MS")) + list(pd.date_range(test_start, latest - pd.DateOffset(months=1), freq="MS"))
    rows, started = [], time.time()
    for i, origin in enumerate(origins):
        for h in (1, 2, 3):
            target = origin + pd.DateOffset(months=h)
            # Purge calibration labels that were still unknown at the first test origin.
            if target > latest or (origin < test_start and target > test_start):
                continue
            train = P[(P.date + pd.DateOffset(months=h) <= origin) & P[f"y{h}"].notna()]
            test = P[P.date.eq(origin) & P[f"y{h}"].notna()]
            if test.empty:
                continue
            r = test[["material_id", "categoryCode"]].copy()
            r["origin"], r["target"], r["h"] = origin, target, h
            r["p"] = fit_p(train, test, h, cols, args.threads)
            r["moved"] = test[f"y{h}"].abs().to_numpy() > EPS
            rows.append(r)
        print(f"{i+1}/{len(origins)} {origin:%Y-%m} ({time.time()-started:.0f}s)", flush=True)
    R = pd.concat(rows, ignore_index=True)
    calibration_rows, test_rows = partition_rows(R, test_start)
    summaries, current, calibration_metadata = [], [], {}
    now = P[P.date.eq(latest)]
    for h in (1, 2, 3):
        cal = calibration_rows[calibration_rows.h.eq(h)]
        evaluated = test_rows[test_rows.h.eq(h)].copy()
        if cal.empty or evaluated.empty:
            raise ValueError(f"No calibration/test rows for horizon {h}")
        table = fit_calibrator(cal)
        calibration_metadata[h] = {**table, "calibration_origin_end": cal.origin.max().strftime("%Y-%m-%d"), "calibration_target_end": cal.target.max().strftime("%Y-%m-%d"), "test_origin_start": evaluated.origin.min().strftime("%Y-%m-%d")}
        evaluated["calibrated"] = calibrated(evaluated.p, table)
        evaluated["category_baseline"] = evaluated.categoryCode.astype(object).map(table["categories"]).fillna(table["prior"]).astype(float)
        evaluated["constant_baseline"] = table["prior"]
        for name, column in (("raw_model", "p"), ("calibrated_model", "calibrated"), ("category_baseline", "category_baseline"), ("constant_baseline", "constant_baseline")):
            summaries.append({"h": h, "method": name, **metrics(evaluated.moved, evaluated[column])})
        evaluated.to_csv(out / f"test_h{h}.csv", index=False)
        mature = P[(P.date + pd.DateOffset(months=h) <= latest) & P[f"y{h}"].notna()]
        prob = calibrated(fit_p(mature, now, h, cols, args.threads), table)
        current.append(pd.DataFrame({"material_id": now.material_id.to_numpy(), "month": h, "change_prob": np.round(prob, 6)}))
    current = pd.concat(current, ignore_index=True)
    current.to_csv(out / "current_probabilities.csv", index=False)
    calibration_rows.to_csv(out / "calibration_predictions.csv", index=False)
    summary = pd.DataFrame(summaries)
    summary.to_csv(out / "metrics.csv", index=False)
    (out / "calibration.json").write_text(json.dumps(calibration_metadata, indent=2), encoding="utf-8")
    (out / "features.json").write_text(json.dumps(cols, indent=2), encoding="utf-8")
    report = ["# ป้ายราคามีโอกาสเปลี่ยน — แยก calibration/test ตามเวลา", "",
              f"- ชุดปัจจัย: {args.factor_set}; ข้อมูลถึง {latest:%Y-%m}; lag ปัจจัย 1 เดือน",
              f"- Test origins เริ่ม {test_start:%Y-%m}; calibration outcomes ต้องไม่เกินเดือนเริ่ม test",
              f"- Threshold ตรึง {SHOW_AT:.0%}; bins ตรึงก่อนรัน; bin < {MIN_BIN} จุดใช้ prior จาก calibration เท่านั้น",
              "- ไม่ใช้ final active cohort เลือกข้อสอบย้อนหลัง และไม่ใช้ราคาที่เติมช่องว่างเป็น actual",
              "- ตัวปรับเทียบและ baseline ตรึงจาก calibration ไม่เรียนจาก test; ตัว classifier ฝึกใหม่ด้วย labels ที่รู้แล้วในแต่ละ origin",
              "- ช่วงย้อนหลังเคยใช้พัฒนาแล้ว ไม่ใช่ fresh holdout; ไม่มีหลักฐานเวลาเผยแพร่/ข้อมูลแต่ละรุ่นครบถ้วน จึงไม่อ้าง point-in-time certification",
              "- ราคาคาดการณ์ยังเป็น Naive; งานนี้ประเมินเฉพาะป้ายว่าจะเปลี่ยนหรือไม่ ไม่บอกทิศทาง", "",
              "## ผล test (precision/recall เป็นสัดส่วน 0–1; ค่าว่างคือไม่มีตัวหาร)", "", md(summary), "",
              "## ขอบเขต calibration", "", md(pd.DataFrame([{"h": h, "origin_end": v["calibration_origin_end"], "target_end": v["calibration_target_end"], "test_origin_start": v["test_origin_start"]} for h, v in calibration_metadata.items()])), ""]
    text = "\n".join(report)
    (out / "report.md").write_text(text, encoding="utf-8")
    if args.apply:
        fc_path = HERE / "api_data/forecast.csv"
        fc = pd.read_csv(fc_path)
        publish(fc, current, latest).to_csv(fc_path, index=False)
        (HERE / "out/change_signal.md").write_text(text, encoding="utf-8")
        manifest = {"issued_at_utc": datetime.now(timezone.utc).isoformat(), "origin_month": protocol["latest"],
                    "method": "supported_factors_temporal_calibration", "factor_lag_months": 1,
                    "excluded_factors": list(EXCLUDED_FACTORS), "threshold": SHOW_AT,
                    "calibration": calibration_metadata, "forecast_sha256": digest(fc_path),
                    "protocol_sha256": digest(out / "protocol.json"), "test_metrics": summaries,
                    "fresh_holdout": False, "publication_timing_verified": False}
        (HERE / "api_data/signal_manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(text, flush=True)


if __name__ == "__main__":
    main()
