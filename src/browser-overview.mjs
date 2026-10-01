import {createHash} from 'node:crypto';
const digest=url=>createHash('sha256').update(url||'').digest('hex');
// One preview lease per browser. A transport operation cannot be cancelled by
// Promise.race; retain the lease until it and our own cleanup actually settle.
export function createPreviewRunner({timeoutMs=1800}={}){
  let current;
  return async body=>{
    if(current)throw new Error(current.cleanupUnconfirmed?'PREVIEW_CLEANUP_UNCONFIRMED':'PREVIEW_PENDING');
    const lease={pending:0,sessions:new Map(),active:true,expired:false,cleanupUnconfirmed:false};current=lease;
    const deadline=performance.now()+timeoutMs;
    const release=()=>{if(!lease.active&&!lease.pending&&!lease.sessions.size&&current===lease)current=null;};
    const track=promise=>{
      lease.pending++;const p=Promise.resolve(promise);
      const settled=()=>{lease.pending--;queueMicrotask(release);};p.then(settled,settled);return p;
    };
    const bounded=async(p,cleanup=false)=>{
      let timer;try{const result=await Promise.race([p,new Promise((_,reject)=>{timer=setTimeout(()=>{lease.expired=true;if(cleanup)lease.cleanupUnconfirmed=true;reject(new Error(cleanup?'PREVIEW_CLEANUP_UNCONFIRMED':'PREVIEW_TIMEOUT'));},Math.max(0,deadline-performance.now()));})]);if(performance.now()>deadline){lease.expired=true;if(cleanup)lease.cleanupUnconfirmed=true;throw new Error(cleanup?'PREVIEW_CLEANUP_UNCONFIRMED':'PREVIEW_TIMEOUT');}return result;}
      finally{clearTimeout(timer);}
    };
    const detach=session=>{
      const own=lease.sessions.get(session);if(!own)return Promise.resolve();if(own.detaching)return own.detaching;
      own.detaching=track(Promise.resolve().then(()=>session.detach()));
      own.detaching.then(()=>{lease.sessions.delete(session);if(!lease.sessions.size)lease.cleanupUnconfirmed=false;release();},()=>{lease.cleanupUnconfirmed=true;release();});return own.detaching;
    };
    const budget={
      run:operation=>performance.now()>=deadline||lease.expired?Promise.reject(new Error('PREVIEW_TIMEOUT')):bounded(track(Promise.resolve().then(operation))),
      attach:async factory=>{
        if(performance.now()>=deadline||lease.expired)throw new Error('PREVIEW_TIMEOUT');
        const pending=track(Promise.resolve().then(factory));
        pending.then(session=>{lease.sessions.set(session,{});if(lease.expired||!lease.active)void detach(session).catch(()=>{});},()=>{});
        return bounded(pending);
      },
      detach:session=>bounded(detach(session),true),
    };
    try{return await body(budget);}
    finally{
      lease.active=false;
      // Start cleanup exactly once without an unbounded finally await. A late
      // attach is handled above; pending/failed cleanup blocks new previews.
      for(const session of lease.sessions.keys())void detach(session).catch(()=>{});
      release();
    }
  };
}
export function browserOverview(browser,{previewTimeoutMs=1800}={}){
  const targets=new WeakMap();
  let initialBlankTargetId=browser.initialBlankTargetId;
  const runPreview=createPreviewRunner({timeoutMs:previewTimeoutMs});
  const api=(operation,value)=>browser.worker.evaluate(({operation,value})=>globalThis.ABW_MANAGEMENT[operation](value),{operation,value});
  return async(operation,args={})=>{
    if(['ensure','open'].includes(operation)){const adoptBlankTargetId=initialBlankTargetId;initialBlankTargetId=undefined;return api(operation,{adoptBlankTargetId});}
    if(operation==='newHuman')return api(operation);
    if(['visible','show','closeHuman'].includes(operation))return api(operation,operation==='visible'?args.pageId:args.tabId);
    if(operation==='metadata'){
      const data=await api('metadata');
      return {...data,tabs:data.tabs.map(t=>{let origin='';try{const u=new URL(t.url);origin=['http:','https:'].includes(u.protocol)?u.origin:u.protocol==='about:'?'空白页':'内部页面';}catch{}return {id:t.id,windowId:t.windowId,title:String(t.title||'未命名页面').slice(0,180),origin,status:t.status||'unknown',documentKey:digest(t.url+'|'+t.revision),active:t.active};})};
    }
    if(operation!=='capture')throw new Error('INVALID_OVERVIEW_ACTION');
    return runPreview(async budget=>{
    if(!await budget.run(()=>api('visible',args.pageId)))throw new Error('OVERVIEW_HIDDEN');
    const before=(await budget.run(()=>api('metadata'))).tabs.find(t=>t.id===args.tabId);if(!before||digest(before.url+'|'+before.revision)!==args.documentKey)throw new Error('PREVIEW_STALE');
    const matches=await budget.run(()=>browser.worker.evaluate(async id=>(await chrome.debugger.getTargets()).filter(t=>t.tabId===id&&t.type==='page').map(t=>({id:t.id,url:t.url})),args.tabId));
    if(matches.length!==1||/^chrome-extension:/.test(matches[0].url||''))throw new Error('PREVIEW_UNAVAILABLE');
    const target=matches[0];let found;
    for(const page of browser.context.pages()){
      let id=targets.get(page);
      if(!id){const session=await budget.attach(()=>browser.context.newCDPSession(page));try{id=(await budget.run(()=>session.send('Target.getTargetInfo'))).targetInfo.targetId;targets.set(page,id);}finally{await budget.detach(session);}}
      if(id===target.id){if(found)throw new Error('PREVIEW_UNAVAILABLE');found=page;}
    }
    if(!found||digest(found.url())!==digest(before.url))throw new Error('PREVIEW_STALE');
    // Capture the exact target through the existing connection. Page.screenshot
    // can adjust a headed viewport and restore a minimized work window.
    const session=await budget.attach(()=>browser.context.newCDPSession(found));let result;
    try{result=await budget.run(()=>session.send('Page.captureScreenshot',{format:'jpeg',quality:40,fromSurface:true,captureBeyondViewport:false}));}
    finally{await budget.detach(session);}
    const bytes=Buffer.from(result.data,'base64');
    const after=(await budget.run(()=>api('metadata'))).tabs.find(t=>t.id===args.tabId);
    if(bytes.length>1024*1024||!after||digest(after.url+'|'+after.revision)!==args.documentKey||!await budget.run(()=>api('visible',args.pageId)))throw new Error('PREVIEW_STALE');
    return {image:'data:image/jpeg;base64,'+bytes.toString('base64'),targetId:target.id,documentKey:args.documentKey};
    });
  };
}
