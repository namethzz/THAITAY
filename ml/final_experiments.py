"""
ทดลองรวมสำหรับบทสรุป: ทุกโมเดลบนจุดเริ่มชุดเดียวกับ compare_models.py (Validation 27 จุด, Test 12 จุด)

    python final_experiments.py          # ~40 นาที (4 คอร์) อย่ารันพร้อมสคริปต์อื่น

เพิ่มจาก compare_models.py
  1. Baseline แบบอนุกรมเวลา: Seasonal naive, Drift, ETS (ฟังก์ชันเดียวกับ baseline.py)
  2. Linear Regression แบบ Huber (โมเดลรวมทุกวัสดุ) และแบบขยับครึ่งเดียว
  3. LightGBM ค่าตั้งเริ่มต้น ทุกแบบ: ทายตรง, 2 ขั้น (ค่าคาดหวัง, เกณฑ์ 0.70, 0.85) และขยับครึ่งเดียว
  4. ค้นหาค่าตั้ง Random Forest 6 ชุด และ LSTM 4 ชุด รอบคัด 9 จุดเริ่ม (แบบเดียวกับ tune.py)
     ชุดที่ดีที่สุดได้ไปรอบเต็ม 27 + 12 จุด เฉพาะเมื่อชนะ Naive ในรอบคัด

ผลลัพธ์: out/final_preds_cv.csv, out/final_preds_test.csv, out/tune_rf_lstm.csv, out/final_report.md
"""
from __future__ import annotations

import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from baseline import f_drift, f_ets, f_snaive
from compare_models import build_sequences, lstm_feature_cols
from global_model import H, PARAMS, feature_cols, md
from tune import fit_all as lgbm_fit_all, load

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
CKPT = OUT / "final_ckpt"
LGBM_DEFAULT = {**PARAMS, "n_jobs": 4}
LGBM_KEYS = ["direct", "direct_half", "ts_ev", "ts_t70", "ts_t85", "ts_t85_half"]

RF_GRID = {  # ชุด A คือค่าที่ใช้ใน compare_models.py
    "A": dict(min_samples_leaf=50, max_features=0.5),
    "B": dict(min_samples_leaf=20, max_features=0.5),
    "C": dict(min_samples_leaf=100, max_features=0.5),
    "D": dict(min_samples_leaf=200, max_features=0.3),
    "E": dict(min_samples_leaf=50, max_features=1.0),
    "F": dict(min_samples_leaf=100, max_features=0.3),
}
LSTM_GRID = {  # ชุด A คือค่าที่ใช้ใน compare_models.py
    "A": dict(hidden=32, lr=1e-3, dropout=0.2, seq=12),
    "B": dict(hidden=16, lr=1e-3, dropout=0.2, seq=12),
    "C": dict(hidden=64, lr=1e-3, dropout=0.3, seq=12),
    "D": dict(hidden=32, lr=3e-3, dropout=0.2, seq=6),
}


# ---------------------------------------------------------------- โมเดล
def classic_forecasts(P, o, mats):
    """Seasonal naive, Drift, ETS จากประวัติราคาถึงเดือน o -> {material: {model: log change ราย h}}"""
    out = {}
    hist = P[(P["date"] <= o) & P["material_id"].isin(mats)].sort_values("date").groupby("material_id")["price"]
    for m, s in hist:
        y = s.to_numpy(float)
        row = {}
        for name, f in (("snaive", f_snaive), ("drift", f_drift), ("ets", f_ets)):
            try:
                fc = f(y)
            except Exception:
                fc = None
            row[name] = np.zeros(H) if fc is None or not np.all(np.isfinite(fc)) else np.log(np.asarray(fc) / y[-1])
        out[m] = row
    return out


