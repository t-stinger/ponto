import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare } from '../src/domain/compare.ts';
import { tableFromRows } from '../src/io/tables.ts';
const result = { headers:['拠点','合計','件数'],rows:[['A',0,1]],grandTotal:0,counts:{input:1,accepted:1,excluded:0,unprocessed:0,output:1} };
test('CSV plain numeric strings compare by numeric value',()=>assert.equal(compare(result,tableFromRows([result.headers,['A','0.00','1']],'見本')).matches,true));
test('blank reference never equals zero',()=>assert.equal(compare(result,tableFromRows([result.headers,['A','',1]],'見本')).matches,false));
test('missing rows, wrong headers and fractional count differ',()=>{
 assert.equal(compare(result,tableFromRows([['場所','合計','件数'],['A',0,1]],'見本')).total,1);
 assert.equal(compare(result,tableFromRows([result.headers,['A',0,1.1]],'見本')).matches,false);
 assert.equal(compare(result,tableFromRows([result.headers],'見本')).total,3);
});
