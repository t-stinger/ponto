import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Papa from 'papaparse';
import { PDFDocument, PDFArray, PDFRawStream, decodePDFRawStream } from 'pdf-lib';
import { exportCsv, exportPdf } from '../src/io/outputs.ts';

test('CSV uses BOM and CRLF, retains commas, line breaks, decimal representations and zero IDs', () => {
  const bytes = exportCsv(['店舗', '売上', '備考'], [['001', 1234.56, '大分,駅前\n支店'], ['002', -0.25, '001.2300']]);
  assert.deepEqual([...bytes.slice(0, 3)], [239, 187, 191]);
  const csv = new TextDecoder().decode(bytes);
  assert.match(csv, /店舗,売上,備考\r\n/);
  assert.deepEqual(Papa.parse<string[]>(csv, { skipEmptyLines: true }).data, [
    ['店舗', '売上', '備考'], ['001', '1234.56', '大分,駅前\n支店'], ['002', '-0.25', '001.2300'],
  ]);
});

test('CSV neutralizes formula-like text including headers without modifying typed negative numbers', () => {
  const csv = new TextDecoder().decode(exportCsv(['=header', '値'], [['=SUM(A1)', -12], ['+cmd', 1], ['-text', 2], ['@x', 3], ['\ttab', 4], ['\rcmd', 5]]));
  const data = Papa.parse<string[]>(csv, { skipEmptyLines: true }).data;
  assert.deepEqual(data[0], ["'=header", '値']);
  assert.deepEqual(data.slice(1), [["'=SUM(A1)", '-12'], ["'+cmd", '1'], ["'-text", '2'], ["'@x", '3'], ["'\ttab", '4'], ["'\rcmd", '5']]);
});

test('CSV and PDF refuse inconsistent shapes and excessive output instead of truncating', async () => {
  assert.throws(() => exportCsv(['店舗'], [['A', 2]]), /一致/);
  assert.throws(() => exportCsv(Array(12).fill('列'), []), /11列/);
  assert.throws(() => exportCsv(['列'], Array(5001).fill(['A'])), /5,000行/);
  await assert.rejects(exportPdf(['列'], [[Infinity]], new Uint8Array()), /出力できない/);
});

test('Japanese PDF is landscape A4 and paginates full table with repeated headers', async () => {
  const font = await readFile(new URL('../public/fonts/NotoSansJP.ttf', import.meta.url));
  const bytes = await exportPdf(['店舗', '売上'], Array.from({ length: 80 }, (_, i) => [`大分店舗${i}`, 1000 + i]), font);
  const pdf = await PDFDocument.load(bytes);
  assert.equal(pdf.getPageCount(), 4); // 21 rows fit per page at 24 pt row height.
  let textDraws = 0;
  for (const page of pdf.getPages()) {
    assert.ok(Math.abs(page.getWidth() - 841.89) < 0.01);
    assert.ok(Math.abs(page.getHeight() - 595.28) < 0.01);
    const streams = page.node.Contents();
    assert.ok(streams instanceof PDFArray);
    for (const ref of streams.asArray()) {
      const stream = pdf.context.lookup(ref);
      assert.ok(stream instanceof PDFRawStream);
      const operations = new TextDecoder().decode(decodePDFRawStream(stream).decode());
      textDraws += operations.match(/\bTj\b/g)?.length ?? 0;
    }
  }
  assert.equal(textDraws, 80 * 2 + 4 * 2 + 4, 'all cells, headers on each page, page counters');
});

test('PDF carries oversized wrapped rows over pages and rejects unsupported glyphs explicitly', async () => {
  const font = await readFile(new URL('../public/fonts/NotoSansJP.ttf', import.meta.url));
  const bytes = await exportPdf(['店舗', '説明'], [['大分', 'あ'.repeat(3000)]], font);
  assert.ok((await PDFDocument.load(bytes)).getPageCount() > 1);
  await assert.rejects(exportPdf(['店舗'], [['🦄']], font), /表示できない文字/);
});

test('boolean classifications remain printable in CSV and PDF',async()=>{assert.match(new TextDecoder().decode(exportCsv(['有効','件数'],[[true,2],[false,1]])),/true,2/);const font=await readFile(new URL('../public/fonts/NotoSansJP.ttf',import.meta.url));assert.ok((await exportPdf(['有効','件数'],[[true,2]],font)).length>100);});

test('Excel keeps numeric classification IDs and counts unformatted',async()=>{const {exportXlsx}=await import('../src/io/tables.ts');const {default:ExcelJS}=await import('exceljs');const bytes=await exportXlsx(['ID','平均','件数'],[[123,2.5,2]],2,{total:0,accepted:2,excluded:0,metrics:[{label:'平均',value:2.5},{label:'件数',value:2}]},[1]);const w=new ExcelJS.Workbook();await w.xlsx.load(bytes as any);assert.equal(w.getWorksheet('Result')!.getCell('A2').numFmt,undefined);assert.equal(w.getWorksheet('Result')!.getCell('B2').numFmt,'0.00');assert.equal(w.getWorksheet('Result')!.getCell('C2').numFmt,undefined);assert.equal(w.getWorksheet('Summary')!.getCell('B3').numFmt,'0');});

