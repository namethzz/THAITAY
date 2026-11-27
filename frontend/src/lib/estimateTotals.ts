import type { EstimateLine, EstimateMeta } from "@/types";

const VAT_RATE = 0.07;

export function calculateEstimateTotals(
  lines: EstimateLine[],
  contingency: EstimateMeta["contingency"],
  includeVat: boolean,
) {
  function totalsFor(priceField: "price" | "low" | "high") {
    const base = lines.reduce((sum, line) => sum + line[priceField] * line.qty, 0);
    const subtotal = base * (1 + contingency / 100);
    const vat = includeVat ? subtotal * VAT_RATE : 0;
    return { base, cont: subtotal - base, vat, total: subtotal + vat };
  }

  return { expected: totalsFor("price"), low: totalsFor("low"), high: totalsFor("high") };
}

export type EstimateTotals = ReturnType<typeof calculateEstimateTotals>;
