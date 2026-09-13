// Confirm the exact current extension generation before passing its capability.
// Only booleans leave the preflight; capability values never enter diagnostics.
import path from 'node:path';
export async function registeredExtension(read,expected,{timeoutMs=10000,pollMs=40}={}){
 const until=performance.now()+timeoutMs;
 while(performance.now()<until){const all=await read();const matches=all.extensions.filter(e=>e.enabled&&e.version===expected.version&&(!expected.id||e.id===expected.id)&&typeof e.path==='string'&&path.resolve(e.path).toLowerCase()===path.resolve(expected.path).toLowerCase());if(matches.length===1)return matches[0];await new Promise(r=>setTimeout(r,pollMs));}
 throw new Error('EXTENSION_LOAD_UNCONFIRMED');
}
export async function currentExtensionWorker(context,expected,{timeoutMs=3000,settleMs=25,allowOldGeneration=false}={}){
 const prefix='chrome-extension://'+new URL(expected).host+'/';
 const end=performance.now()+timeoutMs;
 while(performance.now()<end){
  const all=context.serviceWorkers().filter(w=>w.url().startsWith(prefix)),candidates=all.filter(w=>w.url()===expected);
  if(candidates.length===1&&(allowOldGeneration||all.length===1)){const chosen=candidates[0];await new Promise(r=>setTimeout(r,settleMs));const now=context.serviceWorkers().filter(w=>w.url().startsWith(prefix)),exact=now.filter(w=>w.url()===expected);if(exact.length===1&&exact[0]===chosen&&(allowOldGeneration||now.length===1))return chosen;}
  else await new Promise(r=>setTimeout(r,settleMs));
 }
 throw new Error('EXTENSION_WORKER_UNCONFIRMED');
}
export async function bootstrapExtension({context,worker,expected,expectedVersion,config,confirm=async()=>{},run=fn=>fn(),note=()=>{},contextTimeoutMs=3000,activationTimeoutMs=3000,writeTimeoutMs=10000}){
 let closed=false,rejectClosed;
 const closure=new Promise((_,reject)=>rejectClosed=reject);closure.catch(()=>{});
 const onClose=()=>{closed=true;rejectClosed(new Error('EXTENSION_WORKER_REPLACED'));};worker.on('close',onClose);
 const current=(sole=true)=>{const prefix='chrome-extension://'+new URL(expected).host+'/';const all=context.serviceWorkers().filter(w=>w.url().startsWith(prefix)),workers=all.filter(w=>w.url()===expected);if(closed||workers.length!==1||workers[0]!==worker||sole&&all.length!==1)throw new Error('EXTENSION_WORKER_REPLACED');};
 async function bounded(fn,ms,code){let timer;try{return await Promise.race([run(fn),closure,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error(code)),ms);})]);}finally{clearTimeout(timer);}}
 try{
  current(false);await confirm(false);current(false);note('extension_context');
  const ready=await bounded(()=>worker.evaluate(({id,version})=>typeof chrome!=='undefined'&&chrome.runtime.id===id&&(!version||chrome.runtime.getManifest().version===version)&&!!chrome.storage?.session,{id:new URL(expected).host,version:expectedVersion}),contextTimeoutMs,'EXTENSION_CONTEXT_TIMEOUT');
  current(false);await confirm(false);current(false);if(!ready)throw new Error('EXTENSION_CONTEXT_UNAVAILABLE');note('extension_context','ok');
  note('extension_activation');
  const activated=await bounded(()=>worker.evaluate(async()=>{
   if(!self.registration||typeof self.skipWaiting!=='function')return false;
   if(self.registration.active?.scriptURL!==self.location.href)await self.skipWaiting();
   const deadline=performance.now()+2000;
   while(self.registration.active?.scriptURL!==self.location.href||self.registration.active?.state!=='activated'){if(performance.now()>=deadline)return false;await new Promise(r=>setTimeout(r,20));}
   return true;
  }),activationTimeoutMs,'EXTENSION_ACTIVATION_TIMEOUT');
  if(!activated)throw new Error('EXTENSION_ACTIVATION_TIMEOUT');
  const selected=await run(()=>currentExtensionWorker(context,expected));if(selected!==worker)throw new Error('EXTENSION_WORKER_REPLACED');current();await confirm(true);note('extension_activation','ok');
  note('extension_bootstrap');
  await bounded(()=>worker.evaluate(async value=>{await chrome.storage.session.set({abwRuntimeCapability:value});},config),writeTimeoutMs,'BROWSER_BOOTSTRAP_TIMEOUT');
  current();await confirm(true);current();note('extension_bootstrap','ok');
 }finally{worker.off('close',onClose);}
}