def huber_predict(train, test, h, cols):
    from sklearn.impute import SimpleImputer
    from sklearn.linear_model import HuberRegressor
    from sklearn.pipeline import make_pipeline
    from sklearn.preprocessing import StandardScaler
    num = [c for c in cols if c not in ("categoryCode", "familyCode")]
    oh = lambda d: pd.concat([d[num], pd.get_dummies(d["categoryCode"].astype(str), prefix="cat", dtype=float)], axis=1)
    Xtr = oh(train)
    Xte = oh(test).reindex(columns=Xtr.columns, fill_value=0.0)
    m = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), HuberRegressor(max_iter=1000))
    return m.fit(Xtr, train[f"y{h}"]).predict(Xte)


def rf_predict_cfg(train, test, h, cols, min_samples_leaf, max_features):
    from sklearn.ensemble import RandomForestRegressor
    X = lambda d: d[cols].assign(**{c: d[c].cat.codes for c in ("categoryCode", "familyCode") if c in cols})
    m = RandomForestRegressor(n_estimators=200, min_samples_leaf=min_samples_leaf, max_features=max_features,
                              n_jobs=4, random_state=7)
    return m.fit(X(train), train[f"y{h}"]).predict(X(test))


def lstm_predict_cfg(seqs, P, train_mask, test_mask, hidden, lr, dropout, seq, seed=7):
    """เหมือน compare_models.lstm_predict แต่ปรับค่าตั้งได้ (seq = ใช้กี่เดือนล่าสุดจากลำดับ 12 เดือน)"""
    import torch
    from torch import nn
    torch.manual_seed(seed)
    np.random.seed(seed)
    torch.set_num_threads(4)
    seqs = seqs[:, -seq:, :]
    Y = P[[f"y{k}" for k in range(1, H + 1)]].to_numpy(np.float32)
    tr = np.where(train_mask)[0]
    dates = P["date"].values[tr].astype("int64")
    cut = np.quantile(dates, 0.9)
    fit_i, val_i = tr[dates <= cut], tr[dates > cut]
    flat = seqs[fit_i].reshape(-1, seqs.shape[2])
    mu, sd = np.nanmean(flat, 0), np.nanstd(flat, 0)
    sd[~np.isfinite(sd) | (sd == 0)] = 1.0
    mu[~np.isfinite(mu)] = 0.0
    prep = lambda i: torch.tensor(np.nan_to_num((seqs[i] - mu) / sd, nan=0.0), dtype=torch.float32)
    ysc = np.nanstd(Y[fit_i]) or 1.0

    class Net(nn.Module):
        def __init__(self, f):
            super().__init__()
            self.lstm = nn.LSTM(f, hidden, batch_first=True)
            self.head = nn.Sequential(nn.Dropout(dropout), nn.Linear(hidden, H))

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.head(out[:, -1])

    net = Net(seqs.shape[2])
    opt = torch.optim.Adam(net.parameters(), lr=lr)
    tens = lambda i: (prep(i), torch.tensor(np.nan_to_num(Y[i] / ysc, nan=0.0)), torch.tensor(~np.isnan(Y[i])))
    (Xf, Yf, Mf), (Xv, Yv, Mv) = tens(fit_i), tens(val_i)
    loss = lambda p, y, m: ((p - y).abs() * m).sum() / m.sum().clamp(min=1)
    best, best_state, bad = np.inf, None, 0
    for _ in range(30):
        net.train()
        perm = torch.randperm(len(Xf))
        for b in range(0, len(perm), 256):
            j = perm[b:b + 256]
            opt.zero_grad()
            loss(net(Xf[j]), Yf[j], Mf[j]).backward()
            opt.step()
        net.eval()
        with torch.no_grad():
            v = loss(net(Xv), Yv, Mv).item() if len(Xv) else 0.0
        if v < best - 1e-5:
            best, best_state, bad = v, {k: t.clone() for k, t in net.state_dict().items()}, 0
        else:
            bad += 1
            if bad >= 4:
                break
    if best_state:
        net.load_state_dict(best_state)
    net.eval()
    with torch.no_grad():
        return net(prep(np.where(test_mask)[0])).numpy() * ysc


