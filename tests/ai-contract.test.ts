import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeAiRequest, validateAiAnswer } from '../src/ai/contract.ts';
const input=makeAiRequest(['拠点','金額','状態'],'拠点ごとに金額を合計。取消は除いて');
const proposal={kind:'proposal',groupFieldId:'field_0',amountFieldId:'field_1',filter:{fieldId:'field_2',excludedValue:'取消'},explanation:'拠点ごとの合計と件数'};
test('AI payload contains only column metadata and instruction',()=>{
 assert.deepEqual(Object.keys(input),['fields','instruction']);assert.equal(input.fields[0].id,'field_0');
 assert.throws(()=>makeAiRequest(['拠点','拠点'], '集計'));assert.throws(()=>makeAiRequest(['拠点','金額'],''));
});
test('AI candidate must use existing distinct columns and no arbitrary code',()=>{
 assert.deepEqual(validateAiAnswer(proposal,input),proposal);
 assert.throws(()=>validateAiAnswer({...proposal,amountFieldId:'field_99'},input));
 assert.throws(()=>validateAiAnswer({...proposal,amountFieldId:'field_0'},input));
 assert.throws(()=>validateAiAnswer({...proposal,code:'doSomething()'},input));
});
test('clarification is a question, not a guessed runnable recipe',()=>{
 assert.deepEqual(validateAiAnswer({kind:'question',question:'何ごとにまとめますか？'},input),{kind:'question',question:'何ごとにまとめますか？'});
});
