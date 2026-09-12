import {createHash} from 'node:crypto';
const digest=url=>createHash('sha256').update(url||'').digest('hex');
export function browserOverview(browser){
  const targets=new WeakMap();
  const api=(operation,value)=>browser.worker.evaluate(({operation,value})=>globalThis.ABW_MANAGEMENT[operation](value),{operation,value});
  return async(operation,args={})=>{
    if(['open','newHuman'].includes(operation))return api(operation);
    if(['visible','show','closeHuman'].includes(operation))return api(operation,operation==='visible'?args.pageId:args.tabId);
    if(operation==='metadata'){
      const data=await api('metadata');
      return {...data,tabs:data.tabs.map(t=>{let origin='';try{const u=new URL(t.url);origin=['http:','https:'].includes(u.protocol)?u.origin:u.protocol==='about:'?'空白页':'内部页面';}catch{}return {id:t.id,windowId:t.windowId,title:String(t.title||'未命名页面').slice(0,180),origin,documentKey:digest(t.url+'|'+t.revision),active:t.active};})};
    }
    if(operation!=='capture')throw new Error('INVALID_OVERVIEW_ACTION');
    if(!await api('visible',args.pageId))throw new Error('OVERVIEW_HIDDEN');
    const before=(await api('metadata')).tabs.find(t=>t.id===args.tabId);if(!before||digest(before.url+'|'+before.revision)!==args.documentKey)throw new Error('PREVIEW_STALE');
    const matches=await browser.worker.evaluate(async id=>(await chrome.debugger.getTargets()).filter(t=>t.tabId===id&&t.type==='page').map(t=>({id:t.id,url:t.url})),args.tabId);
    if(matches.length!==1||/^chrome-extension:/.test(matches[0].url||''))throw new Error('PREVIEW_UNAVAILABLE');
    const target=matches[0];let found;
    for(const page of browser.context.pages()){
      let id=targets.get(page);
      if(!id){const session=await browser.context.newCDPSession(page);try{id=(await session.send('Target.getTargetInfo')).targetInfo.targetId;targets.set(page,id);}finally{await session.detach();}}
      if(id===target.id){if(found)throw new Error('PREVIEW_UNAVAILABLE');found=page;}
    }
    if(!found||digest(found.url())!==digest(before.url))throw new Error('PREVIEW_STALE');
    // Existing Playwright connection only; never detach another debugger or focus/resize.
    const bytes=await found.screenshot({type:'jpeg',quality:40,timeout:1800,caret:'initial',animations:'allow',scale:'css'});
    const after=(await api('metadata')).tabs.find(t=>t.id===args.tabId);
    if(bytes.length>1024*1024||!after||digest(after.url+'|'+after.revision)!==args.documentKey||!await api('visible',args.pageId))throw new Error('PREVIEW_STALE');
    return {image:'data:image/jpeg;base64,'+bytes.toString('base64'),targetId:target.id,documentKey:args.documentKey};
  };
}
