import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewRunner} from '../src/browser-overview.mjs';
import {OverviewController} from '../src/overview-controller.mjs';
const tick=()=>new Promise(setImmediate);
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}

test('stalled attach is bounded, prevents repeated attach, and late own session is reclaimed',async()=>{
 const late=deferred();let attaches=0,detaches=0;const run=createPreviewRunner({timeoutMs:25}),began=performance.now();
 await assert.rejects(run(b=>b.attach(()=>{attaches++;return late.promise;})),/PREVIEW_TIMEOUT/);assert.ok(performance.now()-began<200);
 await assert.rejects(run(b=>b.attach(()=>{attaches++;return {};})),/PREVIEW_PENDING/);assert.equal(attaches,1);
 late.resolve({detach:async()=>{detaches++;}});await tick();await tick();assert.equal(detaches,1);assert.equal(await run(async()=>42),42);
});

for(const stage of ['target','capture'])test(`stalled ${stage} result is discarded and cannot accumulate new sessions`,async()=>{
 const late=deferred();let attaches=0,detaches=0;const run=createPreviewRunner({timeoutMs:25}),session={send:async method=>(stage==='target'&&method==='Target.getTargetInfo'||stage==='capture'&&method==='Page.captureScreenshot')?late.promise:{data:'synthetic'},detach:async()=>{detaches++;}};
 await assert.rejects(run(async b=>{const own=await b.attach(async()=>{attaches++;return session;});try{await b.run(()=>own.send('Target.getTargetInfo'));return await b.run(()=>own.send('Page.captureScreenshot'));}finally{await b.detach(own);}}),/PREVIEW_(TIMEOUT|CLEANUP_UNCONFIRMED)/);
 await assert.rejects(run(async b=>b.attach(async()=>{attaches++;return session;})),/PREVIEW_(PENDING|CLEANUP_UNCONFIRMED)/);assert.equal(attaches,1);assert.equal(detaches,1);
 late.resolve({data:'late synthetic result'});await tick();await tick();assert.equal(await run(async()=>42),42);
});

test('detach never blocks finally; cleanup status is honest and ordinary instance queue can continue',async()=>{
 const pending=deferred();let attaches=0,detaches=0;const run=createPreviewRunner({timeoutMs:25}),session={send:async()=>({data:'synthetic'}),detach:()=>{detaches++;return pending.promise;}},capture=()=>run(async b=>{const own=await b.attach(async()=>{attaches++;return session;});const result=await b.run(()=>own.send('Page.captureScreenshot'));await b.detach(own);return result;});
 const instance={id:'main',queue:Promise.resolve(),uncertain:false},tab={id:2,documentKey:'one'},bridge={sessions:new Map(),owners:new Map()},worker={exited:false};
 const controller=new OverviewController(bridge,new Map([['main',worker]]),async(_worker,operation)=>operation==='visible'?true:operation==='metadata'?{tabs:[tab],humanWindows:[]}:capture(),'test');
 const began=performance.now(),result=await controller.handle(instance,{pageId:1,action:'preview',tabId:2});assert.ok(performance.now()-began<200);assert.match(result.error,/清理未确认/);assert.equal(instance.previewPending,false);assert.equal(await instance.queue.then(()=>42),42);
 const again=await controller.handle(instance,{pageId:1,action:'preview',tabId:2});assert.match(again.error,/清理未确认/);assert.equal(attaches,1);assert.equal(detaches,1);
 pending.resolve();await tick();await tick();assert.equal(await run(async()=>42),42);
});
