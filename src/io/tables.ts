import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { Unzip, UnzipInflate } from 'fflate';
import { DataError } from './errors.ts';
export { DataError } from './errors.ts';

export type Cell = string | number | boolean | null;
export type Table = { headers: string[]; rows: Cell[][]; source: string; blankRows: number };
export function tableFromRows(rows: Cell[][], source: string): Table {
  if (!rows.length || !rows[0].length) throw new DataError('TABLE_AMBIGUOUS', `${source}: 表がありません`);
  const headers = rows[0].map(c => typeof c === 'string' ? c : '');
  const normalized = headers.map(x => x.normalize('NFC').trim());
  if (headers.length > 50 || normalized.some(x => !x) || new Set(normalized).size !== headers.length)
    throw new DataError('TABLE_AMBIGUOUS', `${source}: 見出しが空・重複、または50列を超えています`);
  let blankRows = 0;
  const data = rows.slice(1).filter(row => {
    if (row.every(c => c === null || c === '')) { blankRows++; return false; }
    return true;
  });
  if (data.length > 5000) throw new DataError('INPUT_LIMIT', `${source}: 5000行を超えています`);
  for (const row of data) {
    if (row.length !== headers.length) throw new DataError('TABLE_AMBIGUOUS', `${source}: 列数が一致しません`);
    if (row.some(c => typeof c === 'string' && c.length > 2000)) throw new DataError('INPUT_LIMIT', `${source}: セルが2000文字を超えています`);
  }
  return { headers, rows: data, source, blankRows };
}
export function readCsv(bytes: Uint8Array, source: string): Table {
  if (bytes.length > 5 * 1024 * 1024) throw new DataError('INPUT_LIMIT', `${source}: 5MiBを超えています`);
  let text: string;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new DataError('INPUT_FORMAT', `${source}: UTF-8で読めません`); }
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { delimiter: ',', dynamicTyping: false, skipEmptyLines: true });
  if (parsed.errors.length) throw new DataError('INPUT_FORMAT', `${source}: CSVの引用符等が不正です`);
  return tableFromRows(parsed.data, source);
}
// Count actual inflated bytes rather than trusting ZIP header sizes.
export function inspectZip(bytes: Uint8Array, maxBytes = 40 * 1024 * 1024): void {
  let entries = 0, total = 0;
  let failure: DataError | undefined;
  const names = new Set<string>();
  const unzip = new Unzip(file => {
    entries++;
    if (entries > 2000 || names.has(file.name) || file.name.startsWith('/') || file.name.split('/').includes('..'))
      throw new DataError('INPUT_FORMAT', 'ZIPの構造が不正です');
    names.add(file.name);
    if (/\.(zip|xlsx|xlsm)$/i.test(file.name) || /vbaProject\.bin$/i.test(file.name))
      throw new DataError('INPUT_FORMAT', '入れ子のアーカイブ・マクロは対象外です');
    file.ondata = (error, data) => {
      if (failure) return;
      if (error) { failure = new DataError('INPUT_FORMAT', 'ZIPを展開できません'); return; }
      total += data.length;
      if (total > maxBytes) { failure = new DataError('INPUT_LIMIT', 'XLSXの実際の展開量が上限を超えています'); file.terminate?.(); }
    };
    file.start();
  });
  unzip.register(UnzipInflate);
  try {
    for (let offset = 0; offset < bytes.length; offset += 1024) {
      unzip.push(bytes.subarray(offset, offset + 1024), offset + 1024 >= bytes.length);
      if (failure) throw failure;
    }
  } catch (e) {
    if (e instanceof DataError) throw e;
    throw new DataError('INPUT_FORMAT', '不正・暗号化されたZIPは読めません');
  }
  if (!names.has('[Content_Types].xml') || !names.has('xl/workbook.xml')) throw new DataError('INPUT_FORMAT', 'Excelブックではありません');
}
export async function readXlsx(bytes: Uint8Array, source: string, sheetName: string): Promise<Table> {
  if (bytes.length > 5 * 1024 * 1024) throw new DataError('INPUT_LIMIT', `${source}: 5MiBを超えています`);
  inspectZip(bytes);
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(bytes as unknown as ExcelJS.Buffer); }
  catch { throw new DataError('INPUT_FORMAT', `${source}: ブックを読めません`); }
  const sheet = workbook.getWorksheet(sheetName);
  if (!sheet) throw new DataError('TABLE_AMBIGUOUS', `${source}: 指定シートがありません`);
  if (sheet.rowCount > 5001 || sheet.columnCount > 50) throw new DataError('INPUT_LIMIT', `${source}: 表の上限を超えています`);
  const rows: Cell[][] = [];
  for (let r = 1; r <= sheet.rowCount; r++) {
    const row: Cell[] = [];
    if (sheet.getRow(r).hidden) throw new DataError('TABLE_AMBIGUOUS', `${source}: 隠し行の確認は未実装です`);
    for (let c = 1; c <= sheet.columnCount; c++) {
      const cell = sheet.getCell(r, c), value = cell.value;
      if (cell.isMerged || sheet.getColumn(c).hidden) throw new DataError('TABLE_AMBIGUOUS', `${source}: 結合セル・隠し列は確認が必要です`);
      if (cell.type === ExcelJS.ValueType.Formula) throw new DataError('FORMULA_UNSUPPORTED', `${source}:${cell.address}: 数式は対象外です`);
      if (value instanceof Date) throw new DataError('DATE_PENDING', `${source}:${cell.address}: 日付方式の検証は次の作業です`);
      if (value !== null && !['string', 'number', 'boolean'].includes(typeof value))
        throw new DataError('INPUT_FORMAT', `${source}:${cell.address}: 値以外のセルは対象外です`);
      // Do not silently turn a displayed zero-padded number into a plain number.
      if (typeof value === 'number' && /^0{2,}$/.test(cell.numFmt))
        throw new DataError('BINDING_REQUIRED', `${source}:${cell.address}: 先頭ゼロのIDか数値か確認が必要です`);
      row.push(value as Cell);
    }
    rows.push(row);
  }
  return tableFromRows(rows, source);
}
export async function exportXlsx(headers: string[], rows: Cell[][], decimalPlaces?: number, summary?: {total:number;accepted:number;excluded:number;metrics?:{label:string;value:number}[]}, decimalColumns?:number[]): Promise<Uint8Array> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Result');
  sheet.addRow(headers); rows.forEach(row => sheet.addRow(row));
  if (decimalPlaces !== undefined) {
    if (!Number.isInteger(decimalPlaces) || decimalPlaces < 0 || decimalPlaces > 10) throw new Error('小数桁は0〜10を指定してください');
    const format = decimalPlaces ? '0.' + '0'.repeat(decimalPlaces) : '0';
    rows.forEach((row, i) => { row.forEach((value,j)=>{if(typeof value==='number' && (decimalColumns??[1]).includes(j))sheet.getCell(i+2,j+1).numFmt=format;}); });
  }
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.columns.forEach(col => { col.width = 18; });
  if(summary){
    const totals=workbook.addWorksheet('Summary');
    totals.addRow(['項目','値']);if(summary.metrics)summary.metrics.forEach(m=>totals.addRow(['全体：'+m.label,m.value]));else totals.addRow(['全体合計',summary.total]);totals.addRow(['採用行数',summary.accepted]);totals.addRow(['除外行数',summary.excluded]);
    if(summary.metrics)summary.metrics.forEach((m,i)=>{totals.getCell(i+2,2).numFmt=(decimalColumns??[]).includes(headers.length-summary.metrics!.length+i)&&decimalPlaces?'0.'+'0'.repeat(decimalPlaces):'0';});else totals.getCell('B2').numFmt=decimalPlaces?'0.'+'0'.repeat(decimalPlaces):'0';
    totals.getRow(1).font={bold:true};totals.columns.forEach(col=>{col.width=20;});
  }
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
