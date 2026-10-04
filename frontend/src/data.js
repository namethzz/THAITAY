import { LayoutDashboard, Boxes, TrendingUp, Activity, Calculator } from 'lucide-react';
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
export function searchMaterials(query = '', limit = materialCatalog.length) {
  const terms = String(query).trim().toLocaleLowerCase('th-TH').split(/\s+/).filter(Boolean);
  return materialCatalog.filter(material => terms.every(term => [material.id, material.name, material.category, material.unit].join(' ').toLocaleLowerCase('th-TH').includes(term))).slice(0, Math.max(1, Number(limit) || materialCatalog.length));
}
export const defaultMaterialId = materialCatalog.find(material => material.categoryCode === 'STR-01' && /SD[\s.]*40/i.test(material.name))?.id ?? materialCatalog[0]?.id ?? '';
export const dataMeta = Object.freeze({scope: 'structural', label: 'วัสดุงานโครงสร้าง', status: 'catalog-only'});
// Reserved for the future price integration. Frontend does not fetch or calculate prices.
export const priceData = [];
export const forecastData = [];
export const navItems = [
  ['overview', 'ภาพรวม', LayoutDashboard],
  ['prices', 'รายการวัสดุ', Boxes],
  ['analysis', 'วิเคราะห์การเปลี่ยนแปลงราคา', Activity],
  ['forecast', 'พยากรณ์ราคา 1–3 เดือน', TrendingUp],
  ['cost', 'คำนวณต้นทุน', Calculator],
];
