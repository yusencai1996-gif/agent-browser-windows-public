// First compatibility target only: an exact official OpenCLI release, not an
// arbitrary extension permission manager. No profile or authentication data here.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {ROOT,LOCAL,secureLocal} from './local-control.mjs';
const record=path.join(LOCAL,'opencli-extension.json');
export async function inspectOpencliExtension(input){
 if(typeof input!=='string'||!path.isAbsolute(input)||input.includes(','))throw new Error('OPENCLI_EXTENSION_PATH');
 const dir=path.resolve(input);
 const plain=async p=>{const s=await fs.lstat(p);if(s.isSymbolicLink()||(await fs.realpath(p)).toLowerCase()!==path.resolve(p).toLowerCase())throw new Error('OPENCLI_EXTENSION_LINK');return s;};
 const pin=JSON.parse(await fs.readFile(path.join(ROOT,'vendor/opencli-bridge/PROVENANCE.json'),'utf8'));
 try{
  if(!(await plain(dir)).isDirectory())throw new Error('OPENCLI_EXTENSION_PATH');
  const actual=[];async function scan(d){for(const e of await fs.readdir(d,{withFileTypes:true})){const p=path.join(d,e.name),s=await plain(p);if(s.isDirectory())await scan(p);else if(s.isFile())actual.push(path.relative(dir,p).replaceAll('\\','/'));else throw new Error('OPENCLI_EXTENSION_INVALID');}}
  await scan(dir);if(actual.length!==pin.files.length)throw new Error('OPENCLI_EXTENSION_MISMATCH');
  for(const item of pin.files){if(!actual.includes(item.file)||createHash('sha256').update(await fs.readFile(path.join(dir,item.file))).digest('hex')!==item.sha256)throw new Error('OPENCLI_EXTENSION_MISMATCH');}
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'manifest.json'),'utf8'));
  if(manifest.name!=='OpenCLI'||manifest.version!==pin.version)throw new Error('OPENCLI_EXTENSION_MISMATCH');
  return {path:dir,version:manifest.version,worker:manifest.background.service_worker,sourceCommit:pin.sourceCommit};
 }catch(e){throw new Error(/^OPENCLI_/.test(e.message)?e.message:'OPENCLI_EXTENSION_INVALID');}
}
export async function configuredOpencli(){
 let s;try{s=await fs.lstat(record);}catch(e){if(e.code==='ENOENT')return null;throw new Error('OPENCLI_CONFIG_INVALID');}
 try{if(!s.isFile()||s.isSymbolicLink())throw new Error('OPENCLI_CONFIG_INVALID');const value=JSON.parse(await fs.readFile(record,'utf8'));return (await inspectOpencliExtension(value.path)).path;}catch(e){throw new Error(/^OPENCLI_/.test(e.message)?e.message:'OPENCLI_CONFIG_INVALID');}
}
export async function configureOpencli(input){const info=await inspectOpencliExtension(input);await secureLocal();try{if((await fs.lstat(record)).isSymbolicLink())throw new Error('OPENCLI_CONFIG_INVALID');}catch(e){if(e.code!=='ENOENT')throw e;}await fs.writeFile(record,JSON.stringify({path:info.path}));return info;}
