// Shared transport and result conversion for CLI and MCP. Never logs grants.
import WebSocket from 'ws';
import {validCommand} from './tools.mjs';
import {safeDetails} from './diagnostics.mjs';
export const failure=(code,details)=>({isError:true,structuredContent:{ok:false,untrusted:false,error:{code,...(safeDetails(details)?{details:safeDetails(details)}:{})}},content:[{type:'text',text:code}]});
export function resultOf(response) {
  if(!response.ok)return failure(response.error?.code || 'INTERNAL',response.error?.details);
  if(response.data?.dataUrl){
    const [head,data]=response.data.dataUrl.split(',');const mimeType=head.match(/data:([^;]+)/)?.[1];
    if(!mimeType)return failure('INVALID_IMAGE');
    return {structuredContent:{ok:true,untrusted:true,data:{mimeType}},content:[{type:'image',data,mimeType}]};
  }
  const result={ok:true,untrusted:true,data:response.data};
  return {structuredContent:result,content:[{type:'text',text:JSON.stringify(result)}]};
}
export async function connectTask(grant) {
  if(!grant.port || !grant.sessionId || !grant.token)throw new Error('INVALID_GRANT');
  const ws=new WebSocket(`ws://127.0.0.1:${grant.port}`);const waiting=new Map();let seq=0;
  ws.on('error',()=>{});
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{ws.close();reject(new Error('BRIDGE_UNAVAILABLE'));},5000);
    const fail=code=>{clearTimeout(timer);reject(new Error(code));};
    ws.once('open',()=>ws.send(JSON.stringify({type:'hello',role:'agent',...grant})));
    ws.once('message',raw=>{clearTimeout(timer);JSON.parse(raw).type==='welcome'?resolve():fail('AUTH');});
    ws.once('error',()=>fail('BRIDGE_UNAVAILABLE'));
    ws.once('close',code=>fail(code===4008?'SESSION_BUSY':code===4003?'TASK_PAUSED':'AUTH'));
  });
  ws.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='res'){waiting.get(m.id)?.(m);waiting.delete(m.id);}});
  ws.on('close',()=>{for(const done of waiting.values())done({ok:false,error:{code:'BRIDGE_CLOSED'}});waiting.clear();});
  return {
    async call(name,args={}) {
      if(!validCommand(name,args))return failure('INVALID_ARGUMENT');
      if(ws.readyState!==1)return failure('BRIDGE_CLOSED');
      const id=++seq;return resultOf(await new Promise(resolve=>{waiting.set(id,resolve);ws.send(JSON.stringify({type:'cmd',id,cmd:name,params:args}));}));
    },
    async close(){if(ws.readyState===3)return;await new Promise(resolve=>{ws.once('close',resolve);ws.close();});},
  };
}
