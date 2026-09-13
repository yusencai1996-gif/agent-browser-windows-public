import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {createHash,randomUUID} from 'node:crypto';
import {diagnosticRecord,LOG_FORMAT,validCorrelation} from './diagnostic-schema.mjs';
export const LOG_LIMITS={slots:32,bytesPerFile:192*1024,filesPerSlot:2,maxEvents:200};
const header=JSON.stringify({format:LOG_FORMAT})+'\n';
async function plain(p,directory=false){const s=await fs.lstat(p);if(s.isSymbolicLink()||(await fs.realpath(p)).toLowerCase()!==path.resolve(p).toLowerCase()||(directory?!s.isDirectory():!s.isFile()||s.nlink!==1))throw new Error('LOG_UNSAFE_PATH');return s;}
async function location(local){await plain(local,true);const dir=path.join(local,'logs');await fs.mkdir(dir,{recursive:true});await plain(dir,true);return dir;}
export async function diagnosticsEnabled(local){
 await plain(local,true);const file=path.join(local,'diagnostics.json');
 let s;try{s=await plain(file);}catch(e){if(e.code==='ENOENT')return true;throw e;}
 if(s.size>64)throw new Error('LOG_CONFIG_INVALID');const h=await fs.open(file,'r');let value;try{const f=await h.stat();if(f.ino!==s.ino||f.nlink!==1)throw new Error('LOG_UNSAFE_PATH');const b=Buffer.alloc(65),read=await h.read(b,0,b.length,0);if(read.bytesRead>64)throw new Error('LOG_CONFIG_INVALID');value=JSON.parse(b.subarray(0,read.bytesRead).toString('utf8'));}finally{await h.close();}
 if(typeof value.enabled!=='boolean'||Object.keys(value).some(k=>k!=='enabled'))throw new Error('LOG_CONFIG_INVALID');return value.enabled;
}
export async function configureDiagnostics(local,enabled){
 await plain(local,true);const file=path.join(local,'diagnostics.json');try{await plain(file);}catch(e){if(e.code!=='ENOENT')throw e;}
 const temp=path.join(local,`diagnostics-setting-${randomUUID()}.tmp`);
 try{await fs.writeFile(temp,JSON.stringify({enabled:!!enabled}),{flag:'wx'});await plain(local,true);try{await plain(file);}catch(e){if(e.code!=='ENOENT')throw e;}await fs.rename(temp,file);}finally{await fs.unlink(temp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 return {enabled:!!enabled};
}
// OS-owned named-pipe leases bound concurrency without stale PID/lock files.
export async function openDiagnosticStore(local,{slots=LOG_LIMITS.slots,bytesPerFile=LOG_LIMITS.bytesPerFile}={}){
 const dir=await location(local);const identity=await plain(dir,true);let lease,index;
 const prefix='\\\\.\\pipe\\abw-diag-'+createHash('sha256').update(path.resolve(local).toLowerCase()).digest('hex').slice(0,24);
 for(let n=0;n<slots;n++){const server=net.createServer(s=>s.destroy());const acquired=await new Promise(resolve=>{server.once('error',()=>resolve(false));server.listen(prefix+'-'+n,()=>resolve(true));});if(acquired){lease=server;index=n;lease.unref();break;}}
 if(!lease)throw new Error('LOG_SLOTS_BUSY');
 const names=['current','previous'].map(s=>path.join(dir,`diag-${String(index).padStart(2,'0')}-${s}.jsonl`));
 const checkDir=async()=>{await plain(local,true);const s=await plain(dir,true);if(s.ino!==identity.ino||s.dev!==identity.dev)throw new Error('LOG_UNSAFE_PATH');};
 async function inspect(file){
  let s;try{s=await plain(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}
  if(s.size>bytesPerFile||s.size<header.length)throw new Error('LOG_FILE_INVALID');
  const h=await fs.open(file,'r');try{const f=await h.stat();if(f.ino!==s.ino||f.nlink!==1)throw new Error('LOG_UNSAFE_PATH');const b=Buffer.alloc(Buffer.byteLength(header));await h.read(b,0,b.length,0);if(b.toString()!==header)throw new Error('LOG_FILE_INVALID');}finally{await h.close();}return s;
 }
 return {async append(input){
  const record=diagnosticRecord(input);if(!record)return false;
  if(!await diagnosticsEnabled(local))return false;
  const line=Buffer.from(JSON.stringify(record)+'\n');if(line.length>1024)throw new Error('LOG_RECORD_TOO_LARGE');
  await checkDir();let current=await inspect(names[0]);
  if(current&&current.size+line.length>bytesPerFile){
   const previous=await inspect(names[1]);await checkDir();if(previous)await fs.unlink(names[1]);await fs.rename(names[0],names[1]);current=null;
  }
  if(!current){const h=await fs.open(names[0],'wx');try{await h.writeFile(header);}finally{await h.close();}}
  await checkDir();const before=await inspect(names[0]),h=await fs.open(names[0],'a');
  try{const s=await h.stat();if(s.ino!==before.ino||s.dev!==before.dev||s.nlink!==1)throw new Error('LOG_UNSAFE_PATH');await h.writeFile(line);}finally{await h.close();}return true;
 },async close(){await new Promise(r=>lease.close(r));}};
}
export async function readDiagnostics(local,{limit=100,correlationId,since}={}){
 if(!Number.isInteger(limit)||limit<1||limit>LOG_LIMITS.maxEvents||correlationId&&!validCorrelation(correlationId))throw new Error('INVALID_DIAGNOSTIC_FILTER');
 if(since&&(!/^\d{4}-\d\d-\d\dT.+(?:Z|[+-]\d\d:\d\d)$/.test(since)||!Number.isFinite(Date.parse(since))))throw new Error('EXPLICIT_TIMEZONE_REQUIRED');
 const after=since?Date.parse(since):0,dir=await location(local);let events=[],files=0,totalBytes=0,invalidFiles=0;
 for(let n=0;n<LOG_LIMITS.slots;n++)for(const tail of ['current','previous']){
  const file=path.join(dir,`diag-${String(n).padStart(2,'0')}-${tail}.jsonl`);let s;try{s=await plain(file);}catch(e){if(e.code==='ENOENT')continue;invalidFiles++;continue;}
  if(s.size>LOG_LIMITS.bytesPerFile){invalidFiles++;continue;}
  // Rotation may replace this path after inspection. Skip that snapshot before
  // reading any bytes; the remaining slots are still useful diagnostics.
  let h,data;try{h=await fs.open(file,'r');const f=await h.stat();if(f.ino!==s.ino||f.dev!==s.dev||f.nlink!==1)throw new Error('LOG_UNSAFE_PATH');const b=Buffer.alloc(LOG_LIMITS.bytesPerFile),read=await h.read(b,0,b.length,0);data=b.subarray(0,read.bytesRead).toString('utf8');}catch{invalidFiles++;continue;}finally{if(h)await h.close();}
  if(!data.startsWith(header)){invalidFiles++;continue;}files++;totalBytes+=s.size;
  const recent=[];for(const line of data.split('\n').slice(1)){if(line.length>1024)continue;try{const r=diagnosticRecord(JSON.parse(line));if(r&&Date.parse(r.utc)>=after&&(!correlationId||r.correlationId===correlationId)){recent.push(r);if(recent.length>limit)recent.shift();}}catch{}}
  events.push(...recent);events.sort((a,b)=>a.utc.localeCompare(b.utc));events=events.slice(-limit);
 }
 return {enabled:await diagnosticsEnabled(local),events,files,totalBytes,invalidFiles,limits:LOG_LIMITS};
}
