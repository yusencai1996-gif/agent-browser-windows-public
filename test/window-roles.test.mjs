import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installOverviewChannel} from '../extension/overview-channel.js';

const extensionId='a'.repeat(32),overviewUrl=`chrome-extension://${extensionId}/overview.html`;
function fakeChrome({tabs,windows,targets=[],stored={}}){
 let nextTab=100,nextWindow=200;const saved={...stored},event={addListener(){}},focusListeners=[],focus={addListener:listener=>focusListeners.push(listener),fire:id=>focusListeners.forEach(listener=>listener(id))};
 const chrome={
  runtime:{id:extensionId,getURL:file=>`chrome-extension://${extensionId}/${file}`,onConnect:event},
  storage:{session:{get:async()=>saved,set:async value=>Object.assign(saved,value)}},
  debugger:{getTargets:async()=>targets},
  tabs:{onActivated:event,onRemoved:event,onUpdated:event,query:async()=>tabs,get:async id=>tabs.find(t=>t.id===id),update:async(id,change)=>{const tab=tabs.find(t=>t.id===id);Object.assign(tab,change);return tab;},create:async options=>{const tab={id:nextTab++,windowId:options.windowId,url:options.url,active:options.active};tabs.push(tab);windows.find(w=>w.id===options.windowId).tabs.push(tab);return tab;}},
  windows:{onBoundsChanged:event,onFocusChanged:focus,get:async id=>windows.find(w=>w.id===id),getAll:async()=>windows,
   create:async options=>{
    const id=nextWindow++;let tab;
    if(options.tabId){tab=tabs.find(t=>t.id===options.tabId);const old=windows.find(w=>w.id===tab.windowId);old.tabs=old.tabs.filter(t=>t.id!==tab.id);if(!old.tabs.length)windows.splice(windows.indexOf(old),1);tab.windowId=id;}
    else{tab={id:nextTab++,windowId:id,url:options.url,active:true};tabs.push(tab);}
    const window={id,type:options.type||'normal',state:options.state||'normal',focused:options.focused,tabs:[tab]};windows.push(window);return window;
   },
   update:async(id,change)=>{Object.assign(windows.find(w=>w.id===id),change);},remove:async id=>{const i=windows.findIndex(w=>w.id===id);if(i>=0)windows.splice(i,1);}}
 };
 return {chrome,tabs,windows,saved,focus};
}
async function withChrome(fake,run){const previous=globalThis.chrome;globalThis.chrome=fake.chrome;try{return await run(installOverviewChannel(()=>{}));}finally{globalThis.chrome=previous;}}

test('only the exact launch target becomes the popup; Agent pages use a separate normal window',async()=>{
 const blank={id:10,windowId:1,url:'about:blank',active:true},f=fakeChrome({tabs:[blank],windows:[{id:1,type:'normal',state:'minimized',tabs:[blank]}],targets:[{id:'launch-target',tabId:10,type:'page',url:'about:blank'}]});
 await withChrome(f,async api=>{const overview=await api.ensure({adoptBlankTargetId:'launch-target'});assert.equal(overview.tabId,10);assert.equal(f.windows.length,1);assert.equal(f.windows[0].type,'popup');assert.equal(blank.url,overviewUrl);
  const a=await api.createAgentTab({url:'http://127.0.0.1/one',active:false}),b=await api.createAgentTab({url:'http://127.0.0.1/two',active:false});assert.notEqual(a.windowId,overview.windowId);assert.equal(a.windowId,b.windowId);assert.equal(f.windows.find(w=>w.id===a.windowId).type,'normal');assert.equal(f.windows.find(w=>w.id===overview.windowId).tabs.length,1);
  const work=f.windows.find(w=>w.id===a.windowId);work.state='normal';work.focused=false;await api.settleAgentTab(a);assert.equal(work.state,'minimized');work.state='normal';work.focused=true;await api.settleAgentTab(a);assert.equal(work.state,'normal','preserve explicit user focus');
  api.noteWindowShown(work.id);work.focused=false;await api.settleAgentTab(a);assert.equal(work.state,'normal','preserve prior explicit show after focus returned to overview');
  work.state='minimized';const later=await api.createAgentTab({url:'http://127.0.0.1/slow',active:false});f.focus.fire(work.id);work.state='normal';work.focused=true;f.focus.fire(overview.windowId);work.focused=false;await api.settleAgentTab(later);assert.equal(work.state,'normal','preserve prior taskbar focus history');work.state='minimized';await api.settleAgentTab(later);assert.equal(work.state,'minimized','respect later user minimization');
 });
});

test('a navigated or replaced launch target leaves user tabs untouched',async()=>{
 for(const mismatch of ['navigation','replacement']){
  const tab={id:mismatch==='replacement'?11:10,windowId:1,url:mismatch==='navigation'?'https://local.invalid/':'about:blank',active:true},f=fakeChrome({tabs:[tab],windows:[{id:1,type:'normal',state:'minimized',tabs:[tab]}],targets:[{id:'launch-target',tabId:10,type:'page',url:mismatch==='navigation'?'https://local.invalid/':'about:blank'}]});
  await withChrome(f,async api=>{const management=await api.ensure({adoptBlankTargetId:'launch-target'});assert.notEqual(management.tabId,tab.id);assert.equal(f.windows.find(w=>w.id===1).tabs[0],tab);assert.equal(f.windows.find(w=>w.id===1).state,'minimized');assert.equal(f.windows.find(w=>w.id===management.windowId).type,'popup');});
 }
});

test('old management tab moves alone; stale Agent window ID cannot point into popup',async()=>{
 const management={id:10,windowId:1,url:overviewUrl,active:true},business={id:11,windowId:1,url:'https://local.invalid/work',active:false},f=fakeChrome({tabs:[management,business],windows:[{id:1,type:'normal',state:'minimized',tabs:[management,business]}],stored:{abwAgentWindow:1}});
 await withChrome(f,async api=>{const moved=await api.ensure();assert.equal(moved.tabId,10);assert.equal(f.windows.find(w=>w.id===1).tabs.length,1);assert.equal(f.windows.find(w=>w.id===1).tabs[0],business);assert.equal(f.windows.find(w=>w.id===moved.windowId).type,'popup');
  f.saved.abwAgentWindow=moved.windowId;const tab=await api.createAgentTab({url:'http://127.0.0.1/new',active:false});assert.notEqual(tab.windowId,moved.windowId);assert.equal(f.windows.find(w=>w.id===tab.windowId).type,'normal');assert.equal(f.windows.find(w=>w.id===moved.windowId).tabs.length,1);});
});
