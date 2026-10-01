import {test} from 'node:test';
import assert from 'node:assert/strict';
import {installOverviewChannel} from '../extension/overview-channel.js';

test('ensure establishes one minimized overview without focus; open restores the same tab',async()=>{
 const original=globalThis.chrome,windows=[],tabs=[];let nextWindow=1,nextTab=10;
 globalThis.chrome={
  runtime:{id:'a'.repeat(32),getURL:file=>`chrome-extension://${'a'.repeat(32)}/${file}`,onConnect:{addListener(){}}},
  storage:{session:{get:async()=>({}),set:async()=>{}}},
  tabs:{query:async()=>{await new Promise(setImmediate);return tabs;},get:async id=>tabs.find(t=>t.id===id),update:async(id,change)=>{Object.assign(tabs.find(t=>t.id===id),change);}},
  windows:{get:async id=>windows.find(w=>w.id===id),getAll:async()=>windows,onBoundsChanged:{addListener(){}},onFocusChanged:{addListener(){}},
   create:async options=>{
    const id=nextWindow++;let tab;
    if(options.tabId){tab=tabs.find(t=>t.id===options.tabId);const old=windows.find(w=>w.id===tab.windowId);old.tabs=old.tabs.filter(t=>t.id!==tab.id);if(!old.tabs.length)windows.splice(windows.indexOf(old),1);tab.windowId=id;}
    else{tab={id:nextTab++,url:options.url,windowId:id,active:true};tabs.push(tab);}
    const window={id,state:options.state||'normal',focused:options.focused,tabs:[tab],type:options.type||'normal'};windows.push(window);return window;
   },
   update:async(id,change)=>{Object.assign(windows.find(w=>w.id===id),change);},remove:async id=>{const index=windows.findIndex(w=>w.id===id);if(index>=0)windows.splice(index,1);}}
 };
 globalThis.chrome.tabs.onActivated={addListener(){}};globalThis.chrome.tabs.onRemoved={addListener(){}};globalThis.chrome.tabs.onUpdated={addListener(){}};
 try{
  const api=installOverviewChannel(()=>{});const first=await api.ensure();assert.equal(first.alreadyOpen,false);assert.equal(windows.length,1);assert.equal(windows[0].state,'minimized');assert.equal(windows[0].focused,false);
  const again=await api.ensure();assert.equal(again.tabId,first.tabId);assert.equal(again.alreadyOpen,true);assert.equal(windows.length,1);assert.equal(windows[0].focused,false);
  const shown=await api.open();assert.equal(shown.tabId,first.tabId);assert.equal(windows[0].state,'normal');assert.equal(windows[0].focused,true);
  tabs.splice(0,1);windows.splice(0,1);const restored=await api.ensure();assert.notEqual(restored.tabId,first.tabId);assert.equal(windows.length,1);assert.equal(windows[0].state,'minimized');
  tabs.splice(0,1);windows.splice(0,1);const concurrent=await Promise.all([api.ensure(),api.open(),api.ensure(),api.open()]);assert.equal(windows.length,1);assert.equal(tabs.length,1);assert.ok(concurrent.every(r=>r.tabId===tabs[0].id));assert.equal(windows[0].state,'normal');assert.equal(windows[0].focused,true);
 }finally{globalThis.chrome=original;}
});
