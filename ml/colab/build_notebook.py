"""สร้าง colab/THAITAY_ML.ipynb ใหม่ (ยังไม่รัน): python colab/build_notebook.py colab/THAITAY_ML.ipynb

ข้อความที่มีตัวเลขจาก final_experiments.py อยู่ใน FACTS ด้านล่าง แก้ที่เดียวถ้ารันการทดลองใหม่
"""
import sys

import nbformat as nbf

OUT = sys.argv[1]
FACTS = {
    "N_VARIANTS": "16",
    "R1_DECIDE": "Naive ดีที่สุดทั้งสองช่วงทุกระยะ · Seasonal naive แย่สุด (ผิด 5–7%) เพราะราคาวัสดุไม่ขึ้นลงตามฤดูกาล · "
                 "Drift และ ETS ต่อแนวโน้มเดิมออกไป เลยผิดตอนราคาหยุดขยับหรือเปลี่ยนทิศ · ใช้ Naive เป็นเกณฑ์ที่ทุกโมเดลต้องชนะ",
    "R3_DECIDE": "2 ขั้นดีกว่าทายตรงชัดเจน และขยับครึ่งเดียวช่วยแทบทุกครั้ง · แบบที่ใกล้สุดคือเกณฑ์ 85% ขยับครึ่งเดียว: "
                 "Validation ทาย 1 เดือนเสมอ Naive แต่ 2–3 เดือนแพ้ · เกณฑ์ 70% ชนะใน Test ที่ 1 เดือน (1.65%) แต่แพ้ใน Validation · "
                 "ยังไม่ผ่านกติกา รอบต่อไปลองปรับข้อมูลภายนอก",
    "R5_DECIDE": "ทาย 1 เดือนเสมอ Naive ทั้งสองช่วง เพราะเส้นตรงทายขยับน้อยมากจนใกล้ Naive · ทาย 3 เดือนดีกว่าเล็กน้อยใน Test "
                 "(5.03% เทียบ 5.06%) แต่แพ้ใน Validation (2.59% เทียบ 2.19%) · ไม่ผ่านกติกา",
    "R7_DECIDE": "จูนแล้วดีขึ้นทั้งคู่ ชุดที่ดีที่สุดคือชุดที่คุมความซับซ้อน (Random Forest ชุด F ใบใหญ่ขึ้น สุ่มฟีเจอร์น้อยลง, "
                 "LSTM ชุด B เล็กลงเหลือ 16 หน่วย) แต่ยังแพ้ Naive ทุกระยะในรอบคัด จึงไม่ไปรอบเต็ม · "
                 "ผลเต็มของชุดเดิม: แพ้ทุกระยะใน Validation ส่วน LSTM ทาย 3 เดือนชนะใน Test (4.96% เทียบ 5.06%) แต่ Validation ไม่ยืนยัน · "
                 "ไม่ผ่านกติกา",
    "R9_MAE": "ไม่มีแบบไหนดีกว่า Naive ในช่วง Validation เลยแม้แต่ระยะเดียว ดีที่สุดคือเสมอที่ทาย 1 เดือน "
              "ช่วง Test มีบางแบบดีกว่าเล็กน้อย เช่น LightGBM จูนแล้ว, LightGBM 2 ขั้นเกณฑ์ 70% (1 เดือน), LSTM และ Linear (3 เดือน) "
              "แต่ Validation ไม่ยืนยัน จึงไม่ผ่านกติกาสักแบบ",
}

cells = []


def fill(s):
    for k, v in FACTS.items():
        s = s.replace("{{" + k + "}}", v)
    assert "{{" not in s, s[:200]
    return s


def md(s):
    cells.append(nbf.v4.new_markdown_cell(fill(s).strip("\n")))


def code(s):
    cells.append(nbf.v4.new_code_cell(s.strip("\n")))


def round_card(title, why, what, decide):
    """หัวข้อแต่ละรอบ: ข้อความที่คั่นด้วย " · " กลายเป็นหัวข้อย่อย"""
    def items(text):
        parts = [x.strip() for x in fill(text).split(" · ")]
        return parts[0] if len(parts) == 1 else "\n" + "\n".join(f"  - {x}" for x in parts)
    md(f"""
### {title}

- **ทำไมลอง:** {items(why)}
- **ทำอะไร:** {items(what)}
- **ตัดสินใจ:** {items(decide)}
""")


# ================================================================== หัวเรื่อง
md("""
# THAI TAY: บทสรุปการสร้างโมเดลทายราคาวัสดุก่อสร้าง

notebook นี้คือบทสรุปสุดท้ายของงาน ML ในโปรเจค THAI TAY เล่าตั้งแต่โจทย์ ข้อมูล การทดลองทุกรอบ การปรับจูน จนถึงข้อสรุป ผลทุกช่องบันทึกไว้แล้ว อ่านได้เลยโดยไม่ต้องรัน

## คำตอบสุดท้าย

> **ทายราคาวัสดุงานโครงสร้างทุกชนิด ทุกระยะ (1–3 เดือน) ด้วย Naive** คือให้ราคาเดือนหน้าเท่ากับราคาเดือนล่าสุด
>
> เราทดลอง 8 รอบ เทียบ {{N_VARIANTS}} แบบกับ Naive บนข้อมูลชุดเดียวกัน และลองค่าตั้งตอนจูนอีก 31 ชุด **ไม่มีแบบไหนชนะ Naive ได้ทั้งช่วง Validation (ย้อนหลัง 7 ปี) และช่วง Test (12 เดือนล่าสุด)** ส่วน ML ใช้ได้ดีกับงานอีกแบบ คือป้าย "ราคามีโอกาสเปลี่ยน" ซึ่งขึ้นป้ายแล้วราคาเปลี่ยนจริง 80%

| ส่วนบนเว็บ | ใช้อะไร | ผล |
|---|---|---|
| ตัวเลขราคาที่ทาย | Naive | ปีปกติ ทาย 1 เดือนผิดเฉลี่ย 0.67% ปีล่าสุดที่ตลาดแกว่ง ผิด 1.75% (1 เดือน) ถึง 5.06% (3 เดือน) |
| ช่วงราคาต่ำ–สูง | ความผิดพลาดในอดีตของแต่ละหมวด | ครอบราคาจริง 76% (1 เดือน) ถึง 54% (3 เดือน) ต่ำกว่าเป้า 80% ต้องขยายช่วง |
| ป้าย "ราคามีโอกาสเปลี่ยน" | LightGBM Classifier | ขึ้นป้ายแล้วราคาเปลี่ยนจริง 80% |

## เนื้อหา

| ส่วน | หัวข้อ |
|---|---|
| เตรียมข้อมูล | 1. โจทย์และกติกา · 2. ข้อมูล · 3. ทำความสะอาด · 4. ฟีเจอร์ · 5. แบ่งข้อมูล · 6. วัดผล |
| ทดลอง | 7. ลองฝึกทุกโมเดลจริง · 8. การทดลอง 8 รอบ (รวมการจูน) |
| สรุป | 9. ผลรวมทุกโมเดล · 10. Residual · 11. ป้ายเตือน · 12. ปัญหาที่เจอ · 13. บทสรุป |

## วิธีรันเอง (ไม่บังคับ)

1. กด **Runtime → Run all**
2. ช่องแรกจะขอไฟล์ ให้เลือก `thaitay_colab.zip` ที่ได้มาพร้อม notebook
3. รอราว 3 นาที การทดลองเต็มใช้เวลาหลายชั่วโมง notebook จึงโหลดผลที่บันทึกไว้มาแสดง (ดูภาคผนวกถ้าจะรันใหม่ทั้งหมด)

ช่องโค้ดส่วนใหญ่ซ่อนไว้ ดับเบิลคลิกที่หัวช่องเพื่อดูโค้ด
""")

