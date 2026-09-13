// Optional I/O lives in an unreferenced worker thread, never on the CLI exit path.
import {parentPort} from 'node:worker_threads';
import {LOCAL,secureLocal} from './local-control.mjs';
import {openDiagnosticStore} from './diagnostic-store.mjs';
let store,failed=false,queue=Promise.resolve();
const ready=(async()=>{await secureLocal();store=await openDiagnosticStore(LOCAL);})().catch(()=>{failed=true;});
parentPort.on('message',m=>{
 queue=queue.then(async()=>{await ready;if(failed){parentPort.postMessage({id:m.id,state:'unavailable'});return;}
  try{const written=await store.append(m.record);parentPort.postMessage({id:m.id,state:written?'written':'disabled'});}catch{failed=true;parentPort.postMessage({id:m.id,state:'unavailable'});}
 }).catch(()=>{failed=true;});
});
