import {test} from 'node:test';
import assert from 'node:assert/strict';
import {windowController} from '../src/window-control.mjs';
import {waitForOwnedProcessExit,retryOwnedFile} from '../src/lifecycle.mjs';
import {EventEmitter} from 'node:events';
import {waitForWorkerReady} from '../src/worker-rpc.mjs';
function fake(windows){return {evaluate:async(_fn,arg)=>{if(arg){Object.assign(windows.find(w=>w.id===arg.id),{state:arg.state,focused:arg.focused});return;}return structuredClone(windows);}};}
test('window IDs remain instance-scoped; multiple windows require selection',async()=>{
  const a=[{id:1,state:'normal',width:1200,height:800},{id:2,state:'normal'}],b=[{id:1,state:'normal'}];
  const first=windowController(fake(a)),second=windowController(fake(b));
  await assert.rejects(first.set('minimize'),/WINDOW_ID_REQUIRED/);await assert.rejects(first.set('show',99),/WINDOW_NOT_OWNED/);
  await first.set('minimize',1);assert.equal(a[0].state,'minimized');assert.equal((await second.status()).windows[0].state,'normal');await first.set('show',1);assert.equal(a[0].state,'normal');
});
test('status/cleanup IPC cannot impersonate startup result',async()=>{
  const child=new EventEmitter(),ready=waitForWorkerReady(child);let settled=false;ready.then(()=>settled=true);
  child.emit('message',{rpc:'status',ok:false,error:'WINDOW_STARTING'});child.emit('message',{event:'cleanup',ok:false});await Promise.resolve();assert.equal(settled,false);
  child.emit('message',{ready:true,version:'test'});assert.equal((await ready).version,'test');assert.equal(child.listenerCount('message'),0);assert.equal(child.listenerCount('exit'),0);
});
test('headless cannot silently become visible',async()=>{const c=windowController(fake([]),{headless:true});assert.equal((await c.status()).mode,'headless');await assert.rejects(c.set('show'),/HEADLESS_NO_WINDOW/);});
test('process waiting is observe-only and file retries do not ignore identity errors',async()=>{
  let calls=0;await waitForOwnedProcessExit([1,2],{alive:()=>++calls<2});
  await assert.rejects(waitForOwnedProcessExit(1,{alive:()=>true,timeoutMs:0}),/UNCONFIRMED/);
  let tries=0;await retryOwnedFile(async()=>{if(++tries<2)throw Object.assign(new Error(),{code:'EBUSY'});});assert.equal(tries,2);
  await assert.rejects(retryOwnedFile(async()=>{throw new Error('WORKSPACE_IDENTITY_CHANGED');}),/IDENTITY_CHANGED/);
});