code(r'''
# @title 0. เตรียมเครื่อง: โหลดไฟล์ข้อมูล โค้ด ผลการทดลอง และฟอนต์ไทย { display-mode: "form" }
import glob, json, os, subprocess, sys, warnings, zipfile
warnings.filterwarnings("ignore")

ROOT = "thaitay_colab"
if not os.path.isdir(ROOT):
    if "google.colab" in sys.modules:
        from google.colab import files
        print("เลือกไฟล์ thaitay_colab.zip")
        uploaded = files.upload()
        zipfile.ZipFile(next(iter(uploaded))).extractall(".")
    else:
        raise FileNotFoundError("แตกไฟล์ thaitay_colab.zip ไว้ในโฟลเดอร์เดียวกับ notebook ก่อน")

for module, package in (("lightgbm", "lightgbm"), ("sklearn", "scikit-learn"), ("torch", "torch"), ("statsmodels", "statsmodels")):
    try:
        __import__(module)
    except ImportError:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", package], check=True)

import matplotlib
import matplotlib.dates as mdates
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from IPython.display import Image, display
from matplotlib import font_manager
from matplotlib.colors import LinearSegmentedColormap

for f in glob.glob(f"{ROOT}/fonts/*.otf"):
    font_manager.fontManager.addfont(f)
INK, MUTED, GRID, SURFACE = "#0b0b0b", "#898781", "#e1e0d9", "#fcfcfb"
SERIES = "#52514e"
SPLIT = {"Validation": "#6250d6", "Test": "#e87ba4", "Train": "#d6d5ce"}
MODEL = {"naive": ("Naive (baseline)", "#2a78d6"), "lgbm": ("LightGBM", "#eb6834"),
         "rf": ("Random Forest", "#1baf7a"), "lstm": ("LSTM", "#eda100")}
BETTER, WORSE = "#cde2fb", "#f6d3d3"          # พื้นตาราง: ดีกว่า / แย่กว่า Naive
DIVERGING = LinearSegmentedColormap.from_list("div", ["#1c5cab", "#86b6ef", "#f0efec", "#ef9a9a", "#c62f2f"])
plt.rcParams.update({
    "font.family": "Loma", "font.size": 11, "axes.unicode_minus": False, "axes.edgecolor": "#c3c2b7",
    "axes.labelcolor": INK, "xtick.color": MUTED, "ytick.color": MUTED, "axes.grid": True, "grid.color": GRID,
    "grid.linewidth": 0.6, "axes.spines.top": False, "axes.spines.right": False, "axes.axisbelow": True,
    "figure.facecolor": SURFACE, "axes.facecolor": SURFACE, "axes.titlesize": 12, "axes.titleweight": "bold",
    "axes.titlecolor": INK, "figure.dpi": 110,
})
pd.set_option("display.precision", 2)
pd.set_option("display.max_colwidth", 90)
sys.path.insert(0, f"{ROOT}/ml")

TH_MON = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
th = lambda t: f"{TH_MON[t.month]} {t.year + 543}"
CAT = {"STR-01": "เหล็กเส้น", "STR-02": "เหล็กรูปพรรณ", "STR-03": "ตะแกรงเหล็ก", "STR-04": "ลวดผูกเหล็ก",
       "STR-05": "ลวดอัดแรง", "STR-06": "คอนกรีตผสมเสร็จ", "STR-07": "คอนกรีตหยาบ", "STR-08": "เสาเข็ม/สำเร็จรูป",
       "STR-09": "ทราย หิน"}

# ผลการทดลองทุกโมเดล: 1 แถว = วัสดุ × จุดเริ่ม × ระยะทาย, คอลัมน์ d_* = % การเปลี่ยนที่โมเดลทาย (log)
CV = pd.read_csv(f"{ROOT}/ml/out/final_preds_cv.csv", parse_dates=["origin"])
TE = pd.read_csv(f"{ROOT}/ml/out/final_preds_test.csv", parse_dates=["origin"])
# Validation ใช้เฉพาะคู่ที่ (1) เดือนเป้าหมายอยู่ก่อนช่วง Test และ (2) มีราคาจริงทั้งเดือนเริ่มและเดือนเป้าหมาย (ไม่ใช่ราคาที่เติม)
FIRST_TEST = TE.origin.min()
_real = pd.read_csv(f"{ROOT}/ml/data/prices_clean.csv", usecols=["material_id", "date"], parse_dates=["date"])
_real = set(zip(_real.material_id, _real.date))
CV["target"] = [o + pd.DateOffset(months=int(k)) for o, k in zip(CV.origin, CV.h)]
CV_OVERLAP = CV.target >= FIRST_TEST
CV_FILLED = ~pd.Series([(m, o) in _real and (m, t) in _real for m, o, t in zip(CV.material_id, CV.origin, CV.target)], index=CV.index)
CV_RAW_N = len(CV)
CV = CV[~CV_OVERLAP & ~CV_FILLED].copy()
NAMES = {
    "naive": "Naive (baseline)", "snaive": "Seasonal naive", "drift": "Drift", "ets": "ETS",
    "lgbm0_direct": "LightGBM ทายตรง", "lgbm0_direct_half": "LightGBM ทายตรง ขยับครึ่งเดียว",
    "lgbm0_ts_ev": "LightGBM 2 ขั้น แบบค่าคาดหวัง", "lgbm0_ts_t70": "LightGBM 2 ขั้น เกณฑ์ 70%",
    "lgbm0_ts_t85": "LightGBM 2 ขั้น เกณฑ์ 85%", "lgbm0_ts_t85_half": "LightGBM 2 ขั้น เกณฑ์ 85% ขยับครึ่งเดียว",
    "huber": "Linear Regression (Huber)", "huber_half": "Linear Regression ขยับครึ่งเดียว",
    "lgbm": "LightGBM จูนแล้ว", "rf": "Random Forest", "rf_half": "Random Forest ขยับครึ่งเดียว",
    "rf_tuned": "Random Forest จูนแล้ว", "lstm": "LSTM", "lstm_half": "LSTM ขยับครึ่งเดียว", "lstm_tuned": "LSTM จูนแล้ว",
}
NAMES = {k: v for k, v in NAMES.items() if f"d_{k}" in TE.columns}
TOL = 0.01  # ต่างกันไม่ถึง 0.01 จุด % ถือว่าเสมอ


def errors(R, m):
    """ความผิดพลาด (%) ของแต่ละการทาย"""
    return np.abs(R.price * np.exp(R[f"d_{m}"]) - R.actual) / R.actual * 100


def mae_table(models):
    rows = {}
    for m in ["naive"] + [x for x in models if x != "naive"]:
        rows[NAMES[m]] = {(split, f"{h} เดือน"): errors(R[R.h == h], m).mean()
                          for split, R in (("Validation", CV), ("Test", TE)) for h in (1, 2, 3)}
    return pd.DataFrame(rows).T


def verdict(t):
    """ผ่านเกณฑ์ = ดีกว่า Naive ทั้ง Validation และ Test ในระยะเดียวกัน"""
    base = t.loc[NAMES["naive"]]
    out = []
    for name, row in t.iterrows():
        if name == NAMES["naive"]:
            out.append("เกณฑ์")
            continue
        win = [h for h in (1, 2, 3) if row[("Validation", f"{h} เดือน")] <= base[("Validation", f"{h} เดือน")] - TOL
               and row[("Test", f"{h} เดือน")] <= base[("Test", f"{h} เดือน")] - TOL]
        out.append("✅ ผ่าน (" + ", ".join(f"{h} เดือน" for h in win) + ")" if win else "❌ ไม่ผ่าน")
    return out


def show(models, caption=None):
    """ตาราง MAE (%) ช่วง Validation และ Test พื้นฟ้า = ดีกว่า Naive, พื้นแดง = แย่กว่า Naive"""
    t = mae_table(models)
    base = t.loc[NAMES["naive"]]

    def color(col):
        b = base[col.name]
        return [f"background-color:{BETTER}" if v <= b - TOL else f"background-color:{WORSE}" if v >= b + TOL else ""
                for v in col]

    t2 = t.copy()
    t2[("ผล", "ชนะทั้ง 2 ช่วง?")] = verdict(t)
    num = t2.columns[:-1]
    sty = (t2.style.format("{:.2f}", subset=num).apply(color, subset=num)
           .set_properties(subset=pd.IndexSlice[[NAMES["naive"]], :], **{"font-weight": "bold"}))
    if caption:
        sty = sty.set_caption(caption)
    display(sty)


print(f"พร้อมแล้ว: ผลการทดลอง {len(NAMES)} แบบ, Validation {len(CV):,} การทาย, Test {len(TE):,} การทาย")
print(f"(ตัดจาก Validation: เป้าหมายทับช่วง Test {CV_OVERLAP.sum():,} คู่, ใช้ราคาที่เติม {CV_FILLED.sum():,} คู่ จากทั้งหมด {CV_RAW_N:,} คู่)")
''')

# ================================================================== 1. โจทย์
md("""
# ส่วนที่ 1: เตรียมข้อมูล

## 1. โจทย์และกติกาตัดสิน

- **ทายอะไร:** ราคาวัสดุหมวดงานโครงสร้าง เช่น เหล็กเส้น เหล็กรูปพรรณ คอนกรีต เสาเข็ม ใช้ราคาส่วนกลาง (กรุงเทพฯ) ของสำนักงานนโยบายและยุทธศาสตร์การค้า (สนค.)
- **ล่วงหน้าเท่าไร:** 1, 2 และ 3 เดือน แยกทีละวัสดุ
- **ใช้ทำอะไร:** เว็บ THAI TAY บอกผู้รับเหมาและเจ้าของบ้านว่าราคาน่าจะขยับไหม ควรซื้อตอนนี้หรือรอ
- **ประเภทงาน ML:** Regression (ทายตัวเลขราคา) และ Classification (ทายว่าราคาจะเปลี่ยนหรือไม่)

**กติกาที่ตั้งไว้ก่อนเริ่มทดลอง**

1. ทุกโมเดลต้องเทียบกับ **Naive** (ราคาเดือนหน้า = ราคาเดือนนี้) บนข้อมูลชุดเดียวกัน
2. โมเดลจะได้ขึ้นเว็บก็ต่อเมื่อ **ชนะ Naive ทั้งช่วง Validation และช่วง Test** ในระยะทายเดียวกัน
3. ชนะแค่ช่วงเดียวถือว่าบังเอิญ เพราะช่วงเดียวอาจมีเหตุการณ์ที่โมเดลโชคดี

เราตั้งกติกานี้ก่อนเห็นผล จะได้ไม่เลือกตัวเลขที่ดูดีภายหลัง
""")

# ================================================================== 2. ข้อมูล
md("""
## 2. ข้อมูล

| ข้อมูล | ที่มา | ช่วง |
|---|---|---|
| ราคาวัสดุรายเดือน | เว็บ สนค. index.tpso.go.th ดึงผ่าน API ด้วย `fetch_tpso.py` | ม.ค. 2559 – ก.ย. 2569 |
| ปัจจัยภายนอก 8 ตัว | ไฟล์ของทีมใน Google Drive รวมเป็นรายเดือนด้วย `build_factors.py` | ปี 2557 – ก.ย. 2569 |

ปัจจัยภายนอก 8 ตัว เลือกจากต้นทุนของเหล็กและคอนกรีต:

| กลุ่ม | ปัจจัย |
|---|---|
| วัตถุดิบเหล็ก | แร่เหล็ก 62%, ราคาเหล็กฟิวเจอร์ส, ดัชนีราคาเศษเหล็ก |
| พลังงานและขนส่ง | น้ำมันดิบเบรนท์, ถ่านหินนิวคาสเซิล, ดีเซลในไทย |
| ค่าเงิน | บาทต่อดอลลาร์, บาทต่อหยวน |
""")

code(r'''
# @title 2.1 ข้อมูลที่ได้ { display-mode: "form" }
from tune import load

P, latest, active = load()   # ตารางหลัก: 1 แถว = วัสดุ 1 ตัว × 1 เดือน พร้อมฟีเจอร์ทั้งหมด
display(pd.DataFrame({"ค่า": [f"{th(P.date.min())} – {th(latest)}", f"{P.material_id.nunique():,}", f"{len(active):,}", f"{len(P):,}"]},
                     index=["ช่วงข้อมูล", "วัสดุทั้งหมด (หลังต่อรหัส)", "วัสดุที่ยังเก็บราคา (ใช้ทาย)", "จำนวนแถว (วัสดุ × เดือน)"]))
Pc = P.assign(หมวด=P.categoryCode.astype(str).map(CAT))
by_cat = pd.DataFrame({"วัสดุทั้งหมด": Pc.groupby("หมวด").material_id.nunique(),
                       "ยังเก็บราคา (ใช้ทาย)": Pc[Pc.material_id.isin(active)].groupby("หมวด").material_id.nunique()})
display(by_cat.fillna(0).astype(int).sort_values("วัสดุทั้งหมด", ascending=False))
''')

code(r'''
# @title 2.2 ราคาเปลี่ยนไปอย่างไรในช่วง 10 ปี { display-mode: "form" }
fig, axes = plt.subplots(1, 3, figsize=(15, 3.9), layout="constrained")
for ax, code_ in zip(axes, ["STR-01", "STR-06", "STR-08"]):
    g = P[P.categoryCode.astype(str) == code_].groupby("date")["ret1"].mean().fillna(0)
    idx = 100 * np.exp(g.cumsum())
    ax.axvspan(pd.Timestamp("2019-01-01"), pd.Timestamp("2025-10-01"), color=SPLIT["Validation"], alpha=0.08, lw=0)
    ax.axvspan(pd.Timestamp("2025-09-01"), latest, color=SPLIT["Test"], alpha=0.18, lw=0)
    ax.plot(idx.index, idx.values, color=SERIES, lw=2)
    ax.set_title(f"{CAT[code_]} (ดัชนี เริ่มต้น = 100)", loc="left")
    ax.xaxis.set_major_locator(mdates.YearLocator(2))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y"))
fig.suptitle("พื้นม่วง = ช่วง Validation   พื้นชมพู = ช่วง Test", x=0.01, ha="left", fontsize=11, color=MUTED)
plt.show()
''')

md("""
เหล็กเส้นขึ้นแรง 2 ช่วง คือปี 2564–2565 และ มี.ค.–มิ.ย. 2569 ส่วนคอนกรีตผสมเสร็จกับเสาเข็มขยับเป็นขั้นบันได นาน ๆ ครั้ง เช่น คอนกรีตผสมเสร็จขึ้นทีเดียว 20–25% ใน พ.ค. 2569 ช่วง Test (พื้นชมพู) จึงมีทั้งเหล็กพุ่งแล้วลงและคอนกรีตกระโดด ทายยากกว่าปีปกติ

กราฟเส้นไม่จำเป็นต้องเริ่มแกนตั้งที่ 0 เพราะเราดูการขึ้นลงของเส้น ดัชนี 120 แปลว่าแพงขึ้น 20% จากตอนเริ่ม
""")

