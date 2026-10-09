import {startupResources} from './startup-resources.mjs';
import {connectionFilter} from './connection-filter.mjs';
// Independent C adaptation. B frozen files are never loaded at runtime.
import {verifyDeployment,POWERSHELL,RUNS} from './deployment.mjs';import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';import {EventEmitter} from 'node:events';
import {fixture} from './fixture.mjs';import {ROOT,PROFILE,fail,bounded} from './wire.mjs';
export class Native extends EventEmitter{
 pending=new Map();id=0;state=null;unavailable=null;
 async start(){
  const exe=path.join(ROOT,'dist/abw19e-host.exe');const receipt=await verifyDeployment();
  if(createHash('sha256').update(await fs.readFile(exe)).digest('hex')!==receipt.binaries['abw19e-host.exe'])throw fail('BINARY_PIN');
  const resources=await startupResources(fixture,connectionFilter);this.fixture=resources.fixture;this.proxy=resources.proxy;this.run=path.join(RUNS,'wv19-a-'+randomUUID());this.artifacts=path.join(this.run,'artifacts');
  const env={};for(const k of ['SystemRoot','WINDIR','ComSpec','SYSTEMDRIVE','NUMBER_OF_PROCESSORS'])if(process.env[k])env[k]=process.env[k];env.PATH=path.join(env.SystemRoot,'System32');env.TEMP=path.join(this.run,'temp');env.TMP=env.TEMP;this.env=env;
  this.child=spawn(exe,['--origin',this.fixture.origin,'--data-root',PROFILE,'--output-root',this.artifacts,'--proxy-port',String(this.proxy.port)],{windowsHide:false,env,stdio:['pipe','pipe','pipe']});
  this.exited=new Promise(resolve=>this.child.once('exit',(code,signal)=>{this.exitCode=code;this.exitSignal=signal;this.rejectAll('HOST_EXITED');resolve(code);}));this.child.on('error',()=>this.rejectAll('HOST_SPAWN'));this.child.stdin.on('error',()=>this.rejectAll('HOST_INPUT'));this.child.stderr.resume();let buffer='';
  this.child.stdout.on('data',b=>{buffer+=b.toString('utf8');if(Buffer.byteLength(buffer)>262144){this.rejectAll('HOST_OUTPUT_LIMIT');buffer='';return;}const lines=buffer.split('\n');buffer=lines.pop();for(const line of lines){let m;try{m=JSON.parse(line);}catch{this.rejectAll('HOST_JSON');continue;}if(m.kind==='state'){this.state=m.data;this.emit('state',m.data);if(m.data.status==='close-requested')this.emit('close-requested');}else if(m.kind==='result'){const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);p.resolve(m);}}}});
  await this.wait(s=>s.status==='ready',performance.now()+25000);if(this.state.proxyPort!==this.proxy.port||this.proxy.stats().httpFixture<1)throw fail('PROXY_ROUTING_UNVERIFIED');return this;
 }
 rejectAll(code){this.unavailable=code;for(const p of this.pending.values())p.reject(fail(code));this.pending.clear();this.emit('fault',code);}
 async wait(predicate,deadline){if(this.state&&predicate(this.state))return this.state;if(this.unavailable)throw fail(this.unavailable);let state,fault;try{return await bounded(new Promise((resolve,reject)=>{state=s=>{if(s.error!=='NONE')reject(fail(s.error));else if(predicate(s))resolve(s);};fault=c=>reject(fail(c));this.on('state',state);this.on('fault',fault);}),deadline,'HOST_READY_UNKNOWN');}finally{this.off('state',state);this.off('fault',fault);}}
 async command(op,slot=0,value='',deadline=performance.now()+25000,owner=Math.floor(slot/4)){if(this.unavailable)throw fail(this.unavailable);const budget=Math.min(25000,Math.floor(deadline-performance.now()));if(budget<=0)throw fail('HOST_REQUEST_UNKNOWN');const id=++this.id;const payload=['navigate','history','register','scope-check','script','label','cdp'].includes(op)?'\t'+Buffer.from(value).toString('hex'):op==='mutate'?'\t'+value:'';const line=op==='close'?`${id}\tclose\t${budget}\n`:`${id}\t${op}\t${owner}\t${slot}\t${budget}${payload}\n`;if(Buffer.byteLength(line)>131072)throw fail('HOST_INPUT_LIMIT');let resolve,reject;const response=new Promise((a,b)=>{resolve=a;reject=b;});this.pending.set(id,{resolve,reject});
  try{return await bounded(Promise.all([new Promise((a,b)=>this.child.stdin.write(line,e=>e?b(fail('HOST_WRITE_UNKNOWN')):a())),response]).then(v=>v[1]),deadline,'HOST_REQUEST_UNKNOWN');}
  finally{this.pending.delete(id);}
 }
 async close(){if(this.closePromise)return this.closePromise;this.closePromise=this.closeImpl();return this.closePromise;}
 async closeImpl(){const deadline=performance.now()+24000;let proof={cleanupPermitted:false,runMustBeRetained:true};
  try{if(!this.state?.browserCreationHex)throw fail('NO_BROWSER_IDENTITY');
   const exe=POWERSHELL;
   const observer=spawn(exe,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(ROOT,'scripts/observe-browser-exit.ps1'),'-BrowserPid',String(this.state.browserPid),'-CreationHex',this.state.browserCreationHex,'-ExpectedUdf',PROFILE,'-WaitForExitMs','15000'],{windowsHide:true,env:this.env,stdio:['ignore','pipe','ignore']});let buffer='',readyResolve,readyReject;const ready=new Promise((a,b)=>{readyResolve=a;readyReject=b;});const records=[];
   observer.stdout.on('data',b=>{buffer+=b.toString();if(buffer.length>65536){readyReject(fail('OBSERVER_LIMIT'));return;}let idx;while((idx=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,idx);buffer=buffer.slice(idx+1);try{const p=JSON.parse(line);records.push(p);if(p.observerReady)readyResolve(p);else if(p.runMustBeRetained)readyReject(fail('OBSERVER_UNKNOWN'));}catch{}}});observer.on('error',()=>readyReject(fail('OBSERVER_SPAWN')));const done=new Promise(resolve=>observer.once('close',code=>{this.observerExit=code;readyReject(fail('OBSERVER_EXIT'));resolve(code);}));
   const identity=await bounded(ready,Math.min(deadline,performance.now()+7000));if(!identity.creationIdentityMatch||!identity.udfCanonicalMatch||!identity.imageIdentityMatch||!identity.browserStillLive)throw fail('OBSERVER_IDENTITY');
   await this.command('close',0,'',deadline);const [observerExit,hostExit]=await bounded(Promise.all([done,this.exited]),deadline);const last=records.find(p=>Object.hasOwn(p,'browserExited'));proof={cleanupPermitted:observerExit===0&&hostExit===0&&last?.browserExited===true&&last?.cleanupPermitted===true,hostExit,observerExit,observer:records,processKilled:false,persistentProfileRetained:true,run:this.run};
  }catch(e){proof={...proof,reason:e.code||'CLOSE_UNKNOWN',hostExit:this.exitCode??null,observerExit:this.observerExit??null,processKilled:false,persistentProfileRetained:true,run:this.run};}
  try{if(this.proxy)await bounded(this.proxy.close(),deadline,'PROXY_CLOSE_UNKNOWN');}catch{proof={...proof,cleanupPermitted:false,runMustBeRetained:true,reason:'PROXY_CLOSE_UNKNOWN'};}
  try{if(this.fixture)await bounded(this.fixture.close(),deadline,'FIXTURE_CLOSE_UNKNOWN');}catch{proof={...proof,cleanupPermitted:false,runMustBeRetained:true,reason:'FIXTURE_CLOSE_UNKNOWN'};}return proof;
 }
}
