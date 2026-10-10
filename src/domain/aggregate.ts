import { Decimal } from 'decimal.js';
import { z } from 'zod';
import { DataError } from '../io/errors.ts';
import type { Cell, Table } from '../io/tables.ts';

// Narrow fixed-recipe probe, not the full production Recipe schema or AI interpreter.
export const FixedRecipe = z.object({
  groupColumn: z.string().min(1), amountColumn: z.string().min(1),
  statusColumn: z.string(), excludedStatus: z.string(),
  excludeEnabled: z.boolean().default(true),
  outputHeaders: z.tuple([z.string().min(1), z.string().min(1), z.string().min(1)]).default(['拠点','合計','件数']),
  decimalPlaces: z.number().int().min(0).max(10),
}).strict();
export const fixedRecipe = { groupColumn: '拠点', amountColumn: '金額', statusColumn: '状態', excludedStatus: '取消', decimalPlaces: 2 };
const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Result = { headers: string[]; rows: Cell[][]; grandTotal: number; counts: { input: number; accepted: number; excluded: number; unprocessed: number; output: number } };
export function aggregate(tables: Table[], unknownRecipe: unknown): Result {
  const recipe = FixedRecipe.parse(unknownRecipe);
  if (!tables.length || tables.length > 10) throw new DataError('INPUT_LIMIT', 'ファイル数が範囲外です');
  if (recipe.excludeEnabled && (!recipe.statusColumn || !recipe.excludedStatus)) throw new DataError('BINDING_REQUIRED', '除外条件の列と値が必要です');
  if (new Set(recipe.outputHeaders).size !== 3) throw new DataError('BINDING_REQUIRED', '出力列名が重複しています');
  const groups = new Map<string, { total: Decimal; count: number }>();
  let input = 0, accepted = 0, excluded = 0;
  let grandTotal = new Money(0);
  for (const table of tables) {
    const normalized = table.headers.map(s => s.normalize('NFC').trim());
    const indexes = [recipe.groupColumn, recipe.amountColumn, ...(recipe.excludeEnabled ? [recipe.statusColumn] : [])].map(name => normalized.indexOf(name));
    if (indexes.some(i => i < 0)) throw new DataError('BINDING_REQUIRED', `${table.source}: 必要な列がありません`);
    for (const row of table.rows) {
      input++;
      if (input > 5000) throw new DataError('INPUT_LIMIT', '全体で5000行を超えています');
      const [group, amount, status] = indexes.map(i => row[i]);
      if (typeof group !== 'string' || !group || recipe.excludeEnabled && (typeof status !== 'string' || !status))
        throw new DataError('VALUE_INVALID', `${table.source}: 分類・状態の空欄や型を確認してください`);
      // Validate all amounts, including excluded rows; never silently coerce invalid values.
      if (typeof amount !== 'string' && typeof amount !== 'number') throw new DataError('VALUE_INVALID', `${table.source}: 金額が空欄です`);
      const literal = String(amount);
      if (!/^[+-]?\d+(\.\d+)?$/.test(literal) || typeof amount === 'number' && !Number.isFinite(amount))
        throw new DataError('VALUE_INVALID', `${table.source}: 金額の解釈が不明です`);
      const money = new Money(literal);
      if (money.sd() > 15) throw new DataError('VALUE_INVALID', `${table.source}: 有効15桁を超えています`);
      if (recipe.excludeEnabled && status === recipe.excludedStatus) { excluded++; continue; }
      accepted++;
      grandTotal = grandTotal.plus(money);
      if (grandTotal.sd() > 15) throw new DataError('VALUE_INVALID', '全体合計が有効15桁を超えています');
      const entry = groups.get(group) ?? { total: new Money(0), count: 0 };
      entry.total = entry.total.plus(money); entry.count++;
      if (entry.total.sd() > 15) throw new DataError('VALUE_INVALID', '合計が有効15桁を超えています');
      groups.set(group, entry);
    }
  }
  const rows: Cell[][] = [...groups].map(([name, v]) => [name, Number(v.total.toDecimalPlaces(recipe.decimalPlaces).toString()), v.count]);
  return { headers: recipe.outputHeaders, rows, grandTotal:Number(grandTotal.toDecimalPlaces(recipe.decimalPlaces).toString()), counts: { input, accepted, excluded, unprocessed: 0, output: rows.length } };
}