# ================================================================== 3. ทำความสะอาด
md("""
## 3. ตรวจและทำความสะอาดข้อมูล

เราเทียบข้อมูลกับเว็บ สนค. ทุกจุด (24,163 จุด) ตรงกันทั้งหมด ไม่มีแถวซ้ำ หน่วยตรงกับเว็บ แต่เจอเรื่องที่ต้องจัดการ:

| เรื่องที่เจอ | เราทำอะไร |
|---|---|
| สนค. เปลี่ยนรหัสเหล็กเส้น 2 ครั้ง (ปี 2561 และ 2569) รหัสใหม่จึงมีประวัติแค่ไม่กี่เดือน | จับคู่รหัสเก่ากับรหัสใหม่ 39 คู่ (สเปก ขนาด หน่วยเดียวกัน ราคาต่อกันห่างไม่เกิน 15%) แล้วต่อประวัติเข้าด้วยกัน |
| วัสดุบนเว็บ 100 รายการไม่มีราคาล่าสุด: 39 เป็นรหัสเก่าที่ต่อกับรหัสใหม่แล้ว ที่เหลือเลิกเก็บราคาจริง บางตัวหยุดตั้งแต่ปี 2559 | เก็บประวัติไว้ฝึกโมเดล แต่ไม่ทายและซ่อนจากเว็บ เหลือวัสดุที่ทาย 188 รายการ |
| เดือนที่ขาดหาย | ช่องว่างไม่เกิน 2 เดือน เติมด้วยการลากเส้นตรง ช่องว่างยาวกว่านั้นใช้เฉพาะช่วงหลังช่องว่าง |
| ราคาหลายหมวดไม่เปลี่ยนเกือบทุกเดือน | ข้อมูลถูกต้อง ราคา สนค. ขยับเป็นขั้นบันได เรื่องนี้ทำให้ทายยากที่สุด (ดูกราฟ 3.2) |

เราไม่เติมหรือแก้ค่า target และไม่ตัดราคาที่กระโดด เพราะตรวจแล้วเป็นราคาจริง
""")

code(r'''
# @title 3.1 ตัวอย่างรหัสเหล็กเส้นที่ต่อกัน { display-mode: "form" }
links = pd.read_csv(f"{ROOT}/ml/out/series_links.csv", parse_dates=["old_last", "new_first"])
links = links[links.accepted]
print(f"ต่อรหัสทั้งหมด {len(links)} คู่")
show_ = links.groupby(links.new_first.dt.year).head(2)
display(pd.DataFrame({
    "ชื่อเดิม": show_.old_name, "ชื่อใหม่": show_.new_name,
    "รหัสเดิมหยุด": show_.old_last.map(th), "รหัสใหม่เริ่ม": show_.new_first.map(th),
    "ราคาขยับตอนต่อ (%)": show_.change * 100,
}).reset_index(drop=True))
''')

code(r'''
# @title 3.2 ราคาไม่เปลี่ยนจากเดือนก่อนกี่ % ของเดือน { display-mode: "form" }
x = P[P.ret1.notna()].assign(same=lambda d: d.ret1.abs() < 1e-9, หมวด=lambda d: d.categoryCode.astype(str).map(CAT))
share = x.groupby("หมวด")["same"].mean().mul(100).sort_values()
print(f"ทุกวัสดุรวมกัน: ราคาเท่าเดือนก่อน {x.same.mean():.0%} ของเดือน")
fig, ax = plt.subplots(figsize=(9, 3.8), layout="constrained")
ax.barh(share.index, share.values, color=SERIES, height=0.6)
for y, v in enumerate(share.values):
    ax.text(v + 1, y, f"{v:.0f}%", va="center", fontsize=10, color=INK)
ax.set_xlim(0, 105)
ax.set_xlabel("% ของเดือนที่ราคาเท่าเดือนก่อน")
ax.grid(axis="y", visible=False)
ax.set_title("ราคาหลายหมวดไม่เปลี่ยนเกือบทุกเดือน", loc="left")
plt.show()
''')

md("""
- **คอนกรีต เสาเข็ม ตะแกรงเหล็ก:** ราคาเท่าเดิมราว 9 ใน 10 เดือน ทายว่า "ไม่เปลี่ยน" ก็ถูกเกือบตลอด
- **เหล็กเส้น ลวดผูกเหล็ก:** ราคาเปลี่ยนเกือบทุกเดือน แต่ขึ้นหรือลงเดายาก หมวดนี้ทำให้ทายผิดมากสุด

โมเดลที่จะชนะ Naive ต้องรู้ว่า **เดือนไหน** ราคาจะขยับ และขยับ **ขึ้นหรือลง** ข้อนี้คือโจทย์จริงของการทดลองทั้งหมดด้านล่าง
""")

# ================================================================== 4. ฟีเจอร์
md("""
## 4. สร้างฟีเจอร์ (Feature Engineering)

**สิ่งที่ให้โมเดลทาย (target):** % ที่ราคาจะเปลี่ยนจากเดือนนี้ เช่น ราคาวันนี้ 100 บาท อีก 1 เดือนเป็น 103 บาท target = +3% (ในโค้ดใช้ log(103/100) ≈ 0.03) แล้วแปลงกลับเป็นบาทตอนวัดผล

ทำไมไม่ทายราคาตรง ๆ: ราคาวัสดุต่างกันหลายพันเท่า (ตารางด้านล่าง) ถ้าแปลงเป็น % ทุกวัสดุจะอยู่ในหน่วยเดียวกัน โมเดลตัวเดียวจึงเรียนจากทุกวัสดุพร้อมกันได้

**ฟีเจอร์ 52 ตัว** ทุกตัวใช้เฉพาะข้อมูลที่รู้แล้ว ณ เดือนที่ทาย ปัจจัยภายนอกใช้ค่าเดือนเดียวกับราคาล่าสุดได้ เพราะ สนค. ประกาศราคาเดือน ก.ย. ราววันที่ 9 ต.ค. ตอนนั้นรู้ราคาตลาดเดือน ก.ย. ครบแล้ว ยกเว้นดัชนีเศษเหล็กที่ออกช้า เราใช้ค่าเดือนก่อนหน้า
""")

code(r'''
# @title 4.1 ช่วงราคาวัสดุ และกลุ่มฟีเจอร์ { display-mode: "form" }
from global_model import feature_cols

catalog = {m["id"]: m for m in json.load(open(f"{ROOT}/frontend/src/data/structural-materials.json", encoding="utf-8"))["materials"]}
now = P[(P.date == latest) & P.material_id.isin(active)].sort_values("price").iloc[[0, -1]]
display(pd.DataFrame({"วัสดุ": [catalog[i]["name"] for i in now.material_id],
                      f"ราคา {th(latest)} (บาท)": now.price.values,
                      "ต่อ": [catalog[i]["unit"] for i in now.material_id]}, index=["ถูกสุด", "แพงสุด"]))

cols = feature_cols(P)
groups = [
    ("ราคาตัวเองย้อนหลัง", "ราคาขยับกี่ % ใน 1, 2, 3, 6, 12 เดือน และแกว่งแค่ไหน",
     lambda c: c.startswith(("ret", "vol"))),
    ("จังหวะการเปลี่ยนราคา", "ผ่านมากี่เดือนแล้วตั้งแต่ราคาเปลี่ยนครั้งล่าสุด เปลี่ยนครั้งล่าสุดเท่าไร ปีที่แล้วเปลี่ยนกี่ครั้ง",
     lambda c: c in ("since_change", "last_change", "changes12")),
    ("ราคาเทียบช่วง 12 เดือน", "ราคาตอนนี้สูงหรือต่ำกว่าค่าเฉลี่ย สูงสุด ต่ำสุด ของปีที่ผ่านมา",
     lambda c: c.startswith(("dev_", "fam_dev"))),
    ("วัสดุกลุ่มเดียวกัน", "เดือนนี้วัสดุกลุ่มเดียวกันขยับเท่าไร กี่ % ขึ้น กี่ % ลง (สนค. มักปรับทั้งกลุ่มพร้อมกัน)",
     lambda c: c.startswith(("fam_", "cat_")) and not c.startswith("fam_dev")),
    ("ข้อมูลประจำตัว", "หมวด กลุ่มย่อย และเดือนของปี",
     lambda c: c in ("categoryCode", "familyCode", "month")),
    ("ปัจจัยภายนอก", "ปัจจัย 8 ตัว + แร่เหล็กคิดเป็นเงินบาท: ขยับกี่ % ใน 1 และ 3 เดือน และห่างจากค่าเฉลี่ย 12 เดือนเท่าไร",
     lambda c: c.endswith(("_r1", "_r3", "_dev12")) and not c.startswith(("fam_", "cat_", "dev_"))),
]
rows, used = [], set()
for name, meaning, rule in groups:
    fs = [c for c in cols if rule(c) and c not in used]
    used |= set(fs)
    rows.append({"กลุ่ม": name, "จำนวน": len(fs), "ความหมาย": meaning, "ตัวอย่าง": ", ".join(fs[:4]) + (" ..." if len(fs) > 4 else "")})
display(pd.DataFrame(rows).set_index("กลุ่ม"))
print(f"รวม {sum(r['จำนวน'] for r in rows)} ฟีเจอร์")
''')

# ================================================================== 5. แบ่งข้อมูล
md("""
## 5. แบ่งข้อมูล: Train / Validation / Test

ข้อมูลราคาเป็นลำดับเวลา ถ้าสุ่มแบ่งแถว โมเดลจะได้เห็นราคาในอนาคตตอนฝึก ผลจะดูดีเกินจริง เราจึงแบ่งตามเวลาแบบ **walk-forward**:

1. ยืนที่เดือนหนึ่ง เรียกว่า "จุดเริ่ม"
2. ฝึกโมเดลด้วยข้อมูลที่รู้คำตอบแล้ว ณ เดือนนั้นเท่านั้น (Train)
3. ทายราคาอีก 1, 2, 3 เดือน แล้วเทียบกับราคาจริง
4. เลื่อนจุดเริ่มไปข้างหน้า ฝึกใหม่ แล้วทำซ้ำ

| ชุด | จุดเริ่ม | จำนวนการทาย | ใช้ทำอะไร |
|---|---|---:|---|
| Validation | 27 จุด ทุก 3 เดือน ม.ค. 2562 – ก.ค. 2568 (เดือนที่ทายไม่เกิน ส.ค. 2568) | 13,307 | เลือกโมเดลและจูนค่า ครอบช่วงเหล็กพุ่งปี 2564–2565 |
| Test | 12 จุด ทุกเดือน ก.ย. 2568 – ส.ค. 2569 | 6,093 | วัดผลสุดท้าย ไม่แตะตอนเลือกหรือจูนโมเดล |

ทุกโมเดลในการทดลองทั้ง 8 รอบใช้จุดเริ่มชุดเดียวกันนี้ ตัวเลขทุกตารางจึงเทียบกันได้ตรง ๆ

**แก้หลังตรวจทาน:** ฉบับก่อนนับ Validation 13,680 คู่ การตรวจทานรอบหลังพบ 2 เรื่อง เราจึงตัดออก
- **372 คู่ทายเลยเข้าไปในช่วง Test:** จุดเริ่ม ก.ค. 2568 ทาย 3 เดือนไปถึง ต.ค. 2568 ซึ่งเป็นเดือนในช่วง Test แล้ว ตอนนี้ Validation นับเฉพาะเดือนที่ทายไม่เกิน ส.ค. 2568
- **1 คู่ใช้ราคาที่เราเติมเอง:** ราคาในเดือนที่ขาด เราเติมด้วยการลากเส้นตรง ตอนวัดผลต้องใช้เฉพาะราคาจริง

ตัวเลข Validation ทุกตัวสูงขึ้นเล็กน้อย รวมถึง Naive (ทาย 2 เดือน 1.35% → 1.40%) แต่ข้อสรุปไม่เปลี่ยน
""")

