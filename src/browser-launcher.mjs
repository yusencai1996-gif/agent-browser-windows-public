// Product-only prepared workspace. The owner controls creation and cleanup.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ROOT,LOCAL} from './local-control.mjs';
import {windowController} from './window-control.mjs';
import {waitForOwnedProcessExit} from './lifecycle.mjs';
import {inspectOpencliExtension} from './opencli-extension.mjs';
import {logEvent} from './runtime-log.mjs';
import {bootstrapExtension,currentExtensionWorker,registeredExtension} from './extension-bootstrap.mjs';
import {prepareExtension} from './prepare-extension.mjs';
export async function launchPreparedBrowser({config,profile,runtime,downloads,headless=false,visible=false,freshProfile=true,signal,opencliExtension,diagnosticCorrelation}){
  process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(LOCAL,'browsers');
  const {chromium}=await import('playwright');
  const extension=path.join(runtime,'extension');
  let context,ownedPid,failureCode='BROWSER_START_FAILED';
  let phase='browser_launch';const mark=(next,state='begin',code)=>{phase=next;logEvent(phase,{correlationId:diagnosticCorrelation,action:'browser',state,...(code?{code}:{})});};
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
    const manifest=await prepareExtension(extension);
    if(freshProfile){await fs.mkdir(path.join(profile,'Default'));await fs.writeFile(path.join(profile,'Default','Preferences'),JSON.stringify({download:{default_directory:downloads,prompt_for_download:false}}));}
    // A fixed headed viewport resizes/restores the native window when a tab appears.
    mark('chromium_launch');context=await chromium.launchPersistentContext(profile,{timeout:15000,channel:'chromium',headless,chromiumSandbox:true,ignoreDefaultArgs:['--disable-extensions'],downloadsPath:downloads,acceptDownloads:true,viewport:headless?{width:1200,height:800}:null,args:['--window-size=1200,900','--enable-unsafe-extension-debugging',...(!headless&&!visible?['--start-minimized']:[]),`--disable-extensions-except=${[extension,...(third?[third.path]:[])].join(',')}`]});mark('chromium_launch','ok');
    const cdp=await step(()=>context.browser().newBrowserCDPSession());
    const processes=await step(()=>cdp.send('SystemInfo.getProcessInfo')),version=await step(()=>cdp.send('Browser.getVersion'));
    ownedPid=processes.processInfo.find(p=>p.type==='browser')?.id;
    // A persistent profile also restores website service workers. Never inject there.
    if(!manifest.key)throw new Error('EXTENSION_ID_UNCONFIRMED');
    const extensionId=createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));
    const expected=`chrome-extension://${extensionId}/${manifest.background.service_worker}`;
    // Chromium's disable-extensions-except ALSO loads these paths. Loading again
    // via CDP can produce two Worker generations and a stale evaluation channel.
    mark('extension_load');await step(()=>registeredExtension(()=>cdp.send('Extensions.getExtensions'),{id:extensionId,path:extension,version:manifest.version}));
    failureCode='EXTENSION_WORKER_FAILED';
    mark('extension_selection');
    const worker=await step(()=>currentExtensionWorker(context,expected,{allowOldGeneration:true}));
    const targetFor=async (selected,url,prior,sole=true)=>{const prefix='chrome-extension://'+new URL(url).host+'/';const allTargets=(await step(()=>cdp.send('Target.getTargets'))).targetInfos.filter(t=>t.type==='service_worker'&&t.url.startsWith(prefix)),targets=allTargets.filter(t=>t.url===url);const allWorkers=context.serviceWorkers().filter(w=>w.url().startsWith(prefix)),workers=allWorkers.filter(w=>w.url()===url);if(targets.length!==1||workers.length!==1||workers[0]!==selected||sole&&(allTargets.length!==1||allWorkers.length!==1)||prior&&targets[0].targetId!==prior)throw new Error('EXTENSION_WORKER_REPLACED');return targets[0].targetId;};
    const targetId=await targetFor(worker,expected,undefined,false);
    failureCode='EXTENSION_BOOTSTRAP_FAILED';
    await bootstrapExtension({context,worker,expected,expectedVersion:manifest.version,config,confirm:sole=>targetFor(worker,expected,targetId,sole),run:step,note:mark});
    const extensionProof={id:extensionId,path:extension,version:manifest.version,workerEntry:manifest.background.service_worker,enabled:true,workerCount:1,targetCount:1};
    let opencli,opencliWorker;
    if(third){
      // Different identity and storage scope; never pass config/capability here.
        const ext=await step(()=>registeredExtension(()=>cdp.send('Extensions.getExtensions'),{path:third.path,version:third.version}));
        if(ext.id===extensionId)throw new Error('OPENCLI_ID_COLLISION');
        const target=`chrome-extension://${ext.id}/${third.worker}`;
        opencliWorker=await step(()=>currentExtensionWorker(context,target));
        const opencliTarget=await targetFor(opencliWorker,target);
        const contextId=await step(()=>opencliWorker.evaluate(async()=>{
          for(let i=0;i<40;i++){const value=(await chrome.storage.local.get('opencli_context_id_v1')).opencli_context_id_v1;if(typeof value==='string'&&/^[a-z0-9]{8}$/.test(value))return value;await new Promise(r=>setTimeout(r,100));}throw new Error('OPENCLI_CONTEXT_UNCONFIRMED');
        }));
        await targetFor(opencliWorker,target,opencliTarget);
        opencli={extensionId:ext.id,contextId,path:third.path,version:third.version,sourceCommit:third.sourceCommit,workerCount:1,targetCount:1};
    }
    await step(()=>cdp.detach());
    const windows=windowController(worker,{headless});
    failureCode='BROWSER_WINDOW_FAILED';
    mark('window_ready');
    if(!headless){const current=await step(()=>windows.status());for(const w of current.windows)await step(()=>windows.set(visible&&w.id===current.windows[0].id?'show':'minimize',w.id));}
    if(!ownedPid)throw new Error('BROWSER_ID_UNCONFIRMED');
    return {context,worker,extensionProof,opencliWorker,opencli,windows,downloads,version,processes:processes.processInfo,close:async()=>{await context.close();await waitForOwnedProcessExit(processes.processInfo.map(p=>p.id));await fs.unlink(path.join(extension,'config.js')).catch(e=>{if(e.code!=='ENOENT')throw e;});}};
  }catch(e){mark(phase,'error',/^[A-Z_]+$/.test(e.message)?e.message:failureCode);if(context){try{await context.close();if(ownedPid)await waitForOwnedProcessExit(ownedPid);}catch{throw Object.assign(new Error('BROWSER_CLOSE_UNCONFIRMED'),{browserMayBeActive:true});}}await fs.unlink(path.join(extension,'config.js')).catch(()=>{});throw new Error(/^[A-Z_]+$/.test(e.message)?e.message:failureCode);}
}
