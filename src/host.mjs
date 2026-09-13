import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {fork} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {ControlBridge} from './control-bridge.mjs';
import {ROOT,LOCAL,STATE,PIPE,secureLocal} from './local-control.mjs';
import {closeOwnedWorker,withinStartupDeadline} from './lifecycle.mjs';
import {attachWorkerRpc,callWindow,callOverview,waitForWorkerReady} from './worker-rpc.mjs';
import {OverviewController} from './overview-controller.mjs';
import {configuredOpencli,inspectOpencliExtension} from './opencli-extension.mjs';
import {initDiagnostics,logEvent,finishDiagnostics} from './runtime-log.mjs';
initDiagnostics('host');
const workers=new Map();let stopping=false,bridge,serial=Promise.resolve();
const control=randomBytes(32).toString('hex'),generation=randomUUID();
const validName=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,48}$/.test(s);
let released=!process.connected&&!process.argv.includes('--managed-start'),cancelled=false,wroteState=false;
// Before the CLI acknowledges readiness this host may not launch a browser.
const initializationTimer=setTimeout(()=>void abortInitialization(),12000);initializationTimer.unref();
process.on('disconnect',()=>{if(!released)void abortInitialization();});
process.on('message',m=>{
  if(m?.action==='startup-cancel'&&!released)return void abortInitialization();
  if(m?.action==='startup-release'&&!cancelled&&wroteState){released=true;clearTimeout(initializationTimer);logEvent('host_release',{state:'ready'});process.send?.({released:true},()=>{});}
});
const server=http.createServer(async(req,res)=>{
  const reply=(ok,data)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(ok?{ok,data}:{ok,error:data}));};
  if(req.headers.origin || req.headers.authorization!==`Bearer ${control}`){res.statusCode=403;return reply(false,'AUTH');}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>8192){req.destroy();return;}}
  let args;try{args=JSON.parse(body);}catch{return reply(false,'INVALID_ARGUMENT');}
  const record=(phase,extra)=>{if(args.action!=='health')logEvent(phase,{action:args.action,correlationId:args.correlationId,...extra});};record('request_begin',{state:'begin'});
  // stop/revoke must not wait behind other local management operations.
  const execute=()=>dispatch(args);
  try{let data;if(['revoke','stop','status','health'].includes(args.action))data=await execute();else {const job=serial.then(execute);serial=job.catch(()=>{});data=await job;}record('request_end',{state:'ok'});reply(true,data);if(args.action==='stop')server.close(()=>{void finishDiagnostics().finally(()=>process.exit(0));});}catch(e){record('request_end',{state:'error',code:e.message});reply(false,/^[A-Z_]+$/.test(e.message)?e.message:'HOST_ERROR');}
});
try {
await secureLocal();if(cancelled)throw new Error('HOST_START_CANCELLED');
// Bind before writing capability: a second host cannot overwrite the live owner's state.
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(PIPE,resolve);});
bridge=await new ControlBridge().start();
if(cancelled)throw new Error('HOST_START_CANCELLED');
}catch{await abortInitialization(true);}
const overview=new OverviewController(bridge,workers,callOverview,generation);bridge.onManagement=(instance,message)=>overview.handle(instance,message);
await fs.writeFile(STATE,JSON.stringify({token:control,generation}));
wroteState=true;
logEvent('host_ready',{state:'ready'});
if(cancelled)await abortInitialization(true);
if(released)clearTimeout(initializationTimer);else process.send?.({ready:true,protocol:1},e=>{if(e)void abortInitialization();});
async function abortInitialization(force=false){
  if(released&&!force)return;cancelled=true;clearTimeout(initializationTimer);
  logEvent('startup_abort',{state:'error',code:'HOST_START_CANCELLED'});
  // This is only the new, unreleased daemon with no browser/profile operation.
  const fallback=setTimeout(()=>process.exit(1),1500);fallback.unref();
  try{await bridge?.close();if(wroteState)await fs.unlink(STATE);server.close();}catch{}
  await finishDiagnostics();process.exit(1);
}
const signalStop=()=>void stop().then(()=>server.close(()=>process.exit(0))).catch(()=>console.error('CLEANUP_INCOMPLETE'));
process.on('SIGINT',signalStop);process.on('SIGTERM',signalStop);
async function dispatch(p) {
  if(p.action==='health')return {hostReady:released&&!cancelled&&!stopping,bootstrapReady:wroteState&&!cancelled&&!stopping};
  if(p.action==='startup-release'){
    if(cancelled||!wroteState||stopping)throw new Error('HOST_STARTING');released=true;clearTimeout(initializationTimer);logEvent('host_release',{correlationId:p.correlationId,state:'ready'});return {hostReady:true};
  }
  if(!released)throw new Error('HOST_STARTING');
  if(p.action==='status')return {generation,stopping,overviewCaptures:overview.captures,instances:await Promise.all([...workers].map(async([id,w])=>({id,online:bridge.instances.get(id)?.ws?.readyState===1,headless:w.headless,profileMode:w.profileMode,version:w.version,processes:w.processes,profile:w.profile,runtime:w.runtime,opencli:w.opencli,cleanup:w.cleanup,window:await callWindow(w,'status').catch(e=>({mode:'unknown',error:e.message,windows:[]}))}))),tasks:[...bridge.sessions.values()].map(s=>({name:s.id,instance:s.instanceId,revoked:s.revoked,paused:s.paused,takeover:s.takeover,tabId:s.current,connected:s.ws?.readyState===1,requests:s.requests||0,executing:!!s.executing,uncertain:bridge.instances.get(s.instanceId).uncertain}))};
  if(p.action==='stop')return stop();
  if(p.action==='overview'){const w=workers.get(p.instance);if(!w)throw new Error('INVALID_INSTANCE');return callOverview(w,'open');}
  if(stopping)throw new Error('HOST_STOPPING');
  if(['show','minimize'].includes(p.action)){
    const w=workers.get(p.instance);if(!w)throw new Error('INVALID_INSTANCE');
    if(p.windowId!==undefined && !Number.isSafeInteger(p.windowId))throw new Error('INVALID_WINDOW_ID');
    return {instance:p.instance,...await callWindow(w,p.action,p.windowId)};
  }
  if(p.action==='browser') {
    if(!validName(p.name))throw new Error('INVALID_INSTANCE_NAME');
    const startedAt=performance.now();
    const opencliExtension=p.opencliExtension?(await inspectOpencliExtension(p.opencliExtension)).path:await configuredOpencli();
    if(performance.now()-startedAt>=30000)throw new Error('BROWSER_START_TIMEOUT');
    const existing=workers.get(p.name);
    if(existing){
      if(existing.exited)throw new Error('INSTANCE_CLOSED');
      if(existing.starting)throw new Error('INSTANCE_STARTING');
      if(existing.headless!==!!p.headless||existing.profileMode!==(p.temporary?'temporary':'shared')||existing.opencliPath!==opencliExtension)throw new Error('INSTANCE_MODE_MISMATCH');
      if(bridge.instances.get(p.name)?.ws?.readyState!==1)throw new Error('INSTANCE_OFFLINE');
      return {instance:p.name,alreadyRunning:true,headless:existing.headless,profileMode:existing.profileMode,version:existing.version,extension:existing.extension,window:await callWindow(existing,'status')};
    }
    const config=bridge.registerInstance(p.name);
    bridge.instances.get(p.name).diagnosticCorrelation=p.correlationId;
    logEvent('browser_launch',{action:'browser',correlationId:p.correlationId,state:'begin'});
    const child=fork(path.join(ROOT,'src/browser-worker.mjs'),[],{detached:true,windowsHide:true,stdio:['ignore','ignore','ignore','ipc']});
    const entry={child,starting:true,opencliPath:opencliExtension,headless:!!p.headless,profileMode:p.temporary?'temporary':'shared'};attachWorkerRpc(entry);workers.set(p.name,entry);
    const ready=waitForWorkerReady(child);ready.catch(()=>{});
    child.on('exit',(code)=>{logEvent('worker_exit',{correlationId:p.correlationId,state:'exit',exitCode:code,childPid:child.pid});for(const s of bridge.sessions.values())if(s.instanceId===p.name)s.revoked=true;entry.exited=true;entry.exitCode=code;});
    try{return await withinStartupDeadline(async()=>{
    await new Promise((resolve,reject)=>child.send({action:'launch',correlationId:p.correlationId,params:{config,headless:!!p.headless,visible:!!p.visible,temporary:!!p.temporary,opencliExtension}},e=>e?reject(new Error('BROWSER_DISCONNECTED')):resolve()));
    const result=await ready;Object.assign(entry,result);
    const deadline=Date.now()+15000;while(bridge.instances.get(p.name).ws?.readyState!==1){if(Date.now()>deadline)throw new Error('INSTANCE_OFFLINE');await new Promise(r=>setTimeout(r,100));}
    const window=await callWindow(entry,'status');entry.starting=false;
    logEvent('browser_ready',{action:'browser',correlationId:p.correlationId,state:'ready',childPid:child.pid});
    return {instance:p.name,alreadyRunning:false,headless:entry.headless,profileMode:entry.profileMode,profile:entry.profile,version:entry.version,opencli:entry.opencli,extension:entry.extension,window};
    },{timeoutMs:Math.max(1,30000-(performance.now()-startedAt))});}catch(e){entry.starting=false;await closeOwnedWorker(entry).catch(()=>{});throw e;}
  }
  if(p.action==='close-browser'){
    const w=workers.get(p.name);if(!w)throw new Error('INVALID_INSTANCE');
    for(const s of bridge.sessions.values())if(s.instanceId===p.name)s.revoked=true;
    await closeOwnedWorker(w);return {closed:p.name};
  }
  if(!validName(p.name))throw new Error('INVALID_TASK');
  if(p.action==='task'){
    const instance=p.instance||'main';if(!workers.has(instance)||workers.get(instance).exited)throw new Error('INSTANCE_OFFLINE');
    bridge.createSession(p.name,instance);return {task:p.name,instance};
  }
  const s=bridge.sessions.get(p.name);if(!s)throw new Error('INVALID_TASK');
  if(p.action==='grant') {if(s.revoked)throw new Error('REVOKED');if(s.paused)throw new Error('TASK_PAUSED');return {port:bridge.port,sessionId:s.id,token:s.token};}
  if(p.action==='revoke'||p.action==='end')return bridge.revoke(s.id);
  throw new Error('INVALID_ACTION');
}
let stopJob;
async function stop(){
  if(stopJob)return stopJob;stopping=true;
  stopJob=(async()=>{
    for(const s of bridge.sessions.values())s.revoked=true;
    // Cancel workers before waiting for an in-progress browser startup transaction.
    for(const w of workers.values())if(!w.exited&&w.child.connected)w.child.send({action:'close'},()=>{});
    await serial;
    const results=await Promise.allSettled([...workers.values()].map(closeOwnedWorker));
    const incomplete=results.some(r=>r.status==='rejected');
    if(incomplete && [...workers.values()].some(w=>!w.exited))throw new Error('CLEANUP_INCOMPLETE');
    await bridge.close();await fs.unlink(STATE);
    // HTTP caller writes the truthful result before closing its listener.
    return incomplete?{stopped:false,hostStopped:true,cleanupConfirmed:false,generation,residuals:[...workers].filter(([,w])=>w.exitCode!==0).map(([instance,w])=>({instance,profile:w.profile,runtime:w.runtime,error:w.cleanup?.error||'CLEANUP_INCOMPLETE'}))}:{stopped:true,cleanupConfirmed:true,generation};
  })().catch(e=>{stopJob=null;throw e;});
  return stopJob;
}