code(r'''
# @title 5.1 ภาพการแบ่งข้อมูล { display-mode: "form" }
cv_origins = list(pd.date_range("2019-01-01", latest - pd.DateOffset(months=14), freq="3MS"))
test_origins = [latest - pd.DateOffset(months=k) for k in range(12, 0, -1)]
examples = [("Validation", cv_origins[0]), ("Validation", cv_origins[10]), ("Validation", cv_origins[-1]),
            ("Test", test_origins[0]), ("Test", test_origins[-1])]
num = mdates.date2num
start = P.date.min()
fig, ax = plt.subplots(figsize=(13, 3.9), layout="constrained")
for i, (split, o) in enumerate(examples):
    y = len(examples) - i
    ax.barh(y, num(o) - num(start), left=num(start), height=0.5, color=SPLIT["Train"])
    end = min(o + pd.DateOffset(months=3), FIRST_TEST) if split == "Validation" else o + pd.DateOffset(months=3)
    ax.barh(y, num(end) - num(o), left=num(o), height=0.5, color=SPLIT[split])
    ax.text(num(start) - 40, y, f"{split}: ยืนที่ {th(o)}", ha="right", va="center", fontsize=10, color=INK)
for split, origins in (("Validation", cv_origins), ("Test", test_origins)):
    ax.scatter([num(o) for o in origins], [0] * len(origins), marker="|", s=160, color=SPLIT[split], linewidths=2)
ax.text(num(start) - 40, 0, f"จุดเริ่มทั้งหมด ({len(cv_origins)} + {len(test_origins)})", ha="right", va="center", fontsize=10, color=INK)
ax.xaxis_date()
ax.set_yticks([])
ax.grid(axis="y", visible=False)
ax.set_xlim(num(start) - 30, num(latest) + 150)
ax.set_title("แถบเทา = ข้อมูลที่ใช้ฝึก   แถบสี = 3 เดือนที่ทาย (ม่วง = Validation, ชมพู = Test)", loc="left")
plt.show()
''')

# ================================================================== 6. วัดผล
md("""
## 6. วัดผลยังไง

| ตัววัด | ความหมาย | ค่าที่ดี |
|---|---|---|
| **MAE (%)** | ทายผิดเฉลี่ยกี่ % ของราคา เช่น ราคา 100 บาท MAE 2% = ผิดเฉลี่ย 2 บาท | ต่ำ |
| **RMSE (%)** | คล้าย MAE แต่นับการผิดก้อนใหญ่หนักกว่า | ต่ำ |
| **R² ของ % การเปลี่ยน** | โมเดลอธิบายการขึ้นลงของราคาได้กี่ส่วน 0 = ไม่ดีกว่าทายว่าไม่เปลี่ยน | ใกล้ 1 |

เราใช้ **MAE เป็นตัวตัดสินหลัก** เพราะอ่านเป็นบาทได้ตรง ๆ ส่วน RMSE และ R² ใช้ดูประกอบ

**กับดัก R²:** ถ้าวัด R² จากตัวราคา Naive ได้เกือบ 1 ทั้งที่ไม่ได้ทายอะไรเลย เหตุผลคือเสาเข็มราคาหลักพัน ลวดราคาหลักสิบ แค่รู้ว่าวัสดุไหนแพงกว่าก็ได้ R² สูงแล้ว เราจึงวัด R² จาก % การเปลี่ยนแทน
""")

code(r'''
# @title 6.1 R² ของ Naive: วัดจากราคา เทียบวัดจาก % การเปลี่ยน (ช่วง Test, ทาย 1 เดือน) { display-mode: "form" }
g = TE[TE.h == 1]
r2 = lambda a, p: 1 - ((a - p) ** 2).sum() / ((a - a.mean()) ** 2).sum()
display(pd.DataFrame({"R²": [r2(g.actual, g.price), r2(g.y, 0 * g.y)]},
                     index=["วัดจากราคา (หลอกตา)", "วัดจาก % การเปลี่ยน (ใช้จริง)"]))
''')

# ================================================================== 7. ลองฝึกจริง
md("""
# ส่วนที่ 2: การทดลอง

## 7. ลองฝึกทุกโมเดลจริงที่จุดเริ่มเดียว

ก่อนดูผลรวม ช่องนี้ฝึกทุกอัลกอริทึมจริงที่จุดเริ่มเดียว (ก.ย. 2568, ทาย 1 เดือน) ให้เห็นโค้ดและค่าตั้งที่ใช้ เราฝึก **โมเดลรวมตัวเดียวจากทุกวัสดุ** (global model) แทนการฝึกแยกทีละวัสดุ เพราะวัสดุแต่ละตัวเปลี่ยนราคาแค่ไม่กี่ครั้ง โมเดลรวมได้เรียนจากการเปลี่ยนราคาหลายพันครั้ง

| อัลกอริทึม | ประเภท | ทำงานยังไง |
|---|---|---|
| Naive | Baseline | ราคาเดือนหน้า = ราคาเดือนนี้ |
| ETS | สถิติอนุกรมเวลา | ถ่วงน้ำหนักราคาล่าสุดมากกว่าราคาเก่า แล้วต่อแนวโน้มแบบค่อย ๆ แผ่ว |
| Linear Regression (Huber) | Regression เส้นตรง | หาเส้นตรงที่ใกล้ข้อมูลที่สุด ทนค่าโดด |
| Random Forest | Bagging | ต้นไม้ตัดสินใจ 200 ต้น แต่ละต้นฝึกจากข้อมูลที่สุ่มมาคนละชุด แล้วเฉลี่ยคำตอบ |
| LightGBM | Gradient Boosting | สร้างต้นไม้ทีละต้น ต้นใหม่แก้จุดที่ต้นก่อนหน้าทายผิด |
| LSTM | Deep Learning (RNN) | อ่านข้อมูลย้อนหลัง 12 เดือนเป็นลำดับ แล้วทาย 1, 2, 3 เดือนพร้อมกัน |

ใช้เวลาราว 1 นาที
""")

code(r'''
# 7.1 ฝึกทุกโมเดลที่จุดเริ่มเดียว
from compare_models import FIXED, LGBM_PICK, build_sequences, lstm_feature_cols, lstm_predict, rf_predict
from final_experiments import LGBM_DEFAULT, huber_predict
from tune import fit_all as lightgbm_models

P2, seqs = build_sequences(P, lstm_feature_cols(P))   # LSTM: ลำดับ 12 เดือน × 32 ฟีเจอร์ ต่อแถว
for c in ("categoryCode", "familyCode"):
    P2[c] = P2[c].astype("category")

o, h = pd.Timestamp("2025-09-01"), 1
train = P2[(P2.date + pd.DateOffset(months=h) <= o) & P2[f"y{h}"].notna()]        # รู้คำตอบแล้ว ณ ก.ย. 2568
test = P2[(P2.date == o) & P2[f"y{h}"].notna() & P2.material_id.isin(active)]       # สิ่งที่ต้องทาย
print(f"ฝึกด้วย {len(train):,} แถว   ทาย {len(test):,} วัสดุ")

pred = {"naive": np.zeros(len(test))}

# Linear Regression (Huber): เติมค่าว่างด้วยมัธยฐาน -> ปรับสเกล -> HuberRegressor
pred["huber"] = huber_predict(train, test, h, cols)

# LightGBM ค่าเริ่มต้น ทายตรง: 300 ต้น, 15 ใบ, learning rate 0.03, L1 loss
pred["lgbm0_direct"] = lightgbm_models(train, test, h, cols, LGBM_DEFAULT)["direct"]

# LightGBM จูนแล้ว: ค่าตั้งที่ชนะรอบจูนสำหรับทาย 1 เดือน + แบบ 2 ขั้น ขยับครึ่งเดียว
params, how = LGBM_PICK[h]
pred["lgbm"] = lightgbm_models(train, test, h, cols, {**params, **FIXED})[how]

# Random Forest: 200 ต้น ใบละอย่างน้อย 50 แถว สุ่มฟีเจอร์ครึ่งหนึ่งต่อการแตกกิ่ง
pred["rf"] = rf_predict(train, test, h, cols)

# LSTM: LSTM 32 หน่วย -> Dropout 0.2 -> ทาย 3 ระยะ, Adam lr 0.001, หยุดเมื่อไม่ดีขึ้น 4 รอบ
known = P2.assign(**{f"y{k}": P2[f"y{k}"].where(P2.date + pd.DateOffset(months=k) <= o) for k in (1, 2, 3)})
at_o = ((P2.date == o) & P2.material_id.isin(active)).values
out = lstm_predict(seqs, known, ((P2.date + pd.DateOffset(months=1) <= o) & P2.y1.notna()).values, at_o)
pos = {j: i for i, j in enumerate(np.where(at_o)[0])}
pred["lstm"] = np.array([out[pos[j], h - 1] for j in test.index])

actual = test.price * np.exp(test[f"y{h}"])
saved = TE[(TE.origin == o) & (TE.h == h)]
display(pd.DataFrame({
    "MAE (%) ที่เพิ่งฝึก": {NAMES[m]: (np.abs(test.price * np.exp(d) - actual) / actual * 100).mean() for m, d in pred.items()},
    "MAE (%) ในผลที่บันทึกไว้": {NAMES[m]: errors(saved, m).mean() for m in pred},
}))
''')

md("""
จุดเริ่มเดียวยังสรุปอะไรไม่ได้ ข้อ 8 รวมผลทุกจุดเริ่ม (Random Forest และ LSTM สุ่มค่าเริ่มต้น ตัวเลขบนเครื่องอื่นอาจต่างจากผลที่บันทึกไว้เล็กน้อย)
""")

# ================================================================== 8. การทดลอง 8 รอบ
md("""
## 8. การทดลอง 8 รอบ

เราทดลองตามลำดับนี้ แต่ละรอบเกิดจากสิ่งที่เห็นในรอบก่อน ทุกรอบแสดงผลแบบเดียวกัน:

- ตัวเลขคือ **MAE (%)** ยิ่งต่ำยิ่งดี
- **พื้นฟ้า** = ดีกว่า Naive, **พื้นแดง** = แย่กว่า Naive, ไม่มีสี = เสมอ (ต่างกันไม่ถึง 0.01 จุด %)
- คอลัมน์สุดท้ายบอกว่าผ่านกติกาไหม คือชนะ Naive ทั้ง Validation และ Test ในระยะทายเดียวกัน

| รอบ | ลองอะไร | ผ่านกติกา? |
|---|---|---|
| 1 | Baseline แบบสถิติ: Seasonal naive, Drift, ETS | ❌ |
| 2 | LightGBM ทายตรง | ❌ |
| 3 | LightGBM 2 ขั้น และเทคนิคขยับครึ่งเดียว | ❌ |
| 4 | ปรับข้อมูลภายนอก: เดือนเดียวกัน และเลือกโมเดลแยกหมวด | ❌ |
| 5 | Linear Regression (Huber) | ❌ |
| 6 | จูน LightGBM (Random Search 21 ชุด) | ❌ |
| 7 | Random Forest และ LSTM พร้อมจูน | ❌ |
| 8 | หาข้อมูลเพิ่ม 5 แหล่ง | ไม่มีข้อมูลที่บอกล่วงหน้าได้ |
""")

