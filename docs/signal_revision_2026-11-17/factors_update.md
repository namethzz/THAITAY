# ต่อข้อมูลปัจจัยภายนอก (fetch_factors.py)

- เขียนเดือน 2026-09 ถึง 2026-10
- สำรองไฟล์เดิม: data/factors_monthly.before_fetch.csv

## แหล่ง

- brent_crude_usd_barrel: Yahoo BZ=F ราคาปิดรายเดือน
- iron_ore_62fe_usd_ton: Yahoo TIO=F ราคาปิดรายเดือน
- fx_usd_thb: Yahoo THB=X ราคาปิดวันสุดท้ายของเดือน
- fx_cny_thb: ค่าเดิมเดือน 2026-08 × การเปลี่ยนของ THB=X ÷ CNY=X
- fuel_Hi_Diesel_thb_litre: ราคาดีเซลรายวันของ ปตท. เฉลี่ยทั้งเดือน
- ตัดปัจจัยที่ยังไม่ยืนยันแหล่งออก ไม่ใช้ค่าเก่าแทน: newcastle_coal_usd_ton, steel_futures_unverified, scrap_metal_ppi_index

## ค่า

| index | เดิม 2026-09 | เดิม 2026-10 | ใหม่ 2026-09 | ใหม่ 2026-10 |
|---|---|---|---|---|
| brent_crude_usd_barrel | 97.44 | nan | 103.53 | 117.64 |
| fx_usd_thb | 33.37 | nan | 33.59 | 33.72 |
| fx_cny_thb | 4.97 | nan | 4.99 | 5.04 |
| iron_ore_62fe_usd_ton | 97.14 | nan | 96.59 | 90.71 |
| fuel_Hi_Diesel_thb_litre | 39.96 | nan | 40.26 | 42.84 |
