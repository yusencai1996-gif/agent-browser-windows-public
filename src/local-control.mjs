// Same-Windows-user local control. Never print the protected capability file.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const ROOT=path.resolve(import.meta.dirname,'..');
export const LOCAL=path.join(ROOT,'.local');
export const STATE=path.join(LOCAL,'host.json');
export const PIPE='\\\\.\\pipe\\abw-'+createHash('sha256').update(ROOT.toLowerCase()+os.userInfo().username).digest('hex').slice(0,24);
export async function secureLocal() {
  if(process.platform!=='win32')throw new Error('WINDOWS_REQUIRED');
  await fs.mkdir(LOCAL,{recursive:true});
  if((await fs.lstat(LOCAL)).isSymbolicLink() || (await fs.realpath(LOCAL)).toLowerCase()!==LOCAL.toLowerCase())throw new Error('UNSAFE_WORKSPACE');
  execFileSync('icacls',[LOCAL,'/inheritance:r','/grant:r',`${process.env.USERDOMAIN}\\${os.userInfo().username}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'],{stdio:'ignore',windowsHide:true});
}
export async function request(action,args={}) {
  let state;try{state=JSON.parse(await fs.readFile(STATE,'utf8'));}catch{throw new Error('HOST_OFFLINE');}
  return new Promise((resolve,reject)=>{
    const req=http.request({socketPath:PIPE,path:'/',method:'POST',headers:{authorization:`Bearer ${state.token}`,'content-type':'application/json'}},res=>{
      let data='';res.on('data',c=>data+=c);res.on('end',()=>{
        try{const result=JSON.parse(data);result.ok?resolve(result.data):reject(new Error(result.error));}catch{reject(new Error('HOST_PROTOCOL'));}
      });
    });
    req.setTimeout(45000,()=>req.destroy(new Error('HOST_TIMEOUT')));
    req.on('error',e=>reject(new Error(e.message==='HOST_TIMEOUT'?'HOST_TIMEOUT':'HOST_OFFLINE')));req.end(JSON.stringify({action,...args}));
  });
}