# ---------------------------------------------------------------- รอบ 1
round_card(
    "8.1 รอบที่ 1: Baseline แบบสถิติ",
    "ต้องมีเกณฑ์ขั้นต่ำก่อน และลองวิธีอนุกรมเวลาคลาสสิกที่ไม่ต้องใช้ ML",
    "Naive: ราคาเท่าเดือนล่าสุด · Seasonal naive: ใช้รูปแบบของเดือนเดียวกันปีก่อน ปรับระดับให้เท่าปีนี้ · "
    "Drift: ต่อแนวโน้มเฉลี่ย 12 เดือนล่าสุด · ETS: exponential smoothing แบบแนวโน้มค่อย ๆ แผ่ว (damped trend) ฝึกแยกทีละวัสดุ",
    "{{R1_DECIDE}}",
)
code(r'''
# @title ผลรอบที่ 1 { display-mode: "form" }
show(["snaive", "drift", "ets"])
''')

# ---------------------------------------------------------------- รอบ 2
round_card(
    "8.2 รอบที่ 2: LightGBM ทายตรง",
    "ML ใช้ฟีเจอร์ได้หลายตัวพร้อมกัน ทั้งประวัติราคา วัสดุกลุ่มเดียวกัน และปัจจัยภายนอก และเรียนจากทุกวัสดุพร้อมกันได้",
    "LightGBM regressor ทาย % การเปลี่ยนตรง ๆ ใช้ L1 loss (ตรงกับ MAE) · ค่าตั้งเริ่มต้น: 300 ต้น, 15 ใบ, learning rate 0.03, "
    "ใบละอย่างน้อย 40 แถว · เวอร์ชันแรกใช้ฟีเจอร์ 33 ตัว ปัจจัยภายนอก 6 ตัวแบบหน่วง 1 เดือน ภายหลังเพิ่มเป็น 52 ตัว",
    "แพ้ทั้งสองช่วง · สาเหตุคือโมเดลทาย \"ขยับนิดหน่อย\" แทบทุกครั้ง ทั้งที่ราคาส่วนใหญ่ไม่เปลี่ยน (ตารางที่สอง) · "
    "รอบต่อไปจึงลองให้โมเดลขยับเฉพาะตอนมั่นใจ",
)
code(r'''
# @title ผลรอบที่ 2 และสาเหตุที่แพ้ { display-mode: "form" }
show(["lgbm0_direct"])
exact = lambda R, m: (errors(R, m) < 0.01).mean() * 100
display(pd.DataFrame({"ทายถูกพอดี (Test ทาย 1 เดือน)": {NAMES[m]: exact(TE[TE.h == 1], m) for m in ("naive", "lgbm0_direct")}})
        .style.format("{:.0f}% ของการทาย"))
''')
md("""
**เวอร์ชันแรก** (ฟีเจอร์ 33 ตัว ปัจจัย 6 ตัวหน่วง 1 เดือน): Test 1.88 / 3.91 / 5.85% เทียบ Naive 1.75 / 3.47 / 5.06% ตอนนั้นใช้ Validation แค่ 12 เดือน (ก.ย. 2567 – ส.ค. 2568) ซึ่งราคานิ่งมาก Naive ผิดแค่ 0.49% ทำให้เลือกโมเดลผิด เราจึงขยาย Validation เป็น 27 จุด 7 ปีตามที่ใช้ในทุกตาราง
""")

# ---------------------------------------------------------------- รอบ 3
round_card(
    "8.3 รอบที่ 3: LightGBM 2 ขั้น และขยับครึ่งเดียว",
    "รอบ 2 แพ้เพราะทายขยับทุกครั้ง ถ้าแยกถามก่อนว่า \"ราคาจะเปลี่ยนไหม\" แล้วขยับเฉพาะตอนมั่นใจ น่าจะลดการผิดเล็ก ๆ ได้",
    "ขั้นที่ 1: LightGBM classifier ทายโอกาสที่ราคาจะเปลี่ยน · ขั้นที่ 2: LightGBM regressor ฝึกเฉพาะเดือนที่ราคาเปลี่ยน ทายว่าเปลี่ยนเท่าไร · "
    "ลองรวม 3 แบบ: ค่าคาดหวัง (โอกาส × ขนาด), ขยับเมื่อโอกาสเกิน 70%, ขยับเมื่อโอกาสเกิน 85% · "
    "และเทคนิค **ขยับครึ่งเดียว** คือหารคำทายด้วย 2 ให้เข้าใกล้ Naive ลดความเสียหายเวลาทายผิดทิศ",
    "{{R3_DECIDE}}",
)
code(r'''
# @title ผลรอบที่ 3 { display-mode: "form" }
show(["lgbm0_direct", "lgbm0_direct_half", "lgbm0_ts_ev", "lgbm0_ts_t70", "lgbm0_ts_t85", "lgbm0_ts_t85_half"])
''')
md("""
**ทำไมยังไม่ชนะ:** ขั้นที่ 1 รู้ค่อนข้างดีว่าราคาจะเปลี่ยน (ข้อ 11) แต่ขั้นที่ 2 บอกทิศได้แย่ ทายขึ้นหรือลงถูกราว 55% ใกล้การเดาสุ่ม ตอนเหล็กพุ่ง มี.ค.–เม.ย. 2569 โมเดลจับทิศได้บางส่วน แต่พอราคากลับลง มิ.ย.–ส.ค. โมเดลยังทายว่าขึ้นต่อ
""")

# ---------------------------------------------------------------- รอบ 4
round_card(
    "8.4 รอบที่ 4: ปรับข้อมูลภายนอก และเลือกโมเดลแยกหมวด",
    "เวอร์ชันแรกใช้ปัจจัยภายนอกหน่วง 1 เดือน ทั้งที่ตอน สนค. ประกาศราคา (ราววันที่ 9 ของเดือนถัดไป) เรารู้ราคาตลาดเดือนเดียวกันครบแล้ว "
    "และบางหมวดอาจเหมาะกับคนละโมเดล",
    "เพิ่มปัจจัยเหล็กฟิวเจอร์ส (แก้รูปแบบวันที่ที่เป็น ปี-วัน-เดือน) ดัชนีเศษเหล็ก และราคาเทียบค่าเฉลี่ย 12 เดือน รวม 52 ฟีเจอร์ · "
    "เทียบปัจจัยหน่วง 1 เดือน กับเดือนเดียวกัน · ให้ Validation เลือกโมเดลที่ดีที่สุดแยกทีละหมวด",
    "ใช้ปัจจัยเดือนเดียวกันต่อ เพราะถูกต้องตามเวลาจริงและดีขึ้นเล็กน้อย แต่ยังไม่ผ่านกติกา · "
    "การเลือกแยกหมวดสุดท้ายเลือก Naive เกือบทุกหมวด ผลรวมจึงเท่า Naive",
)
md("""
ผลจาก `train_best.py` (MAE %, ทาย 1 / 2 / 3 เดือน) บนจุดเริ่มชุดเดียวกัน

| แบบ | ปัจจัยภายนอก | Validation | Test |
|---|---|---|---|
| **Naive** | | **0.67 / 1.35 / 2.14** | 1.75 / 3.47 / 5.06 |
| LightGBM 2 ขั้น เกณฑ์ 70% | หน่วง 1 เดือน | 0.81 / 1.61 / 2.57 | 1.73 / 3.53 / 5.20 |
| LightGBM 2 ขั้น เกณฑ์ 70% | เดือนเดียวกัน | 0.73 / 1.66 / 2.53 | **1.65** / 3.44 / 5.37 |
| LightGBM 2 ขั้น 85% ขยับครึ่งเดียว | หน่วง 1 เดือน | 0.70 / 1.42 / 2.28 | 1.74 / 3.47 / 5.06 |
| LightGBM 2 ขั้น 85% ขยับครึ่งเดียว | เดือนเดียวกัน | 0.67 / 1.44 / 2.29 | 1.71 / **3.43** / 5.15 |
| เลือกโมเดลแยกหมวดด้วย Validation | หน่วง 1 เดือน | 0.67 / 1.35 / 2.14 | 1.75 / 3.47 / 5.07 |
| เลือกโมเดลแยกหมวดด้วย Validation | เดือนเดียวกัน | 0.67 / 1.35 / 2.14 | 1.75 / 3.47 / 5.06 |

ปัจจัยเดือนเดียวกันทำให้ Test ดีขึ้น (1 เดือน 1.65% ดีที่สุดที่เคยได้) แต่ Validation ยังแพ้ ส่วนการเลือกแยกหมวด Validation เลือก Naive ให้เกือบทุกหมวด เหลือแค่ลวดผูกเหล็กที่ได้โมเดลอื่น ผลจึงแทบเท่า Naive

ตัวเลข Validation ในตารางนี้มาจากรอบที่ยังนับ 13,680 คู่ (ก่อนแก้ในข้อ 5) จึงต่ำกว่าตารางอื่นเล็กน้อยทุกแถว รวมถึง Naive แต่ลำดับและข้อสรุปเหมือนเดิม
""")

# ---------------------------------------------------------------- รอบ 5
round_card(
    "8.5 รอบที่ 5: Linear Regression (Huber)",
    "โมเดลต้นไม้ซับซ้อนแล้วยังแพ้ ลองโมเดลเส้นตรงที่ง่ายที่สุด ถ้าความสัมพันธ์ระหว่างต้นทุนกับราคาเป็นเส้นตรง โมเดลนี้น่าจะจับได้",
    "HuberRegressor (เส้นตรงที่ไม่ไหวตามค่าโดด) ใช้ฟีเจอร์ตัวเลขทั้งหมด + หมวดแบบ one-hot, เติมค่าว่างด้วยมัธยฐาน, "
    "ปรับสเกลด้วยค่าเฉลี่ยและส่วนเบี่ยงเบนจาก Train เท่านั้น และลองแบบขยับครึ่งเดียว",
    "{{R5_DECIDE}}",
)
code(r'''
# @title ผลรอบที่ 5 { display-mode: "form" }
show(["huber", "huber_half"])
''')
md("""
ก่อนหน้านี้เราลอง Huber เฉพาะหมวดเหล็กด้วย ช่วง Test เหล็กเส้นทาย 3 เดือนผิด 7.75% เทียบ Naive 9.93% ดูดีมาก แต่ช่วง Validation ทาย 1 เดือนผิด 4.24% เทียบ Naive 1.97% แพ้หนัก ผลไม่นิ่งจึงไม่ใช้
""")

