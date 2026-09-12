import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {guardedStartup,closeOwnedWorker} from '../src/lifecycle.mjs';
test('disconnect during pending initialization cannot launch later',async()=>{
  let closing=false,release,launched=false;
  const starting=guardedStartup(()=>closing,()=>new Promise(r=>release=r),()=>{launched=true;});
  closing=true;release();assert.equal(await starting,null);assert.equal(launched,false);
});
test('previous nonzero worker exit cannot report successful cleanup',async()=>{
  await assert.rejects(closeOwnedWorker({exited:true,exitCode:1}),/CLEANUP_INCOMPLETE/);
  await assert.rejects(closeOwnedWorker({exited:true,exitCode:null}),/CLEANUP_INCOMPLETE/);
  await closeOwnedWorker({exited:true,exitCode:0});
});
test('live worker exit confirmation checks its actual result',async()=>{
  for(const code of [0,1]){
    const child=new EventEmitter();child.send=()=>setImmediate(()=>child.emit('exit',code));
    const result=closeOwnedWorker({exited:false,child});
    if(code)await assert.rejects(result,/CLEANUP_INCOMPLETE/);else await result;
  }
});
