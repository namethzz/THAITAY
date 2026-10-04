import type { ReactNode } from "react";
export function PageHeading({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return <header className="scope-heading"><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{children}</p></header>;
}
export function Stat({ label, value, unit = "", note }: { label: string; value: number | string; unit?: string; note: string }) {
  return <article className="scope-stat"><span>{label}</span><strong>{typeof value === "number" ? value.toLocaleString("th-TH") : value}<small>{unit}</small></strong><p>{note}</p></article>;
}
