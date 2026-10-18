import catalog from './data/structural-materials.json';

// Frontend catalog only: names, identities, groups and units. No prices or ML readiness.
export const materialCatalog = catalog.materials;
export const materials = materialCatalog;
export const materialCategories = catalog.categories.map(category => ({
  ...category,
  count: materialCatalog.filter(item => item.categoryCode === category.code).length,
}));
export const materialUnits = Object.freeze([...new Set(materialCatalog.map(item => item.unit))]);
const byId = new Map(materialCatalog.map(material => [material.id, material]));
export function getMaterialById(id) {
  const value = String(id ?? '');
  return byId.get(value) ?? byId.get(`MAT-${value}`) ?? null;
}
// Search folds case and the dots/spaces/hyphens people skip when typing: "sd40" finds "SD.40", "h beam" finds "H-Beam".
function fold(text) {
  return String(text ?? '').toLocaleLowerCase('th-TH').replace(/([a-z])[\s.]+(?=\d)/g, '$1').replace(/-/g, '').replace(/\s+/g, ' ').trim();
}
// Without a query the list runs category by category in the catalog's category order (rebar first), not by raw product code.
const categoryRank = new Map(catalog.categories.map((category, index) => [category.code, index]));
const searchIndex = materialCatalog.map((material, order) => ({ material, order: (categoryRank.get(material.categoryCode) ?? 99) * 10000 + order, name: fold(material.name), text: fold([material.id, material.name, material.category, material.unit].join(' ')) }));

/** Materials matching every typed word, best matches first (name starts with the first word, then catalog order). */
export function searchMaterials(query = '', { limit = 0, category = 'all' } = {}) {
  const terms = fold(query).split(' ').filter(Boolean);
  const hits = [];
  for (const row of searchIndex) {
    if (category !== 'all' && row.material.categoryCode !== category) continue;
    if (!terms.every(term => row.text.includes(term))) continue;
    let score = 0;
    if (terms.length) {
      if (row.name.startsWith(terms[0])) score += 4;
      if (terms.every(term => row.name.includes(term))) score += 2;
    }
    hits.push({ material: row.material, order: row.order, score });
  }
  hits.sort((a, b) => b.score - a.score || a.order - b.order);
  return (limit > 0 ? hits.slice(0, limit) : hits).map(hit => hit.material);
}
export const defaultMaterialId = materialCatalog.find(material => material.categoryCode === 'STR-01' && /SD[\s.]*40/i.test(material.name))?.id ?? materialCatalog[0]?.id ?? '';
export const dataMeta = Object.freeze({scope: 'structural', label: 'วัสดุงานโครงสร้าง', status: 'catalog-only'});
