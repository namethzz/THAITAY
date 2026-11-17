"""Factors supported by the monthly pipeline; unknown series are not carried forward."""
SUPPORTED_FACTORS = (
    "brent_crude_usd_barrel", "fx_usd_thb", "fx_cny_thb",
    "iron_ore_62fe_usd_ton", "fuel_Hi_Diesel_thb_litre",
)
EXCLUDED_FACTORS = (
    "newcastle_coal_usd_ton", "steel_futures_unverified", "scrap_metal_ppi_index",
)
