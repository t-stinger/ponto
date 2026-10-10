import { createServer } from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import { resolve,extname,sep } from 'node:path';
import { aiHandler,settings } from './ai.ts';
const root=resolve('dist'),handle=aiHandler(settings(process.env));
const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
const server=createServer((req,res)=>{void handle(req,res,()=>{void(async()=>{
 try{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  const pathname=decodeURIComponent(new URL(req.url??'/', 'http://127.0.0.1').pathname);const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+sep)){res.writeHead(403);res.end();return;}
  if(!(await stat(file)).isFile())throw new Error('Not a file');
  res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:await readFile(file));
 }catch{res.writeHead(404);res.end('Not found');}
 })();});});
const port=Number(process.env.PONTO_PORT??4180);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PONTO_PORT must be a valid TCP port');
server.listen(port,'127.0.0.1',()=>console.log(`Ponto: http://127.0.0.1:${port}/`));
