// Same-machine deployment contract. Runtime never reads the build workspace.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

import binding from '../binding.json' with {type:'json'};
export const CANDIDATE_ROOT=binding.root;
export const PROFILE=binding.profile;
export const RUNS=binding.runs;
export const POWERSHELL=binding.powershell;
export const NODE=binding.node;
export const VERSION='0.10.0-alpha.1';
export function runtimeEnvironment(){
 const env={};for(const key of ['SystemRoot','WINDIR','ComSpec','SYSTEMDRIVE','NUMBER_OF_PROCESSORS'])if(process.env[key])env[key]=process.env[key];
 env.PATH=path.join(env.SystemRoot,'System32');env.PATHEXT='.COM;.EXE;.BAT;.CMD';return env;
}
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const reject=code=>{throw Object.assign(new Error(code),{code});};
export async function plainPath(target,{directory=false}={}){
 const absolute=path.resolve(target);
 for(let p=absolute;;p=path.dirname(p)){
  const stat=await fs.lstat(p);
  const windowsSystemFile=p.toLowerCase()===path.resolve(POWERSHELL).toLowerCase();
  if(stat.isSymbolicLink()||(!stat.isDirectory()&&stat.nlink!==1&&!windowsSystemFile)||(await fs.realpath(p)).toLowerCase()!==p.toLowerCase())reject('DEPLOYMENT_REPARSE');
  if(p===absolute&&(directory?!stat.isDirectory():!stat.isFile()))reject('DEPLOYMENT_TYPE');
  if(p===path.dirname(p))break;
 }
}
let verified;
export function verifyDeployment(){return verified??=(async()=>{
 if(root.toLowerCase()!==path.resolve(CANDIDATE_ROOT).toLowerCase())reject('CANDIDATE_ROOT_SCOPE');
 if(PROFILE!==path.join(CANDIDATE_ROOT,'.local','profile')||RUNS!==path.join(CANDIDATE_ROOT,'.local','runs'))reject('BINDING_SCOPE');
 if(process.execPath.toLowerCase()!==path.resolve(NODE).toLowerCase()||process.version!=='v26.2.0'||process.arch!=='x64')reject('NODE_VERSION_UNVERIFIED');
 await plainPath(root,{directory:true});await plainPath(POWERSHELL);await plainPath(NODE);
 const pin=JSON.parse(await fs.readFile(path.join(root,'BINARY-PIN.json'),'utf8'));
 if(pin.version!==VERSION||pin.candidateRoot!==CANDIDATE_ROOT)reject('PACKAGE_PIN_SCOPE');
 for(const [leaf,digest]of Object.entries(pin.binaries)){
  if(!['abw19e-host.exe','pipe-gate.exe'].includes(leaf)||!/^[a-f0-9]{64}$/.test(digest))reject('PACKAGE_PIN_INVALID');
  const exe=path.join(root,'dist',leaf);await plainPath(exe);
  if(createHash('sha256').update(await fs.readFile(exe)).digest('hex')!==digest)reject('BINARY_PIN');
 }
 if(Object.keys(pin.binaries).length!==2)reject('PACKAGE_PIN_INVALID');
 // Windows component servicing gives the signed system powershell.exe two
 // hardlinks. It is the sole file exception; the measured hash remains pinned.
 for(const runtime of [NODE,POWERSHELL])if(createHash('sha256').update(await fs.readFile(runtime)).digest('hex')!==pin.runtimeHashes?.[runtime])reject('RUNTIME_PIN');
 return pin;
})();}
