"""
เทียบ Naive, LightGBM (ค่าที่ tune.py เลือก), Random Forest และ LSTM ด้วย walk-forward ชุดเดียวกัน

    python compare_models.py          # ~1 ชั่วโมงบนเครื่อง 4 คอร์

ทุกโมเดลทาย log(ราคา t+h / ราคา t) แล้วแปลงกลับเป็นบาท ฝึกใหม่ทุกจุดเริ่มด้วยข้อมูลที่รู้แล้ว ณ จุดนั้น
  Validation  27 จุดเริ่ม ทุก 3 เดือน ม.ค. 2562 – ก.ค. 2568 (ใช้เลือก)
  Test        12 จุดเริ่ม ทุกเดือน ก.ย. 2568 – ส.ค. 2569 (วัดผลอย่างเดียว)

Random Forest (Bagging)  RandomForestRegressor 1 โมเดลต่อ h ฟีเจอร์ 52 ตัวชุดเดียวกับ LightGBM
LSTM                     ดูย้อนหลัง 12 เดือนต่อวัสดุ (ลำดับ 12 × 24 ฟีเจอร์) LSTM(32) → ทาย h = 1, 2, 3 พร้อมกัน
                         fit StandardScaler ด้วยข้อมูล train เท่านั้น, early stopping ด้วย 10% ท้ายของ train ตามเวลา
ทั้งสองแบบมีรุ่น "half" (ขยับครึ่งเดียว) แบบเดียวกับ LightGBM

ผลลัพธ์: out/compare_report.md, out/compare_preds_test.csv, out/compare_preds_cv.csv
"""
from __future__ import annotations

import time
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from global_model import H, PARAMS, feature_cols, md
from tune import fit_all as lgbm_fit_all, load

warnings.filterwarnings("ignore")
HERE = Path(__file__).resolve().parent
OUT = HERE / "out"
# ค่าที่ tune.py เลือกจาก validation ต่อระยะ h (config 0 = ค่าเดิม)
BASE = {k: v for k, v in PARAMS.items() if k not in ("verbose", "subsample_freq")}
LGBM_PICK = {
    1: ({**BASE}, "ts_t85_half"),
    2: ({"num_leaves": 63, "learning_rate": 0.01, "n_estimators": 600, "min_child_samples": 100,
         "subsample": 0.7, "colsample_bytree": 0.5, "reg_lambda": 1.0}, "ts_t85_half"),
    3: ({"num_leaves": 15, "learning_rate": 0.03, "n_estimators": 300, "min_child_samples": 100,
         "subsample": 0.9, "colsample_bytree": 1.0, "reg_lambda": 10.0}, "direct_half"),
}
FIXED = {"subsample_freq": 1, "verbose": -1, "n_jobs": 4}
SEQ = 12


# ---------------------------------------------------------------- Random Forest
def rf_predict(train, test, h, cols):
    from sklearn.ensemble import RandomForestRegressor
    X = lambda d: d[cols].assign(**{c: d[c].cat.codes for c in ("categoryCode", "familyCode") if c in cols})
    m = RandomForestRegressor(n_estimators=200, min_samples_leaf=50, max_features=0.5, n_jobs=4, random_state=7)
    m.fit(X(train), train[f"y{h}"])
    return m.predict(X(test))


# ---------------------------------------------------------------- LSTM
def lstm_feature_cols(P):
    base = ["ret1", "ret3", "vol6", "since_change", "changes12", "dev_mean12", "dev_max12", "dev_min12",
            "fam_ret1", "fam_ret3", "cat_ret1", "fam_up", "fam_down", "fam_dev_mean12"]
    factors = [c for c in P.columns if c.endswith("_r1") and not c.startswith(("fam_", "cat_"))]
    return [c for c in base if c in P] + factors


def build_sequences(P, fcols):
    """ลำดับ 12 เดือนล่าสุดของแต่ละแถว (วัสดุ, เดือน) -> array (n, 12, f) ช่องที่ไม่มีข้อมูลเป็น NaN"""
    P = P.sort_values(["material_id", "date"]).reset_index(drop=True)
    cats = sorted(P["categoryCode"].astype(str).unique())
    onehot = np.eye(len(cats))[P["categoryCode"].astype(str).map({c: i for i, c in enumerate(cats)}).values]
    F = np.concatenate([P[fcols].to_numpy(float), onehot], axis=1)
    seqs = np.full((len(P), SEQ, F.shape[1]), np.nan, dtype=np.float32)
    for _, idx in P.groupby("material_id").indices.items():
        idx = np.sort(idx)
        for k in range(SEQ):  # ช่อง k = เดือน t-(SEQ-1-k)
            lag = SEQ - 1 - k
            if len(idx) > lag:
                seqs[idx[lag:], k, :] = F[idx[: len(idx) - lag]]
    return P, seqs


