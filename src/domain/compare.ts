import { Decimal } from 'decimal.js';
import type { Table, Cell } from '../io/tables.ts';
import type { Result } from './aggregate.ts';
export type Difference = { row: number; column: string; expected: Cell | undefined; actual: Cell | undefined };
export function compare(result: Result, reference: Table) {
  let total = 0; const differences: Difference[] = [];
  const add = (row: number, column: string, expected: Cell | undefined, actual: Cell | undefined) => { total++; if (differences.length < 20) differences.push({ row, column, expected, actual }); };
  for (let c = 0; c < Math.max(result.headers.length, reference.headers.length); c++) {
    if (result.headers[c] !== reference.headers[c]) add(1, `列${c + 1}`, reference.headers[c], result.headers[c]);
  }
  for (let r = 0; r < Math.max(result.rows.length, reference.rows.length); r++) {
    for (let c = 0; c < Math.max(result.headers.length, reference.headers.length); c++) {
      const expected = reference.rows[r]?.[c], actual = result.rows[r]?.[c];
      let equal = expected === actual;
      // Numeric columns accept plain decimal CSV text. Never treat a blank as zero.
      if (c === 1 || c === 2) {
        const plain = (x: unknown) => (typeof x === 'string' || typeof x === 'number') && /^[+-]?\d+(\.\d+)?$/.test(String(x));
        equal = plain(expected) && plain(actual) && new Decimal(String(expected)).sd() <= 15 && new Decimal(String(expected)).eq(String(actual));
        if (c === 2 && equal) equal = new Decimal(String(expected)).isInteger();
      }
      if (!equal) add(r + 2, result.headers[c] ?? `列${c + 1}`, expected, actual);
    }
  }
  return { matches: total === 0, total, differences };
}
