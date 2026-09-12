// Public integration smoke: only a fresh owned copy and a loopback fixture.
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {freshSandbox} from './test-sandbox.mjs';
const source=path.resolve(import.meta.dirname,'..'),box=await freshSandbox('abw-browser');
let started=false;
const fixture=http.createServer((_q,r)=>{r.setHeader('Content-Type','text/html; charset=utf-8');r.end('<!doctype html><title>Local synthetic check</title><main><h1>Local synthetic check</h1><p>Browser smoke passed</p><p>This local paragraph verifies article extraction without a website account.</p></main>');});
function cli(...args){return new Promise((resolve,reject)=>{const p=spawn(process.execPath,[path.join(box.root,'src/cli.mjs'),...args],{cwd:box.root,windowsHide:true,stdio:['ignore','pipe','pipe']});let text='';p.stdout.on('data',b=>text+=b);p.stderr.resume();p.on('error',reject);p.on('exit',()=>{try{const r=JSON.parse(text);if(!r.ok)throw new Error(r.error.code);resolve(r.data);}catch(e){reject(e);}});});}
try {
  for(const name of ['src','extension','vendor','node_modules','package.json'])await fs.cp(path.join(source,name),path.join(box.root,name),{recursive:true,errorOnExist:true,force:false,filter:async p=>{if((await fs.lstat(p)).isSymbolicLink())throw new Error('SMOKE_SOURCE_LINK');return true;}});
  await fs.cp(path.join(source,'.local/browsers'),path.join(box.root,'.local/browsers'),{recursive:true,errorOnExist:true,force:false,filter:async p=>{if((await fs.lstat(p)).isSymbolicLink())throw new Error('SMOKE_CACHE_LINK');return true;}});
  await new Promise(r=>fixture.listen(0,'127.0.0.1',r));
  assert.equal((await cli('doctor')).ready,true);
  // A failed browser launch can still leave our host running. Always stop it.
  started=true;await cli('start','--temporary');await cli('task','synthetic-check');
  const input=path.join(box.root,'input.json');
  await fs.writeFile(input,JSON.stringify({action:'new',url:`http://127.0.0.1:${fixture.address().port}`}));
  const tab=await cli('call','tabs','--task','synthetic-check','--input',input);
  await fs.writeFile(input,JSON.stringify({tabId:tab.tabId}));
  assert.match((await cli('call','read_text','--task','synthetic-check','--input',input)).text,/Browser smoke passed/);
  await cli('call','screenshot','--task','synthetic-check','--input',input);
  const overview=await cli('overview');const s=await cli('status');assert.ok(s.instances[0].window.windows.some(w=>w.id===overview.windowId&&w.state==='normal'));
  await cli('end','synthetic-check');assert.equal((await cli('stop')).cleanupConfirmed,true);started=false;
  console.log(JSON.stringify({passed:true,temporary:true,localFixture:true,read:true,screenshot:true,overview:true,stopped:true,browserCacheReused:true}));
} catch(error) { console.error('SMOKE_FAILURE:',error.message);throw error; } finally {
  let safeToClean=!started;
  try {
    if(started){await cli('end','synthetic-check').catch(()=>{});const s=await cli('status');if(!s.tasks.every(t=>t.revoked))throw new Error('UNEXPECTED_TASK_RETAINED');assert.equal((await cli('stop')).cleanupConfirmed,true);safeToClean=true;}
  } finally {
    // Close our fixture even when host cleanup is unconfirmed. Retain that tree.
    fixture.closeAllConnections();await new Promise(r=>fixture.close(r));
    if(safeToClean)await box.cleanup();
  }
}
