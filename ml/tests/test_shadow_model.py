import sys
import unittest
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from shadow_model import shadow_predictions


class ShadowModelTests(unittest.TestCase):
    @staticmethod
    def inputs(observations):
        prices = pd.DataFrame(observations, columns=["material_id", "date", "price"])
        prices["date"] = pd.to_datetime(prices.date)
        prices["unit"] = "บาท/ตัน"
        origin = prices.date.max()
        latest = prices.sort_values("date").drop_duplicates("material_id", keep="last")
        catalog = latest[["material_id"]].assign(categoryCode="STR-01", familyCode="F").set_index("material_id")
        rows = [(row.material_id, h, (origin + pd.DateOffset(months=h)).strftime("%Y-%m-%d"),
                 round(row.price, 2), "naive") for row in latest.itertuples() for h in (1, 2, 3)]
        forecasts = pd.DataFrame(rows, columns=["material_id", "month", "date", "price", "model"])
        return prices, catalog, forecasts

    def test_gap_is_never_filled_as_an_observed_training_label(self):
        args = self.inputs([("A", "2026-01-01", 100.), ("A", "2026-03-01", 121.),
                            ("B", "2026-02-01", 150.), ("C", "2026-03-01", 200.)])
        result = shadow_predictions(*args).set_index(["material_id", "month"])
        self.assertEqual(len(result), 9)
        for horizon in (1, 3):
            self.assertEqual(result.at[("A", horizon), "status"], "insufficient_history")
            self.assertTrue(pd.isna(result.at[("A", horizon), "ml_price"]))
        self.assertEqual(result.at[("A", 2), "ml_price"], 133.1)
        self.assertEqual(result.at[("A", 2), "naive_price"], 121.)
        self.assertEqual(result.at[("A", 2), "date"], "2026-05-01")
        self.assertEqual(result.at[("A", 2), "status"], "paired")
        self.assertTrue(result.loc["B", "status"].eq("missing_origin").all())
        self.assertTrue(result.loc["C", "status"].eq("insufficient_history").all())

    def test_flat_training_prices_yield_an_actual_model_tie(self):
        args = self.inputs([("A", dt, 100.) for dt in pd.date_range("2026-01-01", periods=6, freq="MS")])
        result = shadow_predictions(*args)
        self.assertTrue(result.status.eq("paired").all())
        self.assertTrue(result.ml_price.eq(result.naive_price).all())

    def test_refuses_misaligned_targets_non_naive_prices_and_missing_horizons(self):
        prices, catalog, forecasts = self.inputs([("A", "2026-01-01", 100.)])
        for invalid in [forecasts.assign(date="2026-01-01"), forecasts.assign(model="drift"),
                        forecasts.assign(price=110.), forecasts.iloc[:2],
                        pd.concat([forecasts, forecasts.iloc[[0]]], ignore_index=True)]:
            with self.subTest(data=invalid.to_dict("list")), self.assertRaises(ValueError):
                shadow_predictions(prices, catalog, invalid)
        self.assertTrue(shadow_predictions(prices, catalog, forecasts).status.eq("insufficient_history").all())


if __name__ == "__main__":
    unittest.main()
