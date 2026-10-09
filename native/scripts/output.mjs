import {spawn} from 'node:child_process';import path from 'node:path';
import {ROOT,MAX_OUTPUT,bounded,fail,requestBudget} from './wire.mjs';
export async function stdoutUntil(bytes,deadline=requestBudget()){
 const body=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);if(body.length>MAX_OUTPUT)throw fail('OUTPUT_LIMIT');const remaining=Math.floor(Math.min(deadline-performance.now(),3000));if(remaining<=0)throw fail('OUTPUT_OUTCOME_UNKNOWN');
 // Windows anonymous stdout may block Node's event loop in write(). A native
 // writer owns the inherited actual stdout handle, not a Promise-only timer.
 const child=spawn(path.join(ROOT,'dist/pipe-gate.exe'),['stdout',String(remaining)],{windowsHide:true,stdio:['pipe','inherit','ignore']});const exit=new Promise((resolve,reject)=>{child.once('error',()=>reject(fail('OUTPUT_OUTCOME_UNKNOWN')));child.once('close',resolve);});child.stdin.on('error',()=>{});
 try{await bounded(new Promise((resolve,reject)=>child.stdin.end(body,e=>e?reject(fail('OUTPUT_OUTCOME_UNKNOWN')):resolve())),deadline,'OUTPUT_OUTCOME_UNKNOWN');const code=await bounded(exit,Math.min(deadline,performance.now()+remaining+100),'OUTPUT_OUTCOME_UNKNOWN');if(code!==0)throw fail('OUTPUT_OUTCOME_UNKNOWN');}
 finally{child.stdin.destroy();if(child.exitCode===null)await bounded(exit,performance.now()+1200,'OUTPUT_WORKER_EXIT_UNKNOWN').catch(()=>{});}
}
// A pending Node/libuv write cannot be cancelled with a Promise. Self-exit
// closes this process's handles and workers; never kill another process.
export function outputFailedExit(){process.stdout.destroy();process.stdin.destroy();process.exit(74);}
