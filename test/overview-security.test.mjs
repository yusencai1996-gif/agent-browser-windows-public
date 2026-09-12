import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {ControlBridge} from '../src/control-bridge.mjs';
import {trustedOverviewSender} from '../extension/overview-channel.js';
import {protectedPageUrl} from '../extension/page-policy.js';
function setup(){const b=new ControlBridge();b.registerInstance('main');b.createSession('task','main');const i=b.instances.get('main'),s=b.sessions.get('task');i.ws={readyState:1};s.current=4;b.owners.set('main:4','task');return {b,i,s};}
test('takeover rejects queued/new commands then confirms only after in-flight completion',async()=>{
 const {b,s}=setup();let release,calls=0;b.forward=()=>{calls++;return new Promise(r=>release=r);};
 const active=b.command(s,'read_text',{});await new Promise(setImmediate);const queued=b.command(s,'read_text',{});const rejected=assert.rejects(queued,/TASK_PAUSED/);let confirmed=false;const pause=b.takeOver('task').then(x=>{confirmed=true;return x;});assert.equal(s.paused,true);assert.equal(confirmed,false);release({text:'done'});await active;await rejected;assert.equal((await pause).confirmed,true);assert.equal(calls,1);await assert.rejects(b.command(s,'read_text',{}),/TASK_PAUSED/);assert.equal(b.handBack('task').resumed,true);
});
test('unknown/revoked states cannot be resumed and unowned pages cannot be claimed',async()=>{const {b,i,s}=setup();i.uncertain=true;await b.takeOver('task');assert.equal(s.takeover,'unconfirmed');assert.throws(()=>b.handBack('task'),/TAKEOVER_UNCONFIRMED/);s.revoked=true;assert.throws(()=>b.handBack('task'),/REVOKED/);const other=setup();await assert.rejects(other.b.command(other.s,'tabs',{action:'select',tabId:999}),/HUMAN_OWNED/);await assert.rejects(other.b.command(other.s,'tabs',{action:'new',url:'chrome-extension://abc/overview.html'}),/PROTECTED_PAGE/);});
test('management sender must be the exact own top-frame extension document',()=>{const id='a'.repeat(32),url=`chrome-extension://${id}/overview.html`,sender={id,url,frameId:0,tab:{id:2}};assert.equal(trustedOverviewSender(sender,id,url),true);for(const patch of [{id:'b'.repeat(32)},{url:'https://evil.invalid/'},{url:url+'?forged=1'},{frameId:1},{tab:undefined}])assert.equal(trustedOverviewSender({...sender,...patch},id,url),false);});
test('same-window manual tab is not followed; only explicit opener is accepted',async()=>{
 const source=await fs.readFile(new URL('../extension/background.js',import.meta.url),'utf8');const code=source.slice(source.indexOf('async function childOpenedSince('),source.indexOf('// agent 自己导航到的地方不算漂移'));
 let list=[{id:9,win:1,at:20}],claimed=false;const sandbox={RECENT_TABS:'recent',chrome:{storage:{session:{get:async()=>({recent:list}),set:async()=>{claimed=true;}}},tabs:{get:async id=>({id,windowId:1,url:'https://example.com'})}},management:{isHumanWindow:()=>false}};
 const fn=vm.runInNewContext(code+'\nchildOpenedSince',sandbox);assert.equal(await fn(4,10),null);assert.equal(claimed,false);list=[{id:9,win:1,opener:4,at:20}];assert.equal((await fn(4,10)).how,'opener');
});
test('normalized internal URLs cannot bypass page protection',async()=>{for(const url of [' \tchrome-extension://abc/overview.html','chro\nme-extension://abc/overview.html',' JAVASCRIPT:alert(1)','view-source:chrome-extension://abc/overview.html']){assert.equal(protectedPageUrl(url),true);const {b,s}=setup();await assert.rejects(b.command(s,'tabs',{action:'new',url}),/PROTECTED_PAGE/);}});
test('screenshot debugger failure never falls back to another visible tab',async()=>{const source=await fs.readFile(new URL('../extension/background.js',import.meta.url),'utf8');const code=source.slice(source.indexOf('  async screenshot(p, tabId)'),source.indexOf('  async tabs(p, tabId, ctx)'));let captured=false;const sandbox={resolveTab:async id=>id,veilMarks:async()=>true,cdp:{screenshot:async()=>{throw Object.assign(new Error('busy'),{code:'L2_BUSY'});}},chrome:{tabs:{captureVisibleTab:async()=>{captured=true;return 'HUMAN';}}}};const handler=vm.runInNewContext('({'+code+'})',sandbox);await assert.rejects(handler.screenshot({},4),e=>e.code==='L2_BUSY');assert.equal(captured,false);});
