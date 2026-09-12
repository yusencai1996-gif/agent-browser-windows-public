// Product-only prepared workspace. The owner controls creation and cleanup.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ROOT,LOCAL} from './local-control.mjs';
import {windowController} from './window-control.mjs';
import {waitForOwnedProcessExit} from './lifecycle.mjs';
import {inspectOpencliExtension} from './opencli-extension.mjs';
export async function launchPreparedBrowser({config,profile,runtime,downloads,headless=false,visible=false,freshProfile=true,signal,opencliExtension}){
  process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(LOCAL,'browsers');
  const {chromium}=await import('playwright');
  const extension=path.join(runtime,'extension');
  let context,ownedPid,failureCode='BROWSER_START_FAILED';
  const step=async operation=>{
    signal?.throwIfAborted();let cancel;
    try{return await Promise.race([operation(),new Promise((_,reject)=>{cancel=()=>reject(new Error('BROWSER_START_CANCELLED'));signal?.addEventListener('abort',cancel,{once:true});})]);}
    finally{if(cancel)signal?.removeEventListener('abort',cancel);}
  };
  try{
    const third=opencliExtension?await inspectOpencliExtension(opencliExtension):null;
    await fs.cp(path.join(ROOT,'extension'),extension,{recursive:true,errorOnExist:true,force:false});
    // Routing and capability enter memory together. Imported module bytes can be
    // cached across a persistent-profile restart, so they contain no runtime values.
    await fs.writeFile(path.join(extension,'config.js'),'export const config={port:0,instanceId:"unconfigured"};');
    if(freshProfile){await fs.mkdir(path.join(profile,'Default'));await fs.writeFile(path.join(profile,'Default','Preferences'),JSON.stringify({download:{default_directory:downloads,prompt_for_download:false}}));}
    // A fixed headed viewport resizes/restores the native window when a tab appears.
    context=await chromium.launchPersistentContext(profile,{timeout:15000,channel:'chromium',headless,chromiumSandbox:true,ignoreDefaultArgs:['--disable-extensions'],downloadsPath:downloads,acceptDownloads:true,viewport:headless?{width:1200,height:800}:null,args:['--window-size=1200,900','--enable-unsafe-extension-debugging',...(!headless&&!visible?['--start-minimized']:[]),`--disable-extensions-except=${[extension,...(third?[third.path]:[])].join(',')}`]});
    const cdp=await step(()=>context.browser().newBrowserCDPSession());
    const processes=await step(()=>cdp.send('SystemInfo.getProcessInfo')),version=await step(()=>cdp.send('Browser.getVersion'));
    ownedPid=processes.processInfo.find(p=>p.type==='browser')?.id;
    // A persistent profile also restores website service workers. Never inject there.
    const manifest=JSON.parse(await fs.readFile(path.join(extension,'manifest.json'),'utf8'));
    if(!manifest.key)throw new Error('EXTENSION_ID_UNCONFIRMED');
    const extensionId=createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
    const expected=`chrome-extension://${extensionId}/${manifest.background.service_worker}`;
    // Subscribe before installation, and accept only the new worker generation.
    const workerReady=context.waitForEvent('serviceworker',{predicate:w=>w.url()===expected,timeout:10000});
    workerReady.catch(()=>{});
    const installed=await step(()=>cdp.send('Extensions.loadUnpacked',{path:extension}).catch(()=>{throw new Error('EXTENSION_LOAD_FAILED');}));
    if(installed.id!==extensionId)throw new Error('EXTENSION_ID_UNCONFIRMED');
    const entries=await step(()=>cdp.send('Extensions.getExtensions'));
    const loaded=entries.extensions.find(e=>e.id===extensionId);
    if(!loaded?.enabled||loaded.version!==manifest.version||path.resolve(loaded.path).toLowerCase()!==path.resolve(extension).toLowerCase())throw new Error('EXTENSION_LOAD_UNCONFIRMED');
    failureCode='EXTENSION_WORKER_FAILED';
    const worker=await step(()=>workerReady);
    let bootstrapTimer;
    failureCode='EXTENSION_BOOTSTRAP_FAILED';
    try{await Promise.race([
      step(()=>worker.evaluate(async value=>{await chrome.storage.session.set({abwRuntimeCapability:value});},config)),
      new Promise((_,reject)=>{bootstrapTimer=setTimeout(()=>reject(new Error('BROWSER_BOOTSTRAP_TIMEOUT')),10000);}),
    ]);}finally{clearTimeout(bootstrapTimer);}
    let opencli,opencliWorker;
    if(third){
      // Different identity and storage scope; never pass config/capability here.
      const freshWorkers=[];const observe=w=>freshWorkers.push(w);context.on('serviceworker',observe);
      try{
        const result=await step(()=>cdp.send('Extensions.loadUnpacked',{path:third.path}));
        if(result.id===extensionId)throw new Error('OPENCLI_ID_COLLISION');
        const list=await step(()=>cdp.send('Extensions.getExtensions'));const ext=list.extensions.find(x=>x.id===result.id);
        if(!ext?.enabled||ext.version!==third.version||path.resolve(ext.path).toLowerCase()!==third.path.toLowerCase())throw new Error('OPENCLI_LOAD_UNCONFIRMED');
        const target=`chrome-extension://${result.id}/${third.worker}`;
        opencliWorker=freshWorkers.find(w=>w.url()===target)||await step(()=>context.waitForEvent('serviceworker',{predicate:w=>w.url()===target,timeout:5000}));
        const contextId=await step(()=>opencliWorker.evaluate(async()=>{
          for(let i=0;i<40;i++){const value=(await chrome.storage.local.get('opencli_context_id_v1')).opencli_context_id_v1;if(typeof value==='string'&&/^[a-z0-9]{8}$/.test(value))return value;await new Promise(r=>setTimeout(r,100));}throw new Error('OPENCLI_CONTEXT_UNCONFIRMED');
        }));
        opencli={extensionId:result.id,contextId,path:third.path,version:third.version,sourceCommit:third.sourceCommit};
      }finally{context.off('serviceworker',observe);}
    }
    await step(()=>cdp.detach());
    const windows=windowController(worker,{headless});
    failureCode='BROWSER_WINDOW_FAILED';
    if(!headless){const current=await step(()=>windows.status());for(const w of current.windows)await step(()=>windows.set(visible&&w.id===current.windows[0].id?'show':'minimize',w.id));}
    if(!ownedPid)throw new Error('BROWSER_ID_UNCONFIRMED');
    return {context,worker,opencliWorker,opencli,windows,downloads,version,processes:processes.processInfo,close:async()=>{await context.close();await waitForOwnedProcessExit(processes.processInfo.map(p=>p.id));await fs.unlink(path.join(extension,'config.js')).catch(e=>{if(e.code!=='ENOENT')throw e;});}};
  }catch(e){if(context){try{await context.close();if(ownedPid)await waitForOwnedProcessExit(ownedPid);}catch{throw Object.assign(new Error('BROWSER_CLOSE_UNCONFIRMED'),{browserMayBeActive:true});}}await fs.unlink(path.join(extension,'config.js')).catch(()=>{});throw new Error(/^[A-Z_]+$/.test(e.message)?e.message:failureCode);}
}
