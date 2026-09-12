// Optional resumable transport. Playwright still owns extraction/install metadata.
import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
export async function installResumable(root,env){
  const cli=path.join(root,'node_modules/playwright/cli.js');
  const official={...env,PLAYWRIGHT_DOWNLOAD_HOST:'',PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST:''};
  async function run(program,args,capture=false,environment=official){return new Promise((resolve,reject)=>{
    const p=spawn(program,args,{cwd:root,env:environment,windowsHide:true,stdio:['ignore','pipe','pipe']});let text='';
    p.stdout.on('data',b=>capture?text+=b:process.stderr.write(b));p.stderr.on('data',b=>process.stderr.write(b));p.on('error',()=>reject(new Error('RESUMABLE_DOWNLOAD_FAILED')));p.on('exit',code=>resolve({code,text}));
  });}
  const plan=await run(process.execPath,[cli,'install','--dry-run','--no-shell','chromium'],true);
  if(plan.code)throw new Error('RESUMABLE_DOWNLOAD_FAILED');
  const urls=[...plan.text.matchAll(/Download url:\s+(https:\/\/\S+)/g)].map(m=>new URL(m[1]));
  if(!urls.length || urls.some(u=>u.hostname!=='cdn.playwright.dev'))throw new Error('UNKNOWN_DOWNLOAD_SOURCE');
  const cache=path.join(env.TEMP,'resumable');await fs.mkdir(cache,{recursive:true});const map=new Map();
  for(const url of urls){
    const file=path.join(cache,createHash('sha256').update(url.href).digest('hex')+'.zip'),receipt=file+'.sha256';
    let complete=false;try{complete=(await fs.readFile(receipt,'utf8'))===createHash('sha256').update(await fs.readFile(file)).digest('hex');}catch{}
    let noProgress=0;
    for(let attempt=0;!complete && attempt<12;attempt++){
      const before=await fs.stat(file).then(s=>s.size,()=>0);
      process.stderr.write(`Resumable browser download: ${path.basename(url.pathname)}, offset ${before}\n`);
      const result=await run('curl.exe',['--fail','--location','--silent','--show-error','--proto','=https','--proto-redir','=https','--connect-timeout','15','--max-time','120','--continue-at','-','--output',file,url.href]);
      if(result.code===0){await fs.writeFile(receipt,createHash('sha256').update(await fs.readFile(file)).digest('hex'));complete=true;break;}
      const after=await fs.stat(file).then(s=>s.size,()=>0);noProgress=after>before?0:noProgress+1;if(noProgress>=3)break;
    }
    if(!complete)throw new Error('RESUMABLE_DOWNLOAD_FAILED');
    map.set(url.pathname,file);const offset=url.pathname.indexOf('/builds/');if(offset>=0)map.set(url.pathname.slice(offset),file);
  }
  const server=http.createServer(async(req,res)=>{
    const file=map.get(req.url);if(!file){res.writeHead(404);res.end();return;}
    res.writeHead(200,{'content-length':(await fs.stat(file)).size});createReadStream(file).pipe(res);
  });
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const host=`http://127.0.0.1:${server.address().port}`;
    const result=await run(process.execPath,[cli,'install','--no-shell','chromium'],false,{...env,PLAYWRIGHT_DOWNLOAD_HOST:host,PLAYWRIGHT_CHROMIUM_DOWNLOAD_HOST:host});
    if(result.code)throw new Error('RESUMABLE_DOWNLOAD_FAILED');
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
}
