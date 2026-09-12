import path from 'node:path';
export function payloadPath(root,file){
  if(path.isAbsolute(file)||file.includes(':'))throw new Error('Scope violation');
  const base=path.resolve(root),dest=path.resolve(base,file),relative=path.relative(base,dest);
  const first=relative.split(/[\\/]/)[0].toLowerCase();
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative)||['.local','profiles','artifacts','downloads','node_modules'].includes(first))throw new Error('Scope violation');
  return dest;
}
export async function restoreAll(applied,restore,remove,manifest){
  const failures=[];
  for(const entry of [...applied].reverse()){
    try{if(entry.existed)await restore(entry.file);else await remove(entry.file);}
    catch(e){failures.push({file:entry.file,code:e.code||'RESTORE_FAILED'});}
  }
  try{await manifest();}catch(e){failures.push({file:'MANIFEST.json',code:e.code||'RESTORE_FAILED'});}
  return failures;
}
