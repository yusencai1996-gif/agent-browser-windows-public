// Install anywhere writable. No machine-specific drive policy or shell execution.
import fs from 'node:fs/promises';
import path from 'node:path';
export async function writableInstall(root,{platform=process.platform,access=fs.access}={}) {
  if(platform!=='win32')return false;
  try{await access(root,2);return true;}catch{return false;}
}
export async function findNpm({execPath=process.execPath,env=process.env,access=fs.access}={}) {
  const bases=[path.dirname(execPath),...(env.PATH||env.Path||'').split(path.delimiter).filter(Boolean)];
  for(const base of bases){
    if(!path.isAbsolute(base))continue;
    const candidate=path.join(base,'node_modules/npm/bin/npm-cli.js');
    try{await access(candidate);return candidate;}catch{}
  }
  throw new Error('NPM_REQUIRED');
}
