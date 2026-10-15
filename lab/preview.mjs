import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const assets=new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/style.css','style.css'],['/sample.json','sample.json']]);
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json'};
export const server=createServer(async(req,res)=>{
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
  if(req.url==='/healthz'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(req.method==='HEAD'?undefined:'ok');}
  const file=assets.get(req.url.split('?')[0]);if(!file){res.writeHead(404);return res.end();}
  try{const bytes=await readFile(new URL('web/'+file,import.meta.url));res.writeHead(200,{'Content-Type':types[file.split('.').pop()]});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(500);res.end('Asset unavailable');}
});
server.listen(Number(process.env.PORT||8790),process.env.HOST||'127.0.0.1',()=>console.error('Reliability Lab preview port '+server.address().port));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>server.close());
