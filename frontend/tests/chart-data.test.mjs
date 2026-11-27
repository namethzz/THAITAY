import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const root = new URL('../', import.meta.url);
const code = fs.readFileSync(new URL('src/lib/chartData.ts', root), 'utf8');
const compiled = ts.transpileModule(code, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText.replaceAll('"react"', JSON.stringify(import.meta.resolve('react'))).replaceAll('import.meta.env.BASE_URL', '"/"');
const {calendarSeries, marketRow, monthlyChanges, comparisonSeries, costBreakdown, shiftMonth} = await import('data:text/javascript;base64,' + Buffer.from(compiled).toString('base64'));
const catalog = JSON.parse(fs.readFileSync(new URL('src/data/structural-materials.json', root))).materials.filter(m => !m.discontinued);
const snapshot = JSON.parse(fs.readFileSync(new URL('public/data/chart-history.json', root)));

test('calendar gaps stay null rather than interpolated', () => {
  const rows = calendarSeries([{date:'2026-01-01',price:100},{date:'2026-03-01',price:120}], '2026-03-01', 3);
  assert.deepEqual(rows.map(r => r.actual), [100,null,120]);
  assert.equal(shiftMonth('2026-01-01',-1),'2025-12-01');
});
test('monthly rankings require two exact adjacent months and matching units', () => {
  const a={id:'A',unit:'ตัน',categoryCode:'x'}, b={id:'B',unit:'ท่อน',categoryCode:'x'};
  const data={asOf:'2026-03-01',materials:{A:{unit:'ตัน',points:[{date:'2026-02-01',price:100},{date:'2026-03-01',price:110}]},B:{unit:'ท่อน',points:[{date:'2026-01-01',price:10},{date:'2026-03-01',price:12}]}}};
  const rows=monthlyChanges(data,[a,b]);
  assert.equal(rows.length,1);assert.ok(Math.abs(rows[0].change-10)<1e-9);
  assert.equal(monthlyChanges(data,[{...a,unit:'กก.'}]).length,0);
});
test('comparison uses the first common base, not separate starting dates', () => {
  const data={asOf:'2026-03-01',materials:{A:{points:[{date:'2026-01-01',price:100},{date:'2026-02-01',price:110},{date:'2026-03-01',price:121}]},B:{points:[{date:'2026-02-01',price:200},{date:'2026-03-01',price:220}]}}};
  const result=comparisonSeries(data,['A','B'],3);
  assert.equal(result.base,'2026-02-01');assert.equal(result.points[0].A,100);assert.equal(result.points[0].B,100);
  assert.ok(Math.abs(result.points[1].A-110)<1e-9);assert.ok(Math.abs(result.points[1].B-110)<1e-9);
});

test('reference month preserves one-sided prices without borrowing newer or older values', () => {
  const material = {id: 'A', unit: 'ตัน'};
  const data = {asOf: '2026-03-01', materials: {A: {unit: 'ตัน', points: [
    {date: '2025-12-01', price: 80}, {date: '2026-01-01', price: 100}, {date: '2026-03-01', price: 110}
  ]}}};
  assert.deepEqual(marketRow(data, material, '2026-01-01'), {material, previous: 80, latest: 100, change: 25, status: 'up'});
  assert.deepEqual(marketRow(data, material, '2026-02-01'), {material, previous: 100, latest: null, change: null, status: 'missing'});
  assert.deepEqual(marketRow(data, material, data.asOf), {material, previous: null, latest: 110, change: null, status: 'missing'});
  assert.equal(marketRow(data, {...material, unit: 'กก.'}, data.asOf).latest, null);
});

test('trend range can end before the latest reference month', () => {
  const points = [{date: '2026-01-01', price: 10}, {date: '2026-02-01', price: 15}, {date: '2026-03-01', price: 20}];
  const data = {asOf: '2026-03-01', materials: {A: {points}, B: {points}}};
  const result = comparisonSeries(data, ['A', 'B'], 2, '2026-02-01');
  assert.equal(result.base, '2026-01-01');
  assert.deepEqual(result.points.map(p => [p.date, p.A]), [['2026-01-01', 100], ['2026-02-01', 150]]);
});
test('comparison gaps remain missing and never imply price stability', () => {
  const data={asOf:'2026-03-01',materials:{A:{points:[{date:'2026-01-01',price:100},{date:'2026-03-01',price:120}]},B:{points:[{date:'2026-01-01',price:200},{date:'2026-02-01',price:210}]}}};
  const result=comparisonSeries(data,['A','B'],3);
  assert.equal(result.points[1].A,null);assert.equal(result.points[2].B,null);
});
test('cost breakdown conserves material subtotal without adding tax or reserve', () => {
  const result=costBreakdown([{materialId:'A',name:'A',price:100,qty:2},{materialId:'A',name:'A',price:120,qty:1},{materialId:'B',name:'B',price:80,qty:1}]);
  assert.equal(result.total,400);assert.deepEqual(result.items.map(r=>r.value),[320,80]);
  assert.deepEqual(result.items.map(r=>r.share),[80,20]);
});
test('grouping many material costs preserves the total and percentage', () => {
  const result=costBreakdown(Array.from({length:20},(_,i)=>({materialId:String(i),name:String(i),price:i+1,qty:1})));
  assert.equal(result.items.length,12);assert.equal(result.total,210);
  assert.equal(result.items.reduce((s,r)=>s+r.value,0),210);
  assert.ok(Math.abs(result.items.reduce((s,r)=>s+r.share,0)-100)<1e-9);
});
test('real export covers 24 calendar months with one observation per material/month', () => {
  assert.equal(snapshot.firstMonth,shiftMonth(snapshot.asOf,-23));
  for(const m of catalog) {
    const series=snapshot.materials[m.id];assert.ok(series);assert.equal(series.unit,m.unit);
    const dates=series.points.map(p=>p.date);assert.equal(new Set(dates).size,dates.length);
    assert.ok(series.points.every(p=>p.date>=snapshot.firstMonth && p.date<=snapshot.asOf && Number.isFinite(p.price) && p.price>0));
  }
});
test('real market counts include only matching observations', () => {
  const rows=monthlyChanges(snapshot,catalog);
  assert.ok(rows.length<=catalog.length);
  for(const r of rows) {
    const points=snapshot.materials[r.material.id].points;
    assert.equal(r.latest,points.find(p=>p.date===snapshot.asOf).price);
    assert.equal(r.previous,points.find(p=>p.date===shiftMonth(snapshot.asOf,-1)).price);
  }
  console.log(`Real chart data: ${catalog.length} active materials; ${rows.length} comparable; ${catalog.length-rows.length} excluded`);
});
