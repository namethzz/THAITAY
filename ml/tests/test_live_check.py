"""Check percentage error reporting and refusal to score an unknown month."""
import contextlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import live_check


class LiveCheckTests(unittest.TestCase):
    def test_reports_mape_in_percent(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            ml = root / "ml"
            for folder in (ml / "data", ml / "out", root / "frontend/src/data"):
                folder.mkdir(parents=True)
            pd.DataFrame([
                {"material_id": "A", "date": "2026-10-01", "price": 100, "categoryCode": "STR-06"},
                {"material_id": "B", "date": "2026-10-01", "price": 200, "categoryCode": "STR-06"},
            ]).to_csv(ml / "data/prices_clean.csv", index=False)
            pd.DataFrame([
                {"material_id": "A", "date": "2026-10-01", "month": 1, "price": 90, "low": 80, "high": 110, "change_prob": 0.8},
                {"material_id": "B", "date": "2026-10-01", "month": 1, "price": 180, "low": 170, "high": 210, "change_prob": 0.2},
            ]).to_csv(ml / "forecast.csv", index=False)
            (root / "frontend/src/data/structural-materials.json").write_text(
                json.dumps({"materials": [{"id": "A", "name": "A"}, {"id": "B", "name": "B"}]}), encoding="utf-8")
            with patch.object(live_check, "HERE", ml), patch.object(sys, "argv", ["live_check.py", str(ml / "forecast.csv")]), contextlib.redirect_stdout(io.StringIO()):
                live_check.main()
            report = (ml / "out/live_check.md").read_text(encoding="utf-8")
            self.assertIn("(MAPE) | 10.00%", report)
            self.assertNotIn("(MAE)", report)
            self.assertIn("2 / 2 (100%)", report)

            future = pd.read_csv(ml / "forecast.csv")
            future["date"] = "2026-11-01"
            future.to_csv(ml / "forecast.csv", index=False)
            with patch.object(live_check, "HERE", ml), patch.object(sys, "argv", ["live_check.py", str(ml / "forecast.csv")]):
                with self.assertRaisesRegex(SystemExit, "2026-11"):
                    live_check.main()


if __name__ == "__main__":
    unittest.main()
