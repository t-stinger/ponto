import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { zipSync, strToU8 } from 'fflate';
import { readCsv, readXlsx, exportXlsx, inspectZip, DataError, tableFromRows } from '../src/io/tables.ts';

test('overall total uses accepted original amounts before rounding each store',async()=>{
 const t=tableFromRows([['店舗','売上','状態'],['A','0.005','有効'],['B','0.005','有効'],['A','999','取消']],'fictional');
 const result=aggregate([t],{groupColumn:'店舗',amountColumn:'売上',statusColumn:'状態',excludedStatus:'取消',excludeEnabled:true,decimalPlaces:2});
 assert.equal(result.grandTotal,0.01);assert.deepEqual(result.rows,[['A',0.01,1],['B',0.01,1]]);
 const total=await readXlsx(await exportXlsx(result.headers,result.rows,2,{total:result.grandTotal,accepted:2,excluded:1}),'output','Summary');
 assert.deepEqual(total.rows,[['全体合計',0.01],['採用行数',2],['除外行数',1]]);
});
import { aggregate, fixedRecipe } from '../src/domain/aggregate.ts';
const fixture = (name: string) => readFile(new URL(`../technical-preparation-2026-10-09/fixtures/${name}`, import.meta.url));
const expectCode = (code: string) => (e: unknown) => e instanceof DataError && e.code === code;
const expected = JSON.parse(await fixture('expected.json').then(b => b.toString()));
const initial = async () => Promise.all(['input-a.csv', 'input-b.csv'].map(async n => readCsv(await fixture(n), n)));

