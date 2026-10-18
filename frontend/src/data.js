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

// Words people use on site → how the catalog names things. "ปูน" on site usually means concrete (cement bags are not in this catalog).
const ALIASES = [
  [/ปูนหยาบ/g, 'คอนกรีตหยาบ'],
  [/ปูน(?:ผสมเสร็จ)?(?!ซีเมนต์|หยาบ)/g, 'คอนกรีตผสมเสร็จ'],
  [/เหล็กข้ออ้อย/g, 'ข้ออ้อย'],
  [/เหล็กกลม/g, 'กลมผิวเรียบ'],
  [/ไวร์เมช|wire ?mesh/g, 'ตะแกรง'],
  [/ลวดอัดแรง|pc ?wire|pc ?strand/g, 'ลวดเหล็กเสริมคอนกรีตอัดแรง'],
  [/ไอบีม/g, 'ibeam'],
  [/เอชบีม/g, 'hbeam'],
];
// Bar sizes: DB12 = deformed bar 12 mm (SD), RB9 = round bar 9 mm (SR), "4 หุน" = 1/2 inch ≈ 12 mm, "12 มม" = 12 mm.
const HUN_MM = { 2: '6', 3: '9|10', 4: '12', 5: '15|16', 6: '19|20', 8: '25' };
function queryTerms(query) {
  let text = fold(query);
  for (const [pattern, replacement] of ALIASES) text = text.replace(pattern, replacement);
  text = text
    .replace(/\bdb ?(\d+)\b/g, 'ข้ออ้อย @mm:$1')
    .replace(/\brb ?(\d+)\b/g, 'กลมผิวเรียบ @mm:$1')
    .replace(/(\d) ?หุน/g, (_, n) => (HUN_MM[n] ? `@mm:${HUN_MM[n]}` : `${n} หุน`))
    .replace(/(?<![\d.@:|])(\d+(?:\.\d+)?) ?มม\.?/g, '@mm:$1');
  return text.split(' ').filter(Boolean).map(term => term.startsWith('@mm:')
    ? new RegExp(`(?:^|[^\\d.]|ศก\\.)(?:${term.slice(4).replace(/\./g, '\\.')}) ?มม`)
    : term);
}
const matches = (text, term) => (typeof term === 'string' ? text.includes(term) : term.test(text));

/** Materials matching every typed word, best matches first (name starts with the first word, then catalog order). */
export function searchMaterials(query = '', { limit = 0, category = 'all' } = {}) {
  const terms = queryTerms(query);
  const first = typeof terms[0] === 'string' ? terms[0] : null;
  const hits = [];
  for (const row of searchIndex) {
    if (category !== 'all' && row.material.categoryCode !== category) continue;
    if (!terms.every(term => matches(row.text, term))) continue;
    let score = 0;
    if (terms.length) {
      if (first && row.name.startsWith(first)) score += 4;
      if (terms.every(term => matches(row.name, term))) score += 2;
    }
    hits.push({ material: row.material, order: row.order, score });
  }
  hits.sort((a, b) => b.score - a.score || a.order - b.order);
  return (limit > 0 ? hits.slice(0, limit) : hits).map(hit => hit.material);
}
export const defaultMaterialId = materialCatalog.find(material => material.categoryCode === 'STR-01' && /SD[\s.]*40/i.test(material.name))?.id ?? materialCatalog[0]?.id ?? '';
export const dataMeta = Object.freeze({scope: 'structural', label: 'วัสดุงานโครงสร้าง', status: 'catalog-only'});
