import {once} from 'node:events';
// One budget for the complete startup transaction, not a fresh budget per stage.
export async function withinStartupDeadline(operation,{timeoutMs=30000}={}){
  let timer;
  try{return await Promise.race([new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('BROWSER_START_TIMEOUT')),timeoutMs);}),Promise.resolve().then(operation)]);}
  finally{clearTimeout(timer);}
}
export async function waitForOwnedProcessExit(pid,{timeoutMs=5000,alive}={}){
  const ids=Array.isArray(pid)?pid:[pid];
  const probe=alive || (()=>ids.some(id=>{try{process.kill(id,0);return true;}catch(e){if(e.code==='ESRCH')return false;return true;}}));
  const deadline=Date.now()+timeoutMs;
  while(probe()){if(Date.now()>=deadline)throw new Error('BROWSER_CLOSE_UNCONFIRMED');await new Promise(r=>setTimeout(r,30));}
}
export async function retryOwnedFile(operation){
  for(let attempt=0;;attempt++){
    try{return await operation();}catch(e){if(!['EBUSY','EPERM'].includes(e.code)||attempt===5)throw e;await new Promise(r=>setTimeout(r,50*2**attempt));}
  }
}
export async function guardedStartup(isClosing,initialize,launch) {
  await initialize();
  if(isClosing())return null;
  return launch();
}
export async function closeOwnedWorker(w) {
  if(w.exited){if(w.exitCode!==0)throw new Error('CLEANUP_INCOMPLETE');return;}
  const done=once(w.child,'exit');if(w.child.connected!==false)w.child.send({action:'close'},()=>{});
  let timer;
  const [code]=await Promise.race([done,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('BROWSER_CLOSE_UNCONFIRMED')),12000);})]).finally(()=>clearTimeout(timer));
  if(code!==0)throw new Error('CLEANUP_INCOMPLETE');
}
