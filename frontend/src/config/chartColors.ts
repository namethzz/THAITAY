// Chart colours follow the brand data code: actual prices in charcoal, forecasts in orange.
export const CHART = {
  measured: "#242a2d",
  forecast: "#a84b1a", // line + points: dark orange reaches 5.5:1 on panels
  band: "#e8753b",     // range band in brand orange
  grid: "#dcd6cb",
  axis: "#cfc9be",
  tick: "#5a6266",
  tooltip: { borderRadius: 10, border: "1px solid #dcd6cb", background: "#fcfbf8", color: "#242a2d" },
} as const;