def lstm_predict(seqs, P, train_mask, test_mask, seed=7):
    import torch
    from torch import nn
    torch.manual_seed(seed)
    np.random.seed(seed)
    torch.set_num_threads(4)
    Y = P[[f"y{h}" for h in range(1, H + 1)]].to_numpy(np.float32)
    tr = np.where(train_mask)[0]
    dates = P["date"].values[tr]
    cut = np.quantile(dates.astype("int64"), 0.9)
    fit_i, val_i = tr[dates.astype("int64") <= cut], tr[dates.astype("int64") > cut]
    # scaler จาก train เท่านั้น
    flat = seqs[fit_i].reshape(-1, seqs.shape[2])
    mu, sd = np.nanmean(flat, 0), np.nanstd(flat, 0)
    sd[~np.isfinite(sd) | (sd == 0)] = 1.0
    mu[~np.isfinite(mu)] = 0.0
    prep = lambda i: torch.tensor(np.nan_to_num((seqs[i] - mu) / sd, nan=0.0), dtype=torch.float32)
    ysc = np.nanstd(Y[fit_i]) or 1.0  # ปรับขนาด target ให้ใกล้ 1

    class Net(nn.Module):
        def __init__(self, f):
            super().__init__()
            self.lstm = nn.LSTM(f, 32, batch_first=True)
            self.head = nn.Sequential(nn.Dropout(0.2), nn.Linear(32, H))

        def forward(self, x):
            out, _ = self.lstm(x)
            return self.head(out[:, -1])

    net = Net(seqs.shape[2])
    opt = torch.optim.Adam(net.parameters(), lr=1e-3)
    Xf, Yf = prep(fit_i), torch.tensor(np.nan_to_num(Y[fit_i] / ysc, nan=0.0)),
    Mf = torch.tensor(~np.isnan(Y[fit_i]))
    Xv, Yv, Mv = prep(val_i), torch.tensor(np.nan_to_num(Y[val_i] / ysc, nan=0.0)), torch.tensor(~np.isnan(Y[val_i]))
    loss = lambda p, y, m: ((p - y).abs() * m).sum() / m.sum().clamp(min=1)  # MAE เฉพาะ target ที่มี
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


# ---------------------------------------------------------------- run
def run(P, seqs, origins, active, cols, label):
    rows, t0 = [], time.time()
    ckpt = OUT / "compare_ckpt"
    ckpt.mkdir(exist_ok=True)
    for i, o in enumerate(origins):
        # เก็บผลทีละจุดเริ่ม ถ้างานหยุดกลางทางจะรันต่อจากจุดเดิมได้
        f = ckpt / f"{label}_{o:%Y-%m}.csv"
        if f.exists():
            rows.append(pd.read_csv(f, parse_dates=["origin"]))
            continue
        n0 = len(rows)
        at_o = (P["date"] == o) & P["material_id"].isin(active)
        # LSTM: 1 โมเดลต่อจุดเริ่ม ฝึกด้วยแถวที่รู้ target อย่างน้อย h = 1 ณ เดือน o
        lstm_train = (P["date"] + pd.DateOffset(months=1) <= o) & P["y1"].notna()
        lstm_pred = lstm_predict(seqs, P.assign(**{f"y{h}": P[f"y{h}"].where(P["date"] + pd.DateOffset(months=h) <= o)
                                                    for h in range(1, H + 1)}), lstm_train.values, at_o.values)
        lstm_idx = {j: k for k, j in enumerate(np.where(at_o.values)[0])}
        for h in range(1, H + 1):
            train = P[(P["date"] + pd.DateOffset(months=h) <= o) & P[f"y{h}"].notna()]
            test = P[at_o & P[f"y{h}"].notna()]
            if test.empty:
                continue
            params, cand = LGBM_PICK[h]
            lg = lgbm_fit_all(train, test, h, cols, {**params, **FIXED})[cand]
            rf = rf_predict(train, test, h, cols)
            ls = np.array([lstm_pred[lstm_idx[j], h - 1] for j in test.index])
            r = test[["material_id", "categoryCode", "price", f"y{h}"]].rename(columns={f"y{h}": "y"}).copy()
            r["origin"], r["h"] = o, h
            r["d_naive"], r["d_lgbm"] = 0.0, lg
            r["d_rf"], r["d_rf_half"] = rf, rf / 2
            r["d_lstm"], r["d_lstm_half"] = ls, ls / 2
            rows.append(r)
        if len(rows) > n0:
            pd.concat(rows[n0:], ignore_index=True).to_csv(f, index=False)
        print(f"  {label} {i + 1}/{len(origins)} ({time.time() - t0:.0f}s)", flush=True)
    R = pd.concat(rows, ignore_index=True)
    R["actual"] = R["price"] * np.exp(R["y"])
    return R


