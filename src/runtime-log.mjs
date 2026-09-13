import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {diagnosticRecord,validCorrelation} from './diagnostic-schema.mjs';
const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const diagnosticArgument=process.argv.indexOf('--diagnostic-id');
export const correlationId=diagnosticArgument>0&&validCorrelation(process.argv[diagnosticArgument+1])?process.argv[diagnosticArgument+1]:randomUUID();
let logger;
export function createRuntimeLog(role,{makeWorker=()=>new Worker(new URL('./diagnostic-writer.mjs',import.meta.url))}={}){
 const begun=performance.now();let worker,pending=0,seq=0,dropped=0,state='pending';
 try{worker=makeWorker();worker.on('message',m=>{pending=Math.max(0,pending-1);state=m.state;});worker.on('error',()=>{state='unavailable';pending=0;});worker.on('exit',()=>{state='unavailable';pending=0;});worker.unref();}catch{state='unavailable';}
 return {event(phase,extra={}){
  if(!worker||pending>=32||state==='unavailable'){dropped++;return;}
  const record=diagnosticRecord({...extra,role,phase,utc:new Date().toISOString(),elapsedMs:performance.now()-begun,version,pid:process.pid,ppid:process.ppid,correlationId:validCorrelation(extra.correlationId)?extra.correlationId:correlationId});
  if(!record)return;pending++;try{worker.postMessage({id:++seq,record});}catch{pending--;dropped++;state='unavailable';}
 },status(){return {state,pending,dropped,correlationId};},async flush(timeoutMs=250){
  const end=performance.now()+timeoutMs;while(pending&&performance.now()<end)await new Promise(r=>setTimeout(r,10));return this.status();
 }};
}
export function initDiagnostics(role){return logger??=createRuntimeLog(role);}
export function logEvent(phase,extra={}){logger?.event(phase,extra);}
export function diagnosticInfo(){return logger?.status()||{state:'not-started',correlationId};}
export async function finishDiagnostics(){return logger?.flush();}
