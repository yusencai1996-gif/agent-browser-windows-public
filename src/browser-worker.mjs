// Owns Playwright's process tree; parent IPC loss closes the browser, not a PID file.
import fs from 'node:fs/promises';
import path from 'node:path';
import {launchPreparedBrowser} from './browser-launcher.mjs';
import {LOCAL} from './local-control.mjs';
import {createOwnedWorkspace} from './owned-workspace.mjs';
import {guardedStartup} from './lifecycle.mjs';
import {acquireSharedProfile} from './shared-profile.mjs';
import {browserOverview} from './browser-overview.mjs';
import {initDiagnostics,logEvent,finishDiagnostics,correlationId} from './runtime-log.mjs';
import {validCorrelation} from './diagnostic-schema.mjs';
initDiagnostics('worker');let startupCorrelation=correlationId;
let browser,params,closing=false,launching,workspace,shared,cleanupError,cleanupPath;
const startupController=new AbortController();let startupTimer;
async function close() {
  if(closing)return;closing=true;
  logEvent('cleanup',{correlationId:startupCorrelation,state:'begin'});
  clearTimeout(startupTimer);startupController.abort();
  // Exit only this worker if its own Playwright transport cannot settle. No PID kill
  // and no data cleanup in this branch. Playwright's owner-exit hook may force
  // its own child tree closed; this is unconfirmed cleanup, not graceful success.
  const closeDeadline=setTimeout(()=>{
    if(process.connected)process.send({event:'cleanup',ok:false,error:'BROWSER_CLOSE_UNCONFIRMED'},()=>process.exit(1));
    setTimeout(()=>process.exit(1),100).unref();
    if(!process.connected)process.exit(1);
  },10000);
  await launching?.catch(()=>{});
  let cleanupOk=true;
  try{await browser?.close();}catch(e){cleanupOk=false;cleanupError=e.code||e.message;}
  if(workspace && cleanupOk){try{await workspace.cleanup();}catch(e){cleanupOk=false;cleanupError=e.code||e.message;if(e.path)cleanupPath=path.relative(workspace.root,e.path);}}
  if(shared&&cleanupOk)await shared.release();
  clearTimeout(closeDeadline);
  logEvent('cleanup',{correlationId:startupCorrelation,state:cleanupOk?'ok':'error',...(cleanupOk?{}:{code:cleanupError})});await finishDiagnostics();
  if(process.connected)process.send({event:'cleanup',ok:cleanupOk,error:cleanupError,path:cleanupPath},()=>process.exit(cleanupOk?0:1));else process.exit(cleanupOk?0:1);
}
process.on('disconnect',()=>void close());
process.on('message',async m=>{
  if(m.action==='close')return void close();
  if(m.action==='overview'){
    try{if(closing||!browser)throw new Error('WINDOW_CLOSED');if(params.headless&&m.operation==='open')throw new Error('HEADLESS_NO_WINDOW');const data=await browser.manage(m.operation,m.args);if(process.connected)process.send({rpc:m.rpc,ok:true,data},()=>{});}catch(e){if(process.connected)process.send({rpc:m.rpc,ok:false,error:/^[A-Z_]+$/.test(e.message)?e.message:'OVERVIEW_FAILED'},()=>{});}return;
  }
  if(m.action==='window'){
    try{if(closing)throw new Error('WINDOW_CLOSING');if(!browser)throw new Error('WINDOW_STARTING');const data=m.command==='status'?await browser.windows.status():await browser.windows.set(m.command,m.windowId);if(process.connected)process.send({rpc:m.rpc,ok:true,data},()=>{});}
    catch(e){if(process.connected)process.send({rpc:m.rpc,ok:false,error:e.message},()=>{});}return;
  }
  if(m.action!=='launch'||params)return;
  params=m.params;
  startupCorrelation=validCorrelation(m.correlationId)?m.correlationId:correlationId;logEvent('browser_launch',{correlationId:startupCorrelation,state:'begin'});
  startupTimer=setTimeout(()=>{if(process.connected)process.send({error:'BROWSER_START_TIMEOUT'},()=>{});void close();},25000);
  // Publish the entire initialization promise synchronously before any await.
  launching=guardedStartup(()=>closing,async()=>{
    if(!params.temporary)shared=await acquireSharedProfile(LOCAL);
    workspace=await createOwnedWorkspace(LOCAL);process.env.TEMP=workspace.temp;process.env.TMP=workspace.temp;
  },()=>workspace.launch(paths=>launchPreparedBrowser({...paths,...(shared?{profile:shared.profile,freshProfile:shared.fresh}:{freshProfile:true}),config:params.config,headless:params.headless,visible:params.visible,signal:startupController.signal,opencliExtension:params.opencliExtension,diagnosticCorrelation:startupCorrelation})));
  try{
    browser=await launching;
    if(browser)browser.manage=browserOverview(browser);
    clearTimeout(startupTimer);
    if(!browser || closing)return;
    logEvent('browser_ready',{correlationId:startupCorrelation,state:'ready'});
    browser.context.on('close',()=>void close());
    if(process.connected)process.send({ready:true,version:browser.version.product,processes:browser.processes,profile:shared?.profile||workspace.profile,profileMode:shared?'shared':'temporary',runtime:workspace.runtime,opencli:browser.opencli,extension:browser.extensionProof},()=>{});
  }catch(e){logEvent('browser_ready',{correlationId:startupCorrelation,state:'error',code:e.message});if(process.connected)process.send({error:['PROFILE_IN_USE','UNKNOWN_PROFILE','UNSAFE_PROFILE','UNSAFE_EXTENSION','EXTENSION_LOAD_FAILED','EXTENSION_LOAD_UNCONFIRMED','EXTENSION_ID_UNCONFIRMED','EXTENSION_WORKER_FAILED','EXTENSION_BOOTSTRAP_FAILED','EXTENSION_CONTEXT_TIMEOUT','EXTENSION_CONTEXT_UNAVAILABLE','EXTENSION_WORKER_REPLACED','EXTENSION_WORKER_UNCONFIRMED','EXTENSION_ACTIVATION_TIMEOUT','BROWSER_WINDOW_FAILED','BROWSER_BOOTSTRAP_TIMEOUT','BROWSER_START_CANCELLED'].includes(e.message)||/^OPENCLI_[A-Z_]+$/.test(e.message)?e.message:'BROWSER_START_FAILED'},()=>{});void close();}
});
