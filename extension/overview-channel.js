// A management document is an extension page, never an HTTP/content-script client.
export function trustedOverviewSender(sender,extensionId,url){return sender?.id===extensionId&&sender.url===url&&sender.frameId===0&&Number.isInteger(sender.tab?.id);}
export function installOverviewChannel(send){
  const url=chrome.runtime.getURL('overview.html'),ports=new Set(),pending=new Map(),humanWindows=new Set(),revisions=new Map();let agentWindow;
  const ready=chrome.storage.session.get(['abwHumanWindows','abwAgentWindow']).then(saved=>{for(const id of saved.abwHumanWindows||[])if(Number.isInteger(id))humanWindows.add(id);if(Number.isInteger(saved.abwAgentWindow))agentWindow=saved.abwAgentWindow;});
  async function visible(tabId){try{const t=await chrome.tabs.get(tabId),w=await chrome.windows.get(t.windowId);return t.url===url&&t.active&&w.focused&&w.state!=='minimized'&&[...ports].some(p=>p.sender.tab.id===tabId);}catch{return false;}}
  async function notify(){for(const port of ports){try{port.postMessage({event:'visibility',visible:await visible(port.sender.tab.id)});}catch{}}}
  chrome.runtime.onConnect.addListener(port=>{
    if(port.name!=='abw-overview'||!trustedOverviewSender(port.sender,chrome.runtime.id,url)){port.disconnect();return;}
    ports.add(port);void notify();
    port.onDisconnect.addListener(()=>{ports.delete(port);for(const [id,p] of pending)if(p.port===port){clearTimeout(p.timer);pending.delete(id);}});
    port.onMessage.addListener(async msg=>{
      if(!Number.isSafeInteger(msg.id)||!['snapshot','preview','takeover','return','new-human','show','close-human'].includes(msg.action))return;
      if(!await visible(port.sender.tab.id)){port.postMessage({id:msg.id,ok:false,error:'OVERVIEW_HIDDEN'});return;}
      if(pending.size>=8){port.postMessage({id:msg.id,ok:false,error:'MANAGEMENT_BUSY'});return;}
      const id=crypto.randomUUID(),timer=setTimeout(()=>{pending.delete(id);try{port.postMessage({id:msg.id,ok:false,error:'MANAGEMENT_TIMEOUT'});}catch{}},40000);
      pending.set(id,{port,id:msg.id,timer});
      void send({type:'management',requestId:id,pageId:port.sender.tab.id,action:msg.action,task:msg.task,tabId:msg.tabId});
    });
  });
  chrome.tabs.onActivated.addListener(()=>void notify());chrome.windows.onBoundsChanged.addListener(()=>void notify());chrome.windows.onFocusChanged.addListener(()=>void notify());chrome.tabs.onRemoved.addListener(()=>void notify());
  chrome.tabs.onUpdated.addListener((id,info)=>{if(info.url||info.status==='loading')revisions.set(id,(revisions.get(id)||0)+1);});chrome.tabs.onRemoved.addListener(id=>revisions.delete(id));
  const api={ready,
    async open(){const old=(await chrome.tabs.query({})).find(t=>t.url===url);if(old){await chrome.windows.update(old.windowId,{state:'normal',focused:true});await chrome.tabs.update(old.id,{active:true});return {tabId:old.id,windowId:old.windowId};}const w=await chrome.windows.create({url,focused:true,width:1240,height:850,type:'normal'});return {tabId:w.tabs[0].id,windowId:w.id};},
    visible,
    async metadata(){await ready;return {tabs:(await chrome.tabs.query({})).filter(t=>t.url!==url).map(t=>({id:t.id,windowId:t.windowId,title:t.title||'',url:t.url||'',status:t.status,active:t.active,revision:revisions.get(t.id)||0})),humanWindows:[...humanWindows]};},
    async newHuman(){await ready;const w=await chrome.windows.create({url:'about:blank',focused:true,type:'normal'});humanWindows.add(w.id);await chrome.storage.session.set({abwHumanWindows:[...humanWindows]});return {windowId:w.id,tabId:w.tabs[0].id};},
    async show(tabId){const t=await chrome.tabs.get(tabId);if(t.url===url)throw new Error('PROTECTED_PAGE');await chrome.windows.update(t.windowId,{state:'normal',focused:true});await chrome.tabs.update(tabId,{active:true});return {shown:true};},
    async closeHuman(tabId){const t=await chrome.tabs.get(tabId);if(!humanWindows.has(t.windowId))throw new Error('HUMAN_WINDOW_NOT_REGISTERED');await chrome.tabs.remove(tabId);return {closed:true};},
    isHumanWindow:id=>humanWindows.has(id),
    async createAgentTab(options){
      await ready;
      if(agentWindow){try{const w=await chrome.windows.get(agentWindow);if(humanWindows.has(w.id))agentWindow=null;}catch{agentWindow=null;}}
      if(!agentWindow){const all=await chrome.windows.getAll({populate:true});const w=all.find(w=>w.type==='normal'&&!humanWindows.has(w.id)&&w.tabs.length===1&&w.tabs[0].url==='about:blank');if(w)agentWindow=w.id;}
      if(agentWindow){await chrome.storage.session.set({abwAgentWindow:agentWindow});return chrome.tabs.create({...options,windowId:agentWindow});}
      const w=await chrome.windows.create({url:options.url,focused:!!options.active,state:options.active?'normal':'minimized',type:'normal'});agentWindow=w.id;await chrome.storage.session.set({abwAgentWindow:agentWindow});return w.tabs[0];
    },
    receive(m){const p=pending.get(m.requestId);if(!p)return;clearTimeout(p.timer);pending.delete(m.requestId);try{p.port.postMessage({id:p.id,ok:m.ok,data:m.data,error:m.error});}catch{}}
  };
  globalThis.ABW_MANAGEMENT=api;return api;
}
