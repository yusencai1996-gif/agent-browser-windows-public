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
const workers=new Map();let stopping=false,bridge,serial=Promise.resolve();
const control=randomBytes(32).toString('hex'),generation=randomUUID();
const validName=s=>typeof s==='string'&&/^[a-zA-Z0-9_-]{1,48}$/.test(s);
const server=http.createServer(async(req,res)=>{
  const reply=(ok,data)=>{res.setHeader('content-type','application/json');res.end(JSON.stringify(ok?{ok,data}:{ok,error:data}));};
  if(req.headers.origin || req.headers.authorization!==`Bearer ${control}`){res.statusCode=403;return reply(false,'AUTH');}
  let body='';for await(const chunk of req){body+=chunk;if(body.length>8192){req.destroy();return;}}
  let args;try{args=JSON.parse(body);}catch{return reply(false,'INVALID_ARGUMENT');}
  // stop/revoke must not wait behind other local management operations.
  const execute=()=>dispatch(args);
  try{let data;if(['revoke','stop','status'].includes(args.action))data=await execute();else {const job=serial.then(execute);serial=job.catch(()=>{});data=await job;}reply(true,data);if(args.action==='stop')server.close(()=>process.exit(0));}catch(e){reply(false,/^[A-Z_]+$/.test(e.message)?e.message:'HOST_ERROR');}
});
await secureLocal();
// Bind before writing capability: a second host cannot overwrite the live owner's state.
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(PIPE,resolve);});
bridge=await new ControlBridge().start();
const overview=new OverviewController(bridge,workers,callOverview,generation);bridge.onManagement=(instance,message)=>overview.handle(instance,message);
await fs.writeFile(STATE,JSON.stringify({token:control,generation}));
process.send?.({ready:true});
const signalStop=()=>void stop().then(()=>server.close(()=>process.exit(0))).catch(()=>console.error('CLEANUP_INCOMPLETE'));
process.on('SIGINT',signalStop);process.on('SIGTERM',signalStop);
async function dispatch(p) {
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
    if(!validName(p.name)||workers.has(p.name))throw new Error('INVALID_INSTANCE');
    const startedAt=performance.now();
    const opencliExtension=p.opencliExtension?(await inspectOpencliExtension(p.opencliExtension)).path:await configuredOpencli();
    const config=bridge.registerInstance(p.name);
    const child=fork(path.join(ROOT,'src/browser-worker.mjs'),[],{detached:true,windowsHide:true,stdio:['ignore','ignore','ignore','ipc']});
    const entry={child,headless:!!p.headless,profileMode:p.temporary?'temporary':'shared'};attachWorkerRpc(entry);workers.set(p.name,entry);
    const ready=waitForWorkerReady(child);
    child.on('exit',(code)=>{for(const s of bridge.sessions.values())if(s.instanceId===p.name)s.revoked=true;entry.exited=true;entry.exitCode=code;});
    child.send({action:'launch',params:{config,headless:!!p.headless,visible:!!p.visible,temporary:!!p.temporary,opencliExtension}});
    try{return await withinStartupDeadline(async()=>{
    const result=await ready;Object.assign(entry,result);
    const deadline=Date.now()+15000;while(bridge.instances.get(p.name).ws?.readyState!==1){if(Date.now()>deadline)throw new Error('INSTANCE_OFFLINE');await new Promise(r=>setTimeout(r,100));}
    return {instance:p.name,headless:entry.headless,profileMode:entry.profileMode,profile:entry.profile,version:entry.version,opencli:entry.opencli,window:await callWindow(entry,'status')};
    },{timeoutMs:Math.max(1,30000-(performance.now()-startedAt))});}catch(e){await closeOwnedWorker(entry).catch(()=>{});throw e;}
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
