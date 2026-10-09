import {verifyDeployment,PROFILE as BOUND_PROFILE} from './deployment.mjs';import {spawn} from 'node:child_process';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
export const budgets=new AsyncLocalStorage();
export const requestBudget=()=>budgets.getStore()??performance.now()+30000;
export const ROOT=path.resolve(import.meta.dirname,'..'),STATE=path.join(ROOT,'.state'),PROFILE=BOUND_PROFILE;
export const MAX_INPUT=65536,MAX_OUTPUT=12000000;
export const fail=code=>Object.assign(new Error(code),{code});
export function result(ok,data=null,code=null,untrusted=false){return {ok,untrusted,data,...(!ok?{error:{code}}:{}),diagnostics:{correlationId:randomUUID(),state:'disabled'}};}
export function bounded(p,deadline,code='DEADLINE_UNKNOWN'){let timer;return Promise.race([p,new Promise((_,reject)=>timer=setTimeout(()=>reject(fail(code)),Math.max(1,deadline-performance.now())))]).finally(()=>clearTimeout(timer));}
export function frame(value,max=MAX_OUTPUT){const body=Buffer.from(JSON.stringify(value));if(!body.length||body.length>max)throw fail('OUTPUT_LIMIT');const header=Buffer.alloc(4);header.writeUInt32LE(body.length);return Buffer.concat([header,body]);}
export function frames(stream,max,onFrame,onError){let buffer=Buffer.alloc(0),size=null;stream.on('data',bytes=>{buffer=Buffer.concat([buffer,bytes]);while(true){if(size===null){if(buffer.length<4)return;size=buffer.readUInt32LE();buffer=buffer.subarray(4);if(!size||size>max){onError('FRAME_LIMIT');stream.destroy();return;}}if(buffer.length<size)return;const b=buffer.subarray(0,size);buffer=buffer.subarray(size);size=null;let value;try{const text=new TextDecoder('utf-8',{fatal:true}).decode(b);value=JSON.parse(text);}catch{onError('INVALID_JSON');continue;}onFrame(value);}});stream.on('end',()=>{if(size!==null||buffer.length)onError('TRUNCATED_FRAME');});}
// Internal client reads private capabilities; the model receives sanitized results only.
export async function request(message,{deadline=requestBudget()}={}){
 await verifyDeployment();const body=Buffer.from(JSON.stringify(message));if(body.length>MAX_INPUT)throw fail('INPUT_LIMIT');
 const remaining=Math.floor(deadline-performance.now());if(remaining<=0)throw fail('OUTCOME_UNKNOWN');
 const child=spawn(path.join(ROOT,'dist/pipe-gate.exe'),['client',String(Math.min(remaining,30000))],{windowsHide:true,stdio:['pipe','pipe','ignore']});let bytes=Buffer.alloc(0);let oversized=false;
 child.stdout.on('data',b=>{if(bytes.length+b.length>MAX_OUTPUT){oversized=true;child.stdout.destroy();return;}bytes=Buffer.concat([bytes,b]);});
 const exit=new Promise((resolve,reject)=>{child.once('error',()=>reject(fail('GATE_UNAVAILABLE')));child.once('close',code=>resolve(code));});child.stdin.on('error',()=>{});
 try{await bounded(new Promise((resolve,reject)=>child.stdin.end(body,e=>e?reject(fail('WRITE_UNKNOWN')):resolve())),deadline);const code=await bounded(exit,deadline);if(code||oversized)throw fail(oversized?'OUTPUT_LIMIT':`IPC_OUTCOME_UNKNOWN_${code}`);try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{throw fail('INVALID_RESPONSE');}}
 finally{child.stdin.destroy();if(child.exitCode===null)await bounded(exit,performance.now()+1200,'CLIENT_EXIT_UNKNOWN').catch(()=>{});}
}
