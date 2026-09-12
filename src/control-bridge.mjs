import { WebSocketServer } from 'ws';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { TOOLS, validCommand } from './tools.mjs';
import {safeDetails} from './diagnostics.mjs';
import {protectedPageUrl} from '../extension/page-policy.js';

const allowed = new Set(TOOLS.map(t=>t.name));
const fail = (code,details) => Object.assign(new Error(code), { code,...(safeDetails(details)?{details:safeDetails(details)}:{}) });
const token = () => randomBytes(32).toString('hex');
function equal(a,b) {
  return typeof a === 'string' && typeof b === 'string' && a.length === b.length
    && timingSafeEqual(Buffer.from(a),Buffer.from(b));
}

/** Local host owns instances and grants. Agent sockets can only use their grant.
 * One queue per instance deliberately serializes more than just a single tab.
 * Disconnected/uncertain operations are never silently retried or rerouted.
 */
export class ControlBridge {
  instances = new Map(); sessions = new Map(); pending = new Map(); owners = new Map();
  async start() {
    this.server = new WebSocketServer({host:'127.0.0.1',port:0,maxPayload:8*1024*1024,
      verifyClient: ({origin},done) => done(!origin || /^chrome-extension:\/\/[a-p]{32}$/.test(origin))});
    await new Promise((resolve,reject) => {this.server.once('listening',resolve); this.server.once('error',reject);});
    this.port = this.server.address().port;
    this.server.on('connection',(ws,req) => {
      let identity;
      const timeout=setTimeout(()=>ws.close(4001),3000);
      ws.on('message',raw=>{
        try {
          const m=JSON.parse(raw);
          if (!identity) {
            if (m.type !== 'hello') throw fail('AUTH');
            if (m.role === 'extension') {
              const instance=this.instances.get(m.instanceId);
              if (!instance || req.headers.origin !== `chrome-extension://${m.extId}` || !equal(instance.token,m.token)) throw fail('AUTH');
              const old=instance.ws;
              instance.ws=ws;
              // A replacement connection does not prove an in-flight command stopped.
              if (old && old !== ws) { this.disconnect(instance,old); old.close(4009); }
              identity={instance};
              ws.send(JSON.stringify({type:'welcome',bridge:'0.8.0',live:[...this.sessions.keys()]}));
            } else if (m.role === 'agent' && !req.headers.origin) {
              const session=this.sessions.get(m.sessionId);
              if (!session || !equal(session.token,m.token) || session.revoked) throw fail('AUTH');
              if(session.paused){ws.close(4003,'TASK_PAUSED');return;}
              if(session.ws && session.ws.readyState!==3){ws.close(4008,'SESSION_BUSY');return;}
              session.ws=ws; identity={session};
              ws.send(JSON.stringify({type:'welcome'}));
            } else throw fail('AUTH');
            clearTimeout(timeout); return;
          }
          if (m.type === 'ping') return ws.send(JSON.stringify({type:'pong'}));
          if(identity.instance&&identity.instance.ws===ws&&m.type==='management'){
            const originSocket=ws;
            Promise.resolve().then(()=>this.onManagement?.(identity.instance,m)).then(data=>{if(identity.instance.ws===originSocket&&ws.readyState===1)ws.send(JSON.stringify({type:'management-result',requestId:m.requestId,ok:true,data}));},error=>{if(ws.readyState===1)ws.send(JSON.stringify({type:'management-result',requestId:m.requestId,ok:false,error:/^[A-Z_]+$/.test(error.message)?error.message:'MANAGEMENT_FAILED'}));});return;
          }
          if(identity.session&&m.type==='management'){send({type:'res',id:m.id,ok:false,error:{code:'MANAGEMENT_FORBIDDEN'}});return;}
          if(identity.instance&&identity.instance.ws===ws&&m.type==='event')this.tabEvent(identity.instance,m);
          if (identity.instance && m.type === 'res') {
            const item=this.pending.get(m.__k);
            if (item?.ws===ws) {this.pending.delete(m.__k); clearTimeout(item.timer); m.ok ? item.resolve(m.data) : item.reject(fail(m.error?.code || 'BROWSER_ERROR',m.error?.details));}
          }
          if (identity.session && m.type === 'cmd') {
            identity.session.requests=(identity.session.requests || 0)+1;
            this.command(identity.session,m.cmd,m.params || {}).then(data=>send({type:'res',id:m.id,ok:true,data}),
              error=>send({type:'res',id:m.id,ok:false,error:{code:error.code || 'INTERNAL',...(error.details?{details:error.details}:{})}})).finally(()=>identity.session.requests--);
          }
        } catch { ws.close(4001); }
      });
      const deliveryLost=()=>{if(identity?.session)this.instances.get(identity.session.instanceId).uncertain=true;};
      const send=m=>{
        if(ws.readyState===1)ws.send(JSON.stringify(m),error=>{if(error)deliveryLost();});
        else deliveryLost();
      };
      ws.on('error',()=>{});
      ws.on('close',()=>{
        clearTimeout(timeout);
        if (identity?.instance) this.disconnect(identity.instance,ws);
        if (identity?.session?.ws===ws) {
          if(identity.session.requests>0)this.instances.get(identity.session.instanceId).uncertain=true;
          identity.session.ws=null;
        }
      });
    });
    return this;
  }
  registerInstance(instanceId) {
    if (!instanceId || this.instances.has(instanceId)) throw fail('INSTANCE_EXISTS');
    const value={id:instanceId,token:token(),queue:Promise.resolve(),ws:null,uncertain:false,tabEvents:new Map()};
    this.instances.set(instanceId,value);
    return {port:this.port,instanceId,token:value.token};
  }
  createSession(sessionId,instanceId) {
    if (!sessionId || this.sessions.has(sessionId) || !this.instances.has(instanceId)) throw fail('INVALID_SESSION');
    const value={id:sessionId,instanceId,token:token(),revoked:false,current:null,ws:null,paused:false,takeover:'agent'};
    this.sessions.set(sessionId,value);
    return {port:this.port,sessionId,token:value.token};
  }
  async revoke(sessionId) {
    const session=this.sessions.get(sessionId);
    if (!session) throw fail('INVALID_SESSION');
    session.revoked=true; // Barrier is set before waiting: new/queued work cannot enter.
    const instance=this.instances.get(session.instanceId);
    await instance.queue;
    return {revoked:true,quiescent:!instance.uncertain};
  }
  async takeOver(sessionId){
    const session=this.sessions.get(sessionId);if(!session)throw fail('INVALID_SESSION');
    session.paused=true;session.takeover='pending';
    const instance=this.instances.get(session.instanceId);await instance.queue;
    session.takeover=instance.uncertain?'unconfirmed':'human';
    return {paused:true,confirmed:!instance.uncertain,revoked:session.revoked};
  }
  handBack(sessionId){
    const session=this.sessions.get(sessionId);if(!session)throw fail('INVALID_SESSION');
    if(session.revoked)throw fail('REVOKED');
    if(!session.paused||session.takeover!=='human'||this.instances.get(session.instanceId).uncertain)throw fail('TAKEOVER_UNCONFIRMED');
    session.paused=false;session.takeover='agent';return {resumed:true};
  }
  disconnect(instance,ws) {
    if (instance.ws===ws) instance.ws=null;
    for (const [key,item] of this.pending) if(item.ws===ws) {
      instance.uncertain=true; this.pending.delete(key); clearTimeout(item.timer); item.reject(fail('OUTCOME_UNKNOWN'));
    }
  }
  tabEvent(instance,event){
    if(!['tab_closed','tab_replaced'].includes(event.event)||!Number.isSafeInteger(event.tabId)||event.tabId<=0)return;
    if(event.event==='tab_replaced'&&(!Number.isSafeInteger(event.replacementTabId)||event.replacementTabId<=0))return;
    const id=event.tabId,key=`${instance.id}:${id}`,owner=this.owners.get(key),replacement=event.event==='tab_replaced'?event.replacementTabId:undefined;
    const detail={tabId:id,stage:'lifecycle',navigation:replacement?'replaced':'closed',...(replacement?{replacementTabId:replacement}:{})};
    instance.tabEvents.set(id,detail);while(instance.tabEvents.size>256)instance.tabEvents.delete(instance.tabEvents.keys().next().value);
    this.owners.delete(key);
    if(replacement&&owner){const nextKey=`${instance.id}:${replacement}`,other=this.owners.get(nextKey);if(other&&other!==owner){instance.uncertain=true;return;}this.owners.set(nextKey,owner);}
    for(const session of this.sessions.values())if(session.instanceId===instance.id&&session.current===id){session.current=replacement||null;session.lastTabEvent=detail;}
  }
  command(session,cmd,params) {
    const instance=this.instances.get(session.instanceId);
    const execute=async()=>{
      if(session.revoked) throw fail('REVOKED');
      if(session.paused)throw fail('TASK_PAUSED');
      if(instance.humanCreation)throw fail('MANAGEMENT_BUSY');
      if(!allowed.has(cmd)) throw fail('UNSUPPORTED');
      if(!validCommand(cmd,params)) throw fail('INVALID_ARGUMENT');
      if(protectedPageUrl(params.url))throw fail('PROTECTED_PAGE');
      if(instance.uncertain) throw fail('OUTCOME_UNKNOWN');
      if(instance.ws?.readyState!==1) throw fail('INSTANCE_OFFLINE');
      let tabId=params.tabId ?? session.current;
      const action=cmd==='tabs' ? params.action : null;
      if(cmd==='tabs' && !['new','list','select','close'].includes(action)) throw fail('INVALID_ACTION');
      if(action!=='new' && action!=='list') {
        if(!Number.isSafeInteger(tabId) || tabId<=0) throw session.lastTabEvent?fail('NO_TAB',session.lastTabEvent):fail('TAB_REQUIRED');
        const removed=instance.tabEvents.get(tabId);if(removed)throw fail(removed.navigation==='replaced'?'TAB_REPLACED':'NO_TAB',removed);
        const owner=this.owners.get(`${instance.id}:${tabId}`);
        if(owner && owner!==session.id) throw fail('TAB_OWNED');
        if(!owner) throw fail('HUMAN_OWNED');
        // Selecting an unclaimed tab reserves it before the awaited browser operation.
        if(!owner) this.owners.set(`${instance.id}:${tabId}`,session.id);
      }
      let data;
      session.executing=true;
      try { data=await this.forward(instance,{type:'cmd',id:randomUUID(),__k:randomUUID(),cmd,
        params:{...params,...(action==='select'||action==='close'?{tabId}: {}),...(action==='list'?{allowedTabIds:[...this.owners].filter(([key,owner])=>key.startsWith(instance.id+':')&&owner===session.id).map(([key])=>Number(key.slice(instance.id.length+1)))}:{})},tabId:action==='new'||action==='list'?undefined:tabId,
        sid:session.id,client:'agent-browser-windows',live:[...this.sessions.values()].filter(s=>!s.revoked).map(s=>s.id)});
      } catch(error) {
        const missing=action==='new'?error.details?.tabId:tabId;
        if(error.code==='NO_TAB'&&Number.isSafeInteger(missing))this.tabEvent(instance,{event:'tab_closed',tabId:missing});
        const created=error.details?.tabId;
        if(action==='new'&&error.details?.created&&created&&!instance.tabEvents.has(created)&&error.details.navigation!=='closed'){this.owners.set(`${instance.id}:${created}`,session.id);session.current=created;session.lastTabEvent=null;}
        // Browser timeout need not mean cancellation (e.g. native download).
        if(['TIMEOUT','OUTCOME_UNKNOWN'].includes(error.code)) instance.uncertain=true;
        throw error;
      }finally{session.executing=false;}
      if(action==='new') {
        if(!Number.isSafeInteger(data?.tabId)) throw fail('INVALID_RESPONSE');
        const removed=instance.tabEvents.get(data.tabId);if(removed)throw fail(removed.navigation==='replaced'?'TAB_REPLACED':'NO_TAB',{...removed,created:true});
        this.owners.set(`${instance.id}:${data.tabId}`,session.id); session.current=data.tabId;
        session.lastTabEvent=null;
      } else if(action==='select') {const removed=instance.tabEvents.get(tabId);if(removed)throw fail(removed.navigation==='replaced'?'TAB_REPLACED':'NO_TAB',removed);session.current=tabId;session.lastTabEvent=null;}
      else if(action==='close') {this.owners.delete(`${instance.id}:${tabId}`); if(session.current===tabId) session.current=null;}
      if(data?.followed?.to !== undefined) {
        if(data.followed.how!=='opener'||data.followed.from!==tabId)throw fail('HUMAN_OWNED');
        const opened=data.followed.to,owner=this.owners.get(`${instance.id}:${opened}`);
        const removed=instance.tabEvents.get(opened);if(removed)throw fail(removed.navigation==='replaced'?'TAB_REPLACED':'NO_TAB',removed);
        if(!Number.isSafeInteger(opened) || (owner && owner!==session.id)) {
          instance.uncertain=true;throw fail('OUTCOME_UNKNOWN');
        }
        this.owners.set(`${instance.id}:${opened}`,session.id);session.current=opened;
      }
      return data;
    };
    instance.queued=(instance.queued||0)+1;
    const result=instance.queue.then(execute).finally(()=>instance.queued--);
    instance.queue=result.catch(()=>{});
    return result;
  }
  forward(instance,message) {
    return new Promise((resolve,reject)=>{
      const ws=instance.ws;
      const timer=setTimeout(()=>{
        this.pending.delete(message.__k); instance.uncertain=true; reject(fail('OUTCOME_UNKNOWN'));
      },30000);
      this.pending.set(message.__k,{ws,resolve,reject,timer});
      ws.send(JSON.stringify(message),error=>{
        if(error && this.pending.delete(message.__k)) {clearTimeout(timer); instance.uncertain=true; reject(fail('OUTCOME_UNKNOWN'));}
      });
    });
  }
  async close() {
    for(const session of this.sessions.values()) session.revoked=true;
    for(const [key,item] of this.pending) {clearTimeout(item.timer);item.reject(fail('CLOSED'));this.pending.delete(key);}
    for(const ws of this.server.clients) ws.terminate();
    await new Promise(resolve=>this.server.close(resolve));
  }
}