test('source audit conserves rows per input and globally, including excluded-only duplicate names',async()=>{
 const {aggregate}=await import('../src/domain/aggregate.ts');
 const {aggregateFlexible}=await import('../src/domain/flexible.ts');
 const sources=[
  {source:'=same.csv',headers:['店舗','売上','状態'],rows:[['A','10','完了'],['A','20','取消']],blankRows:2},
  {source:'=same.csv',headers:['店舗','売上','状態'],rows:[['B','30','取消']],blankRows:1},
 ];
 const recipe={version:2,groups:[{column:'店舗',label:'店舗'}],metrics:[{column:'売上',operation:'sum',label:'合計'},{column:'',operation:'count',label:'件数'},{column:'売上',operation:'average',label:'平均'},{column:'売上',operation:'min',label:'最小'},{column:'売上',operation:'max',label:'最大'}],filter:{column:'状態',excludedValue:'取消'},decimalPlaces:2};
 const flexible=aggregateFlexible(sources,recipe);
 const fixed=aggregate(sources,{groupColumn:'店舗',amountColumn:'売上',statusColumn:'状態',excludedStatus:'取消',decimalPlaces:2});
 for(const result of [fixed,flexible]){
  assert.deepEqual(result.sourceAudit!.map(s=>[s.sourceIndex,s.input,s.accepted,s.excluded,s.blankRows]),[[1,2,1,1,2],[2,1,0,1,1]]);
  for(const s of result.sourceAudit!)assert.equal(s.input,s.accepted+s.excluded);
  for(const key of ['input','accepted','excluded'] as const)assert.equal(result.sourceAudit!.reduce((n,s)=>n+s[key],0),result.counts[key]);
  assert.equal(result.sourceAudit!.reduce((n,s)=>n+(s.metrics[0].value??0),0),result.grandTotal);
 }
 assert.deepEqual(flexible.sourceAudit![1].metrics.map(m=>m.value),[0,0,null,null,null]);
 const {exportXlsx,readXlsx,auditTables}=await import('../src/io/tables.ts');
 const {default:ExcelJS}=await import('exceljs');
 const audit={sources:flexible.sourceAudit!,recipe};
 const bytes=await exportXlsx(flexible.headers,flexible.rows,2,{total:10,accepted:1,excluded:2,metrics:flexible.summaries},[1,3,4,5],audit);
 const book=new ExcelJS.Workbook();await book.xlsx.load(bytes as any);
 assert.deepEqual(book.worksheets.map(s=>s.name),['Result','Summary','Sources','Conditions','SourceDetails']);
 assert.equal(book.getWorksheet('Sources')!.getCell('B2').type,ExcelJS.ValueType.String);
 assert.equal(book.getWorksheet('Sources')!.getCell('B2').value,'=same.csv');
 assert.equal(book.getWorksheet('Sources')!.getCell('I3').value,null);
 for(const table of auditTables(audit)){
  const restored=await readXlsx(bytes,'audit',table.name);
  assert.deepEqual(restored.headers,table.headers);assert.deepEqual(restored.rows,table.rows);
 }
 assert.deepEqual((await readXlsx(bytes,'result','Result')).rows,flexible.rows);
});

test('source details preserve original aliases and chosen Excel sheet on export and reread',async()=>{
 const {aggregateFlexible}=await import('../src/domain/flexible.ts');
 const {exportXlsx,readXlsx,auditTables}=await import('../src/io/tables.ts');
 const recipe={version:2,groups:[{column:'店舗',label:'店舗'}],metrics:[{column:'売上',operation:'sum',label:'合計'}],filter:null,decimalPlaces:2};
 const inputBook=await exportXlsx([' Store ','Sales'],[['A','0.004']]);
 const original=await readXlsx(inputBook,'one.xlsx','Result');
 assert.equal(original.sheetName,'Result');
 const mapped={...original,originalHeaders:[...original.headers],headers:['店舗','売上']};
 const r=aggregateFlexible([mapped],recipe),audit={sources:r.sourceAudit!,recipe};
 assert.deepEqual(r.sourceAudit![0].originalHeaders,[' Store ','Sales']);
 assert.deepEqual(r.sourceAudit![0].normalizedHeaders,['店舗','売上']);
 const bytes=await exportXlsx(r.headers,r.rows,2,{total:r.grandTotal,accepted:1,excluded:0,metrics:r.summaries},[1],audit);
 const details=await readXlsx(bytes,'out','SourceDetails');
 assert.deepEqual(details.rows,[[1,'one.xlsx','Result',1,' Store ','店舗'],[1,'one.xlsx','Result',2,'Sales','売上']]);
 for(const table of auditTables(audit))assert.deepEqual((await readXlsx(bytes,'out',table.name)).rows,table.rows);
});

test('audit records separate rounding boundaries instead of asserting rounded subtotals conserve money',async()=>{
 const {aggregateFlexible}=await import('../src/domain/flexible.ts');
 const {aggregate}=await import('../src/domain/aggregate.ts');
 const {auditTables}=await import('../src/io/tables.ts');
 const tables=['A','B'].map(source=>({source,headers:['店舗','売上'],rows:[[source,'0.004']],blankRows:0}));
 const recipe={version:2,groups:[{column:'店舗',label:'店舗'}],metrics:[{column:'売上',operation:'sum',label:'合計'}],filter:null,decimalPlaces:2};
 const flexible=aggregateFlexible(tables,recipe);
 const fixed=aggregate(tables,{groupColumn:'店舗',amountColumn:'売上',statusColumn:'',excludedStatus:'',excludeEnabled:false,decimalPlaces:2});
 for(const r of [fixed,flexible]){
  assert.equal(r.grandTotal,0.01);
  assert.deepEqual(r.sourceAudit!.map(s=>s.metrics[0].value),[0,0]);
  assert.notEqual(r.sourceAudit!.reduce((n,s)=>n+(s.metrics[0].value??0),0),r.grandTotal);
 }
 assert.match(String(auditTables({sources:flexible.sourceAudit!,recipe}).find(t=>t.name==='Conditions')!.rows.find(row=>row[0]==='集計値の丸め')![1]),/一致しない場合/);
});