def lstm_at_origin(P, seqs, o, active, cfg):
    known = P.assign(**{f"y{k}": P[f"y{k}"].where(P["date"] + pd.DateOffset(months=k) <= o) for k in range(1, H + 1)})
    at_o = ((P["date"] == o) & P["material_id"].isin(active)).values
    train_mask = ((P["date"] + pd.DateOffset(months=1) <= o) & P["y1"].notna()).values
    out = lstm_predict_cfg(seqs, known, train_mask, at_o, **cfg)
    return out, {j: k for k, j in enumerate(np.where(at_o)[0])}


def split(P, o, h, active):
    train = P[(P["date"] + pd.DateOffset(months=h) <= o) & P[f"y{h}"].notna()]
    test = P[(P["date"] == o) & P[f"y{h}"].notna() & P["material_id"].isin(active)]
    return train, test


# ---------------------------------------------------------------- รอบหลัก
def run_main(P, origins, active, cols, label):
    CKPT.mkdir(parents=True, exist_ok=True)
    rows, t0 = [], time.time()
    for i, o in enumerate(origins):
        f = CKPT / f"{label}_{o:%Y-%m}.csv"
        if f.exists():
            rows.append(pd.read_csv(f, parse_dates=["origin"]))
            continue
        mats = set(P.loc[(P["date"] == o) & P["material_id"].isin(active), "material_id"])
        classic = classic_forecasts(P, o, mats)
        part = []
        for h in range(1, H + 1):
            train, test = split(P, o, h, active)
            if test.empty:
                continue
            r = test[["material_id", "categoryCode", "price", f"y{h}"]].rename(columns={f"y{h}": "y"}).copy()
            r["origin"], r["h"] = o, h
            for name in ("snaive", "drift", "ets"):
                r[f"d_{name}"] = [classic[m][name][h - 1] for m in test["material_id"]]
            hub = huber_predict(train, test, h, cols)
            r["d_huber"], r["d_huber_half"] = hub, hub / 2
            lg = lgbm_fit_all(train, test, h, cols, LGBM_DEFAULT)
            for k in LGBM_KEYS:
                r[f"d_lgbm0_{k}"] = lg[k]
            part.append(r)
        if part:
            pd.concat(part, ignore_index=True).to_csv(f, index=False)
            rows.extend(part)
        print(f"  {label} {i + 1}/{len(origins)} ({time.time() - t0:.0f}s)", flush=True)
    return pd.concat(rows, ignore_index=True)


# ---------------------------------------------------------------- ค้นหาค่าตั้ง RF / LSTM
def mae(R, d):
    a = R["price"] * np.exp(R["y"])
    return (np.abs(R["price"] * np.exp(d) - a) / a * 100)


def screen_rf_lstm(P, seqs, quick, active, cols):
    rows, t0 = [], time.time()
    for o in quick:
        lstm_out = {k: lstm_at_origin(P, seqs, o, active, cfg) for k, cfg in LSTM_GRID.items()}
        for h in range(1, H + 1):
            train, test = split(P, o, h, active)
            if test.empty:
                continue
            base = {"origin": o, "h": h, "material_id": test["material_id"].values, "price": test["price"].values,
                    "y": test[f"y{h}"].values}
            for k, cfg in RF_GRID.items():
                d = rf_predict_cfg(train, test, h, cols, **cfg)
                rows.append(pd.DataFrame({**base, "model": "rf", "config": k, "d": d}))
            for k, (out, pos) in lstm_out.items():
                d = np.array([out[pos[j], h - 1] for j in test.index])
                rows.append(pd.DataFrame({**base, "model": "lstm", "config": k, "d": d}))
            rows.append(pd.DataFrame({**base, "model": "naive", "config": "-", "d": 0.0}))
        print(f"  คัด RF/LSTM {o:%Y-%m} ({time.time() - t0:.0f}s)", flush=True)
    R = pd.concat(rows, ignore_index=True)
    out = []
    for (model, cfg, h), g in R.groupby(["model", "config", "h"]):
        out.append({"model": model, "config": cfg, "h": h, "เต็ม": mae(g, g["d"]).mean(), "ครึ่งเดียว": mae(g, g["d"] / 2).mean()})
    return pd.DataFrame(out)


