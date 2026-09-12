// Only fixed metadata crosses the error channel: no page text or full URLs.
export function safeDetails(value){
 if(!value||typeof value!=='object')return undefined;const out={};
 for(const key of ['tabId','replacementTabId'])if(Number.isSafeInteger(value[key])&&value[key]>0)out[key]=value[key];
 if(typeof value.created==='boolean')out.created=value.created;
 if(['navigation','postcheck','lifecycle'].includes(value.stage))out.stage=value.stage;
 if(['closed','replaced','timeout','failed','restricted','challenge'].includes(value.navigation))out.navigation=value.navigation;
 return Object.keys(out).length?out:undefined;
}
