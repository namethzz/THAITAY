import type { Material } from "./types";
export const dataMeta: Readonly<{scope: string; label: string; status: string}>;
export const materialCatalog: Material[];
export const materials: Material[];
export const materialCategories: ReadonlyArray<{code: string; name: string; count: number}>;
export const materialUnits: ReadonlyArray<string>;
export const defaultMaterialId: string;
export function getMaterialById(id: string): Material | null;
export function searchMaterials(query?: string, options?: { limit?: number; category?: string }): Material[];