# ---------------------------------------------------------------- รอบ 6
round_card(
    "8.6 รอบที่ 6: จูน LightGBM (Hyperparameter Tuning)",
    "ค่าตั้งเริ่มต้นอาจไม่เหมาะ ถ้าจูนแล้ว LightGBM อาจชนะได้",
    "Random Search: สุ่มค่าตั้ง 20 ชุด + ค่าเริ่มต้น 1 ชุด จาก 7 ค่าในตารางด้านล่าง ใช้ Validation อย่างเดียว · "
    "รอบคัด: ทั้ง 21 ชุดบน 9 จุดเริ่ม · รอบตัดสิน: 5 ชุดที่ดีที่สุด + ค่าเริ่มต้น บน 27 จุดเต็ม · "
    "เลือกชุดและแบบที่ดีที่สุดแยกตามระยะทาย แล้ววัดบน Test ครั้งเดียว",
    "จูนแล้วชนะเล็กน้อยใน Test ทุกระยะ แต่ Validation เสมอที่ 1 เดือนและแพ้ที่ 2–3 เดือน ไม่ผ่านกติกา · "
    "ค่าตั้งที่ต่างกันให้ผลต่างกันไม่ถึง 0.1 จุด % แปลว่าปัญหาไม่ได้อยู่ที่ค่าตั้ง",
)
code(r'''
# @title 8.6.1 ช่วงค่าที่สุ่ม { display-mode: "form" }
from tune import SPACE
meaning = {"num_leaves": "จำนวนใบสูงสุดต่อต้น (ต้นซับซ้อนแค่ไหน)", "learning_rate": "ต้นใหม่แก้ต้นเก่าแรงแค่ไหน",
           "n_estimators": "จำนวนต้นไม้", "min_child_samples": "ข้อมูลขั้นต่ำต่อใบ (กัน overfit)",
           "subsample": "สุ่มแถวกี่ % ต่อต้น", "colsample_bytree": "สุ่มฟีเจอร์กี่ % ต่อต้น",
           "reg_lambda": "ลงโทษค่าที่ใหญ่เกิน (กัน overfit)"}
display(pd.DataFrame({"ค่าที่สุ่มเลือก": {k: ", ".join(map(str, v)) for k, v in SPACE.items()}, "ความหมาย": meaning}))
''')
code(r'''
# @title 8.6.2 รอบคัด: 21 ชุด บน 9 จุดเริ่ม { display-mode: "form" }
S = pd.read_csv(f"{ROOT}/ml/out/tune_screen.csv").sort_values("quick_best")
fig, ax = plt.subplots(figsize=(10, 5.4), layout="constrained")
labels = [f"ชุด {c}" + (" (ค่าเริ่มต้น)" if c == 0 else "") for c in S.config]
y = np.arange(len(S))
naive_q = S.quick_naive.iloc[0]
ax.axvline(naive_q, color=MODEL["naive"][1], lw=2, ls="--", zorder=1)
ax.scatter(S.quick_best, y, s=70, color=MODEL["lgbm"][1], edgecolors=SURFACE, linewidths=1.5, zorder=3, label="LightGBM แต่ละชุด")
ax.text(naive_q + 0.002, len(S) - 0.6, f"Naive {naive_q:.2f}", color=INK, fontsize=10, va="bottom")
ax.set_yticks(y, labels)
ax.set_ylim(len(S) - 0.3, -0.7)
ax.set_xlabel("MAE (%) เฉลี่ย 3 ระยะ (แบบที่ดีที่สุดของแต่ละชุด) ยิ่งซ้ายยิ่งดี")
ax.grid(axis="y", visible=False)
ax.set_title("รอบคัด 9 จุด: ทุกชุดดูเหมือนชนะ Naive (จุดอยู่ซ้ายเส้นประ)", loc="left")
plt.show()
print("5 ชุดที่ดีที่สุดไปรอบตัดสิน:", ", ".join(f"ชุด {c}" for c in S.config.head(5)))
''')
code(r'''
# @title 8.6.3 รอบตัดสิน: 6 ชุด บน 27 จุดเริ่ม (Validation, MAE %) { display-mode: "form" }
T = pd.read_csv(f"{ROOT}/ml/out/tune_results.csv")
best = T[T.candidate != "naive"].groupby(["config", "h"])["cv_mae"].min().unstack()
best.index = [f"ชุด {i}" + (" (ค่าเริ่มต้น)" if i == 0 else "") for i in best.index]
best.loc["Naive (baseline)"] = T[T.candidate == "naive"].groupby("h")["cv_mae"].first()
best.columns = [f"{h} เดือน" for h in best.columns]
display(best.sort_values("1 เดือน").style.format("{:.2f}").highlight_min(axis=0, props="font-weight:bold"))
''')
md("""
**บทเรียนจากรอบคัด:** ในรอบคัด 9 จุด ทั้ง 21 ชุดดูเหมือนชนะ Naive (ดีสุด 1.37 เทียบ 1.43) แต่พอทดสอบเต็ม 27 จุด ไม่มีชุดไหนชนะเลย ถ้าเราตัดสินจากรอบคัดอย่างเดียว จะสรุปผิด การทดสอบบนข้อมูลช่วงยาวจึงสำคัญ

ตารางรอบตัดสินมาจากรอบที่ยังนับ Validation 13,680 คู่ (ก่อนแก้ในข้อ 5) ส่วนรอบคัด 9 จุดไม่กระทบ เพราะจุดเริ่มสุดท้ายของรอบคัดคือ ม.ค. 2568 ผลของชุดที่เลือกบน Validation ที่แก้แล้วอยู่ในตาราง 8.6.4

ชุดที่ได้เลือก: ทาย 1 เดือน = ค่าเริ่มต้น แบบ 2 ขั้น 85% ขยับครึ่งเดียว · ทาย 2 เดือน = ชุด 7 (63 ใบ, learning rate 0.01, 600 ต้น) แบบเดียวกัน · ทาย 3 เดือน = ชุด 5 (15 ใบ, reg_lambda 10) แบบทายตรงขยับครึ่งเดียว
""")
code(r'''
# @title 8.6.4 ผลของ LightGBM ที่จูนแล้ว { display-mode: "form" }
show(["lgbm0_ts_t85_half", "lgbm"])
''')

# ---------------------------------------------------------------- รอบ 7
round_card(
    "8.7 รอบที่ 7: Random Forest และ LSTM พร้อมจูน",
    "ลองอัลกอริทึมคนละแบบกับ Boosting: Random Forest (Bagging) ซึ่งมักไม่ค่อย overfit และ LSTM (Deep Learning) ที่อ่านข้อมูลเป็นลำดับเวลา",
    "Random Forest: 200 ต้น ลอง 6 ชุดค่า (ขนาดใบขั้นต่ำ 20–200 แถว, สุ่มฟีเจอร์ 30–100%) · "
    "LSTM: ลอง 4 ชุด (หน่วย 16/32/64, learning rate 0.001/0.003, dropout 0.2/0.3, ดูย้อนหลัง 6 หรือ 12 เดือน) "
    "หยุดฝึกเมื่อผลบนข้อมูล 10% ล่าสุดของ Train ไม่ดีขึ้น 4 รอบ (early stopping) · "
    "จูนแบบเดียวกับ LightGBM: รอบคัด 9 จุด ชุดที่ดีที่สุดได้ไปรอบเต็มเฉพาะเมื่อชนะ Naive ในรอบคัด",
    "{{R7_DECIDE}}",
)
code(r'''
# @title 8.7.1 ชุดค่าที่ลอง และผลรอบคัด (9 จุดเริ่ม, MAE %) { display-mode: "form" }
from final_experiments import LSTM_GRID, RF_GRID
tag = lambda k: f"ชุด {k}" + (" (ค่าเดิม)" if k == "A" else "")
display(pd.DataFrame({tag(k): {"ขนาดใบขั้นต่ำ (แถว)": str(v["min_samples_leaf"]), "สุ่มฟีเจอร์ต่อการแตกกิ่ง": f"{v['max_features']:.0%}"}
                      for k, v in RF_GRID.items()}).T.style.set_caption("Random Forest (200 ต้นทุกชุด)"))
display(pd.DataFrame({tag(k): {"หน่วย LSTM": str(v["hidden"]), "learning rate": str(v["lr"]), "dropout": str(v["dropout"]),
                               "ดูย้อนหลัง (เดือน)": str(v["seq"])} for k, v in LSTM_GRID.items()}).T.style.set_caption("LSTM"))
Q = pd.read_csv(f"{ROOT}/ml/out/tune_rf_lstm.csv")
Q["ดีกว่าระหว่างเต็มกับครึ่งเดียว"] = Q[["เต็ม", "ครึ่งเดียว"]].min(axis=1)
q = Q.pivot_table(index=["model", "config"], columns="h", values="ดีกว่าระหว่างเต็มกับครึ่งเดียว")
q.columns = [f"{h} เดือน" for h in q.columns]
q.index = [("Naive (baseline)" if m == "naive" else f"{'Random Forest' if m == 'rf' else 'LSTM'} ชุด {c}") for m, c in q.index]
q = q.loc[["Naive (baseline)"] + [i for i in q.index if i.startswith("Random")] + [i for i in q.index if i.startswith("LSTM")]]
nq = q.loc["Naive (baseline)"]
display(q.style.format("{:.2f}").apply(lambda col: [f"background-color:{BETTER}" if v <= nq[col.name] - TOL else
                                                    f"background-color:{WORSE}" if v >= nq[col.name] + TOL else "" for v in col])
        .set_properties(subset=pd.IndexSlice[["Naive (baseline)"], :], **{"font-weight": "bold"})
        .set_caption("รอบคัด 9 จุดเริ่ม: MAE (%) แบบที่ดีกว่าระหว่างขยับเต็มกับขยับครึ่งเดียว"))
''')
code(r'''
# @title 8.7.2 ผลเต็ม 27 + 12 จุดเริ่ม { display-mode: "form" }
show([m for m in ("rf", "rf_half", "rf_tuned", "lstm", "lstm_half", "lstm_tuned") if m in NAMES])
''')

# ---------------------------------------------------------------- รอบ 8
round_card(
    "8.8 รอบที่ 8: หาข้อมูลที่บอกล่วงหน้าได้",
    "ทุกโมเดลแพ้ด้วยเหตุผลเดียวกัน คือไม่รู้ล่วงหน้าว่าราคาจะขึ้นหรือลง ถ้าหาข้อมูลที่ขยับก่อนราคา สนค. ได้ โมเดลน่าจะชนะ",
    "หาข้อมูลเพิ่ม 5 แหล่ง + ราคาเหล็กต่างจังหวัด + ราคาจากร้านค้าออนไลน์ แล้ววัดว่าขยับก่อนราคา สนค. ไหม (สหสัมพันธ์กับราคาเดือนถัดไป)",
    "ไม่มีแหล่งไหนบอกล่วงหน้าได้พอ จึงไม่เพิ่มลงโมเดล",
)
md("""
| ข้อมูล | ผล |
|---|---|
| ราคาเหล็กเส้นรายสัปดาห์ในไทย | ไม่มีแหล่งสาธารณะย้อนหลัง สถาบันเหล็กฯ เว็บล่ม |
| ข่าวโรงงานเหล็กประกาศปรับราคา | ไม่มีรายการย้อนหลัง มีแต่ข่าวกระจัดกระจาย |
| ค่าไฟฟ้า Ft รายเดือน 2557–2569 | ได้ครบ แต่สหสัมพันธ์ −0.17 ถึง 0.11 |
| ราคานำเข้าเหล็กจาก UN Comtrade | สหสัมพันธ์ไม่เกิน 0.17 และออกช้าราว 4 เดือน |
| มาตรการตอบโต้การทุ่มตลาดเหล็ก | ส่วนใหญ่เป็นเหล็กแผ่น จำนวนเหตุการณ์น้อยเกินทดสอบ |
| ราคาเหล็กเส้น 6 จังหวัด (สนค.) | ขยับพร้อมกรุงเทพฯ ไม่ได้ขยับก่อน |
| ราคาจากร้านค้าออนไลน์ (SteelLead) | สหสัมพันธ์กับเดือนถัดไป 0.16–0.22 ร้านอื่นไม่มีประวัติย้อนหลัง |

สหสัมพันธ์ 0.2 แปลว่าข้อมูลนั้นอธิบายการขึ้นลงของราคาเดือนถัดไปได้ราว 4% (0.2²) น้อยเกินจะช่วยโมเดล
""")

