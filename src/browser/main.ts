import './style.css';
import { makeAiRequest, validateAiAnswer } from '../ai/contract.ts';
import type { Table } from '../io/tables.ts';
import type { Result } from '../domain/aggregate.ts';
import { FlexibleRecipe, type FlexibleRecipeValue as Flexible } from '../domain/flexible.ts';
import type { Difference } from '../domain/compare.ts';
import { listJobs, saveJob, deleteJob, type Job, type Recipe } from '../domain/jobs.ts';
const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `<div class="app-shell" data-stage="files"><aside class="desktop-side desktop-intro"><span class="side-kicker">PONTO</span><h2>ばらばらの表を、<br>ひとつに。</h2><p>表を入れて、まとめ方を選ぶ。<br>いつもの集計を、すっきり。</p><div class="side-art" aria-hidden="true"><span class="art-orbit"></span><span class="mini-sheet"><i></i><i></i><i></i></span><span class="mini-sheet"><i></i><i></i><i></i></span><span class="art-spark">✦</span></div><span class="side-note">Excel & CSV</span></aside><main><div class="brandbar"><button id="back" class="icon-button hidden" aria-label="前の画面へ">‹</button><div class="brand"><span class="brand-mark"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="10" y="7" width="27" height="34" rx="7" fill="#DCD5FF" transform="rotate(-12 10 7)"/><rect x="14" y="7" width="26" height="34" rx="7" fill="white"/><path d="M21 15h12M21 19h8" stroke="#C4B7EF" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="27" r="1.6" fill="#65519A"/><circle cx="32" cy="27" r="1.6" fill="#65519A"/><path d="M24 32q3 3 6 0" stroke="#65519A" stroke-width="1.7" stroke-linecap="round"/><circle cx="19" cy="30" r="2" fill="#F7BFCE"/><circle cx="35" cy="30" r="2" fill="#F7BFCE"/></svg></span>ぽんと</div><span id="stage-counter" aria-label="3画面のうち1画面目">1 / 3</span></div>
<section id="files-screen" class="screen"><div id="home-intro"><h1>表をぽん。<br>集計をすっきり。</h1><p>Excel・CSVを入れて、ひとつの集計表に。</p></div><div id="source-drop" class="dropzone"><div id="file-art" class="file-art" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" aria-hidden="true"><rect x="10" y="7" width="27" height="34" rx="7" fill="#DCD5FF" transform="rotate(-12 10 7)"/><rect x="14" y="7" width="26" height="34" rx="7" fill="white"/><path d="M21 15h12M21 19h8" stroke="#C4B7EF" stroke-width="2" stroke-linecap="round"/><circle cx="22" cy="27" r="1.6" fill="#65519A"/><circle cx="32" cy="27" r="1.6" fill="#65519A"/><path d="M24 32q3 3 6 0" stroke="#65519A" stroke-width="1.7" stroke-linecap="round"/><circle cx="19" cy="30" r="2" fill="#F7BFCE"/><circle cx="35" cy="30" r="2" fill="#F7BFCE"/></svg></div><label for="inputs" class="visually-hidden">集計するExcel・CSV</label><button id="pick-source" type="button">＋ 表を入れる</button><input id="inputs" class="visually-hidden" type="file" multiple accept=".xlsx,.csv"><small>ここにドロップ、またはボタンから選択</small></div><div class="file-links"><button id="file-help" class="text-button">使えるファイル</button><button id="saved-jobs" class="text-button">保存したまとめ方</button></div><div id="home-flow" aria-label="複数の表をひとつの集計表にまとめます"><div class="mini-sources"><span class="mini-sheet"><i></i><i></i><i></i></span><span class="mini-sheet"><i></i><i></i><i></i></span></div><span class="flow-arrow" aria-hidden="true">→</span><span class="mini-sheet mini-result"><i></i><i></i><i></i><b>✓</b></span></div><div id="input-list"></div><div id="file-pager" class="pager hidden"><button id="files-prev" class="secondary">‹</button><span id="files-page"></span><button id="files-next" class="secondary">›</button></div><button id="next" class="bottom-action hidden" disabled>まとめ方を選ぶ →</button></section>
<section id="rules" class="screen hidden"><div class="result-heading"><h2>まとめ方</h2><button id="open-ai" class="text-button">話す・書く</button></div><div class="file-links"><button id="edit-fields" class="text-button">集計項目を選ぶ</button><button id="map-columns" class="text-button">列名をそろえる</button></div><p id="flex-summary" class="muted hidden"></p><div id="basic-settings"><p id="job-context" class="muted hidden"></p><label>まとめる単位<select id="group"><option value="">列を選ぶ</option></select></label><label>合計する数値<select id="amount"><option value="">列を選ぶ</option></select></label><label><input id="exclude" type="checkbox"> 除外する行がある</label><div id="filter" class="hidden"><label>条件の列<select id="status"><option value="">列を選ぶ</option></select></label><label>除く値（完全一致）<input id="excluded" type="text" placeholder="例：取消"></label></div></div><button id="run" class="bottom-action" disabled>集計する →</button></section>
<section id="output" class="screen hidden"><div class="result-heading"><h2>集計結果</h2><button id="settings" class="text-button">Excelの見た目を変える</button></div><div id="comparison" class="muted"></div><p id="counts" class="muted"></p><div id="result-table"></div><div class="pager"><button id="rows-prev" class="secondary">‹</button><span id="rows-page"></span><button id="rows-next" class="secondary">›</button></div><label id="confirm-label"><input id="confirm" type="checkbox"> <span id="confirm-text">条件と結果を確認しました</span></label><button id="save-job" class="text-button" disabled>このまとめ方を保存</button><label class="export-format">保存形式<select id="export-format"><option value="xlsx">Excel</option><option value="csv">CSV</option><option value="pdf">PDF</option></select></label><button id="download" class="bottom-action" disabled>↓ Excelを保存</button></section><div id="message" role="status" aria-live="polite"></div>
<dialog id="preferences"><div class="dialog-head"><h2>Excelの見た目</h2><button id="close-settings" class="icon-button" aria-label="設定を閉じる">×</button></div><div class="dialog-body"><p class="edit-hint">表の見出しを直接書き換えられます。</p><div class="header-editor"><table><thead><tr><th><input id="group-name" aria-label="まとめる単位の見出し" value="拠点" maxlength="80"></th><th><input id="sum-name" aria-label="合計の見出し" value="合計" maxlength="80"></th><th><input id="count-name" aria-label="件数の見出し" value="件数" maxlength="80"></th></tr></thead><tbody id="style-preview"></tbody></table></div><label>表示する小数点以下の桁数<select id="decimals">${Array.from({length:11},(_,i)=>`<option value="${i}" ${i===2?'selected':''}>${i}桁</option>`).join('')}</select></label><p class="muted">合計は指定した桁数で四捨五入して出力します。</p><p id="style-error" role="alert"></p><button id="apply-style">変更を反映</button></div></dialog><dialog id="file-formats"><div class="dialog-head"><h2>使えるファイル</h2><button id="close-formats" class="icon-button" aria-label="閉じる">×</button></div><div class="dialog-body"><p>Excel（.xlsx）・CSV（UTF-8）</p><p>1行目が見出しで、値だけが入った表を選んでください。</p><p class="muted">10ファイル・計5,000行まで。1ファイル5MB、合計20MBまで。数式・日付・結合セル・隠し行列には未対応です。</p><p class="muted">集計とExcel作成は端末内で行います。入力ファイルは閉じると消えます。保存したまとめ方はこのブラウザに残ります。選び直すとファイルは入れ替わります。</p></div></dialog><dialog id="jobs-dialog"><div class="dialog-head"><h2>保存したまとめ方</h2><button id="close-jobs" class="icon-button" aria-label="閉じる">×</button></div><div class="dialog-body"><div id="jobs-list"></div><div class="pager"><button id="jobs-prev" class="secondary">‹</button><span id="jobs-page"></span><button id="jobs-next" class="secondary">›</button></div><p id="jobs-error" role="alert"></p></div></dialog><dialog id="save-dialog"><div class="dialog-head"><h2>まとめ方を保存</h2><button id="close-save" class="icon-button" aria-label="閉じる">×</button></div><div class="dialog-body"><label>名前<input id="job-name" type="text" maxlength="60" placeholder="例：毎月の拠点別集計"></label><p class="muted">列と集計条件をこのブラウザに保存します。元ファイルや明細の値は保存しません。</p><p id="save-error" role="alert"></p><div class="save-actions"><button id="save-new">新しく保存</button><button id="save-update" class="secondary hidden">選んだまとめ方を更新</button></div></div></dialog><dialog id="delete-dialog"><div class="dialog-head"><h2>まとめ方を削除</h2><button id="close-delete" class="icon-button" aria-label="閉じる">×</button></div><div class="dialog-body"><p id="delete-name"></p><p class="muted">削除すると元に戻せません。入力ファイルは変更しません。</p><p id="delete-error" role="alert"></p><button id="delete-confirm">削除する</button></div></dialog><dialog id="ai-dialog"><div class="dialog-head"><h2>やりたい集計を伝える</h2><button id="close-ai" class="icon-button" aria-label="閉じる">×</button></div><div class="dialog-body"><div id="ai-compose"><label>どうまとめますか？<textarea id="ai-instruction" maxlength="2000" rows="3" placeholder="店舗ごとに売上を合計。取消は除いて"></textarea></label><p class="muted">列名とこの文章をOpenAIに送ります。表の明細・ファイル本体は送りません。</p><button id="voice" class="secondary" type="button">🎙 話して入力</button><p id="voice-status" class="muted"></p><label class="ai-consent"><input id="ai-consent" type="checkbox"> 列名と文章を送って提案を作る</label><button id="request-ai" disabled>まとめ方を提案してもらう</button></div><div id="ai-review" class="hidden"><h3>このまとめ方でいいですか？</h3><dl id="ai-bindings"></dl><p id="ai-explanation" class="muted"></p><button id="apply-ai">このまとめ方を使う</button><button id="edit-ai" class="text-button">指示を書き直す</button></div><p id="ai-message" role="status" aria-live="polite"></p></div></dialog></main><aside class="desktop-side desktop-guide"><div class="guide-art" aria-hidden="true"><span class="mini-sheet mini-result"><i></i><i></i><i></i><b>✓</b></span><span class="guide-spark">✦</span></div><h2>できあがりまで、<br>3つのステップ。</h2><ol class="side-steps"><li data-stage="files" aria-current="step"><span>1</span><div>表を入れる<small>Excel・CSVを選択</small></div></li><li data-stage="rules"><span>2</span><div>まとめ方を選ぶ<small>集計する項目を指定</small></div></li><li data-stage="output"><span>3</span><div>結果を保存<small>結果を確認してダウンロード</small></div></li></ol></aside></div>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const escape = (s: unknown) => String(s ?? '（なし）').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]!));
const displayCell = (v: unknown, column: number) => escape(typeof v === 'number' && (flexible ? column>=flexible.groups.length && flexible.metrics[column-flexible.groups.length]?.operation!=='count' : column===1) ? v.toFixed(appearance.decimals) : v);
type Loaded = { file: File; sheets: string[]; sheet: string; table?: Table; aliases?: Record<string,string> };
let flexible: Flexible | undefined;
const operations = {sum:'合計',count:'件数',average:'平均',min:'最小',max:'最大'};
app.insertAdjacentHTML('beforeend', `<dialog id="fields-dialog"><div class="dialog-head"><h2>集計する項目</h2><button id="close-fields" class="icon-button" aria-label="閉じる">×</button></div><div class="dialog-body"><p class="muted">分類は3項目、集計は8項目まで。上から一覧表の列順になります。</p><div id="group-fields"></div><button id="add-group" class="text-button">＋ 分類</button><div id="metric-fields"></div><button id="add-metric" class="text-button">＋ 集計項目</button><p id="fields-error" role="alert"></p><button id="apply-fields">この項目でまとめる</button><button id="basic-fields" class="text-button">1項目の集計に戻す</button></div></dialog><dialog id="mapping-dialog"><div class="dialog-head"><h2>列名をそろえる</h2><button id="close-mapping" class="icon-button" aria-label="閉じる">×</button></div><div class="dialog-body"><p class="muted">同じ意味の列だけ、同じ名前にそろえてください。元ファイルは変えません。</p><div id="mapping-fields"></div><p id="mapping-error" role="alert"></p><button id="apply-mapping">対応を反映</button></div></dialog>`);
function loadedTables():Table[]{return sources.flatMap(s=>s.table?[{...s.table,headers:s.table.headers.map(h=>s.aliases?.[h.normalize('NFC').trim()]??h)}]:[]);}
function commonHeaders(){const tables=loadedTables();return (tables[0]?.headers??[]).map(h=>h.normalize('NFC').trim()).filter(h=>tables.every(t=>t.headers.some(x=>x.normalize('NFC').trim()===h)));}
let sources: Loaded[] = [], revision = 0, busy = false;
let screen: 'files' | 'rules' | 'output' = 'files', filePage = 0, rowPage = 0;
let selectedJob: Job | undefined, jobs: Job[] = [], jobsPage = 0, deletingJob: Job | undefined;
let aiAbort:AbortController|undefined,aiEpoch=0,aiCandidate:ReturnType<typeof validateAiAnswer>|undefined,aiHeaders:string[]=[];
let appearance = { headers: ['拠点','合計','件数'], decimals: 2 };
function showScreen(next: typeof screen) {
  screen = next;
  const index = ['files','rules','output'].indexOf(screen) + 1;
  document.querySelector<HTMLElement>('.app-shell')!.dataset.stage = screen;
  el('stage-counter').textContent = `${index} / 3`;
  el('stage-counter').setAttribute('aria-label', `3画面のうち${index}画面目`);
  document.querySelectorAll<HTMLElement>('.side-steps li').forEach(item=>{
    if(item.dataset.stage === screen) item.setAttribute('aria-current','step'); else item.removeAttribute('aria-current');
  });
  for (const [id, name] of [['files-screen','files'],['rules','rules'],['output','output']] as const) el(id).classList.toggle('hidden', name !== screen);
  el('back').classList.toggle('hidden', screen === 'files');
}
let result: { result: Result; comparison: { matches: boolean; total: number; differences: Difference[] } | null; bytes: Uint8Array } | undefined;
let active: Worker | undefined; let abort: (() => void) | undefined;
function request<T>(data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' }); active = worker;
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => { clearTimeout(timer); worker.terminate(); if (active === worker) { active = undefined; abort = undefined; } };
    abort = () => { finish(); reject(new Error('変更したため処理を取り消しました')); };
    timer = setTimeout(() => { finish(); reject(new Error('処理時間が20秒を超えました。ファイルを小さくして試してください')); }, 20000);
    worker.onmessage = ({ data: answer }) => { finish(); answer.error ? reject(new Error(answer.error)) : resolve(answer.value); };
    worker.onerror = () => { finish(); reject(new Error('ファイル処理に失敗しました')); };
    worker.postMessage(data);
  });
}
function invalidate() {
  cancelAi(); stopVoice();
  revision++; abort?.(); busy = false; result = undefined;
  if (screen === 'output') showScreen('rules'); el<HTMLInputElement>('confirm').checked = false;
  el('message').textContent = ''; refresh();
}
function message(text: string, error = false) { el('message').textContent = text; el('message').className = error ? 'error' : 'muted'; }
function refresh() {
  el('file-art').classList.toggle('hidden', sources.length > 0);
  el('home-intro').classList.toggle('hidden', sources.length > 0);
  el('home-flow').classList.toggle('hidden', sources.length > 0);
  el('source-drop').classList.toggle('compact', sources.length > 0);
  const tables = sources.flatMap(s => s.table ? [s.table] : []);
  el('next').classList.toggle('hidden', sources.length === 0);
  el<HTMLButtonElement>('next').disabled = busy || tables.length !== sources.length || !sources.length;
  const basicReady = tables.length === sources.length && sources.length > 0 && el<HTMLSelectElement>('group').value && el<HTMLSelectElement>('amount').value && (!el<HTMLInputElement>('exclude').checked || (el<HTMLSelectElement>('status').value && el<HTMLInputElement>('excluded').value));
  const headers=commonHeaders();const ready=flexible ? tables.length===sources.length&&sources.length>0&&[...flexible.groups.map(g=>g.column),...flexible.metrics.filter(m=>m.operation!=='count').map(m=>m.column),...(flexible.filter?[flexible.filter.column]:[])].every(c=>headers.includes(c)) : basicReady;
  el<HTMLButtonElement>('run').disabled = busy || !ready;
  el('settings').textContent=flexible?'集計項目を変える':'Excelの見た目を変える';el('basic-settings').classList.toggle('hidden',!!flexible);el('flex-summary').classList.toggle('hidden',!flexible);if(flexible)el('flex-summary').textContent=(flexible.groups.length?flexible.groups.map(g=>g.label).join(' × ')+'別：':'全体：')+flexible.metrics.map(m=>m.label).join('、');
  el<HTMLButtonElement>('save-job').disabled = !result || !el<HTMLInputElement>('confirm').checked;
  el<HTMLButtonElement>('download').disabled = busy || !result || result.comparison?.matches === false || !el<HTMLInputElement>('confirm').checked;
}
function columns() {
  const common = commonHeaders();
  for (const id of ['group','amount','status']) {
    const select = el<HTMLSelectElement>(id), previous = select.value;
    select.innerHTML = '<option value="">列を選ぶ</option>' + common.map(h => `<option value="${escape(h)}">${escape(h)}</option>`).join('');
    select.value = common.includes(previous) ? previous : '';
  }
}
function renderFiles() {
  const pageCount = Math.max(1, Math.ceil(sources.length / 2)); filePage = Math.min(filePage, pageCount - 1);
  el('input-list').innerHTML = sources.slice(filePage * 2, filePage * 2 + 2).map((entry, offset) => `<div class="file">${escape(entry.file.name)}${entry.sheets.length ? `<label>シート<select data-index="${filePage * 2 + offset}" data-role="input-list"><option value="">シートを選ぶ</option>${entry.sheets.map(s => `<option ${s === entry.sheet ? 'selected' : ''} value="${escape(s)}">${escape(s)}</option>`).join('')}</select></label>` : ''}<small>${entry.table ? `${entry.table.rows.length}行 · ${entry.table.headers.length}列` : '未読取り'}</small></div>`).join('');
  el('file-pager').classList.toggle('hidden', pageCount < 2);
  el('files-page').textContent = `${filePage + 1} / ${pageCount}`;
  el<HTMLButtonElement>('files-prev').disabled = filePage === 0;
  el<HTMLButtonElement>('files-next').disabled = filePage >= pageCount - 1;
  document.querySelectorAll<HTMLSelectElement>('[data-role]').forEach(select => select.onchange = async () => {
    invalidate(); const version = revision; const entry = sources[Number(select.dataset.index)];
    entry.sheet = select.value; entry.table = undefined; entry.aliases = undefined; refresh();
    if (entry.sheet) await loadTable(entry, version); renderFiles(); columns();
    if(selectedJob && sources.length && sources.every(s=>s.table)) applyJob(selectedJob);
    refresh();
  });
}
async function loadTable(entry: Loaded, version: number) {
  busy = true; refresh(); message('ファイルを読み取っています…');
  try {
    const bytes = new Uint8Array(await entry.file.arrayBuffer()); if (version !== revision) return;
    const table = await request<Table>({ action: 'read', bytes, name: entry.file.name, sheet: entry.sheet });
    if (version === revision) { entry.table = table; message(''); }
  } catch (e) { if (version === revision) message((e as Error).message, true); }
  finally { if (version === revision) { busy = false; refresh(); } }
}
async function choose(files: File[]) {
  invalidate(); const version = revision;
  sources = []; filePage = 0; showScreen('files');
  try {
    if (files.length > 10 || files.some(f => !/\.(xlsx|csv)$/i.test(f.name) || f.size > 5*1024*1024) || files.reduce((n,f) => n + f.size, 0) > 20*1024*1024) throw new Error('ファイル形式・サイズ上限を確認してください');
    busy = true; refresh();
    for (const file of files) {
      const entry: Loaded = { file, sheet: '', sheets: [] };
      if (/\.xlsx$/i.test(file.name)) {
        const bytes = new Uint8Array(await file.arrayBuffer()); if (version !== revision) return;
        entry.sheets = await request<string[]>({ action: 'sheets', bytes });
        if (entry.sheets.length === 1) entry.sheet = entry.sheets[0];
      }
      if (version !== revision) return;
      sources.push(entry);
      if (/\.csv$/i.test(file.name) || entry.sheet) await loadTable(entry, version);
      if (version !== revision) return;
    }
  } catch (e) { if (version === revision) message((e as Error).message, true); }
  finally { if (version === revision) { busy = false; renderFiles(); columns(); if(selectedJob && sources.length && sources.every(s=>s.table)) applyJob(selectedJob); refresh(); } }
}
el<HTMLInputElement>('inputs').onchange = e => void choose( [...(e.target as HTMLInputElement).files!]);
for (const id of ['group','amount','status','excluded','exclude']) {
  el(id).addEventListener('input', () => { invalidate(); el('filter').classList.toggle('hidden', !el<HTMLInputElement>('exclude').checked); });
}
el('confirm').onchange = refresh;
async function runAggregation() {
  invalidate(); const version = revision; busy = true; refresh(); message('集計して、出力を確認しています…');
  const recipe = currentRecipe();
  try {
    const answer = await request<NonNullable<typeof result>>({ action: 'run', tables: loadedTables(), recipe });
    if (version !== revision) return; result = answer;
    const c = answer.result.counts;
    el('comparison').textContent = flexible && 'summaries' in answer.result ? (answer.result.summaries as {label:string;value:number}[]).map((v,i)=>`${v.label} ${flexible!.metrics[i].operation==='count'?v.value:v.value.toFixed(appearance.decimals)}`).join(' · ') : `全体合計 ${answer.result.grandTotal.toFixed(appearance.decimals)} · 条件と結果を確認してください`;
    el('counts').textContent = `元資料 ${c.input}行 · 除外 ${c.excluded}行 · 結果 ${c.output}行`;
    rowPage = 0; renderRows(); showScreen('output'); message('');
  } catch (e) { if (version === revision) message((e as Error).message, true); }
  finally { if (version === revision) { busy = false; refresh(); } }
}
el('run').onclick = () => void runAggregation();
el('export-format').onchange=()=>{el('download').textContent='↓ '+el<HTMLSelectElement>('export-format').selectedOptions[0].textContent+'を保存';};
el('download').onclick = async () => {
 if(!result||busy||!el<HTMLInputElement>('confirm').checked)return;
 const snapshot=result,version=revision,format=el<HTMLSelectElement>('export-format').value;busy=true;refresh();
 try{
  const bytes=format==='xlsx'?snapshot.bytes:await request<Uint8Array>({action:'export',format,result:snapshot.result});
  if(version!==revision||result!==snapshot||!el<HTMLInputElement>('confirm').checked)return;
  const type=format==='csv'?'text/csv;charset=utf-8':format==='pdf'?'application/pdf':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const url=URL.createObjectURL(new Blob([new Uint8Array(bytes).buffer],{type}));const link=document.createElement('a');link.href=url;link.download='集計結果.'+format;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }catch(e){if(version===revision)message((e as Error).message,true);}finally{if(version===revision){busy=false;refresh();}}
};

const zone = el('source-drop');
zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragging'); });
zone.addEventListener('dragleave', e => { if (!zone.contains((e as DragEvent).relatedTarget as Node | null)) zone.classList.remove('dragging'); });
zone.addEventListener('drop', e => {
  e.preventDefault(); zone.classList.remove('dragging'); const files = [...((e as DragEvent).dataTransfer?.files ?? [])];
  if (files.length) { el<HTMLInputElement>('inputs').value = ''; void choose(files); }
});
// Prevent accidental navigation if a file is dropped outside a target.
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());

el('pick-source').onclick = () => el<HTMLInputElement>('inputs').click();

function renderRows() {
  if (!result) return;
  const size = Math.max(1, Math.min(6, Math.floor((window.innerHeight - 470) / 40)));
  const pages = Math.max(1, Math.ceil(result.result.rows.length / size)); rowPage = Math.min(rowPage, pages - 1);
  el('result-table').innerHTML = `<table><thead><tr>${result.result.headers.map(h=>`<th>${escape(h)}</th>`).join('')}</tr></thead><tbody>${result.result.rows.slice(rowPage * size, rowPage * size + size).map(row=>`<tr>${row.map((v,i)=>`<td>${displayCell(v,i)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  el('rows-page').textContent = `${rowPage + 1} / ${pages}`;
  el<HTMLButtonElement>('rows-prev').disabled = rowPage === 0; el<HTMLButtonElement>('rows-next').disabled = rowPage >= pages - 1;
}
el('next').onclick = () => showScreen('rules');
el('back').onclick = () => showScreen(screen === 'output' ? 'rules' : 'files');
el('files-prev').onclick = () => { filePage--; renderFiles(); };
el('files-next').onclick = () => { filePage++; renderFiles(); };
el('rows-prev').onclick = () => { rowPage--; renderRows(); };
el('rows-next').onclick = () => { rowPage++; renderRows(); };
el('settings').onclick = () => {
  if (!result) return;
  if(flexible){openFields();return;}
  ['group-name','sum-name','count-name'].forEach((id,i)=>el<HTMLInputElement>(id).value=appearance.headers[i]);
  el<HTMLSelectElement>('decimals').value=String(appearance.decimals);
  el('style-error').textContent = '';
  el('style-preview').innerHTML = result.result.rows.slice(0,2).map(row => `<tr>${row.map((v,i)=>`<td>${displayCell(v,i)}</td>`).join('')}</tr>`).join('');
  el<HTMLDialogElement>('preferences').showModal();
};
el('apply-style').onclick = async () => {
  const headers = ['group-name','sum-name','count-name'].map(id=>el<HTMLInputElement>(id).value.normalize('NFC').trim());
  if(headers.some(v=>!v) || new Set(headers).size!==3) { el('style-error').textContent='見出しは空欄にせず、別々の名前にしてください。'; return; }
  headers.forEach((v,i)=>el<HTMLInputElement>(['group-name','sum-name','count-name'][i]).value=v);
  appearance = { headers, decimals: Number(el<HTMLSelectElement>('decimals').value) };
  el<HTMLDialogElement>('preferences').close();await runAggregation();
};
el('file-help').onclick=()=>el<HTMLDialogElement>('file-formats').showModal();
el('close-formats').onclick=()=>el<HTMLDialogElement>('file-formats').close();
el('close-settings').onclick = () => el<HTMLDialogElement>('preferences').close();
window.addEventListener('resize', renderRows);

function currentRecipe():Recipe {
 if(flexible)return FlexibleRecipe.parse({...flexible,decimalPlaces:appearance.decimals});
 return {groupColumn:el<HTMLSelectElement>('group').value,amountColumn:el<HTMLSelectElement>('amount').value,statusColumn:el<HTMLSelectElement>('status').value,excludedStatus:el<HTMLInputElement>('excluded').value,excludeEnabled:el<HTMLInputElement>('exclude').checked,decimalPlaces:appearance.decimals,outputHeaders:appearance.headers as [string,string,string]};
}
function applyJob(job:Job) {
 invalidate();selectedJob=job;
 if('version' in job.recipe){flexible=FlexibleRecipe.parse(job.recipe);appearance.decimals=flexible.decimalPlaces;el('job-context').classList.remove('hidden');el('job-context').textContent=job.name+' · 第'+job.version+'版';if(sources.length)showScreen('rules');refresh();if(sources.length&&el<HTMLButtonElement>('run').disabled)message('必要な列がありません。集計項目か列の対応を確認してください。');return;}
 flexible=undefined;appearance={headers:[...job.recipe.outputHeaders],decimals:job.recipe.decimalPlaces};
 el<HTMLInputElement>('exclude').checked=job.recipe.excludeEnabled;el<HTMLInputElement>('excluded').value=job.recipe.excludedStatus;el('filter').classList.toggle('hidden',!job.recipe.excludeEnabled);
 const missing:string[]=[];
 for(const [id,key] of [['group','groupColumn'],['amount','amountColumn'],['status','statusColumn']] as const){
  const select=el<HTMLSelectElement>(id);select.value=job.recipe[key];
  const needed=id!=='status'||job.recipe.excludeEnabled;
  if(needed&&!select.value){missing.push(job.recipe[key]);select.options[0].textContent=`保存時：${job.recipe[key]}（列を選び直す）`;}
 }
 el('job-context').classList.remove('hidden');el('job-context').textContent=`${job.name} · 第${job.version}版`;
 if(sources.length){showScreen('rules');if(missing.length)message(`列が変わっています：${missing.join('、')}。該当する列を選び直してください。`);}
 else message('次回のファイルを入れると、保存したまとめ方を使えます。');
 refresh();
}
function renderJobs(){
 const pages=Math.max(1,Math.ceil(jobs.length/3));jobsPage=Math.min(jobsPage,pages-1);
 el('jobs-list').innerHTML=jobs.length?jobs.slice(jobsPage*3,jobsPage*3+3).map(job=>`<div class="job-card"><button class="text-button" data-job="${escape(job.id)}">${escape(job.name)}<small>第${job.version}版 · ${escape('version' in job.recipe?job.recipe.groups.map(g=>g.label).join('・'):job.recipe.groupColumn)}別</small></button><button class="text-button" data-delete="${escape(job.id)}" aria-label="${escape(job.name)}を削除">削除</button></div>`).join(''):'<p class="muted">まだ保存したまとめ方はありません。</p>';
 el('jobs-page').textContent=`${jobsPage+1} / ${pages}`;el<HTMLButtonElement>('jobs-prev').disabled=jobsPage===0;el<HTMLButtonElement>('jobs-next').disabled=jobsPage>=pages-1;
 document.querySelectorAll<HTMLButtonElement>('[data-job]').forEach(button=>button.onclick=()=>{const job=jobs.find(j=>j.id===button.dataset.job)!;el<HTMLDialogElement>('jobs-dialog').close();applyJob(job);});
 document.querySelectorAll<HTMLButtonElement>('[data-delete]').forEach(button=>button.onclick=()=>{deletingJob=jobs.find(j=>j.id===button.dataset.delete);el('delete-name').textContent=`「${deletingJob!.name}」を削除しますか？`;el('delete-error').textContent='';el<HTMLDialogElement>('delete-dialog').showModal();});
}
el('saved-jobs').onclick=async()=>{
 el('jobs-error').textContent='';el<HTMLDialogElement>('jobs-dialog').showModal();
 try{jobs=await listJobs();jobsPage=0;renderJobs();}catch(e){el('jobs-error').textContent=(e as Error).message;}
};
el('close-jobs').onclick=()=>el<HTMLDialogElement>('jobs-dialog').close();
el('jobs-prev').onclick=()=>{jobsPage--;renderJobs();};el('jobs-next').onclick=()=>{jobsPage++;renderJobs();};
el('save-job').onclick=()=>{el<HTMLInputElement>('job-name').value=selectedJob?.name??'';el('save-error').textContent='';el('save-update').classList.toggle('hidden',!selectedJob);el<HTMLDialogElement>('save-dialog').showModal();};
async function persistJob(update:boolean){
 el<HTMLButtonElement>('save-new').disabled=true;el<HTMLButtonElement>('save-update').disabled=true;
 try{selectedJob=await saveJob(el<HTMLInputElement>('job-name').value,currentRecipe(),update?selectedJob:undefined);el<HTMLDialogElement>('save-dialog').close();message('まとめ方を保存しました。次回も使えます。');}
 catch(e){el('save-error').textContent=(e as Error).message;}
 finally{el<HTMLButtonElement>('save-new').disabled=false;el<HTMLButtonElement>('save-update').disabled=false;}
}
el('save-new').onclick=()=>void persistJob(false);el('save-update').onclick=()=>void persistJob(true);el('close-save').onclick=()=>el<HTMLDialogElement>('save-dialog').close();
el('close-delete').onclick=()=>el<HTMLDialogElement>('delete-dialog').close();
el('delete-confirm').onclick=async()=>{
 if(!deletingJob)return;
 el<HTMLButtonElement>('delete-confirm').disabled=true;
 try{await deleteJob(deletingJob);if(selectedJob?.id===deletingJob.id){selectedJob=undefined;el('job-context').classList.add('hidden');}jobs=await listJobs();renderJobs();el<HTMLDialogElement>('delete-dialog').close();}
 catch(e){el('delete-error').textContent=(e as Error).message;}
 finally{el<HTMLButtonElement>('delete-confirm').disabled=false;}
};

function cancelAi(){aiEpoch++;aiAbort?.abort();aiAbort=undefined;aiCandidate=undefined;}
function updateAiButton(){el<HTMLButtonElement>('request-ai').disabled=!!aiAbort||!!recognition||!el<HTMLInputElement>('ai-consent').checked||!el<HTMLTextAreaElement>('ai-instruction').value.trim();}
el('open-ai').onclick=()=>{
 cancelAi();aiHeaders=commonHeaders();
 el('ai-compose').classList.remove('hidden');el('ai-review').classList.add('hidden');el('ai-message').textContent='';el<HTMLInputElement>('ai-consent').checked=false;updateAiButton();el<HTMLDialogElement>('ai-dialog').showModal();
};
el('close-ai').onclick=()=>el<HTMLDialogElement>('ai-dialog').close();
el<HTMLDialogElement>('ai-dialog').addEventListener('close',()=>{cancelAi();updateAiButton();});
el('ai-instruction').oninput=()=>{cancelAi();updateAiButton();};el('ai-consent').onchange=()=>{if(!el<HTMLInputElement>('ai-consent').checked)cancelAi();updateAiButton();};
el('request-ai').onclick=async()=>{
 if(el<HTMLButtonElement>('request-ai').disabled)return;
 cancelAi();const epoch=aiEpoch,version=revision;aiAbort=new AbortController();updateAiButton();el('ai-message').textContent='まとめ方を考えています…';
 try{
  const input=makeAiRequest(aiHeaders,el<HTMLTextAreaElement>('ai-instruction').value);
  const response=await fetch('/api/ai/propose',{method:'POST',headers:{'Content-Type':'application/json','X-Ponto-Action':'propose'},body:JSON.stringify(input),signal:AbortSignal.any([aiAbort.signal,AbortSignal.timeout(45000)])});
  const json=await response.json();if(epoch!==aiEpoch||version!==revision||!el<HTMLDialogElement>('ai-dialog').open)return;
  if(!response.ok)throw new Error(typeof json.error==='string'?json.error:'提案を取得できませんでした。');
  aiCandidate=validateAiAnswer(json.answer,input);
  if(aiCandidate.kind==='question'){el('ai-message').textContent=aiCandidate.question;return;}
  const field=(id:string)=>input.fields.find(f=>f.id===id)!.name;
  if(aiCandidate.kind==='flexible'){el('ai-bindings').innerHTML='<dt>分類</dt><dd>'+aiCandidate.groupFieldIds.map(field).map(escape).join('・')+'</dd><dt>一覧の項目</dt><dd>'+aiCandidate.metrics.map(m=>escape(m.label)+'（'+escape(m.fieldId?field(m.fieldId):'行数')+'・'+escape(({sum:'合計',count:'件数',average:'平均',min:'最小',max:'最大'})[m.operation])+'）').join('、')+'</dd><dt>除外</dt><dd>'+(aiCandidate.filter?escape(field(aiCandidate.filter.fieldId))+'：'+escape(aiCandidate.filter.excludedValue):'なし')+'</dd>';el('ai-explanation').textContent=aiCandidate.explanation;el('ai-message').textContent='';el('ai-compose').classList.add('hidden');el('ai-review').classList.remove('hidden');return;}
  el('ai-bindings').innerHTML=`<dt>まとめる単位</dt><dd>${escape(field(aiCandidate.groupFieldId))}</dd><dt>合計する数値</dt><dd>${escape(field(aiCandidate.amountFieldId))}</dd><dt>除外</dt><dd>${aiCandidate.filter?`${escape(field(aiCandidate.filter.fieldId))} が「${escape(aiCandidate.filter.excludedValue)}」の行`:'なし'}</dd>`;
  el('ai-explanation').textContent=aiCandidate.explanation;el('ai-message').textContent='';el('ai-compose').classList.add('hidden');el('ai-review').classList.remove('hidden');
 }catch(e){if(epoch===aiEpoch&&version===revision&&el<HTMLDialogElement>('ai-dialog').open){el('ai-message').textContent=e instanceof Error?e.message:'提案を取得できませんでした。';aiCandidate=undefined;}}
 finally{if(epoch===aiEpoch){aiAbort=undefined;updateAiButton();}}
};
el('edit-ai').onclick=()=>{aiCandidate=undefined;el('ai-compose').classList.remove('hidden');el('ai-review').classList.add('hidden');el('ai-message').textContent='';};
el('apply-ai').onclick=()=>{
 if(!aiCandidate||aiCandidate.kind==='question')return;
 if(aiCandidate.kind==='flexible'){const c=aiCandidate,field=(id:string)=>aiHeaders[Number(id.replace('field_',''))];const next=FlexibleRecipe.parse({version:2,groups:c.groupFieldIds.map(id=>({column:field(id),label:field(id)})),metrics:c.metrics.map(m=>({column:m.fieldId?field(m.fieldId):'',operation:m.operation,label:m.label})),filter:c.filter?{column:field(c.filter.fieldId),excludedValue:c.filter.excludedValue}:null,decimalPlaces:appearance.decimals});invalidate();flexible=next;el<HTMLDialogElement>('ai-dialog').close();message('項目を反映しました。確認して集計してください。');refresh();return;}
 const candidate=aiCandidate,headers=[...aiHeaders];
 const field=(id:string)=>headers[Number(id.replace('field_',''))];
 if([candidate.groupFieldId,candidate.amountFieldId,...(candidate.filter?[candidate.filter.fieldId]:[])].some(id=>!field(id)))return;
 invalidate();flexible=undefined;el<HTMLSelectElement>('group').value=field(candidate.groupFieldId);el<HTMLSelectElement>('amount').value=field(candidate.amountFieldId);el<HTMLInputElement>('exclude').checked=!!candidate.filter;
 el<HTMLSelectElement>('status').value=candidate.filter?field(candidate.filter.fieldId):'';el<HTMLInputElement>('excluded').value=candidate.filter?.excludedValue??'';el('filter').classList.toggle('hidden',!candidate.filter);el<HTMLDialogElement>('ai-dialog').close();message('まとめ方を反映しました。条件を確認して集計してください。');refresh();
};

let fieldDraft:Flexible;
function optionList(value:string){return '<option value="">列を選ぶ</option>'+commonHeaders().map(h=>`<option value="${escape(h)}" ${h===value?'selected':''}>${escape(h)}</option>`).join('');}
function openFields(){
 fieldDraft=flexible?structuredClone(flexible):{version:2,groups:[{column:el<HTMLSelectElement>('group').value,label:appearance.headers[0]}],metrics:[{column:el<HTMLSelectElement>('amount').value,operation:'sum',label:appearance.headers[1]},{column:'',operation:'count',label:appearance.headers[2]}],filter:el<HTMLInputElement>('exclude').checked?{column:el<HTMLSelectElement>('status').value,excludedValue:el<HTMLInputElement>('excluded').value}:null,decimalPlaces:appearance.decimals};
 el('fields-error').textContent='';renderFields();el<HTMLDialogElement>('fields-dialog').showModal();
}
function renderFields(){
 for(const kind of ['groups','metrics'] as const){
  const list=fieldDraft[kind];el(kind==='groups'?'group-fields':'metric-fields').innerHTML=list.map((item,i)=>`<div class="field-row" data-kind="${kind}" data-index="${i}"><label>${kind==='groups'?'分類':'集計'} ${i+1}<select data-key="column" ${'operation' in item&&item.operation==='count'?'disabled':''}>${optionList(item.column)}</select></label>${'operation' in item?`<select aria-label="集計方法 ${i+1}" data-key="operation">${Object.entries(operations).map(([v,n])=>`<option value="${v}" ${item.operation===v?'selected':''}>${n}</option>`).join('')}</select>`:''}<label>一覧の見出し<input data-key="label" value="${escape(item.label)}" maxlength="80"></label><div><button class="text-button" data-move="-1" ${i===0?'disabled':''}>↑</button><button class="text-button" data-move="1" ${i===list.length-1?'disabled':''}>↓</button><button class="text-button" data-remove>削除</button></div></div>`).join('');
 }
 document.querySelectorAll<HTMLElement>('.field-row').forEach(row=>{
  const kind=row.dataset.kind as 'groups'|'metrics',i=Number(row.dataset.index);
  row.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[data-key]').forEach(input=>input.onchange=()=>{const item=fieldDraft[kind][i];const key=input.dataset.key as 'column'|'label'|'operation';if(key==='operation'&&'operation' in item){item.operation=input.value as keyof typeof operations;if(item.operation==='count')item.column='';renderFields();}else if(key==='column'||key==='label')item[key]=input.value;});
  row.querySelectorAll<HTMLButtonElement>('[data-move]').forEach(b=>b.onclick=()=>{const j=i+Number(b.dataset.move);const a=fieldDraft[kind];[a[i],a[j]]=[a[j],a[i]];renderFields();});
  row.querySelector<HTMLButtonElement>('[data-remove]')!.onclick=()=>{fieldDraft[kind].splice(i,1);renderFields();};
 });
 el<HTMLButtonElement>('add-group').disabled=fieldDraft.groups.length>=3;el<HTMLButtonElement>('add-metric').disabled=fieldDraft.metrics.length>=8;
 let filter=el('field-filter');if(!filter){filter=document.createElement('div');filter.id='field-filter';el('metric-fields').after(filter);}
 filter.innerHTML=`<label><input id="flex-exclude" type="checkbox" ${fieldDraft.filter?'checked':''}> 除外する行がある</label><div id="flex-filter-body" class="${fieldDraft.filter?'':'hidden'}"><label>条件の列<select id="flex-status">${optionList(fieldDraft.filter?.column??'')}</select></label><label>除く値（完全一致）<input id="flex-excluded" value="${escape(fieldDraft.filter?.excludedValue??'')}"></label></div><label>小数点以下<select id="flex-decimals">${Array.from({length:11},(_,i)=>`<option value="${i}" ${i===fieldDraft.decimalPlaces?'selected':''}>${i}桁</option>`).join('')}</select></label>`;
 el('flex-exclude').onchange=()=>{fieldDraft.filter=el<HTMLInputElement>('flex-exclude').checked?{column:'',excludedValue:''}:null;renderFields();};
 const syncFilter=()=>{if(fieldDraft.filter)fieldDraft.filter={column:el<HTMLSelectElement>('flex-status').value,excludedValue:el<HTMLInputElement>('flex-excluded').value};};el('flex-status').onchange=syncFilter;el('flex-excluded').oninput=syncFilter;el('flex-decimals').onchange=()=>{fieldDraft.decimalPlaces=Number(el<HTMLSelectElement>('flex-decimals').value);};
}
el('edit-fields').onclick=openFields;
el('add-group').onclick=()=>{fieldDraft.groups.push({column:'',label:'分類'+(fieldDraft.groups.length+1)});renderFields();};
el('add-metric').onclick=()=>{fieldDraft.metrics.push({column:'',operation:'sum',label:'集計'+(fieldDraft.metrics.length+1)});renderFields();};
el('close-fields').onclick=()=>el<HTMLDialogElement>('fields-dialog').close();
el('apply-fields').onclick=()=>{try{const next=FlexibleRecipe.parse(fieldDraft);if([...next.groups.map(g=>g.column),...next.metrics.filter(m=>m.operation!=='count').map(m=>m.column),...(next.filter?[next.filter.column]:[])].some(c=>!commonHeaders().includes(c)))throw new Error('使用する列を選んでください');invalidate();flexible=next;appearance.decimals=next.decimalPlaces;el<HTMLDialogElement>('fields-dialog').close();refresh();}catch{el('fields-error').textContent='列・集計方法・除外条件を選び、見出しを重複しない名前にしてください。';}};
el('basic-fields').onclick=()=>{invalidate();flexible=undefined;el<HTMLDialogElement>('fields-dialog').close();refresh();};
el('map-columns').onclick=()=>{
 const choices=[...new Set(sources.flatMap(s=>s.table?.headers??[]).map(h=>h.normalize('NFC').trim()))];
 el('mapping-fields').innerHTML=sources.map((s,i)=>`<fieldset><legend>${escape(s.file.name)}</legend>${(s.table?.headers??[]).map((h,j)=>`<label>${escape(h)} →<select data-source="${i}" data-column="${j}">${choices.map(c=>`<option value="${escape(c)}" ${c===(s.aliases?.[h.normalize('NFC').trim()]??h.normalize('NFC').trim())?'selected':''}>${escape(c)}</option>`).join('')}</select></label>`).join('')}</fieldset>`).join('');el('mapping-error').textContent='';el<HTMLDialogElement>('mapping-dialog').showModal();
};
el('close-mapping').onclick=()=>el<HTMLDialogElement>('mapping-dialog').close();
el('apply-mapping').onclick=()=>{
 const proposed=sources.map(()=>(Object.create(null) as Record<string,string>));document.querySelectorAll<HTMLSelectElement>('[data-source]').forEach(select=>{const i=Number(select.dataset.source),h=sources[i].table!.headers[Number(select.dataset.column)].normalize('NFC').trim();proposed[i][h]=select.value;});
 if(proposed.some(p=>new Set(Object.values(p)).size!==Object.values(p).length)){el('mapping-error').textContent='同じファイル内の2列を同じ名前にはできません。';return;}invalidate();sources.forEach((s,i)=>s.aliases=proposed[i]);columns();el<HTMLDialogElement>('mapping-dialog').close();refresh();
};

// Browser recognition may send audio to its recognition service. Consent precedes start.
type Recognition={lang:string;interimResults:boolean;continuous:boolean;start():void;abort():void;stop():void;onresult:((e:{results:{isFinal:boolean;[n:number]:{transcript:string}}[]})=>void)|null;onerror:((e:{error:string})=>void)|null;onend:(()=>void)|null};
const Speech=(window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition}).SpeechRecognition??(window as unknown as {webkitSpeechRecognition?:new()=>Recognition}).webkitSpeechRecognition;
let recognition:Recognition|undefined,voiceEpoch=0;
function stopVoice(){voiceEpoch++;recognition?.abort();recognition=undefined;el('voice').textContent='🎙 話して入力';updateAiButton();}
if(!Speech){el<HTMLButtonElement>('voice').disabled=true;el('voice-status').textContent='このブラウザでは音声入力を使えません。文字で入力できます。';}
el('voice').onclick=()=>{
 if(recognition){recognition.stop();return;}
 if(!Speech||!window.confirm('ブラウザの音声認識を使います。音声がブラウザ提供元の外部サービスへ送られる場合があります。マイクを使って入力しますか？'))return;
 cancelAi();const epoch=++voiceEpoch,r=new Speech();recognition=r;r.lang='ja-JP';r.continuous=false;r.interimResults=false;const original=el<HTMLTextAreaElement>('ai-instruction').value;
 r.onresult=e=>{if(epoch!==voiceEpoch||!el<HTMLDialogElement>('ai-dialog').open)return;if(el<HTMLTextAreaElement>('ai-instruction').value!==original){el('voice-status').textContent='文字を編集したため、音声の上書きを止めました。';return;}cancelAi();const text=Array.from(e.results).filter(v=>v.isFinal).map(v=>v[0].transcript).join('');el<HTMLTextAreaElement>('ai-instruction').value=(original+(original?'\n':'')+text).slice(0,2000);el('voice-status').textContent='聞き取った文章を確認・修正してから提案を作ってください。';updateAiButton();};
 r.onerror=e=>{if(epoch===voiceEpoch)el('voice-status').textContent='音声を入力できませんでした（'+e.error+'）。文字でも入力できます。';};
 r.onend=()=>{if(epoch===voiceEpoch){recognition=undefined;el('voice').textContent='🎙 話して入力';updateAiButton();}};
 try{r.start();el('voice').textContent='■ 音声を止める';el('voice-status').textContent='聞き取り中…';updateAiButton();}catch{stopVoice();el('voice-status').textContent='音声を開始できません。文字で入力できます。';}
};
el<HTMLDialogElement>('ai-dialog').addEventListener('close',stopVoice);
