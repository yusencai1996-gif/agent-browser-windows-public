// Called only by the authenticated extension channel, never by CLI tool dispatch.
export class OverviewController {
  cache=new Map();captures=0;
  constructor(bridge,workers,rpc,generation){Object.assign(this,{bridge,workers,rpc,generation});}
  async handle(instance,message){
    const worker=this.workers.get(instance.id);if(!worker||worker.exited)throw new Error('INSTANCE_OFFLINE');
    if(!Number.isInteger(message.pageId)||!await this.rpc(worker,'visible',{pageId:message.pageId}))throw new Error('OVERVIEW_HIDDEN');
    const action=message.action;
    const session=message.task?this.bridge.sessions.get(message.task):null;
    if(session&&session.instanceId!==instance.id)throw new Error('INVALID_TASK');
    if(['takeover','return'].includes(action)){
      if(!session)throw new Error('INVALID_TASK');
      return action==='takeover'?this.bridge.takeOver(session.id):this.bridge.handBack(session.id);
    }
    if(action==='new-human'){
      instance.humanCreation=true;
      try{await instance.queue;return await this.rpc(worker,'newHuman');}finally{instance.humanCreation=false;}
    }
    const meta=await this.rpc(worker,'metadata');
    const tab=meta.tabs.find(t=>t.id===message.tabId);
    if(action==='show'||action==='close-human'){
      if(!tab)throw new Error('NO_TAB');
      return this.rpc(worker,action==='show'?'show':'closeHuman',{tabId:tab.id});
    }
    if(action==='snapshot'){
      const tasks=[...this.bridge.sessions.values()].filter(s=>s.instanceId===instance.id).map(s=>{
        const tabs=meta.tabs.filter(t=>this.bridge.owners.get(`${instance.id}:${t.id}`)===s.id);
        const state=s.revoked?'ended':s.paused?(instance.uncertain?'unconfirmed':s.takeover):s.executing?'running':'waiting';
        return {id:s.id,name:s.id,state,revoked:s.revoked,current:tabs.some(t=>t.id===s.current)?s.current:null,tabs};
      });
      const humans=[];for(const tab of meta.tabs)if(!this.bridge.owners.has(`${instance.id}:${tab.id}`)){let group=humans.find(g=>g.windowId===tab.windowId);if(!group){group={id:'human:'+tab.windowId,windowId:tab.windowId,name:meta.humanWindows.includes(tab.windowId)?'我的窗口':'未分配窗口',state:'human',human:true,closable:meta.humanWindows.includes(tab.windowId),tabs:[],current:tab.id};humans.push(group);}group.tabs.push(tab);if(tab.active)group.current=tab.id;}
      for(const [key,value] of this.cache)if(!meta.tabs.some(t=>t.id===value.tabId&&t.documentKey===value.documentKey))this.cache.delete(key);
      return {generation:this.generation,tasks:[...tasks,...humans],externalBridge:!!worker.opencli,captures:this.captures};
    }
    if(action!=='preview'||!tab)throw new Error('NO_TAB');
    const key=`${instance.id}:${tab.id}`,cached=this.cache.get(key),previous=cached?.documentKey===tab.documentKey?cached:null;
    if(previous?.documentKey===tab.documentKey&&Date.now()-previous.updatedAt<5000)return {...previous,cached:true};
    if(instance.queued||instance.uncertain||instance.previewPending)return previous?{...previous,stale:true,error:'操作进行中，保留上次预览'}:{error:'操作进行中，稍后预览'};
    instance.previewPending=true;
    const job=instance.queue.then(async()=>{
      if(!await this.rpc(worker,'visible',{pageId:message.pageId}))return {error:'总览已隐藏'};
      this.captures++;
      try{const result=await this.rpc(worker,'capture',{pageId:message.pageId,tabId:tab.id,documentKey:tab.documentKey});const value={...result,tabId:tab.id,updatedAt:Date.now()};this.cache.set(key,value);while(this.cache.size>8)this.cache.delete(this.cache.keys().next().value);return value;}catch{return previous?{...previous,stale:true,error:'预览暂不可用'}:{error:'预览暂不可用'};}
    });
    const done=job.finally(()=>{instance.previewPending=false;});instance.queue=done.catch(()=>{});return done;
  }
}