# ================================================================== 9. ผลรวม
md("""
# ส่วนที่ 3: ผลรวมและบทสรุป

## 9. ผลรวมทุกโมเดล

ตารางนี้รวมทุกแบบจากทั้ง 8 รอบ ตัวเลขคือ **MAE ของโมเดล ลบ MAE ของ Naive** (จุด %)

- **สีน้ำเงิน** = ดีกว่า Naive
- **สีแดง** = แย่กว่า Naive
- สีเข้มขึ้นแปลว่าห่างจาก Naive มากขึ้น

แบบที่จะผ่านกติกาต้องเป็นสีน้ำเงินทั้งฝั่ง Validation และ Test ในระยะเดียวกัน
""")
code(r'''
# @title 9.1 ทุกแบบเทียบ Naive { display-mode: "form" }
t = mae_table([m for m in NAMES if m != "naive"])
diff = t - t.loc[NAMES["naive"]]
diff = diff.drop(index=NAMES["naive"])
diff[("ผล", "ชนะทั้ง 2 ช่วง?")] = verdict(t)[1:]
diff = diff.sort_values(("Validation", "1 เดือน"))
m = diff.iloc[:, :-1].abs().to_numpy().max()
num = diff.columns[:-1]
display(diff.style.format("{:+.2f}", subset=num).background_gradient(cmap=DIVERGING, vmin=-m, vmax=m, subset=num))
passed = sum(v.startswith("✅") for v in diff[("ผล", "ชนะทั้ง 2 ช่วง?")])
print(f"ผ่านกติกา {passed} จาก {len(diff)} แบบ")
print("MAE ของ Naive:", ", ".join(f"{s} {h}: {v:.2f}%" for (s, h), v in t.loc[NAMES['naive']].items()))
''')
code(r'''
# @title 9.2 กราฟเทียบโมเดลหลัก { display-mode: "form" }
main = ["naive", "lgbm", "rf", "lstm"]
s = mae_table(main)
fig, axes = plt.subplots(1, 2, figsize=(13, 4.2), layout="constrained")
for ax, split in zip(axes, ("Validation", "Test")):
    for k, m in enumerate(main):
        vals = s.loc[NAMES[m], split].values
        ax.bar(np.arange(3) + (k - 1.5) * 0.2, vals, width=0.18, color=MODEL[m][1], label=MODEL[m][0])
    ax.set_xticks(range(3), ["ทาย 1 เดือน", "ทาย 2 เดือน", "ทาย 3 เดือน"])
    ax.set_ylabel("MAE (%)")
    ax.grid(axis="x", visible=False)
    ax.set_title(split, loc="left")
handles, labels = axes[0].get_legend_handles_labels()
fig.legend(handles, labels, frameon=False, ncol=4, loc="outside lower center")
plt.show()
''')
code(r'''
# @title 9.3 RMSE และ R² ของโมเดลหลัก (ช่วง Test) { display-mode: "form" }
rows = {}
for m in ["naive", "ets", "huber", "lgbm", "rf", "lstm"]:
    for h in (1, 2, 3):
        g = TE[TE.h == h]
        pe = (g.price * np.exp(g[f"d_{m}"]) - g.actual) / g.actual * 100
        rows.setdefault(NAMES[m], {})[("RMSE (%)", f"{h} เดือน")] = np.sqrt((pe ** 2).mean())
        rows[NAMES[m]][("R² ของ % การเปลี่ยน", f"{h} เดือน")] = 1 - ((g.y - g[f"d_{m}"]) ** 2).sum() / ((g.y - g.y.mean()) ** 2).sum()
display(pd.DataFrame(rows).T.style.format("{:.2f}"))
''')
md("""
**อ่านผล**

- **MAE:** {{R9_MAE}}
- **RMSE:** บางโมเดล เช่น Random Forest มี RMSE ต่ำกว่า Naive ในช่วง Test เพราะลดการผิดก้อนใหญ่ช่วงเหล็กพุ่งได้บ้าง แต่ MAE สูงกว่า เพราะทาย "ขยับนิดหน่อย" ทุกวัสดุ ทั้งที่ราคาส่วนใหญ่นิ่ง
- **R²:** ทุกโมเดลใกล้ 0 คืออธิบายการขึ้นลงของราคาแทบไม่ได้
""")

# ================================================================== 10. residual
md("""
## 10. ดู Residual (ช่วง Test)

residual = (ราคาจริง − ราคาที่ทาย) / ราคาจริง × 100 ค่าบวกคือทายต่ำไป ค่าลบคือทายสูงไป
""")
code(r'''
# @title 10.1 กราฟ residual { display-mode: "form" }
import residuals

for h in (1, 3):
    R = residuals.load(h)
    residuals.residual_hist(R, h)
    residuals.error_by_month(R, h)
    residuals.error_by_category(R, h)
for f in ("residual_hist_h1", "error_by_month_h1", "error_by_month_h3", "error_by_category_h3"):
    display(Image(f"{ROOT}/ml/report_figures/{f}.png", width=1000))
''')
md("""
**อ่านกราฟ**

- **Histogram:** Naive กับ LightGBM มีแท่งสูงที่ 0 คือทายถูกพอดีราว 2 ใน 3 ของครั้ง Random Forest กับ LSTM กระจายรอบ 0 เพราะทายขยับเล็กน้อยเกือบทุกครั้ง
- **ค่าเฉลี่ยเป็นบวกทุกโมเดล:** ปีทดสอบราคาขึ้น ทุกโมเดลทายต่ำไป
- **รายเดือน:** ความผิดพลาดกองอยู่ที่ มี.ค.–ก.ค. 2569 และทุกโมเดลพลาดพร้อมกัน แปลว่าข้อมูลที่มีไม่มีสัญญาณเตือนล่วงหน้าของช่วงนั้น เปลี่ยนอัลกอริทึมก็ไม่ช่วย
- **รายหมวด:** เหล็กเส้นผิดมากสุด (ทาย 3 เดือนผิดเฉลี่ยเกือบ 10%) คอนกรีตหยาบผิดน้อยสุด
""")

# ================================================================== 11. classification
md("""
## 11. ป้าย "ราคามีโอกาสเปลี่ยน" (Classification)

ขั้นที่ 1 ของโมเดล 2 ขั้น (รอบ 3) บอกได้ดีว่า **ราคากำลังจะขยับ** แม้ไม่รู้ทิศ เว็บจึงใช้ส่วนนี้ขึ้นป้ายเตือนเมื่อโอกาสถึง 70%

- **target:** ราคาเดือนที่ทายต่างจากเดือนนี้หรือไม่ (1 = เปลี่ยน, 0 = เท่าเดิม)
- **เทียบ 3 แบบ:** กฎตามหมวด (baseline: โอกาส = สัดส่วนเดือนที่หมวดนั้นเคยเปลี่ยน), Logistic Regression, LightGBM
- **แบ่งข้อมูล:** walk-forward ชุดเดียวกับข้อ 5

| ตัววัด | ความหมาย |
|---|---|
| Precision | ขึ้นป้ายแล้ว ราคาเปลี่ยนจริงกี่ % |
| Recall | ราคาที่เปลี่ยนจริงทั้งหมด ขึ้นป้ายไว้ทันกี่ % |
| F1 | ค่ากลางของ Precision กับ Recall |
| AUC | เรียงลำดับ "วัสดุไหนน่าจะเปลี่ยน" ได้ดีแค่ไหน 0.5 = เดาสุ่ม, 1 = สมบูรณ์ |

Accuracy ใช้ตัวเดียวไม่ได้ เพราะทาย "ไม่เปลี่ยน" ทุกตัวก็ได้ 68% แล้ว
""")
code(r'''
# @title 11.1 ผลช่วง Test ที่เกณฑ์ 70% และ Confusion Matrix { display-mode: "form" }
import classify_signal

C = pd.read_csv(f"{ROOT}/ml/out/classify_preds.csv")
CT = C[C.split == "test"]
mt = classify_signal.metrics(CT, thresholds=(0.7,))
mt["model"] = mt.model.map(classify_signal.NAMES)
mt["h"] = mt.h.map(lambda h: f"ทาย {h} เดือน")
display(mt.drop(columns=["threshold"]).set_index(["h", "model"])
        .style.format({"AUC": "{:.2f}", "Accuracy": "{:.0%}", "Precision": "{:.0%}", "Recall": "{:.0%}", "F1": "{:.2f}", "ขึ้นป้าย (%)": "{:.0f}"}))
classify_signal.plot_confusion(CT)
display(Image(f"{ROOT}/ml/report_figures/confusion_h1.png", width=1000))
''')
md("""
**อ่านผล**

- ทั้ง Logistic Regression และ LightGBM ชนะกฎตามหมวด
- **LightGBM** มี AUC สูงสุดทุกระยะ ขึ้นป้ายน้อยกว่าแต่แม่นกว่า (Precision 80% ที่ 1 เดือน)
- **Logistic Regression** จับการเปลี่ยนได้มากกว่า (Recall 54%) แลกกับ Precision ที่ลดลงเล็กน้อย
- เว็บเลือก LightGBM เพราะป้ายที่ขึ้นแล้วผิดบ่อยจะทำให้ผู้ใช้ไม่เชื่อป้าย ตัวเลขบนเว็บผ่านการปรับโอกาสให้ตรงกับที่เกิดจริง (calibration) จึงต่างจากตารางนี้เล็กน้อย
""")

# ================================================================== 12. ปัญหา
md("""
## 12. ปัญหาที่เจอและวิธีแก้

| ลำดับ | ปัญหา | เราทำอะไร | ผล |
|---:|---|---|---|
| 1 | เหล็กเส้นรหัสใหม่มีประวัติแค่ 5 เดือน | ต่อรหัสเก่ากับรหัสใหม่ 39 คู่ | เหล็กเส้น 25 จาก 26 รายการมีประวัติพอทาย |
| 2 | 100 วัสดุไม่มีราคาล่าสุด เว็บโชว์ราคาเก่าหลายปี | แยกวัสดุที่ยังเก็บราคา ซ่อนตัวที่เลิกแล้ว | ทาย 188 วัสดุที่ยังมีราคา |
| 3 | LightGBM เวอร์ชันแรกแพ้ Naive | ดูผลแล้วพบว่าโมเดลทายขยับทุกครั้ง | สร้างโมเดล 2 ขั้น ขยับเฉพาะตอนมั่นใจ (รอบ 3) |
| 4 | Validation ช่วงแรก 12 เดือนราคานิ่งเกินไป เลือกโมเดลผิด | ขยาย Validation เป็น 27 จุด 7 ปี | ผลน่าเชื่อขึ้น ครอบช่วงเหล็กพุ่ง |
| 5 | ข้อมูลเหล็กฟิวเจอร์สเรียงวันที่แบบ ปี-วัน-เดือน | ตรวจและแปลงวันที่ใหม่ | ใช้ข้อมูลนี้ได้ถูกต้อง |
| 6 | ปัจจัยภายนอกหน่วง 1 เดือนโดยไม่จำเป็น | ใช้ค่าเดือนเดียวกันตามวันประกาศจริงของ สนค. | Test ดีขึ้นเล็กน้อย Validation ไม่ยืนยัน (รอบ 4) |
| 7 | รอบคัดของการจูนให้ผลดีเกินจริง | ทดสอบรอบตัดสินบน 27 จุดเต็มทุกครั้ง | ไม่สรุปผิดจากข้อมูลช่วงสั้น (รอบ 6) |
| 8 | อัลกอริทึมอาจไม่เหมาะ | ลอง ETS, Linear, Random Forest, LSTM พร้อมจูน | ทุกแบบแพ้ Naive ใน Validation (รอบ 1, 5, 7) |
| 9 | ไม่มีข้อมูลบอกล่วงหน้า | หาข้อมูลเพิ่ม 7 แหล่ง | สหสัมพันธ์ไม่เกิน 0.22 (รอบ 8) |
| 10 | Validation 372 คู่ทายเลยเข้าไปในช่วง Test และ 1 คู่ใช้ราคาที่เติม (พบตอนตรวจทาน) | ตัดคู่เหล่านี้ออก คำนวณทุกแบบใหม่ | Validation สูงขึ้นเล็กน้อยทุกแบบ ข้อสรุปเหมือนเดิม (ข้อ 5) |
| 11 | ช่วงราคาเคยรายงานว่าครอบราคาจริง 83% แต่วัดบนข้อมูลชุดเดียวกับที่ใช้ตั้งช่วง (พบตอนตรวจทาน) | ตั้งช่วงจาก Validation แล้ววัดบน Test | ครอบจริง 76% / 64% / 54% ต่ำกว่าเป้า 80% (ข้อ 13.2) |
""")

