import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {ensureHost} from '../src/host-startup.mjs';
import {waitForWorkerReady} from '../src/worker-rpc.mjs';
test('existing ready host is reused; bootstrap-ready is not browser or released readiness',async()=>{
 let launches=0,releases=0,phase=0;assert.equal(await ensureHost({probe:async()=>({hostReady:true}),launch:async()=>launches++}),false);assert.equal(launches,0);
 assert.equal(await ensureHost({probe:async()=>{if(!phase++)throw new Error('HOST_OFFLINE');return {hostReady:releases>0,bootstrapReady:true};},release:async()=>releases++,launch:async()=>{launches++;return 123;}}),true);assert.equal(launches,1);assert.equal(releases,1);
});
test('absent/silent daemon and launcher errors return bounded explicit failures',async()=>{
 await assert.rejects(ensureHost({probe:async()=>{throw new Error('HOST_OFFLINE');},launch:async()=>123,timeoutMs:15}),/HOST_START_TIMEOUT/);
 await assert.rejects(ensureHost({probe:async()=>{throw new Error('HOST_OFFLINE');},launch:async()=>{throw new Error('HOST_SPAWN_FAILED');}}),/HOST_SPAWN_FAILED/);
 await assert.rejects(ensureHost({probe:async()=>{throw new Error('HOST_TIMEOUT');},launch:async()=>assert.fail('must not fork on uncertain existing host')}),/HOST_TIMEOUT/);
 await assert.rejects(ensureHost({probe:async()=>{throw new Error('INVALID_TASK');},launch:async()=>assert.fail('must not fork over an old host')}),/HOST_VERSION_MISMATCH/);
});
test('worker error, exit, disconnect and unexpected IPC fail readiness without waiting for timeout',async()=>{
 for(const kind of ['error','exit','disconnect','message']){const c=new EventEmitter(),p=waitForWorkerReady(c);c.emit(kind,{unknown:true});await assert.rejects(p,/BROWSER_/);assert.equal(c.listenerCount('message'),0);}
});
