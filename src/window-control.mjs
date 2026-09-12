// Chrome windows belong to this worker/profile only; IDs are instance-scoped.
export function windowController(worker,{headless=false}={}){
  const previous=new Map();
  async function status(){
    if(headless)return {mode:'headless',windows:[]};
    try{return {mode:'headed',windows:await worker.evaluate(async()=>
      (await chrome.windows.getAll({})).map(({id,state,focused,left,top,width,height})=>({id,state,focused,left,top,width,height}))) };}
    catch{throw new Error('WINDOW_CLOSED');}
  }
  async function set(action,windowId){
    if(headless)throw new Error('HEADLESS_NO_WINDOW');
    if(!['show','minimize'].includes(action))throw new Error('INVALID_WINDOW_ACTION');
    const current=await status();
    if(!current.windows.length)throw new Error('WINDOW_CLOSED');
    if(windowId===undefined && current.windows.length!==1)throw new Error('WINDOW_ID_REQUIRED');
    const window=windowId===undefined?current.windows[0]:current.windows.find(w=>w.id===windowId);
    if(!window)throw new Error('WINDOW_NOT_OWNED');
    if(action==='minimize' && window.state!=='minimized')previous.set(window.id,window.state==='maximized'?'maximized':'normal');
    const state=action==='minimize'?'minimized':(previous.get(window.id)||'normal');
    await worker.evaluate(async ({id,state,focused})=>{await chrome.windows.update(id,{state,focused});},{id:window.id,state,focused:action==='show'});
    const result=await status();
    if(result.windows.find(w=>w.id===window.id)?.state!==state)throw new Error('WINDOW_STATE_UNCONFIRMED');
    return result;
  }
  return {status,set};
}