# ================================================================== 13. บทสรุป
md("""
## 13. บทสรุป

### ระบบที่ใช้บนเว็บ

| ส่วน | ใช้อะไร | ผล |
|---|---|---|
| ตัวเลขราคา 1–3 เดือน | **Naive** | ไม่มีแบบไหนชนะได้ทั้ง 2 ช่วง ({{N_VARIANTS}} แบบ) |
| ช่วงราคาต่ำ–สูง | ความผิดพลาดในอดีตของแต่ละหมวดและระยะทาย | ครอบราคาจริง 76% (1 เดือน) ถึง 54% (3 เดือน) ต่ำกว่าเป้า 80% ต้องขยายช่วง (ข้อ 13.2) |
| ป้าย "ราคามีโอกาสเปลี่ยน" | **LightGBM Classifier** | ขึ้นป้ายแล้วราคาเปลี่ยนจริง 80% |
""")
code(r'''
# @title 13.1 ความแม่นของ Naive แยกหมวด (MAE %) { display-mode: "form" }
rows = {}
for split, R in (("ปีปกติ (Validation)", CV), ("ปีล่าสุด (Test)", TE)):
    for h in (1, 3):
        g = R[R.h == h]
        rows[(split, f"ทาย {h} เดือน")] = errors(g, "naive").groupby(g.categoryCode.map(CAT)).mean()
acc = pd.DataFrame(rows)
acc.index.name = "หมวด"
acc.insert(0, ("", "วัสดุ"), TE[TE.h == 1].groupby(TE.categoryCode.map(CAT)).material_id.nunique())
display(acc.sort_values(("ปีล่าสุด (Test)", "ทาย 3 เดือน")).style.format("{:.2f}", subset=acc.columns[1:]))
''')
code(r'''
# @title 13.2 ช่วงราคาต่ำ–สูงครอบราคาจริงแค่ไหน (ตั้งช่วงจาก Validation, วัดบน Test) { display-mode: "form" }
def coverage(lo_q, hi_q):
    out = {}
    for h in (1, 2, 3):
        v, t = CV[CV.h == h], TE[TE.h == h]
        lv, lt = np.log(v.actual / v.price), np.log(t.actual / t.price)
        q = lv.groupby(v.categoryCode).quantile([lo_q, hi_q]).unstack()
        n = v.groupby("categoryCode").size()
        overall = lv.quantile([lo_q, hi_q])
        pick = lambda c, k: q.loc[c, k] if c in q.index and n[c] >= 20 else overall[k]   # หมวดที่ตัวอย่างน้อยใช้ค่ารวม
        lo, hi = t.categoryCode.map(lambda c: pick(c, lo_q)), t.categoryCode.map(lambda c: pick(c, hi_q))
        inside = (lt >= lo - 1e-12) & (lt <= hi + 1e-12)
        out[f"ทาย {h} เดือน"] = {"ทุกวัสดุ": inside.mean() * 100, "เหล็กเส้น": inside[t.categoryCode == "STR-01"].mean() * 100,
                                 "ความกว้างช่วงเฉลี่ย (% ของราคา)": ((np.exp(hi) - np.exp(lo)) * 100).mean()}
    return pd.DataFrame(out)

display(pd.concat({"ช่วง 10–90% (ตั้งเป้าครอบ 80%)": coverage(0.1, 0.9), "ช่วง 5–95% (ตั้งเป้าครอบ 90%)": coverage(0.05, 0.95)})
        .style.format("{:.0f}"))
''')
md("""
ฉบับก่อนรายงานว่าช่วงราคาครอบราคาจริง 83% แต่ตัวเลขนั้นวัดบนข้อมูลชุดเดียวกับที่ใช้ตั้งช่วง พอตั้งช่วงจาก Validation แล้ววัดบน Test ช่วง 10–90% ครอบได้แค่ 76% (1 เดือน) ถึง 54% (3 เดือน) และเหล็กเส้นแค่ 30–58% เพราะปีทดสอบราคาแกว่งแรงกว่าช่วง Validation

**ต้องทำ:** ขยายช่วงบนเว็บ ถ้าใช้ช่วง 5–95% (ครึ่งล่างของตาราง) จะครอบได้ 79% / 71% / 70% ใกล้เป้า 80% ขึ้น แลกกับช่วงที่กว้างขึ้นเป็น 4–14% ของราคา แล้ววัดซ้ำกับเดือนใหม่ที่ยังไม่เคยเห็น
""")

md("""
คอนกรีตและเสาเข็มทายได้แม่นมาก ส่วนเหล็กเส้นยากสุด ทาย 3 เดือนในปีที่ตลาดแกว่งผิดได้เกือบ 10%

**แปลเป็นเงิน:** ราคา 100 บาท ปีปกติทาย 1 เดือนผิดเฉลี่ยราว 70 สตางค์ ปีล่าสุด 1.75 บาท เหล็กเส้นทาย 1 เดือนผิดเฉลี่ย 778 บาทต่อตัน ทาย 3 เดือน 1,948 บาทต่อตัน

### ทำไม ML ทายตัวเลขไม่ชนะ Naive

1. **ราคานิ่งเป็นส่วนใหญ่:** คอนกรีตและเสาเข็มราคาเท่าเดิมราว 9 ใน 10 เดือน Naive จึงถูกเกือบตลอด โมเดลที่ทายขยับแม้นิดเดียวก็เสียเปรียบ (รอบ 2)
2. **รู้ว่าจะขยับ แต่ไม่รู้ทิศ:** ข้อมูลที่มีบอกได้ว่าราคากำลังจะเปลี่ยน (ป้ายแม่น 80%) แต่ทายขึ้นหรือลงถูกราว 55% ใกล้การเดาสุ่ม (รอบ 3)
3. **ไม่มีข้อมูลที่รู้ก่อน:** ทุกโมเดลพลาดพร้อมกันในเดือนเดียวกัน (ข้อ 10) และข้อมูลที่หาเพิ่มไม่มีตัวไหนขยับก่อนราคา สนค. (รอบ 8)

สิ่งที่ขาดคือข้อมูล อัลกอริทึมที่ดีกว่าหรือการจูนเพิ่มช่วยไม่ได้ เห็นได้จากรอบ 6 และ 7 ที่จูนแล้วผลแทบไม่เปลี่ยน

### สิ่งที่ได้เรียนรู้

- **ต้องมี baseline เสมอ:** ถ้าไม่เทียบกับ Naive ตัวเลข LightGBM 1.71% อาจดูดี ทั้งที่ Naive ได้ 1.75% อยู่แล้ว
- **ตั้งกติกาก่อนดูผล:** ช่วง Test ช่วงเดียวทำให้หลายโมเดลดูชนะ แต่ Validation 7 ปีบอกว่าบังเอิญ
- **เลือกตัววัดให้ถูก:** R² จากราคาได้ 0.99 ทั้งที่โมเดลไม่ได้ทายอะไร
- **ให้คนอื่นตรวจทาน:** การตรวจทานรอบหลังเจอ Validation ที่ทายเลยเข้าไปในช่วง Test และการวัดช่วงราคาบนข้อมูลชุดเดียวกับที่ใช้ตั้งช่วง ทั้งสองเรื่องทำให้ผลดูดีกว่าความจริง
- **ใช้ ML ตรงที่ได้ผล:** ทายตัวเลขไม่ชนะ แต่ทายว่า "จะเปลี่ยนไหม" ได้ดี จึงนำไปทำป้ายเตือนแทน

### ถ้าทำต่อ

1. **รัน LightGBM คู่กับ Naive ทุกเดือน** โดยยังไม่โชว์บนเว็บ ถ้าเหล็กเส้นชนะต่อเนื่องราว 12 เดือน ค่อยเปลี่ยนเหล็กเส้นไปใช้ LightGBM
2. **หาข้อมูลที่รู้ก่อน สนค. ประกาศ** เช่น ราคาที่โรงงานเหล็กประกาศรายสัปดาห์ แหล่งฟรีย้อนหลังไม่มี ต้องซื้อหรือเก็บเองต่อเนื่อง

> **ประโยคสรุป:** ใช้ Naive พร้อมช่วงราคาเป็นตัวทายราคาทุกวัสดุ และใช้ LightGBM ทำป้ายเตือนว่าราคาใกล้เปลี่ยน เพราะจากการทดลอง 8 รอบ {{N_VARIANTS}} แบบ ทั้งช่วง 7 ปีและ 12 เดือนล่าสุด ไม่มีแบบไหนทายตัวเลขได้ดีกว่า Naive อย่างสม่ำเสมอ ข้อจำกัดอยู่ที่ข้อมูลที่ยังไม่มีสัญญาณบอกล่วงหน้า
""")

# ================================================================== ภาคผนวก
md("""
## ภาคผนวก: สคริปต์และการรันใหม่

| สคริปต์ | ทำอะไร | เวลา (4 คอร์) |
|---|---|---|
| `prepare_data.py` | ตรวจและทำความสะอาดข้อมูล ต่อรหัสเหล็กเส้น | ไม่ถึง 1 นาที |
| `build_factors.py` | รวมปัจจัยภายนอกเป็นรายเดือน | ไม่ถึง 1 นาที |
| `compare_models.py` | Naive, LightGBM จูนแล้ว, Random Forest, LSTM | ~15 นาที |
| `final_experiments.py` | Seasonal naive, Drift, ETS, Linear, LightGBM ค่าเริ่มต้นทุกแบบ, จูน RF และ LSTM | ~40 นาที |
| `tune.py` | จูน LightGBM | ~40 นาที |
| `classify_signal.py` | ป้ายเตือน: Precision, Recall, F1 | ~90 นาที |
| `residuals.py` | กราฟ residual | ไม่ถึง 1 นาที |

ตั้ง `RUN_FULL = True` แล้วรันช่องนี้เพื่อรันการทดลองหลักใหม่ (บน Colab ใช้เวลาหลายชั่วโมง) ผลใหม่จะเขียนทับไฟล์ใน `thaitay_colab/ml/out/` แล้วรันข้อ 0 ถึง 13 ซ้ำเพื่อดูผลใหม่
""")
code(r'''
RUN_FULL = False

if RUN_FULL:
    import classify_signal, compare_models, final_experiments, tune
    compare_models.main()
    final_experiments.main()
    tune.main()
    classify_signal.main()
''')

nb = nbf.v4.new_notebook(cells=cells)
nb.metadata = {
    "colab": {"provenance": [], "toc_visible": True},
    "kernelspec": {"display_name": "Python 3", "name": "python3"},
    "language_info": {"name": "python"},
}
nbf.write(nb, OUT)
print("wrote", OUT, len(cells), "cells")
