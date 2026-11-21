from pathlib import Path
import sys
import unittest

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from shadow_scores import SCORE_COLUMNS, score_issued, summary_text


def forecast(mid="A", horizon=1, target="2026-11-01", **overrides):
    return {
        "material_id": mid, "month": horizon, "date": target, "unit": "ตัน",
        "naive_price": 20000, "ml_price": 20500, "status": "paired", **overrides,
    }


def issue(rows, issued_at="2026-11-21T05:00:00Z"):
    return {"origin_month": "2026-10-01", "issued_at_utc": issued_at,
            "model": "test", "forecasts": rows}


def prices(rows):
    return pd.DataFrame(rows, columns=["material_id", "date", "unit", "price"])


class ShadowScoreTests(unittest.TestCase):
    def test_compares_frozen_prices_on_identical_observations(self):
        release = issue([forecast(), forecast("MISSING"), forecast("WRONG-UNIT"),
                         forecast("NO-ML", status="missing_origin", ml_price=None),
                         forecast("OTHER-MONTH"), forecast("BAD-ACTUAL")])
        actual = prices([("A", "2026-11-01", "ตัน", 20400),
                         ("WRONG-UNIT", "2026-11-01", "กก.", 20400),
                         ("NO-ML", "2026-11-01", "ตัน", 20400),
                         ("OTHER-MONTH", "2026-12-01", "ตัน", 20400),
                         ("BAD-ACTUAL", "2026-11-01", "ตัน", 0)])
        scores = score_issued([release], actual, "2026-12-10T02:00:00Z")
        self.assertEqual(len(scores), 1)
        row = scores[0]
        self.assertEqual(list(row), SCORE_COLUMNS)
        self.assertEqual((row["winner"], row["naive_abs_error"], row["ml_abs_error"]),
                         ("ml", 400, 100))
        self.assertAlmostEqual(row["ml_ape_pct"], 100 * 100 / 20400)
        self.assertEqual(row["timing"], "during_target_month")
        from_csv = [{key: str(value) for key, value in row.items()}]
        report = summary_text([release], from_csv)
        self.assertIn("ระหว่างเดือน | 6 | 5 | 1 | 1.961% | 0.490% | 1 | 0 | 0 |", report)

    def test_rounding_ties_at_currency_precision(self):
        release = issue([forecast(naive_price=10.10, ml_price=10.30)])
        actual = prices([("A", "2026-11-01", "ตัน", 10.20)])
        row, = score_issued([release], actual, "2026-12-10T02:00:00Z")
        self.assertEqual((row["winner"], row["naive_abs_error"], row["ml_abs_error"]),
                         ("tie", .1, .1))

    def test_release_month_and_observation_cutoff_use_bangkok_time(self):
        rows = [forecast(), forecast(horizon=2, target="2026-12-01"),
                forecast(horizon=3, target="2027-01-01")]
        # First minute of December in Bangkok; November has already ended.
        release = issue(rows, "2026-11-30T17:01:00Z")
        actual = prices([("A", r["date"], "ตัน", 20000) for r in rows])
        self.assertFalse(score_issued([release], actual, release["issued_at_utc"]))
        dec_scores = score_issued([release], actual, "2026-12-15T00:00:00Z")
        self.assertEqual([(r["month"], r["timing"]) for r in dec_scores],
                         [(2, "during_target_month")])
        jan_scores = score_issued([release], actual, "2027-02-10T00:00:00Z")
        self.assertEqual([r["timing"] for r in jan_scores],
                         ["during_target_month", "before_target_month"])
        report = summary_text([release], jan_scores)
        self.assertIn("หลังสิ้นเดือน (งดวัดผล) | 1 | 1 | 0 | — | —", report)

    def test_duplicate_actuals_rejected(self):
        actual = prices([("A", "2026-11-01", "ตัน", 20100)] * 2)
        with self.assertRaisesRegex(ValueError, "Duplicate actual"):
            score_issued([issue([forecast()])], actual, "2026-12-10T02:00:00Z")


if __name__ == "__main__":
    unittest.main()