def full_run_cfg(P, seqs, origins, active, cols, model, cfg_key, label):
    rows = []
    for o in origins:
        if model == "lstm":
            out, pos = lstm_at_origin(P, seqs, o, active, LSTM_GRID[cfg_key])
        for h in range(1, H + 1):
            train, test = split(P, o, h, active)
            if test.empty:
                continue
            d = (rf_predict_cfg(train, test, h, cols, **RF_GRID[cfg_key]) if model == "rf"
                 else np.array([out[pos[j], h - 1] for j in test.index]))
            rows.append(pd.DataFrame({"material_id": test["material_id"].values, "origin": o, "h": h,
                                      f"d_{model}_tuned": d}))
        print(f"  รอบเต็ม {model} {cfg_key} {label} {o:%Y-%m}", flush=True)
    return pd.concat(rows, ignore_index=True)


def main():
    t0 = time.time()
    P, latest, active = load()
    cols = feature_cols(P)
    P, seqs = build_sequences(P, lstm_feature_cols(P))
    for c in ("categoryCode", "familyCode"):
        P[c] = P[c].astype("category")
    cv_origins = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS"))
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    key = ["material_id", "origin", "h"]

    merged = {}
    for label, origins in (("test", test_origins), ("cv", cv_origins)):
        R = run_main(P, origins, active, cols, label)
        C = pd.read_csv(OUT / f"compare_preds_{label}.csv", parse_dates=["origin"])
        M = C.merge(R.drop(columns=["categoryCode", "price", "y"]), on=key, how="left", validate="1:1")
        assert M["d_ets"].notna().all(), "แถวไม่ตรงกับ compare_preds"
        merged[label] = M

    # ค้นหาค่าตั้ง RF / LSTM
    S = screen_rf_lstm(P, seqs, cv_origins[::3], active, cols)
    S.to_csv(OUT / "tune_rf_lstm.csv", index=False)
    naive_q = S[S.model == "naive"].set_index("h")["เต็ม"]
    notes = []
    for model in ("rf", "lstm"):
        s = S[S.model == model].copy()
        s["ดีสุด"] = s[["เต็ม", "ครึ่งเดียว"]].min(axis=1)
        best_cfg = s.groupby("config")["ดีสุด"].mean().idxmin()
        b = s[s.config == best_cfg].set_index("h")["ดีสุด"]
        wins = (b < naive_q).any()
        notes.append(f"- {model}: ชุดที่ดีที่สุดในรอบคัด = {best_cfg} "
                     + ", ".join(f"h{h} {b[h]:.2f} เทียบ Naive {naive_q[h]:.2f}" for h in b.index)
                     + (" → ไปรอบเต็ม" if wins else " → แพ้ Naive ทุกระยะ ไม่ไปรอบเต็ม"))
        if wins and best_cfg != "A":
            for label, origins in (("test", test_origins), ("cv", cv_origins)):
                T = full_run_cfg(P, seqs, origins, active, cols, model, best_cfg, label)
                merged[label] = merged[label].merge(T, on=key, how="left")
    for label, M in merged.items():
        M.to_csv(OUT / f"final_preds_{label}.csv", index=False)

    lines = ["# ทดลองรวมสำหรับบทสรุป (final_experiments.py)", "", "## ค้นหาค่าตั้ง RF / LSTM (รอบคัด 9 จุด, MAE %)", "",
             md(S.round(3)), "", *notes, "", "## MAE (%) ทุกโมเดล", ""]
    for label, M in merged.items():
        ds = [c for c in M.columns if c.startswith("d_")]
        t = pd.DataFrame({c[2:]: M.groupby("h").apply(lambda g: mae(g, g[c]).mean()) for c in ds}).T.round(2)
        lines += [f"### {label}", "", md(t), ""]
    lines.append(f"ใช้เวลา {time.time() - t0:.0f} วินาที")
    (OUT / "final_report.md").write_text("\n".join(lines), encoding="utf-8")
    print("\n".join(lines))


if __name__ == "__main__":
    main()
