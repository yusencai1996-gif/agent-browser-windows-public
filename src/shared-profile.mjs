// Opening is exclusive; persistent data is NEVER owned by temporary cleanup.
import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import {createHash} from 'node:crypto';
async function directory(dir){const s=await fs.lstat(dir,{bigint:true});if(!s.isDirectory()||s.isSymbolicLink()||(await fs.realpath(dir)).toLowerCase()!==path.resolve(dir).toLowerCase())throw new Error('UNSAFE_PROFILE');return s;}
export async function acquireSharedProfile(local){
  local=path.resolve(local);
  await directory(local);const parent=path.join(local,'profiles');await fs.mkdir(parent,{recursive:true});await directory(parent);
  const profile=path.join(parent,'shared'),record=path.join(parent,'shared.identity.json');
  const pipe='\\\\.\\pipe\\abw-profile-'+createHash('sha256').update(profile.toLowerCase()).digest('hex').slice(0,24);
  const lock=net.createServer(socket=>socket.end());
  await new Promise((resolve,reject)=>{lock.once('error',()=>reject(new Error('PROFILE_IN_USE')));lock.listen(pipe,resolve);});
  try{
    let fresh=false;
    try{await fs.mkdir(profile);fresh=true;}catch(e){if(e.code!=='EEXIST')throw e;}
    const identity=await directory(profile);
    if(fresh){await fs.writeFile(record,JSON.stringify({schema:1,kind:'abw-shared-profile',dev:String(identity.dev),ino:String(identity.ino)}),{flag:'wx'});}
    else{
      let saved;try{const st=await fs.lstat(record);if(st.isSymbolicLink())throw new Error();saved=JSON.parse(await fs.readFile(record,'utf8'));}catch{throw new Error('UNKNOWN_PROFILE');}
      if(saved.kind!=='abw-shared-profile'||saved.dev!==String(identity.dev)||saved.ino!==String(identity.ino))throw new Error('UNKNOWN_PROFILE');
    }
    return {profile,fresh,release:()=>new Promise(resolve=>lock.close(resolve))};
  }catch(e){await new Promise(r=>lock.close(r));throw e;}
}
