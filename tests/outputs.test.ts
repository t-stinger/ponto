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
