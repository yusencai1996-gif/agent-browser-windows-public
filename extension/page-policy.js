// URL parsing removes ASCII whitespace/control characters before comparing schemes.
export function protectedPageUrl(value){
  if(typeof value!=='string')return false;
  try{const url=new URL(value);return ['chrome:','chrome-extension:','devtools:','javascript:','view-source:'].includes(url.protocol)||url.origin.startsWith('chrome-extension:');}catch{return false;}
}
