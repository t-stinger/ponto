import { Decimal } from 'decimal.js';
import { z } from 'zod';
import { DataError } from '../io/errors.ts';
import type { Cell, Table } from '../io/tables.ts';
import type { Result } from './aggregate.ts';
export const MetricOperation = z.enum(['sum','count','average','min','max']);
export const FlexibleRecipe = z.object({
 version:z.literal(2),
 groups:z.array(z.object({column:z.string().trim().min(1),label:z.string().trim().min(1).max(200)}).strict()).max(3),
 metrics:z.array(z.object({column:z.string().trim(),operation:MetricOperation,label:z.string().trim().min(1).max(200)}).strict()).min(1).max(8),
 filter:z.object({column:z.string().trim().min(1),excludedValue:z.string().min(1).max(2000)}).strict().nullable(),
 decimalPlaces:z.number().int().min(0).max(10),
}).strict().superRefine((r,c)=>{
 const labels=[...r.groups,...r.metrics].map(x=>x.label.normalize('NFC'));
 if(new Set(labels).size!==labels.length)c.addIssue({code:'custom',message:'出力列名が重複しています'});
 if(new Set(r.groups.map(x=>x.column.normalize('NFC'))).size!==r.groups.length)c.addIssue({code:'custom',message:'分類列が重複しています'});
 r.metrics.forEach((m,i)=>{if(m.operation==='count'?m.column!=='':!m.column)c.addIssue({code:'custom',path:['metrics',i,'column'],message:'件数は全採用行を数えます。他の集計には数値列が必要です'});});
});
export type FlexibleRecipeValue = z.infer<typeof FlexibleRecipe>;
export type FlexibleResult = Result & {summaries:{label:string;value:number}[];groupCount:number};
const D=Decimal.clone({precision:40,rounding:Decimal.ROUND_HALF_UP});
type State={sum:Decimal;count:number;min:Decimal|null;max:Decimal|null};
const state=():State=>({sum:new D(0),count:0,min:null,max:null});
function numeric(value:Cell|undefined,source:string):Decimal{
 if(typeof value!=='string'&&typeof value!=='number')throw new DataError('VALUE_INVALID',`${source}: 数値列に空欄や数値以外があります`);
 const literal=String(value);
 if(!/^[+-]?\d+(\.\d+)?$/.test(literal)||typeof value==='number'&&!Number.isFinite(value))throw new DataError('VALUE_INVALID',`${source}: 数値の解釈が不明です`);
 const n=new D(literal);if(n.sd()>15)throw new DataError('VALUE_INVALID',`${source}: 有効15桁を超えています`);return n;
}
function add(s:State,n:Decimal|undefined){s.count++;if(!n)return;s.sum=s.sum.plus(n);if(s.sum.sd()>15)throw new DataError('VALUE_INVALID','合計が有効15桁を超えています');s.min=s.min===null?n:D.min(s.min,n);s.max=s.max===null?n:D.max(s.max,n);}
function value(s:State,operation:z.infer<typeof MetricOperation>,places:number):number{
 if(operation==='count')return s.count;
 const n=operation==='sum'?s.sum:operation==='average'?(s.count?s.sum.div(s.count):null):operation==='min'?s.min:s.max;
 if(n===null)throw new DataError('VALUE_INVALID','採用行がないため平均・最小・最大を計算できません');
 const rounded=n.toDecimalPlaces(places);if(rounded.sd()>15)throw new DataError('VALUE_INVALID','集計結果が有効15桁を超えています');return rounded.toNumber();
}
export function aggregateFlexible(tables:Table[],unknownRecipe:unknown):FlexibleResult{
 const recipe=FlexibleRecipe.parse(unknownRecipe);
 if(!tables.length||tables.length>10)throw new DataError('INPUT_LIMIT','ファイル数が範囲外です');
 const groups=new Map<string,{keys:Cell[];states:State[]}>(),totals=recipe.metrics.map(state);
 let input=0,accepted=0,excluded=0;
 for(const table of tables){
  const headers=table.headers.map(s=>s.normalize('NFC').trim());
  const index=(name:string)=>{const i=headers.indexOf(name.normalize('NFC').trim());if(i<0)throw new DataError('BINDING_REQUIRED',`${table.source}: 必要な列「${name}」がありません`);return i;};
  const gi=recipe.groups.map(g=>index(g.column)),mi=recipe.metrics.map(m=>m.operation==='count'?-1:index(m.column)),fi=recipe.filter?index(recipe.filter.column):-1;
  for(const row of table.rows){
   if(++input>5000)throw new DataError('INPUT_LIMIT','全体で5000行を超えています');
   const keys=gi.map(i=>{const v=row[i];if(v===null||v===undefined||v===''||typeof v==='number'&&!Number.isFinite(v))throw new DataError('VALUE_INVALID',`${table.source}: 分類に空欄や不正な値があります`);return v;});
   const numbers=mi.map(i=>i<0?undefined:numeric(row[i],table.source));
   if(recipe.filter){const f=row[fi];if(f===null||f===undefined||f==='')throw new DataError('VALUE_INVALID',`${table.source}: 除外条件の列に空欄があります`);if(String(f)===recipe.filter.excludedValue){excluded++;continue;}}
   accepted++;const key=JSON.stringify(keys),entry=groups.get(key)??{keys,states:recipe.metrics.map(state)};
   numbers.forEach((n,i)=>{add(entry.states[i],n);add(totals[i],n);});groups.set(key,entry);
  }
 }
 const summaries=recipe.metrics.map((m,i)=>({label:m.label,value:value(totals[i],m.operation,recipe.decimalPlaces)}));
 const rows:Cell[][]=[...groups.values()].map(g=>[...g.keys,...recipe.metrics.map((m,i)=>value(g.states[i],m.operation,recipe.decimalPlaces))]);
 const firstSum=recipe.metrics.findIndex(m=>m.operation==='sum');
 return {headers:[...recipe.groups,...recipe.metrics].map(x=>x.label),rows,summaries,grandTotal:firstSum<0?0:summaries[firstSum].value,groupCount:groups.size,counts:{input,accepted,excluded,unprocessed:0,output:rows.length}};
}
