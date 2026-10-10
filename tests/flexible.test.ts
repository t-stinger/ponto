import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aggregateFlexible,FlexibleRecipe} from '../src/domain/flexible.ts';
import {SavedJob} from '../src/domain/jobs.ts';
import {makeAiRequest,validateAiAnswer} from '../src/ai/contract.ts';
const recipe={version:2,groups:[{column:'店舗',label:'店舗'}],metrics:[{column:'売上',operation:'sum',label:'合計'},{column:'売上',operation:'average',label:'平均'},{column:'売上',operation:'min',label:'最小'},{column:'売上',operation:'max',label:'最大'},{column:'',operation:'count',label:'件数'}],filter:{column:'状態',excludedValue:'取消'},decimalPlaces:2};
const table={headers:['店舗','売上','状態'],rows:[['A','10','完了'],['A','20','完了'],['B','60','完了'],['B','100','取消']],source:'x',blankRows:0};
test('multiple metrics and weighted overall average use accepted source rows',()=>{const r=aggregateFlexible([table],recipe);assert.deepEqual(r.rows,[['A',30,15,10,20,2],['B',60,60,60,60,1]]);assert.deepEqual(r.summaries.map(s=>s.value),[90,30,10,60,3]);assert.equal(r.counts.excluded,1);});
test('invalid numbers in excluded rows stop rather than silently disappear',()=>{assert.throws(()=>aggregateFlexible([{...table,rows:[...table.rows,['B','oops','取消']]}],recipe));});
test('composite grouping keys cannot collide and output labels are user ordered',()=>{const r=aggregateFlexible([{...table,headers:['店舗','部門','売上','状態'],rows:[['a,b','c','1','完了'],['a','b,c','2','完了']]}],{...recipe,groups:[{column:'店舗',label:'お店'},{column:'部門',label:'部署'}]});assert.equal(r.rows.length,2);assert.deepEqual(r.headers.slice(0,2),['お店','部署']);});
test('overall-only grouping and count require no numeric column',()=>{const r=aggregateFlexible([table],{...recipe,groups:[],metrics:[{column:'',operation:'count',label:'件数'}]});assert.deepEqual(r.rows,[[3]]);assert.equal(r.grandTotal,0);});
test('empty average errors, sum/count empty are defined; schema rejects duplicate labels',()=>{assert.throws(()=>aggregateFlexible([{...table,rows:[]}],recipe));assert.equal(aggregateFlexible([{...table,rows:[]}],{...recipe,metrics:[recipe.metrics[0],recipe.metrics[4]]}).grandTotal,0);assert.equal(FlexibleRecipe.safeParse({...recipe,metrics:[{...recipe.metrics[0],label:'店舗'}]}).success,false);});
test('saved recipes preserve legacy records and validate flexible records',()=>{const base={id:'x',name:'売上',version:1,updatedAt:'2026-10-10'};const parsed=SavedJob.parse({...base,recipe}).recipe;assert.ok('version' in parsed && parsed.version===2);assert.ok(SavedJob.parse({...base,recipe:{groupColumn:'店舗',amountColumn:'売上',statusColumn:'状態',excludedStatus:'取消',decimalPlaces:2}}));});
test('flexible AI answer validates count, labels, columns and rejects code',()=>{const input=makeAiRequest(table.headers,'集計'),answer={kind:'flexible',groupFieldIds:['field_0'],metrics:[{fieldId:'field_1',operation:'sum',label:'売上合計'},{fieldId:null,operation:'count',label:'件数'}],filter:null,explanation:'店舗ごと'};assert.deepEqual(validateAiAnswer(answer,input),answer);for(const bad of [{...answer,metrics:[{fieldId:'field_99',operation:'sum',label:'合計'}]},{...answer,metrics:[{fieldId:'field_1',operation:'count',label:'件数'}]},{...answer,code:'run()'}])assert.throws(()=>validateAiAnswer(bad,input));});

test('single-column count-only AI request is valid',()=>{const input=makeAiRequest(['店舗'],'全行の件数');assert.equal(input.fields.length,1);assert.equal(validateAiAnswer({kind:'flexible',groupFieldIds:[],metrics:[{fieldId:null,operation:'count',label:'件数'}],filter:null,explanation:'件数'},input).kind,'flexible');});

test('source audit computes each metric from that input rather than grouped or combined values',()=>{
 const second={...table,source:'another.csv',rows:[['A','100','完了']]};
 const r=aggregateFlexible([table,second],recipe);
 assert.deepEqual(r.sourceAudit!.map(s=>s.metrics.map(m=>m.value)),[[90,30,10,60,3],[100,100,100,100,1]]);
 assert.equal(r.summaries[1].value,47.5);
});