test('independent initial expected sums and row partition', async () => {
 const result = aggregate(await initial(), fixedRecipe);
 assert.deepEqual(result.rows, expected.initial.rows.map(([g, s, n]: [string,string,number]) => [g, Number(s), n]));
 const { rows, ...counts } = expected.initial; assert.deepEqual(result.counts, counts);
});
test('unseen input with reordered columns uses same recipe', async () => {
 const result = aggregate([readCsv(await fixture('next-input.csv'), 'next')], fixedRecipe);
 assert.deepEqual(result.rows, expected.next.rows.map(([g,s,n]: [string,string,number]) => [g,Number(s),n]));
 const { rows, ...counts } = expected.next; assert.deepEqual(result.counts, counts);
});
test('CSV IDs retain leading zero', async () => assert.equal((await initial())[0].rows[0][0], '001'));
test('CSV comma and embedded newline stay in one cell', async () => {
 const t = readCsv(await fixture('csv-quoted-newline.csv'), 'quoted');
 assert.equal(t.rows[0][1], 'カンマ,を含む');
 assert.equal(String(t.rows[1][1]).replace(/\r\n/g,'\n'), '改行\nを含む');
 assert.equal(t.rows.length, 2);
});
test('CSV preserves both LF and CRLF inside quoted cells',()=>{
 for(const newline of ['\n','\r\n']) {
  const text=`ID,値\r\n001,"前${newline}後"\r\n`;
  assert.deepEqual(readCsv(strToU8(text),'line endings').rows,[['001',`前${newline}後`]]);
 }
});
test('invalid UTF8 stops', () => assert.throws(() => readCsv(new Uint8Array([255]), 'bad'), expectCode('INPUT_FORMAT')));
test('invalid amount stops rather than zero', async () => { const table=readCsv(await fixture('invalid-amount.csv'), 'bad'); assert.throws(() => aggregate([table], fixedRecipe), expectCode('VALUE_INVALID')); });
test('empty, duplicate and missing headers stop', () => {
 assert.throws(() => readCsv(strToU8('A,A\n1,2'), 'duplicate'), expectCode('TABLE_AMBIGUOUS'));
 assert.throws(() => readCsv(strToU8(',B\n1,2'), 'empty-header'), expectCode('TABLE_AMBIGUOUS'));
 assert.throws(() => aggregate([tableFromRows([['別名'], ['x']], 'missing')], fixedRecipe), expectCode('BINDING_REQUIRED'));
});
test('null, ambiguous numbers and excessive precision stop', () => {
 for (const value of [null, '1,000', '1e3', '0.1234567890123456']) {
  assert.throws(() => aggregate([tableFromRows([['拠点','金額','状態'],['北',value,'有効']], 'bad')], fixedRecipe), expectCode('VALUE_INVALID'));
 }
});
test('unknown recipe keys are rejected', async () => assert.throws(() => aggregate(awaitInitialSync(), {...fixedRecipe, code: 'fetch()'})));
function awaitInitialSync() { return [tableFromRows([['拠点','金額','状態'], ['北','1','有効']], 'inline')]; }
test('all excluded returns header-only result', () => {
 const result = aggregate([tableFromRows([['拠点','金額','状態'], ['北','1','取消']], 'inline')], fixedRecipe);
 assert.deepEqual(result.rows, []); assert.deepEqual(result.counts, {input:1,accepted:0,excluded:1,unprocessed:0,output:0});
});
test('same recipe/input gives same table', async () => {
 const input = await initial(); assert.deepEqual(aggregate(input,fixedRecipe), aggregate(input,fixedRecipe));
});
test('XLSX input and output roundtrip preserves numeric sums', async () => {
 const tables = await initial();
 const xlsx = await Promise.all(tables.map(async t => readXlsx(await exportXlsx(t.headers,t.rows),t.source,'Result')));
 const result = aggregate(xlsx,fixedRecipe);
 const reread = await readXlsx(await exportXlsx(result.headers,result.rows),'output','Result');
 assert.deepEqual(reread.headers, ['拠点','合計','件数']);
 assert.deepEqual(reread.rows, [['北',120.3,2],['南',10,1]]);
 assert.equal(xlsx[0].rows[0][0], '001');
});
test('formula-like strings are exported as text', async () => {
 const t=await readXlsx(await exportXlsx(['ID'],[['=1+1'],['+001'],['@name']]),'text','Result');
 assert.deepEqual(t.rows,[['=1+1'],['+001'],['@name']]);
});
async function specialWorkbook(modify: (w: ExcelJS.Worksheet) => void) {
 const b = new ExcelJS.Workbook(); const sheet = b.addWorksheet('Input'); sheet.addRow(['ID','値']);sheet.addRow(['001',1]);modify(sheet);
 return new Uint8Array(await b.xlsx.writeBuffer());
}
test('formula cached result is not silently used', async () => {
 const bytes=await specialWorkbook(s => {s.getCell('B2').value={formula:'1+1',result:2};});
 await assert.rejects(readXlsx(bytes,'formula','Input'),expectCode('FORMULA_UNSUPPORTED'));
});
test('merged cells stop', async () => {
 const bytes=await specialWorkbook(s => s.mergeCells('A2:B2'));
 await assert.rejects(readXlsx(bytes,'merged','Input'),expectCode('TABLE_AMBIGUOUS'));
});
test('hidden rows stop pending explicit confirmation', async () => {
 const bytes=await specialWorkbook(s => {s.getRow(2).hidden=true;});
 await assert.rejects(readXlsx(bytes,'hidden','Input'),expectCode('TABLE_AMBIGUOUS'));
});
test('date cells stop until date-system validation is implemented', async () => {
 const bytes=await specialWorkbook(s => {s.getCell('B2').value=new Date('2026-10-09T00:00:00Z');});
 await assert.rejects(readXlsx(bytes,'date','Input'),expectCode('DATE_PENDING'));
});
test('zero-padded numeric ID needs explicit meaning confirmation', async () => {
 const bytes=await specialWorkbook(s => {s.getCell('A2').value=1;s.getCell('A2').numFmt='000';});
 await assert.rejects(readXlsx(bytes,'id','Input'),expectCode('BINDING_REQUIRED'));
});
test('invalid zip stops', async () => await assert.rejects(readXlsx(strToU8('not a zip'),'bad','Input'),expectCode('INPUT_FORMAT')));
test('actual ZIP expansion enforces limit', () => {
 const zip=zipSync({'[Content_Types].xml':strToU8('x'),'xl/workbook.xml':strToU8('x'),'huge.txt':strToU8('a'.repeat(100000))});
 assert.throws(() => inspectZip(zip,1024),expectCode('INPUT_LIMIT'));
});

test('manual aggregation without exclusion needs no status column', () => {
  const result = aggregate([tableFromRows([['分類','数値'],['A','1.1'],['A','2.2']], 'manual')], { ...fixedRecipe, groupColumn:'分類', amountColumn:'数値', statusColumn:'', excludeEnabled:false, outputHeaders:['分類','合計','件数'] });
  assert.deepEqual(result.rows, [['A',3.3,2]]);
});
