import path from 'node:path';
import {spawn} from 'node:child_process';
import {ROOT,request} from './local-control.mjs';
import {correlationId} from './runtime-log.mjs';

// ShellExecute breaks inherited PowerShell pipe handles. PID is diagnostics only;
// readiness/ownership uses the ACL-protected local channel, never a PID lookup.
export function launchManagedHost({timeoutMs=5000}={}) {
 return new Promise((resolve,reject)=>{
  const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(ROOT,'src/host-bootstrap.ps1'),'-NodePath',process.execPath,'-HostFile',path.join(ROOT,'src/host.mjs'),'-CorrelationId',correlationId],{windowsHide:true,stdio:['ignore','pipe','pipe']});
  let text='',done=false;
  const finish=(error,pid)=>{if(done)return;done=true;clearTimeout(timer);child.stdout.destroy();child.stderr.destroy();child.unref();error?reject(error):resolve(pid);};
  const timer=setTimeout(()=>finish(new Error('HOST_LAUNCHER_TIMEOUT')),timeoutMs);
  child.stdout.on('data',b=>{text+=b;if(text.length>128)finish(new Error('HOST_START_PROTOCOL'));});child.stderr.resume();
  child.once('error',()=>finish(new Error('HOST_SPAWN_FAILED')));
  child.once('close',code=>{if(code!==0)return finish(new Error('HOST_SPAWN_FAILED'));try{const value=JSON.parse(text);if(!Number.isSafeInteger(value.pid)||value.pid<1)throw new Error();finish(null,value.pid);}catch{finish(new Error('HOST_START_PROTOCOL'));}});
 });
}

export async function ensureHost({probe=()=>request('health',{}, {timeoutMs:1500}),release=()=>request('startup-release',{}, {timeoutMs:1500}),launch=()=>launchManagedHost(),timeoutMs=10000,event=()=>{}}={}) {
 let absent=false;
 try{const state=await probe();if(state?.hostReady===true)return false;}catch(e){if(['INVALID_TASK','INVALID_ACTION'].includes(e.message))throw new Error('HOST_VERSION_MISMATCH');if(e.message!=='HOST_OFFLINE')throw e;absent=true;}
 if(absent){const childPid=await launch();event('host_spawn',{childPid});}
 const deadline=performance.now()+timeoutMs;let acknowledged=false;
 while(performance.now()<deadline){
  try{
   const state=await probe();
   if(state?.hostReady===true){event('host_release');return absent;}
   if(state?.bootstrapReady===true&&!acknowledged){event('host_ready');await release();acknowledged=true;}
  }catch(e){if(!['HOST_OFFLINE','HOST_STARTING'].includes(e.message))throw e;}
  await new Promise(r=>setTimeout(r,40));
 }
 // An unreleased host self-aborts on its bounded initialization lease. No PID kill.
 throw new Error('HOST_START_TIMEOUT');
}
