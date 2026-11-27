import { getMaterialById } from "@/data.js";
import type { EstimateLine, EstimateMeta } from "@/types";

export const DEFAULT_META: EstimateMeta = { project: "", customer: "", contingency: 0, vat: true };

export function cleanLines(saved: unknown): EstimateLine[] {
  if (!Array.isArray(saved)) return [];
  return saved.filter(
    (line) =>
      line &&
      getMaterialById(line.materialId) &&
      Number.isFinite(line.price) &&
      Number.isFinite(line.qty),
  );
}

export function cleanMeta(saved: unknown): EstimateMeta {
  const meta = (saved ?? {}) as Partial<EstimateMeta>;
  return {
    project: typeof meta.project === "string" ? meta.project : "",
    customer: typeof meta.customer === "string" ? meta.customer : "",
    contingency:
      typeof meta.contingency === "number" && [0, 3, 5, 10].includes(meta.contingency)
        ? meta.contingency
        : 0,
    vat: meta.vat !== false,
  };
}

// รหัสเก่าอาจชี้ไปยังวัสดุเดียวกัน จึงเก็บรหัสปัจจุบันเพียงครั้งเดียว
export function cleanWatch(saved: unknown): string[] {
  if (!Array.isArray(saved)) return [];
  const activeIds = new Set<string>();
  for (const id of saved) {
    if (typeof id !== "string") continue;
    const material = getMaterialById(id);
    if (material && !material.discontinued) activeIds.add(material.id);
  }
  return [...activeIds];
}
