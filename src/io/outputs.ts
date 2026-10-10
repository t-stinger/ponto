import Papa from 'papaparse';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { DataError } from './errors.ts';

type Cell = string | number | boolean;
function validate(headers: string[], rows: Cell[][]): void {
  if (!headers.length || headers.length > 11 || rows.length > 5000)
    throw new DataError('OUTPUT_LIMIT', '出力は11列・5,000行までです。');
  if (headers.some(h => typeof h !== 'string' || !h.trim()) || rows.some(r => r.length !== headers.length))
    throw new DataError('OUTPUT_SHAPE', '出力する列と行が一致しません。');
  for (const c of [...headers, ...rows.flat()]) {
    if ((typeof c !== 'string' && typeof c !== 'number' && typeof c !== 'boolean') || (typeof c === 'number' && !Number.isFinite(c)))
      throw new DataError('OUTPUT_VALUE', '出力できない値があります。');
    if (String(c).length > 10000)
      throw new DataError('OUTPUT_LIMIT', 'ひとつのセルは10,000文字までです。');
  }
}

/** BOM for Excel, CRLF records, and formula-safe text; numeric cells remain numbers. */
export function exportCsv(headers: string[], rows: Cell[][]): Uint8Array {
  validate(headers, rows);
  const safe = (v: Cell): Cell => typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  const csv = Papa.unparse([headers.map(safe), ...rows.map(r => r.map(safe))], { newline: '\r\n' });
  return new TextEncoder().encode(`\uFEFF${csv}\r\n`);
}

const W = 841.89, H = 595.28, M = 28, FONT_SIZE = 9, LINE = 14, PAD = 5;
function wrap(text: string, font: PDFFont, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.replace(/\r\n?/g, '\n').split('\n')) {
    let line = '';
    for (const char of paragraph) {
      if (font.widthOfTextAtSize(line + char, FONT_SIZE) > width && line) { lines.push(line); line = ''; }
      if (font.widthOfTextAtSize(char, FONT_SIZE) > width)
        throw new DataError('PDF_LAYOUT', '文字を表示する列幅が足りません。');
      line += char;
    }
    lines.push(line);
  }
  return lines;
}

/** Japanese font is supplied by caller from /fonts/NotoSansJP.ttf. No network inside exporter. */
export async function exportPdf(headers: string[], rows: Cell[][], fontBytes: Uint8Array): Promise<Uint8Array> {
  validate(headers, rows);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // Full embedding avoids variable-font subsetting corruption in fontkit.
  const font = await doc.embedFont(fontBytes, { subset: false });
  const supported = new Set(font.getCharacterSet());
  for (const text of [...headers, ...rows.flat().map(String)]) {
    for (const char of text.replace(/[\r\n]/g, '')) {
      if (!supported.has(char.codePointAt(0)!))
        throw new DataError('PDF_CHARACTER', 'PDFのフォントで表示できない文字があります。CSVまたはExcelを選んでください。');
    }
  }
  const width = (W - 2 * M) / headers.length;
  const head = headers.map(h => wrap(h, font, width - PAD * 2));
  const headLines = Math.max(...head.map(l => l.length));
  const headHeight = headLines * LINE + PAD * 2;
  if (headHeight > 120) throw new DataError('PDF_LAYOUT', 'PDFの列名が長すぎます。短くするかCSV・Excelを選んでください。');
  let page: PDFPage;
  let y: number;
  const draw = (cells: string[][], offset: number, count: number, header = false) => {
    const height = count * LINE + PAD * 2;
    cells.forEach((lines, col) => {
      const x = M + col * width;
      page.drawRectangle({ x, y: y - height, width, height, borderWidth: 0.4, borderColor: rgb(0.8, 0.81, 0.85), ...(header ? { color: rgb(0.93, 0.93, 0.97) } : {}) });
      lines.slice(offset, offset + count).forEach((line, i) => {
        if (line) page.drawText(line, { x: x + PAD, y: y - PAD - FONT_SIZE - i * LINE, size: FONT_SIZE, font, color: rgb(0.15, 0.16, 0.2) });
      });
    });
    y -= height;
  };
  const newPage = () => {
    if (doc.getPageCount() >= 1000) throw new DataError('PDF_LAYOUT', 'PDFが1,000ページを超えます。CSV・Excelを選んでください。');
    page = doc.addPage([W, H]); y = H - M;
    draw(head, 0, headLines, true);
  };
  newPage();
  for (const row of rows) {
    const cells = row.map(c => wrap(String(c), font, width - PAD * 2));
    const lineCount = Math.max(...cells.map(c => c.length));
    const fullHeight = lineCount * LINE + PAD * 2;
    // Keep a row together where possible; otherwise carry all its lines onto following pages.
    if (fullHeight <= H - 2 * M - headHeight && y! - fullHeight < M) newPage();
    let offset = 0;
    while (offset < lineCount) {
      const room = Math.floor((y! - M - PAD * 2) / LINE);
      if (room < 1) { newPage(); continue; }
      const count = Math.min(room, lineCount - offset);
      draw(cells, offset, count); offset += count;
      if (offset < lineCount) newPage();
    }
  }
  doc.getPages().forEach((p, i) => p.drawText(`${i + 1} / ${doc.getPageCount()}`, { x: W - M - 70, y: 12, size: 8, font }));
  return doc.save();
}
