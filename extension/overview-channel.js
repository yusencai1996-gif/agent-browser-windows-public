// A management document is an extension page, never an HTTP/content-script client.
export function trustedOverviewSender(sender,extensionId,url){return sender?.id===extensionId&&sender.url===url&&sender.frameId===0&&Number.isInteger(sender.tab?.id);}
export function installOverviewChannel(send){
  const url=chrome.runtime.getURL('overview.html'),ports=new Set(),pending=new Map(),humanWindows=new Set(),revisions=new Map(),displayEpochs=new Map();let agentWindow;
  const noteShown=id=>{if(Number.isInteger(id)&&id>0)displayEpochs.set(id,(displayEpochs.get(id)||0)+1);};
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
  chrome.tabs.onActivated.addListener(()=>void notify());chrome.windows.onBoundsChanged.addListener(()=>void notify());chrome.windows.onFocusChanged.addListener(id=>{noteShown(id);void notify();});chrome.tabs.onRemoved.addListener(()=>void notify());
  chrome.windows.onRemoved?.addListener(id=>{displayEpochs.delete(id);if(agentWindow===id)agentWindow=undefined;});
  chrome.tabs.onUpdated.addListener((id,info)=>{if(info.url||info.status==='loading')revisions.set(id,(revisions.get(id)||0)+1);});chrome.tabs.onRemoved.addListener(id=>revisions.delete(id));
  let creating;
  const existingOverview=async()=>{const matches=(await chrome.tabs.query({})).filter(t=>t.url===url);if(matches.length>1)throw new Error('OVERVIEW_DUPLICATE');return matches[0];};
  async function popupFor(tab,foreground){
    const current=await chrome.windows.get(tab.windowId);
    if(current.type==='popup')return {tabId:tab.id,windowId:current.id,alreadyOpen:true};
    if(current.type!=='normal')throw new Error('OVERVIEW_WINDOW_UNSAFE');
    // Move only our exact extension page; other tabs in the old normal window stay put.
    const w=await chrome.windows.create({tabId:tab.id,type:'popup',focused:foreground,width:1240,height:850});
    if(!w?.id)throw new Error('OVERVIEW_WINDOW_UNCONFIRMED');
    if(!foreground)await chrome.windows.update(w.id,{state:'minimized'});
    return {tabId:tab.id,windowId:w.id,alreadyOpen:true};
  }
  async function freshBlank(expectedTargetId){
    if(typeof expectedTargetId!=='string'||!expectedTargetId)return null;
    const targets=(await chrome.debugger.getTargets()).filter(t=>t.id===expectedTargetId&&t.type==='page');
    if(targets.length!==1||!Number.isInteger(targets[0].tabId)||targets[0].url!=='about:blank')return null;
    const all=await chrome.windows.getAll({populate:true});
    if(all.length!==1||all[0].type!=='normal'||all[0].tabs?.length!==1)return null;
    const candidate=all[0].tabs[0];
    if(candidate.id!==targets[0].tabId||candidate.url!=='about:blank'||candidate.pendingUrl)return null;
    const current=await chrome.tabs.get(candidate.id);
    return current.windowId===all[0].id&&current.url==='about:blank'&&!current.pendingUrl?current:null;
  }
  async function ensureExists(foreground,{adoptBlankTargetId}={}){
    await ready;
    if(creating)return creating;
    // The same promise covers lookup and creation for ensure/open callers.
    creating=(async()=>{
      const old=await existingOverview();if(old)return popupFor(old,foreground);
      if(adoptBlankTargetId){
        const blank=await freshBlank(adoptBlankTargetId);
        if(blank){
          const w=await chrome.windows.create({tabId:blank.id,type:'popup',focused:foreground,width:1240,height:850});
          if(!w?.id)throw new Error('OVERVIEW_WINDOW_UNCONFIRMED');
          await chrome.tabs.update(blank.id,{url});
          if(!foreground)await chrome.windows.update(w.id,{state:'minimized'});
          return {tabId:blank.id,windowId:w.id,alreadyOpen:false};
        }
      }
      // The old profile may contain user pages. Create a new popup and leave
      // every existing normal window untouched.
      const w=await chrome.windows.create({url,focused:foreground,width:1240,height:850,type:'popup'});
      if(!w?.tabs?.[0]?.id)throw new Error('OVERVIEW_WINDOW_UNCONFIRMED');
      try{if(!foreground)await chrome.windows.update(w.id,{state:'minimized'});return {tabId:w.tabs[0].id,windowId:w.id,alreadyOpen:false};}
      catch(e){await chrome.windows.remove(w.id).catch(()=>{});throw e;}
    })();
    try{return await creating;}finally{creating=null;}
  }
  const api={ready,
    async ensure(args){return ensureExists(false,args);},
    async open(args){const target=await ensureExists(true,args);await chrome.windows.update(target.windowId,{state:'normal',focused:true});await chrome.tabs.update(target.tabId,{active:true});return {tabId:target.tabId,windowId:target.windowId};},
    visible,
    async metadata(){await ready;return {tabs:(await chrome.tabs.query({})).filter(t=>t.url!==url).map(t=>({id:t.id,windowId:t.windowId,title:t.title||'',url:t.url||'',status:t.status,active:t.active,revision:revisions.get(t.id)||0})),humanWindows:[...humanWindows]};},
    async newHuman(){await ready;const w=await chrome.windows.create({url:'about:blank',focused:true,type:'normal'});humanWindows.add(w.id);await chrome.storage.session.set({abwHumanWindows:[...humanWindows]});return {windowId:w.id,tabId:w.tabs[0].id};},
    async show(tabId){const t=await chrome.tabs.get(tabId);if(t.url===url)throw new Error('PROTECTED_PAGE');noteShown(t.windowId);await chrome.windows.update(t.windowId,{state:'normal',focused:true});await chrome.tabs.update(tabId,{active:true});return {shown:true};},
    async closeHuman(tabId){const t=await chrome.tabs.get(tabId);if(!humanWindows.has(t.windowId))throw new Error('HUMAN_WINDOW_NOT_REGISTERED');await chrome.tabs.remove(tabId);return {closed:true};},
    isHumanWindow:id=>humanWindows.has(id),
    noteWindowShown:noteShown,
    async createAgentTab(options){
      await ready;
      if(agentWindow){try{const w=await chrome.windows.get(agentWindow,{populate:true});if(w.type!=='normal'||humanWindows.has(w.id)||w.tabs?.some(t=>t.url===url))agentWindow=null;}catch{agentWindow=null;}}
      // An about:blank window is not proof of Agent ownership. Only a window
      // this API created and recorded may be reused for subsequent Agent tabs.
      if(agentWindow){const before=await chrome.windows.get(agentWindow),backgroundDisplayEpoch=displayEpochs.get(agentWindow)||0;await chrome.storage.session.set({abwAgentWindow:agentWindow});const tab=await chrome.tabs.create({...options,windowId:agentWindow});if(options.active){noteShown(agentWindow);await chrome.windows.update(agentWindow,{state:'normal',focused:true});}return {...tab,backgroundWindowExpected:!options.active&&before.state==='minimized',backgroundDisplayEpoch};}
      const w=await chrome.windows.create({url:options.url,focused:!!options.active,state:options.active?'normal':'minimized',type:'normal'});agentWindow=w.id;await chrome.storage.session.set({abwAgentWindow:agentWindow});if(!options.active){const current=await chrome.windows.get(w.id);if(!current.focused&&!displayEpochs.get(w.id))await chrome.windows.update(w.id,{state:'minimized'});}return {...w.tabs[0],backgroundWindowExpected:!options.active,backgroundDisplayEpoch:0};
    },
    async settleAgentTab(tab){
      if(!tab.backgroundWindowExpected)return;
      const current=await chrome.tabs.get(tab.id);if(current.windowId!==tab.windowId)return;
      const w=await chrome.windows.get(current.windowId,{populate:true});
      if(w.type!=='normal'||humanWindows.has(w.id)||w.tabs?.some(t=>t.url===url))throw new Error('AGENT_WINDOW_UNSAFE');
      if((displayEpochs.get(w.id)||0)!==tab.backgroundDisplayEpoch)return;
      // A newly populated work window can be restored while the page initializes.
      // Recheck after readiness, preserving explicit display or focus history
      // even when the user has subsequently returned to the overview.
      if(!w.focused&&w.state!=='minimized')await chrome.windows.update(w.id,{state:'minimized'});
    },
    receive(m){const p=pending.get(m.requestId);if(!p)return;clearTimeout(p.timer);pending.delete(m.requestId);try{p.port.postMessage({id:p.id,ok:m.ok,data:m.data,error:m.error});}catch{}}
  };
  globalThis.ABW_MANAGEMENT=api;return api;
}
