import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import change_signal as signal
import fetch_factors
import build_factors
from factor_policy import SUPPORTED_FACTORS, EXCLUDED_FACTORS
from global_model import feature_cols


class SignalTests(unittest.TestCase):
    def setUp(self):
        dates = pd.date_range("2019-01-01", "2022-12-01", freq="MS")
        self.prices = pd.DataFrame({"material_id": "A", "date": dates, "price": np.arange(len(dates)) + 100.})
        self.cat = pd.DataFrame({"categoryCode": ["STR-01"], "familyCode": ["F"]}, index=["A"])
        self.factors = pd.DataFrame({"month_date": dates, **{c: np.arange(len(dates)) + 10. for c in [*SUPPORTED_FACTORS, *EXCLUDED_FACTORS]}})

    def test_future_prices_gaps_and_factors_do_not_change_past_features(self):
        end = pd.Timestamp("2021-01-01")
        original = signal.prepare_panel(self.prices, self.cat, self.factors)
        prices = self.prices.copy()
        prices.loc[prices.date.gt(end), "price"] *= 5
        prices = prices[~prices.date.eq("2021-03-01")]
        factors = self.factors.copy()
        factors.loc[factors.month_date.ge(end), list(SUPPORTED_FACTORS)] *= 10
        changed = signal.prepare_panel(prices, self.cat, factors)
        cols = ["material_id", "date", *feature_cols(original)]
        pd.testing.assert_frame_equal(original.loc[original.date.le(end), cols].reset_index(drop=True), changed.loc[changed.date.le(end), cols].reset_index(drop=True))

    def test_missing_actual_is_not_interpolated_into_a_label(self):
        prices = self.prices[~self.prices.date.eq("2021-02-01")]
        panel = signal.prepare_panel(prices, self.cat, self.factors)
        self.assertTrue(pd.isna(panel.loc[panel.date.eq("2021-01-01"), "y1"].iloc[0]))
        self.assertFalse(panel.date.eq("2021-02-01").any())

    def test_legacy_comparator_keeps_extra_features_without_duplicate_columns(self):
        panel = signal.prepare_panel(self.prices, self.cat, self.factors, "legacy")
        self.assertFalse(panel.columns.duplicated().any())
        for factor in EXCLUDED_FACTORS:
            self.assertIn(factor + "_r1", feature_cols(panel))

    def test_excluded_factor_values_cannot_change_supported_panel(self):
        original = signal.prepare_panel(self.prices, self.cat, self.factors)
        self.factors.loc[:, list(EXCLUDED_FACTORS)] *= 1000
        changed = signal.prepare_panel(self.prices, self.cat, self.factors)
        pd.testing.assert_frame_equal(original, changed)
        self.assertFalse(any(f in c for f in EXCLUDED_FACTORS for c in feature_cols(original)))

    def test_calibration_is_purged_and_independent_of_test_labels(self):
        rows = pd.DataFrame({"origin": pd.to_datetime(["2020-07-01", "2020-09-01", "2020-10-01"]), "target": pd.to_datetime(["2020-10-01", "2020-12-01", "2020-11-01"]), "p": [.8, .9, .9], "moved": [True, False, False], "categoryCode": ["STR-01"] * 3})
        cal, test = signal.partition_rows(rows, pd.Timestamp("2020-10-01"))
        self.assertEqual(len(cal), 1)
        self.assertEqual(len(test), 1)
        original = signal.fit_calibrator(cal)
        rows.loc[rows.origin.ge("2020-10-01"), "moved"] = True
        cal2, _ = signal.partition_rows(rows, pd.Timestamp("2020-10-01"))
        self.assertEqual(original, signal.fit_calibrator(cal2))

    def test_sparse_bins_use_only_calibration_prior(self):
        rows = pd.DataFrame({"p": [.1, .9], "moved": [True, False], "categoryCode": ["STR-01"] * 2})
        model = signal.fit_calibrator(rows)
        np.testing.assert_equal(signal.calibrated([0., .5, 1.], model), [.5, .5, .5])
        self.assertIsNone(signal.metrics([True, False], [.2, .2])["precision"])

    def test_publish_preserves_prices_and_checks_dates(self):
        fc = pd.DataFrame({"material_id": ["A"] * 3, "month": [1, 2, 3], "date": ["2026-11-01", "2026-12-01", "2027-01-01"], "price": [100.] * 3, "low": [90.] * 3, "high": [110.] * 3})
        probs = fc[["material_id", "month"]].assign(change_prob=[.4, .5, .6])
        updated = signal.publish(fc, probs, pd.Timestamp("2026-10-01"))
        pd.testing.assert_frame_equal(fc, updated.drop(columns="change_prob"))
        with self.assertRaisesRegex(ValueError, "dates"):
            signal.publish(fc, probs, pd.Timestamp("2026-09-01"))
        probs.loc[0, "change_prob"] = 1.5
        with self.assertRaisesRegex(ValueError, "outside"):
            signal.publish(fc, probs, pd.Timestamp("2026-10-01"))


class FactorPipelineTests(unittest.TestCase):
    def test_builder_needs_only_five_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "data").mkdir()
            for file, column in [("Brent_Crude_prices.csv", SUPPORTED_FACTORS[0]), ("fx_usd_thb.csv", "fx_usd_thb"), ("fx_cny_thb.csv", "fx_cny_thb"), ("Iron_Ore_prices.csv", "iron_ore_62fe_usd_ton")]:
                pd.DataFrame({"Date": ["2026-08-01", "2026-09-01"], column: [10., 11.]}).to_csv(root / file, index=False)
            pd.DataFrame({"Date": ["2026-08-01", "2026-09-30"], "Hi_Diesel": [30., 31.]}).to_csv(root / "Fuels_prices.csv", index=False)
            with patch.object(build_factors, "HERE", root), patch.object(sys, "argv", ["build_factors.py", str(root)]):
                build_factors.main()
            F = pd.read_csv(root / "data/factors_monthly.csv")
            self.assertEqual(set(F.columns), {"month_date", *SUPPORTED_FACTORS})

    def test_fetch_removes_legacy_columns_without_carrying_values(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / "data").mkdir()
            (root / "out").mkdir()
            dates = pd.to_datetime(["2026-08-01", "2026-09-01", "2026-10-01"])
            F = pd.DataFrame({"month_date": dates[:2], **{c: [10., 11.] for c in [*SUPPORTED_FACTORS, *EXCLUDED_FACTORS]}})
            F.to_csv(root / "data/factors_monthly.csv", index=False)
            s = pd.Series([10., 11., 12.], index=dates)
            with patch.object(fetch_factors, "HERE", root), patch.object(sys, "argv", ["fetch_factors.py", "--to", "2026-10"]), patch.object(fetch_factors, "monthly_close", return_value=s), patch.object(fetch_factors, "month_end_daily", return_value=s), patch.object(fetch_factors, "ptt_diesel", return_value=33.):
                fetch_factors.main()
            updated = pd.read_csv(root / "data/factors_monthly.csv")
            self.assertEqual(set(updated.columns), {"month_date", *SUPPORTED_FACTORS})
            self.assertEqual(updated.iloc[-1].brent_crude_usd_barrel, 12.)


if __name__ == "__main__":
    unittest.main()
