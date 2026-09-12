import {randomUUID} from 'node:crypto';
export function waitForWorkerReady(child){
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>finish(new Error('BROWSER_START_TIMEOUT')),32000);
    const finish=(error,data)=>{clearTimeout(timer);child.off('message',onMessage);child.off('exit',onExit);error?reject(error):resolve(data);};
    const onMessage=m=>{if(m.rpc||m.event)return;if(m.ready===true)finish(null,m);else if(m.error)finish(new Error(/^[A-Z_]+$/.test(m.error)?m.error:'BROWSER_START_FAILED'));};
    const onExit=()=>finish(new Error('BROWSER_EXITED'));
    child.on('message',onMessage);child.once('exit',onExit);
  });
}
export function attachWorkerRpc(entry){
  entry.pending=new Map();
  entry.child.on('message',m=>{
    if(m.event==='cleanup')entry.cleanup={ok:m.ok,error:m.error,path:m.path};
    const item=entry.pending.get(m.rpc);if(!item)return;clearTimeout(item.timer);entry.pending.delete(m.rpc);m.ok?item.resolve(m.data):item.reject(new Error(m.error||'WINDOW_QUERY_FAILED'));
  });
  entry.child.on('exit',()=>{for(const item of entry.pending.values()){clearTimeout(item.timer);item.reject(new Error('WINDOW_CLOSED'));}entry.pending.clear();});
}
export function callWindow(entry,command,windowId){
  if(entry.exited)return command==='status'?Promise.resolve({mode:'closed',windows:[]}):Promise.reject(new Error('WINDOW_CLOSED'));
  const rpc=randomUUID();return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{entry.pending.delete(rpc);reject(new Error('WINDOW_QUERY_TIMEOUT'));},7000);
    entry.pending.set(rpc,{resolve,reject,timer});entry.child.send({action:'window',rpc,command,windowId},e=>{if(e){clearTimeout(timer);entry.pending.delete(rpc);reject(new Error('WINDOW_CLOSED'));}});
  });
}
export function callOverview(entry,operation,args={}){
  if(entry.exited)return Promise.reject(new Error('WINDOW_CLOSED'));
  const rpc=randomUUID();return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{entry.pending.delete(rpc);reject(new Error('OVERVIEW_TIMEOUT'));},6000);entry.pending.set(rpc,{resolve,reject,timer});entry.child.send({action:'overview',rpc,operation,args},e=>{if(e){clearTimeout(timer);entry.pending.delete(rpc);reject(new Error('WINDOW_CLOSED'));}});});
}
