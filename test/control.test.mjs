import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ControlBridge} from '../src/control-bridge.mjs';
import WebSocket from 'ws';
import {once} from 'node:events';
import fs from 'node:fs/promises';

function fixture(){
  const bridge=new ControlBridge();bridge.port=1;
  bridge.registerInstance('a');bridge.registerInstance('b');
  bridge.instances.get('a').ws={readyState:1};bridge.instances.get('b').ws={readyState:1};
  bridge.createSession('s1','a');bridge.createSession('s2','a');bridge.createSession('s3','b');
  let id=10;bridge.forward=async(_i,m)=>m.cmd==='tabs'&&m.params.action==='new'?{tabId:++id}:{};
  return {bridge,call:(sid,cmd,p={})=>bridge.command(bridge.sessions.get(sid),cmd,{...({eval:{expr:'1'},click:{selector:'button'},download:{url:'http://127.0.0.1/file'}}[cmd] || {}),...p})};
}
test('explicit ownership rejects another task for selection, close and implicit use',async()=>{
  const {call}=fixture();const {tabId}=await call('s1','tabs',{action:'new'});
  await assert.rejects(call('s2','tabs',{action:'select',tabId}),{code:'TAB_OWNED'});
  await assert.rejects(call('s2','tabs',{action:'close',tabId}),{code:'TAB_OWNED'});
  await assert.rejects(call('s2','eval',{tabId}),{code:'TAB_OWNED'});
  await assert.rejects(call('s2','snapshot'),{code:'TAB_REQUIRED'});
});
test('queue serializes requests and revoke is a draining barrier',async()=>{
  const {bridge,call}=fixture();await call('s1','tabs',{action:'new'});
  let release,entered=0;bridge.forward=async()=>{entered++;await new Promise(r=>release=r);return {done:true};};
  const first=call('s1','eval');await new Promise(r=>setImmediate(r));
  const queued=call('s1','eval');const rejected=assert.rejects(queued,{code:'REVOKED'});
  const stopped=bridge.revoke('s1');assert.equal(entered,1);release();
  await first;await rejected;assert.deepEqual(await stopped,{revoked:true,quiescent:true});
  await assert.rejects(call('s1','eval'),{code:'REVOKED'});assert.equal(entered,1);
});
test('instance offline does not switch to live alternative',async()=>{
  const {bridge,call}=fixture();await call('s1','tabs',{action:'new'});
  bridge.instances.get('a').ws=null;
  await assert.rejects(call('s1','snapshot'),{code:'INSTANCE_OFFLINE'});
  assert.ok((await call('s3','tabs',{action:'new'})).tabId);
});
test('uncertain outcome latches instance and does not claim stopped',async()=>{
  const {bridge,call}=fixture();bridge.instances.get('a').uncertain=true;
  await assert.rejects(call('s1','tabs',{action:'new'}),{code:'OUTCOME_UNKNOWN'});
  assert.deepEqual(await bridge.revoke('s1'),{revoked:true,quiescent:false});
});
test('tab numeric namespace is isolated by explicitly bound instance',async()=>{
  const {bridge,call}=fixture();bridge.forward=async()=>({tabId:7});
  await call('s1','tabs',{action:'new'});await call('s3','tabs',{action:'new'});
  assert.equal(bridge.owners.get('a:7'),'s1');assert.equal(bridge.owners.get('b:7'),'s3');
});
test('bridge rejects wrong capability and webpage Origin',async()=>{
  const bridge=await new ControlBridge().start();
  try {
    bridge.registerInstance('a');const grant=bridge.createSession('s','a');
    const ws=new WebSocket(`ws://127.0.0.1:${bridge.port}`);
    await once(ws,'open');const closed=once(ws,'close');
    ws.send(JSON.stringify({type:'hello',role:'agent',sessionId:grant.sessionId,token:'invalid'}));
    assert.equal((await closed)[0],4001);
    const page=new WebSocket(`ws://127.0.0.1:${bridge.port}`,{origin:'https://example.invalid'});
    const [error]=await once(page,'error');assert.match(error.message,/401/);
  } finally {await bridge.close();}
});
test('followed child tab stays owned and becomes task default',async()=>{
  const {bridge,call}=fixture();const parent=await call('s1','tabs',{action:'new'});
  bridge.forward=async()=>({followed:{from:parent.tabId,to:88,how:'opener'}});
  await call('s1','click',{tabId:parent.tabId});
  assert.equal(bridge.sessions.get('s1').current,88);
  await assert.rejects(call('s2','tabs',{action:'select',tabId:88}),{code:'TAB_OWNED'});
});
test('browser download timeout locks instance and revoke cannot confirm quiescence',async()=>{
  const {bridge,call}=fixture();await call('s1','tabs',{action:'new'});
  bridge.forward=async()=>{throw Object.assign(new Error('timeout'),{code:'TIMEOUT'});};
  await assert.rejects(call('s1','download'),{code:'TIMEOUT'});
  await assert.rejects(call('s1','snapshot'),{code:'OUTCOME_UNKNOWN'});
  assert.deepEqual(await bridge.revoke('s1'),{revoked:true,quiescent:false});
});
