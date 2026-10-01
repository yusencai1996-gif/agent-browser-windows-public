import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {ControlBridge} from '../src/control-bridge.mjs';
import {OverviewController} from '../src/overview-controller.mjs';
import {validateArguments} from '../src/arguments.mjs';
import {diagnosticRecord} from '../src/diagnostic-schema.mjs';

test('Agent and task display names are optional declarations and do not replace owner IDs',async()=>{
 assert.doesNotThrow(()=>validateArguments('task',['one','--agent-name','Codex','--display-name','资料整理']));
 const bridge=new ControlBridge();bridge.registerInstance('main');bridge.createSession('one','main',{agentName:'Codex',displayName:'资料整理'});bridge.createSession('two','main',{agentName:'Codex',displayName:'资料整理'});bridge.createSession('legacy','main');
 bridge.owners.set('main:10','one');bridge.owners.set('main:11','two');
 const tabs=[{id:10,windowId:2,title:'合成一',documentKey:'one',status:'complete'},{id:11,windowId:2,title:'合成二',documentKey:'two',status:'loading'}];
 const overview=new OverviewController(bridge,new Map([['main',{exited:false}]]),async(_worker,operation)=>operation==='visible'?true:{tabs,humanWindows:[]},'test-generation');
 const result=await overview.handle(bridge.instances.get('main'),{action:'snapshot',pageId:1});const a=result.tasks.find(t=>t.id==='one'),b=result.tasks.find(t=>t.id==='two');assert.equal(a.name,b.name);assert.equal(a.agentName,'Codex');assert.equal(a.tabs[0].id,10);assert.equal(b.tabs[0].id,11);assert.equal(result.tasks.find(t=>t.id==='legacy').agentName,null);
});

test('invalid labels fail and privacy diagnostics ignore display metadata',()=>{
 const bridge=new ControlBridge();bridge.registerInstance('main');for(const value of ['', 'a'.repeat(41),'bad\nline'])assert.throws(()=>bridge.createSession(randomUUID(),'main',{agentName:value}),/INVALID_DISPLAY_NAME/);
 const r=diagnosticRecord({role:'cli',phase:'cli_begin',version:'0.9.0',utc:'2026-10-01T12:00:00.000Z',correlationId:randomUUID(),agentName:'synthetic agent label',displayName:'synthetic task label'});assert.equal('agentName' in r,false);assert.equal('displayName' in r,false);
});
