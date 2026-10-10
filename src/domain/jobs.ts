import { z } from 'zod';
import { FixedRecipe } from './aggregate.ts';
import { FlexibleRecipe } from './flexible.ts';
export const RecipeSchema = z.union([FixedRecipe,FlexibleRecipe]);
export type Recipe = z.infer<typeof RecipeSchema>;
export const SavedJob = z.object({ id:z.string().min(1), name:z.string().trim().min(1).max(60), version:z.number().int().positive(), recipe:RecipeSchema, updatedAt:z.string() }).strict();
export type Job = z.infer<typeof SavedJob>;
const DB='ponto-jobs', STORE='jobs';
async function open():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE,{keyPath:'id'});
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(new Error('まとめ方を保存できません。ブラウザの保存設定を確認してください。'));
  request.onblocked=()=>reject(new Error('別の画面を閉じて、もう一度試してください。'));
 });
}
export async function listJobs():Promise<Job[]>{
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly'),request=tx.objectStore(STORE).getAll();
  tx.oncomplete=()=>{db.close();try{resolve(request.result.map((v:unknown)=>SavedJob.parse(v)).sort((a:Job,b:Job)=>b.updatedAt.localeCompare(a.updatedAt)));}catch{reject(new Error('保存データを読み取れません。削除や上書きはしていません。'));}};
  tx.onabort=tx.onerror=()=>{db.close();reject(new Error('保存したまとめ方を読み取れません。'));};
 });
}
export async function saveJob(name:string,recipe:Recipe,previous?:Job):Promise<Job>{
 const proposed=SavedJob.parse({id:previous?.id??crypto.randomUUID(),name,recipe,version:(previous?.version??0)+1,updatedAt:new Date().toISOString()});
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),lookup=store.get(proposed.id);let conflict=false;
  lookup.onsuccess=()=>{
   if(previous && lookup.result?.version!==previous.version){conflict=true;tx.abort();return;}
   store.put(proposed);
  };
  tx.oncomplete=()=>{db.close();resolve(proposed);};
  tx.onabort=tx.onerror=()=>{db.close();reject(new Error(conflict?'別の画面で更新されています。一覧から選び直してください。':'保存できませんでした。以前のまとめ方は残っています。'));};
 });
}
export async function deleteJob(job:Job):Promise<void>{
 const db=await open();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE),lookup=store.get(job.id);let conflict=false;
  lookup.onsuccess=()=>{if(lookup.result?.version!==job.version){conflict=true;tx.abort();}else store.delete(job.id);};
  tx.oncomplete=()=>{db.close();resolve();};
  tx.onabort=tx.onerror=()=>{db.close();reject(new Error(conflict?'更新されています。一覧から選び直してください。':'削除できませんでした。'));};
 });
}
