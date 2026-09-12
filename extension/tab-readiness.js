// Readiness is observed, never inferred from tabs.create or from a quiet timeout.
export async function waitForTabReady(tabId,{getTab,probe,commit=async()=>{},restricted=()=>false,hardCap=12000,blank=false}){
 const deadline=Date.now()+hardCap;let last;
 const problem=(code,state)=>Object.assign(new Error(code),{code,details:{tabId,stage:'navigation',navigation:state}});
 const bounded=async operation=>{let timer;try{return await Promise.race([Promise.resolve().then(operation),new Promise((_,reject)=>{timer=setTimeout(()=>reject(problem('NAVIGATION_TIMEOUT','timeout')),Math.max(1,deadline-Date.now()));})]);}finally{clearTimeout(timer);}};
 const current=async()=>{try{return await bounded(getTab);}catch(e){if(e.code==='NAVIGATION_TIMEOUT')throw e;throw problem('NO_TAB','closed');}};
 await bounded(commit);
 while(Date.now()<deadline){
  last=await current();const url=last.url||'';
  if(/^chrome-error:/.test(url))throw problem('NAVIGATION_FAILED','failed');
  if(blank&&url==='about:blank'&&!last.pendingUrl)return {navigation:'blank',contentReadable:false,siteAccess:'unverified'};
  if(url&&!/^about:blank/.test(url)&&!last.pendingUrl){
   if(restricted(url))throw problem('CONTENT_UNAVAILABLE','restricted');
   let ready;
   try{ready=await bounded(()=>probe(Math.max(1,deadline-Date.now())));}catch(e){if(e.code==='NAVIGATION_TIMEOUT')throw e;}
   const after=await current();
   if(ready?.ready&&after.url===url&&!after.pendingUrl){
    if(ready.challenge)throw problem('SITE_REQUIRES_USER','challenge');
    let origin;try{const parsed=new URL(url);if(['http:','https:'].includes(parsed.protocol))origin=parsed.origin;}catch{}
    return {navigation:'ready',contentReadable:true,siteAccess:'unverified',...(origin?{origin}:{})};
   }
  }
  await bounded(()=>new Promise(r=>setTimeout(r,80)));
 }
 throw problem('NAVIGATION_TIMEOUT','timeout');
}
