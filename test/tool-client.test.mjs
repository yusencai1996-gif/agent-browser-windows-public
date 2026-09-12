import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import WebSocket from 'ws';
import {ControlBridge} from '../src/control-bridge.mjs';
import {connectTask} from '../src/tool-client.mjs';
test('shared client busy rejection preserves incumbent; disconnect in-flight locks outcome',async()=>{
  const bridge=await new ControlBridge().start();let a,b,ext;
  try{
    const config=bridge.registerInstance('test'),grant=bridge.createSession('task','test');
    const id='a'.repeat(32);ext=new WebSocket(`ws://127.0.0.1:${bridge.port}`,{origin:`chrome-extension://${id}`});
    await once(ext,'open');const welcome=once(ext,'message');ext.send(JSON.stringify({type:'hello',role:'extension',extId:id,instanceId:'test',token:config.token}));await welcome;
    let entered;const began=new Promise(r=>entered=r);
    ext.on('message',raw=>{const m=JSON.parse(raw);if(m.type!=='cmd')return;if(m.cmd==='tabs')ext.send(JSON.stringify({type:'res',__k:m.__k,ok:true,data:{tabId:1,text:'created'}}));else entered();});
    a=await connectTask(grant);await assert.rejects(connectTask(grant),/SESSION_BUSY/);
    assert.equal((await a.call('tabs',{action:'new'})).structuredContent.data.tabId,1);
    const pending=a.call('wait',{for:'idle'});await began;await a.close();assert.equal((await pending).isError,true);
    b=await connectTask(grant);assert.equal((await b.call('read_text')).structuredContent.error.code,'OUTCOME_UNKNOWN');
  }finally{await a?.close();await b?.close();ext?.close();await bridge.close();}
});
test('CLOSING connection stays busy and a lost response locks the instance',async()=>{
  const bridge=await new ControlBridge().start();let old,ext,next;
  try{
    const config=bridge.registerInstance('test'),grant=bridge.createSession('task','test'),id='b'.repeat(32);
    ext=new WebSocket(`ws://127.0.0.1:${bridge.port}`,{origin:`chrome-extension://${id}`});await once(ext,'open');
    const ready=once(ext,'message');ext.send(JSON.stringify({type:'hello',role:'extension',extId:id,instanceId:'test',token:config.token}));await ready;
    old=new WebSocket(`ws://127.0.0.1:${bridge.port}`);await once(old,'open');const welcome=once(old,'message');old.send(JSON.stringify({type:'hello',role:'agent',...grant}));await welcome;
    const command=once(ext,'message');old.send(JSON.stringify({type:'cmd',id:1,cmd:'tabs',params:{action:'new'}}));const [raw]=await command,m=JSON.parse(raw);
    // Hold peer close processing to make the CLOSING window deterministic.
    old._socket.pause();bridge.sessions.get('task').ws.close();
    assert.equal(bridge.sessions.get('task').ws.readyState,2);
    await assert.rejects(connectTask(grant),/SESSION_BUSY/);
    ext.send(JSON.stringify({type:'res',__k:m.__k,ok:true,data:{tabId:5,text:'created'}}));
    await new Promise(r=>setTimeout(r,30));assert.equal(bridge.instances.get('test').uncertain,true);
    const closed=once(old,'close');old._socket.resume();await closed;
    next=await connectTask(grant);assert.equal((await next.call('read_text')).structuredContent.error.code,'OUTCOME_UNKNOWN');
  }finally{old?._socket?.resume();old?.terminate();await next?.close();ext?.close();await bridge.close();}
});
