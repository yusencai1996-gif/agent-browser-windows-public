import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {freshSandbox} from '../scripts/test-sandbox.mjs';
import {diagnosticRecord} from '../src/diagnostic-schema.mjs';
import {openDiagnosticStore,readDiagnostics,configureDiagnostics} from '../src/diagnostic-store.mjs';
import {createRuntimeLog} from '../src/runtime-log.mjs';
import Ajv from 'ajv';
import {TOOLS} from '../src/tools.mjs';
const record=(extra={})=>({role:'cli',phase:'request_end',version:'0.8.1',utc:new Date().toISOString(),elapsedMs:2,correlationId:randomUUID(),state:'error',code:'HOST_START_TIMEOUT',...extra});
test('published output schema accepts bounded diagnostic metadata, not extra fields',()=>{const validate=new Ajv({strict:false}).compile(TOOLS[0].outputSchema),value={ok:true,untrusted:true,data:{},diagnostics:{correlationId:randomUUID(),state:'unavailable',pending:0,dropped:1}};assert.equal(validate(value),true);const extra=Object.fromEntries([['token',randomUUID()]]);assert.equal(validate({...value,diagnostics:{...value.diagnostics,...extra}}),false);});
test('records are whitelist-built; sensitive fields and malicious error text cannot survive',()=>{
 // Random synthetic data only; no credentials, files, or environment are read.
 const marker=`test-marker-${randomUUID()}`;const fields=['code','action','tool','token','url','title','task','password'];const input=Object.fromEntries(fields.map(name=>[name,marker]));const r=diagnosticRecord(record({...input,args:[marker],env:{KEY:marker},error:{message:marker}}));assert.equal(r.code,'INTERNAL');assert.equal(r.action,'other');assert.equal(r.tool,'other');assert.equal(JSON.stringify(r).includes(marker),false);assert.equal(diagnosticRecord(record({phase:marker})),null);
});
test('fixed leased slots rotate bounded files, concurrent writers retain complete JSONL',async()=>{
 const box=await freshSandbox('wp16-log');const a=await openDiagnosticStore(box.root,{slots:2,bytesPerFile:1400}),b=await openDiagnosticStore(box.root,{slots:2,bytesPerFile:1400});
 try{await assert.rejects(openDiagnosticStore(box.root,{slots:2}),/LOG_SLOTS_BUSY/);await Promise.all([a,b].map(async store=>{for(let n=0;n<25;n++)await store.append(record());}));
 const files=await fs.readdir(path.join(box.root,'logs'));assert.equal(files.length,4);let bytes=0;for(const f of files){const raw=await fs.readFile(path.join(box.root,'logs',f),'utf8');bytes+=Buffer.byteLength(raw);for(const line of raw.trim().split('\n'))assert.doesNotThrow(()=>JSON.parse(line));}assert.ok(bytes<=2*2*1400);
 const data=await readDiagnostics(box.root,{limit:3});assert.equal(data.events.length,3);assert.equal(data.invalidFiles,0);
 }finally{await a.close();await b.close();await box.cleanup();}
});
test('links and unknown slot files are refused without modifying an outside file',async()=>{
 const box=await freshSandbox('wp16-link'),store=await openDiagnosticStore(box.root,{slots:1});
 const outside=path.join(box.root,'outside'),current=path.join(box.root,'logs/diag-00-current.jsonl');await fs.writeFile(outside,'synthetic outside');await fs.link(outside,current);
 try{await assert.rejects(store.append(record()),/LOG_UNSAFE_PATH/);assert.equal(await fs.readFile(outside,'utf8'),'synthetic outside');await fs.unlink(current);await fs.writeFile(current,'unknown owner');await assert.rejects(store.append(record()),/LOG_FILE_INVALID/);assert.equal(await fs.readFile(current,'utf8'),'unknown owner');}finally{await store.close();await box.cleanup();}
});
test('reader safely skips a path rotated between inspection and open',async()=>{
 for(const replacement of [false,true]){
  const box=await freshSandbox('wp16-reader-rotation'),store=await openDiagnosticStore(box.root,{slots:1});
  const current=path.join(box.root,'logs','diag-00-current.jsonl'),previous=path.join(box.root,'logs','diag-00-previous.jsonl'),originalOpen=fs.open,id=randomUUID();let rotated=false;
  try{
   await store.append(record({correlationId:id}));const raw=await fs.readFile(current,'utf8');
   fs.open=async function(file,flags,...args){
    if(file===current&&flags==='r'&&!rotated){rotated=true;await fs.rename(current,previous);if(replacement)await fs.writeFile(current,raw,{flag:'wx'});}
    return originalOpen.call(this,file,flags,...args);
   };
   const result=await readDiagnostics(box.root);assert.equal(rotated,true);assert.equal(result.invalidFiles,1);assert.equal(result.events.length,1);assert.equal(result.events[0].correlationId,id);
  }finally{fs.open=originalOpen;await store.close();await box.cleanup();}
 }
});
test('disable, bounded correlation reads and explicit timezone filters work',async()=>{
 const box=await freshSandbox('wp16-filter'),store=await openDiagnosticStore(box.root,{slots:1}),id=randomUUID();
 try{await configureDiagnostics(box.root,false);assert.equal(await store.append(record()),false);assert.equal((await readDiagnostics(box.root)).events.length,0);await configureDiagnostics(box.root,true);await store.append(record({correlationId:id,utc:'2026-09-13T02:00:00.000Z'}));await store.append(record());
 const filtered=await readDiagnostics(box.root,{correlationId:id,since:'2026-09-13T10:00:00+08:00'});assert.equal(filtered.events.length,1);assert.equal(filtered.events[0].phase,'request_end');await assert.rejects(readDiagnostics(box.root,{since:'2026-09-13 10:00'}),/EXPLICIT_TIMEZONE_REQUIRED/);
 }finally{await store.close();await box.cleanup();}
});
test('unavailable or stalled writer cannot throw into business or grow an unlimited queue',async()=>{
 const w=new EventEmitter();w.unref=()=>{};w.postMessage=()=>{};
 const log=createRuntimeLog('cli',{makeWorker:()=>w});for(let n=0;n<100;n++)log.event('cli_begin');assert.equal(log.status().pending,32);assert.equal(log.status().dropped,68);const began=performance.now();await log.flush(20);assert.ok(performance.now()-began<200);w.emit('error',new Error('synthetic disk full'));assert.doesNotThrow(()=>log.event('cli_result'));assert.equal(log.status().state,'unavailable');
});