MODELS = ["naive", "lgbm", "rf", "rf_half", "lstm", "lstm_half"]


def scores(R):
    out = []
    for (h, m), _ in pd.Series(0, index=pd.MultiIndex.from_product([sorted(R.h.unique()), MODELS])).items():
        g = R[R.h == h]
        pred = g["price"] * np.exp(g[f"d_{m}"])
        pe = (pred - g["actual"]) / g["actual"] * 100
        ss = ((g["y"] - g["y"].mean()) ** 2).sum()
        out.append({"h": h, "model": m, "MAE (%)": pe.abs().mean(), "RMSE (%)": np.sqrt((pe ** 2).mean()),
                    "R² การเปลี่ยนแปลง": 1 - ((g["y"] - g[f"d_{m}"]) ** 2).sum() / ss if ss else np.nan})
    return pd.DataFrame(out)


def main():
    t0 = time.time()
    P, latest, active = load()
    cols = feature_cols(P)
    P, seqs = build_sequences(P, lstm_feature_cols(P))
    for c in ("categoryCode", "familyCode"):
        P[c] = P[c].astype("category")
    cv_origins = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS"))
    test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
    TE = run(P, seqs, test_origins, active, cols, "test")
    TE.to_csv(OUT / "compare_preds_test.csv", index=False)
    CV = run(P, seqs, cv_origins, active, cols, "cv")
    CV.to_csv(OUT / "compare_preds_cv.csv", index=False)
    s_cv, s_te = scores(CV), scores(TE)
    piv = lambda s, col: s.pivot(index="model", columns="h", values=col).reindex(MODELS)
    names = {"naive": "Naive (baseline)", "lgbm": "LightGBM (Boosting, ปรับจูนแล้ว)", "rf": "Random Forest (Bagging)",
             "rf_half": "Random Forest ขยับครึ่งเดียว", "lstm": "LSTM", "lstm_half": "LSTM ขยับครึ่งเดียว"}
    ren = lambda t: t.rename(index=names).rename(columns=lambda h: f"{h} เดือน")
    report = [
        "# เทียบโมเดล: Naive, LightGBM, Random Forest, LSTM (compare_models.py)", "",
        f"- ข้อมูลถึง {latest:%Y-%m}, ฟีเจอร์ 52 ตัว (LSTM: ลำดับ 12 เดือน × {seqs.shape[2]} ฟีเจอร์)",
        f"- Validation: {len(cv_origins)} จุดเริ่ม ({len(CV):,} การทาย), Test: {len(test_origins)} จุดเริ่ม ({len(TE):,} การทาย)",
        "", "## Validation: MAE (%)", "", md(ren(piv(s_cv, "MAE (%)"))),
        "", "## Test: MAE (%)", "", md(ren(piv(s_te, "MAE (%)"))),
        "", "## Test: RMSE (%)", "", md(ren(piv(s_te, "RMSE (%)"))),
        "", "## Test: R² ของ % การเปลี่ยนแปลง", "", md(ren(piv(s_te, "R² การเปลี่ยนแปลง"))),
        "", f"ใช้เวลา {time.time() - t0:.0f} วินาที",
    ]
    (OUT / "compare_report.md").write_text("\n".join(report), encoding="utf-8")
    print("\n".join(report))


if __name__ == "__main__":
    main()
