import fs from 'node:fs';
import crypto from 'node:crypto';

export function parseCsv(text) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && (c === ',' || c === '\n')) { row.push(cell.replace(/\r$/, '')); cell = ''; if (c === '\n') { rows.push(row); row = []; } }
    else cell += c;
  }
  if (quoted) throw new Error('Unclosed CSV quote');
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  const header = rows.shift().map(s => s.replace(/^\uFEFF/, ''));
  return rows.filter(r => r.some(Boolean)).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

const source = new URL('../../ml/api_data/prices.csv', import.meta.url);
const csv = fs.readFileSync(source, 'utf8');
const catalog = JSON.parse(fs.readFileSync(new URL('../src/data/structural-materials.json', import.meta.url), 'utf8')).materials;
const wanted = new Map(catalog.filter(m => !m.discontinued).map(m => [m.id, m]));
const rows = parseCsv(csv).filter(r => wanted.has(r.material_id));
const asOf = rows.map(r => r.date).sort().at(-1);
if (!asOf) throw new Error('No real history for charts');
const start = new Date(asOf + 'T00:00:00Z'); start.setUTCMonth(start.getUTCMonth() - 23);
const firstMonth = start.toISOString().slice(0, 10);
const materials = {}; const keys = new Set();
for (const r of rows) {
  const price = Number(r.price); const material = wanted.get(r.material_id);
  if (!/^\d{4}-\d{2}-01$/.test(r.date) || !Number.isFinite(price) || price <= 0 || material.unit !== r.unit) throw new Error('Invalid chart price/unit/date: ' + r.material_id);
  const key = r.material_id + '/' + r.date;
  if (keys.has(key)) throw new Error('Duplicate chart observation: ' + key); keys.add(key);
  if (r.date < firstMonth) continue;
  materials[r.material_id] ??= {unit: r.unit, points: []};
  materials[r.material_id].points.push({date: r.date, price});
}
for (const value of Object.values(materials)) value.points.sort((a, b) => a.date.localeCompare(b.date));
const output = new URL('../public/data/chart-history.json', import.meta.url);
fs.mkdirSync(new URL('../public/data/', import.meta.url), {recursive: true});
fs.writeFileSync(output, JSON.stringify({asOf, firstMonth, sourceSha256: crypto.createHash('sha256').update(csv).digest('hex'), materials}));
console.log(`Chart history: ${Object.keys(materials).length} materials, ${firstMonth} to ${asOf}; real observations only`);
