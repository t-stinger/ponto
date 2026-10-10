import { test, expect } from '@playwright/test';
import ExcelJS from 'exceljs';
import fs from 'node:fs/promises';
const fixture = 'technical-preparation-2026-10-09/fixtures/';
async function setup(page: import('@playwright/test').Page, files=[fixture+'input-a.csv',fixture+'input-b.csv']) {
 await page.goto('/');await page.locator('#inputs').setInputFiles(files);
 await expect(page.locator('#next')).toBeEnabled();await page.locator('#next').click();
 await page.locator('#group').selectOption('拠点');await page.locator('#amount').selectOption('金額');
 await page.locator('#exclude').check();await page.locator('#status').selectOption('状態');await page.locator('#excluded').fill('取消');
}
test('single initial screen, real aggregation and checked XLSX download',async({page})=>{
 await page.goto('/');await expect(page.locator('#rules')).toBeHidden();await expect(page.locator('#output')).toBeHidden();await expect(page.locator('#reference')).toHaveCount(0);await expect(page.locator('#result-placeholder')).toHaveCount(0);
 await setup(page);await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();await expect(page.locator('#files-screen')).toBeHidden();await expect(page.locator('#rules')).toBeHidden();
 await expect(page.locator('#result-table')).toContainText('120.3');await expect(page.locator('#download')).toBeDisabled();await page.locator('#confirm').check();
 const downloadPromise=page.waitForEvent('download');await page.locator('#download').click();const download=await downloadPromise;
 const book=new ExcelJS.Workbook();await book.xlsx.load(await fs.readFile((await download.path())!) as unknown as ExcelJS.Buffer);expect(book.getWorksheet('Result')!.getCell('B2').value).toBe(120.3);expect(book.getWorksheet('Result')!.getCell('B2').numFmt).toBe('0.00');
 await page.screenshot({path:'evidence/browser-result.png',fullPage:true});
 await page.locator('#back').click();await page.locator('#excluded').fill('別の値');await expect(page.locator('#output')).toBeHidden();await expect(page.locator('#download')).toBeDisabled();
});
test('invalid amount stops on conditions screen',async({page})=>{
 await setup(page,[fixture+'invalid-amount.csv']);await page.locator('#run').click();await expect(page.locator('#message')).toContainText('金額');await expect(page.locator('#output')).toBeHidden();
});
test('XLSX import and multiple sheet selection',async({page})=>{
 await setup(page,['fixtures/input-1.xlsx','fixtures/input-2.xlsx']);await page.locator('#run').click();await expect(page.locator('#result-table')).toContainText('120.3');
 const book=new ExcelJS.Workbook();book.addWorksheet('説明').addRow(['説明']);const sheet=book.addWorksheet('明細');sheet.addRow(['拠点','金額','状態']);sheet.addRow(['北',10,'有効']);
 await page.goto('/');await page.locator('#inputs').setInputFiles({name:'multi.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await book.xlsx.writeBuffer())});
 await expect(page.locator('#next')).toBeDisabled();await page.locator('[data-role="input-list"]').selectOption('明細');await expect(page.locator('#next')).toBeEnabled();
});
test('drop sources, reject wrong format, keep page stationary',async({page})=>{
 await page.goto('/');const content=await fs.readFile(fixture+'input-a.csv','utf8');
 const d=await page.evaluateHandle(content=>{const dt=new DataTransfer();dt.items.add(new File([content],'input-a.csv'));return dt;},content);
 await page.locator('#source-drop').dispatchEvent('drop',{dataTransfer:d});await expect(page.locator('#next')).toBeEnabled();
 const bad=await page.evaluateHandle(()=>{const d=new DataTransfer();d.items.add(new File(['x'],'bad.pdf'));return d;});await page.locator('#source-drop').dispatchEvent('drop',{dataTransfer:bad});await expect(page.locator('#message')).toContainText('ファイル形式');await expect(page.locator('#rules')).toBeHidden();
});
test('no page scroll at phone sizes throughout the workflow, list/result pagination',async({page})=>{
 for(const size of [{width:390,height:844},{width:360,height:640},{width:320,height:568}]){
  await page.setViewportSize(size);await setup(page);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const run=await page.locator('#run').boundingBox();expect(run!.y+run!.height).toBeLessThanOrEqual(size.height);
  await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();
  const save=await page.locator('#download').boundingBox();expect(save!.y+save!.height).toBeLessThanOrEqual(size.height);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
 }
 await page.goto('/');await page.locator('#inputs').setInputFiles([fixture+'input-a.csv',fixture+'input-b.csv',fixture+'next-input.csv']);await expect(page.locator('#file-pager')).toBeVisible();await expect(page.locator('#input-list .file')).toHaveCount(2);await page.locator('#files-next').click();await expect(page.locator('#input-list .file')).toHaveCount(1);
});
test('result pages preserve all rows and settings close without leaving the screen',async({page})=>{
 await page.setViewportSize({width:360,height:640});await page.goto('/');
 await expect(page.locator('#settings')).toBeHidden();
 await page.locator('#file-help').click();await expect(page.locator('#file-formats')).toBeVisible();await page.locator('#close-formats').click();
 await page.locator('#inputs').setInputFiles({name:'groups.csv',mimeType:'text/csv',buffer:Buffer.from('拠点,金額\n'+Array.from({length:10},(_,i)=>`拠点${i},${i+1}`).join('\n'))});
 await expect(page.locator('#next')).toBeEnabled();await page.locator('#next').click();await page.locator('#group').selectOption('拠点');await page.locator('#amount').selectOption('金額');await page.locator('#run').click();
 await expect(page.locator('#output')).toBeVisible();
 await page.locator('#settings').click();await expect(page.locator('#preferences')).toBeVisible();
 await page.locator('#close-settings').click();await expect(page.locator('#preferences')).toBeHidden();
 const seen=new Set<string>();
 do {
  for(const label of await page.locator('#result-table tbody tr td:first-child').allTextContents())seen.add(label);
  if(await page.locator('#rows-next').isDisabled())break;
  await page.locator('#rows-next').click();
 }while(seen.size<11);
 expect(seen.size).toBe(10);await expect(page.locator('#rows-prev')).toBeEnabled();
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight)).toBe(true);
});
test('edit real output headers and rounding, cancel drafts, confirm the new Excel',async({page})=>{
 await setup(page);await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();await page.locator('#confirm').check();
 await page.locator('#settings').click();await expect(page.locator('#style-preview')).toContainText('北');
 await page.locator('#group-name').fill('変更しない');await page.locator('#close-settings').click();await page.locator('#settings').click();await expect(page.locator('#group-name')).toHaveValue('拠点');
 await page.locator('#group-name').fill('');await page.locator('#apply-style').click();await expect(page.locator('#style-error')).toContainText('空欄');
 await page.locator('#group-name').fill('地域');await page.locator('#sum-name').fill('売上');await page.locator('#decimals').selectOption('0');await page.locator('#apply-style').click();
 await expect(page.locator('#result-table th').first()).toHaveText('地域');await expect(page.locator('#result-table')).toContainText('120');await expect(page.locator('#download')).toBeDisabled();
 await page.locator('#confirm').check();const ready=page.waitForEvent('download');await page.locator('#download').click();const download=await ready;
 const book=new ExcelJS.Workbook();await book.xlsx.load(await fs.readFile((await download.path())!) as unknown as ExcelJS.Buffer);
 expect(book.getWorksheet('Result')!.getCell('A1').value).toBe('地域');expect(book.getWorksheet('Result')!.getCell('B1').value).toBe('売上');expect(book.getWorksheet('Result')!.getCell('B2').value).toBe(120);expect(book.getWorksheet('Result')!.getCell('B2').numFmt).toBe('0');
});
test('desktop sides remain visible across all screens without page scrolling',async({page})=>{
 for(const size of [{width:1440,height:900},{width:1024,height:768}]){
  await page.setViewportSize(size);await page.goto('/');
  await expect(page.locator('.desktop-intro')).toBeVisible();await expect(page.locator('.desktop-guide')).toBeVisible();
  await expect(page.locator('#stage-counter')).toHaveText('1 / 3');
  await page.screenshot({path:`evidence/ponto-desktop-home-${size.width}-2026-10-10.png`});
  await setup(page);await expect(page.locator('#stage-counter')).toHaveText('2 / 3');
  await expect(page.locator('.side-steps li[aria-current]')).toHaveAttribute('data-stage','rules');
  await page.screenshot({path:`evidence/ponto-desktop-rules-${size.width}-2026-10-10.png`});
  await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();
  await expect(page.locator('#stage-counter')).toHaveText('3 / 3');await expect(page.locator('.side-steps li[aria-current]')).toHaveAttribute('data-stage','output');
  await page.screenshot({path:`evidence/ponto-desktop-result-${size.width}-2026-10-10.png`});
  const bounds=await page.locator('#download').boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(size.height);
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#settings').click();await expect(page.locator('#preferences')).toBeVisible();
  await page.locator('#close-settings').click();await page.locator('#back').click();await expect(page.locator('#stage-counter')).toHaveText('2 / 3');
 }
 await page.setViewportSize({width:390,height:844});await page.goto('/');await expect(page.locator('.desktop-side').first()).toBeHidden();
});
test('save a recipe, reopen, reuse unseen input and repair only a changed column',async({page})=>{
 await setup(page);await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();await expect(page.locator('#save-job')).toBeDisabled();await page.locator('#confirm').check();await page.locator('#save-job').click();await page.locator('#job-name').fill('月次集計');await page.locator('#save-new').click();await expect(page.locator('#save-dialog')).toBeHidden();
 await page.reload();await page.locator('#saved-jobs').click();await expect(page.locator('#jobs-list')).toContainText('月次集計');await page.locator('[data-job]').click();
 await page.locator('#inputs').setInputFiles(fixture+'next-input.csv');await expect(page.locator('#rules')).toBeVisible();await expect(page.locator('#group')).toHaveValue('拠点');await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();await expect(page.locator('#result-table')).toContainText('60.00');await expect(page.locator('#comparison')).toContainText('60.30');
 await page.reload();await page.locator('#saved-jobs').click();await page.locator('[data-job]').click();await page.locator('#inputs').setInputFiles({name:'changed.csv',mimeType:'text/csv',buffer:Buffer.from('拠点,売上,状態\n北,5,有効\n北,7,有効\n')});
 await expect(page.locator('#run')).toBeDisabled();await expect(page.locator('#message')).toContainText('金額');await expect(page.locator('#group')).toHaveValue('拠点');await page.locator('#amount').selectOption('売上');await page.locator('#run').click();await expect(page.locator('#result-table')).toContainText('12.00');
 await page.locator('#confirm').check();await page.locator('#save-job').click();await page.locator('#save-update').click();await expect(page.locator('#save-dialog')).toBeHidden();
 await page.reload();await page.locator('#saved-jobs').click();await expect(page.locator('#jobs-list')).toContainText('第2版');await page.locator('[data-delete]').click();await page.locator('#delete-confirm').click();await expect(page.locator('#jobs-list')).toContainText('まだ保存');
});
test('storage failure never claims success or loses the result',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{value:{open:()=>{throw new Error('保存が禁止されています');}}});});
 await setup(page);await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();await page.locator('#confirm').check();await page.locator('#save-job').click();await page.locator('#job-name').fill('保存失敗');await page.locator('#save-new').click();await expect(page.locator('#save-error')).toContainText('保存');await expect(page.locator('#result-table')).toContainText('120.30');
});
test('fictional daily store sales: exact totals, export and invalid next input',async({page})=>{
 await page.goto('/');await page.locator('#inputs').setInputFiles([
  {name:'store-a.csv',mimeType:'text/csv',buffer:Buffer.from('店舗,売上,状態\nA店,12000,有効\nA店,3500,有効\nA店,800,取消\n')},
  {name:'store-b.csv',mimeType:'text/csv',buffer:Buffer.from('店舗,売上,状態\nB店,9800,有効\nB店,2200,有効\n')}
 ]);await expect(page.locator('#next')).toBeEnabled();await page.locator('#next').click();await page.locator('#group').selectOption('店舗');await page.locator('#amount').selectOption('売上');await page.locator('#exclude').check();await page.locator('#status').selectOption('状態');await page.locator('#excluded').fill('取消');await page.locator('#run').click();
 await expect(page.locator('#comparison')).toContainText('27500.00');await expect(page.locator('#result-table')).toContainText('15500.00');await expect(page.locator('#result-table')).toContainText('12000.00');
 await page.locator('#confirm').check();const downloading=page.waitForEvent('download');await page.locator('#download').click();const file=await downloading;const book=new ExcelJS.Workbook();await book.xlsx.load(await fs.readFile((await file.path())!) as unknown as ExcelJS.Buffer);expect(book.getWorksheet('Summary')!.getCell('B2').value).toBe(27500);
 await page.locator('#save-job').click();await page.locator('#job-name').fill('毎日の店舗売上');await page.locator('#save-new').click();await expect(page.locator('#save-dialog')).toBeHidden();await page.reload();await page.locator('#saved-jobs').click();await page.locator('[data-job]').click();
 await page.locator('#inputs').setInputFiles({name:'bad.csv',mimeType:'text/csv',buffer:Buffer.from('店舗,売上,状態\nA店,不明,有効\n')});await expect(page.locator('#rules')).toBeVisible();await page.locator('#run').click();await expect(page.locator('#message')).toContainText('金額');await expect(page.locator('#download')).toBeDisabled();
 await page.locator('#back').click();await page.locator('#inputs').setInputFiles({name:'wrong.pdf',mimeType:'application/pdf',buffer:Buffer.from('bad')});await expect(page.locator('#message')).toContainText('ファイル形式');await expect(page.locator('#files-screen')).toBeVisible();
});
test('stale version cannot overwrite another tab update',async({page})=>{
 await setup(page);await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();await page.locator('#confirm').check();await page.locator('#save-job').click();await page.locator('#job-name').fill('競合確認');await page.locator('#save-new').click();await expect(page.locator('#save-dialog')).toBeHidden();
 await page.evaluate(()=>new Promise<void>((resolve,reject)=>{const opening=indexedDB.open('ponto-jobs',1);opening.onerror=()=>reject();opening.onsuccess=()=>{const db=opening.result;const tx=db.transaction('jobs','readwrite');const store=tx.objectStore('jobs');const all=store.getAll();all.onsuccess=()=>{const job=all.result[0];store.put({...job,version:job.version+1,name:'他画面で更新済み'});};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject();};}));
 await page.locator('#save-job').click();await page.locator('#save-update').click();await expect(page.locator('#save-error')).toContainText('別の画面');await page.locator('#close-save').click();await page.reload();await page.locator('#saved-jobs').click();await expect(page.locator('#jobs-list')).toContainText('他画面で更新済み');await expect(page.locator('#jobs-list')).toContainText('第2版');
});
test('AI setup missing: explicit consent required, zero real AI fallback, manual result works',async({page})=>{
 await setup(page);await page.locator('#open-ai').click();await page.locator('#ai-instruction').fill('拠点ごとに金額を合計。取消は除いて');await expect(page.locator('#request-ai')).toBeDisabled();await page.locator('#ai-consent').check();
 const response=page.waitForResponse('/api/ai/propose');await page.locator('#request-ai').click();expect((await response).status()).toBe(503);await expect(page.locator('#ai-message')).toContainText('設定後');await expect(page.locator('#ai-review')).toBeHidden();await page.locator('#close-ai').click();await expect(page.locator('#group')).toHaveValue('拠点');await page.locator('#run').click();await expect(page.locator('#output')).toBeVisible();
});
test('mocked AI proposal waits for review, sends no rows, and requires result confirmation',async({page})=>{
 let payload:Record<string,unknown>|undefined;
 await page.route('**/api/ai/propose',async route=>{payload=route.request().postDataJSON();const fields=payload!.fields as {id:string;name:string}[];const id=(name:string)=>fields.find(f=>f.name===name)!.id;await route.fulfill({json:{answer:{kind:'proposal',groupFieldId:id('拠点'),amountFieldId:id('金額'),filter:{fieldId:id('状態'),excludedValue:'取消'},explanation:'テスト応答：拠点別に金額を合計'}}});});
 await page.setViewportSize({width:390,height:844});await setup(page);await page.locator('#group').selectOption('');await page.locator('#amount').selectOption('');await page.locator('#open-ai').click();await page.locator('#ai-instruction').fill('拠点ごとに金額を合計。取消は除いて');await page.locator('#ai-consent').check();await page.locator('#request-ai').click();await expect(page.locator('#ai-review')).toBeVisible();expect(Object.keys(payload!).sort()).toEqual(['fields','instruction']);expect(JSON.stringify(payload)).not.toContain('120.3');await expect(page.locator('#group')).toHaveValue('');await expect(page.locator('#ai-bindings')).toContainText('金額');
 await page.screenshot({path:'evidence/ai-implementation-2026-10-10/mocked-proposal-review.png'});const bounds=await page.locator('#apply-ai').boundingBox();expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(844);await page.locator('#apply-ai').click();await expect(page.locator('#ai-dialog')).toBeHidden();await expect(page.locator('#group')).toHaveValue('拠点');await page.locator('#run').click();await expect(page.locator('#result-table')).toContainText('120.30');await expect(page.locator('#download')).toBeDisabled();
});
test('mocked clarification and invalid binding never apply or run silently',async({page})=>{
 let invalid=false;await page.route('**/api/ai/propose',route=>route.fulfill({json:{answer:invalid?{kind:'proposal',groupFieldId:'field_0',amountFieldId:'field_99',filter:null,explanation:'bad'}:{kind:'question',question:'どの数値を合計しますか？'}}}));
 await setup(page);await page.locator('#open-ai').click();await page.locator('#ai-instruction').fill('まとめて');await page.locator('#ai-consent').check();await page.locator('#request-ai').click();await expect(page.locator('#ai-message')).toContainText('どの数値');await expect(page.locator('#ai-review')).toBeHidden();await expect(page.locator('#group')).toHaveValue('拠点');invalid=true;await page.locator('#ai-instruction').fill('拠点別合計');await page.locator('#request-ai').click();await expect(page.locator('#ai-message')).toContainText('存在しない列');await expect(page.locator('#ai-review')).toBeHidden();await expect(page.locator('#output')).toBeHidden();
});
test('closing a pending AI request discards its late proposal',async({page})=>{
 await page.route('**/api/ai/propose',async route=>{await new Promise(r=>setTimeout(r,300));await route.fulfill({json:{answer:{kind:'proposal',groupFieldId:'field_0',amountFieldId:'field_1',filter:null,explanation:'late test'}}}).catch(()=>{});});
 await setup(page);await page.locator('#open-ai').click();await page.locator('#ai-instruction').fill('拠点別金額');await page.locator('#ai-consent').check();await page.locator('#request-ai').click();await expect(page.locator('#request-ai')).toBeDisabled();await page.locator('#close-ai').click();await page.locator('#open-ai').click();await expect(page.locator('#ai-review')).toBeHidden();await expect(page.locator('#ai-consent')).not.toBeChecked();await expect(page.locator('#group')).toHaveValue('拠点');
});
