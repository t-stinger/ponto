import { z } from 'zod';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AiAnswer, AiRequest, AI_SYSTEM_INSTRUCTION, validateAiAnswer } from '../ai/contract.ts';
const Envelope=z.object({answer:AiAnswer}).strict();
const ApiEnvelope=z.object({answer:z.union(AiAnswer.options)}).strict();
function outputSchema(){
 const schema=z.toJSONSchema(ApiEnvelope,{target:'draft-7'});
 function compatible(value:unknown):void{if(!value||typeof value!=='object')return;const obj=value as Record<string,unknown>;if('const' in obj){obj.enum=[obj.const];delete obj.const;}delete obj.$schema;delete obj.minLength;delete obj.maxLength;Object.values(obj).forEach(compatible);}
 compatible(schema);return schema;
}
export type Settings={enabled:boolean;apiKey:string;model:string;maxCalls:number};
export function settings(env:NodeJS.ProcessEnv):Settings{
 const raw=env.PONTO_AI_MAX_CALLS??'0';
 return{enabled:env.PONTO_AI_ENABLED==='true',apiKey:env.OPENAI_API_KEY??'',model:env.OPENAI_CODEX_MODEL??'',maxCalls:/^\d+$/.test(raw)?Math.min(Number(raw),100):0};
}
export function ready(config:Settings){return config.enabled&&!!config.apiKey&&/^[a-z0-9][a-z0-9.-]*codex[a-z0-9.-]*$/.test(config.model)&&Number.isInteger(config.maxCalls)&&config.maxCalls>0;}
class Failure extends Error{status:number;constructor(status:number,message:string){super(message);this.status=status;}}
export function apiBody(raw:unknown,model:string){
 const input=AiRequest.parse(raw);
 if(new Set(input.fields.map(f=>f.id)).size!==input.fields.length||new Set(input.fields.map(f=>f.name.normalize('NFC').trim())).size!==input.fields.length)throw new Failure(400,'列名や列IDが重複しています。');
 return{input,body:{model,instructions:AI_SYSTEM_INSTRUCTION+' Return an object with one key answer containing the question or proposal.',input:[{role:'user',content:JSON.stringify(input)}],tools:[],tool_choice:'none',store:false,reasoning:{effort:'low'},max_output_tokens:1536,text:{format:{type:'json_schema',name:'ponto_proposal',strict:true,schema:outputSchema()}}}};
}
export async function propose(raw:unknown,config:Settings,fetcher:typeof fetch=fetch,signal?:AbortSignal){
 const {input,body}=apiBody(raw,config.model);
 const response=await fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:signal?AbortSignal.any([signal,AbortSignal.timeout(40000)]):AbortSignal.timeout(40000)});
 if(!response.ok)throw new Failure(response.status===429?429:502,response.status===429?'AIの利用上限に達しました。時間をおいて試してください。':'AIに接続できませんでした。設定を確認してください。');
 const reader=response.body?.getReader();if(!reader)throw new Failure(502,'AIの返答を読み取れませんでした。');
 let size=0;const chunks:Uint8Array[]=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>256*1024){await reader.cancel();throw new Failure(502,'AIの返答が長すぎます。');}chunks.push(value);}
 const answer=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(answer.status!=='completed'||!Array.isArray(answer.output))throw new Failure(502,'AIの提案が完了しませんでした。指示を短くして試してください。');
 const content=answer.output.flatMap((item:{type:string;content?:unknown[]})=>item.type==='message'?item.content??[]:[]);
 if(content.some((item:{type:string})=>item.type==='refusal'))throw new Failure(502,'この指示では提案できません。列を選んで集計してください。');
 const text=content.filter((item:{type:string})=>item.type==='output_text').map((item:{text:string})=>item.text).join('');
 return validateAiAnswer(Envelope.parse(JSON.parse(text)).answer,input);
}
export function aiHandler(config:Settings,fetcher:typeof fetch=fetch){
 let calls=0,pending=false;
 const json=(res:ServerResponse,status:number,value:unknown)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));}};
 return async(req:IncomingMessage,res:ServerResponse,next:()=>void)=>{
  const route=req.url?.split('?')[0];if(!route?.startsWith('/api/ai/')){next();return;}
  const host=req.headers.host??'';
  if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)){json(res,403,{error:'この接続先は許可されていません。'});return;}
  if(route==='/api/ai/status'&&req.method==='GET'){json(res,200,{ready:ready(config)&&calls<config.maxCalls});return;}
  if(route!=='/api/ai/propose'||req.method!=='POST'){json(res,405,{error:'この操作は利用できません。'});return;}
  if(req.headers.origin!==`http://${host}`||req.headers['x-ponto-action']!=='propose'||req.headers['content-type']?.split(';')[0]!=='application/json'){json(res,403,{error:'アプリの画面から操作してください。'});return;}
  if(!ready(config)){json(res,503,{error:'AIの設定後に使えます。今は列を選んで集計できます。'});return;}
  if(Number(req.headers['content-length']??0)>32*1024){req.resume();json(res,413,{error:'指示が長すぎます。'});return;}
  if(pending||calls>=config.maxCalls){json(res,429,{error:'AIの呼び出し上限、または処理中です。列を選んで集計できます。'});return;}
  const abort=new AbortController();res.on('close',()=>{if(!res.writableEnded)abort.abort();});
  try{
   const chunks:Buffer[]=[];let length=0;
   for await(const chunk of req){length+=chunk.length;if(length>32*1024)throw new Failure(413,'指示が長すぎます。');chunks.push(Buffer.from(chunk));}
   const raw=JSON.parse(Buffer.concat(chunks).toString('utf8'));apiBody(raw,config.model);
   if(pending||calls>=config.maxCalls)throw new Failure(429,'AIは処理中、または呼び出し上限です。');
   pending=true;calls++;
   try{json(res,200,{answer:await propose(raw,config,fetcher,abort.signal)});}finally{pending=false;}
  }catch(e){json(res,e instanceof Failure?e.status:e instanceof z.ZodError||e instanceof SyntaxError?400:502,{error:e instanceof Failure?e.message:e instanceof z.ZodError||e instanceof SyntaxError?'AIへの指示または返答の形式を確認してください。':'AIの応答がありません。条件は変更していません。'});}
 };
}
