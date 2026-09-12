// Ownership exists only in this process, never reconstructed from a disk manifest.
import fs from 'node:fs/promises';
import path from 'node:path';
import {retryOwnedFile} from './lifecycle.mjs';
const owned=new WeakSet();
async function plainDir(dir){
  const st=await fs.lstat(dir);
  if(!st.isDirectory() || st.isSymbolicLink() || (await fs.realpath(dir)).toLowerCase()!==path.resolve(dir).toLowerCase())throw new Error('UNSAFE_WORKSPACE');
  return st;
}
export async function createOwnedWorkspace(local){
  await plainDir(local);
  const parent=path.join(local,'sessions');await fs.mkdir(parent,{recursive:true});await plainDir(parent);
  const root=await fs.mkdtemp(path.join(parent,'session-'));
  const identity=await plainDir(root);
  const downloadRoot=path.join(local,'downloads');await fs.mkdir(downloadRoot,{recursive:true});await plainDir(downloadRoot);
  const downloads=await fs.mkdtemp(path.join(downloadRoot,'download-'));
  const downloadIdentity=await plainDir(downloads);
  const value=Object.freeze({root,profile:path.join(root,'profile'),runtime:path.join(root,'runtime'),temp:path.join(root,'temp'),downloads});
  for(const dir of [value.profile,value.runtime,value.temp])await fs.mkdir(dir);
  owned.add(value);
  let launched=false,closed=false;
  return Object.freeze({...value,
    async launch(factory){
      if(launched || closed)throw new Error('WORKSPACE_ALREADY_USED');
      launched=true;
      try{
        const resource=await factory(value);
        return {...resource,close:async()=>{await resource.close();closed=true;}};
      }catch(e){
        // Factory guarantees any started browser has been closed before rejecting.
        closed=!e.browserMayBeActive;throw e;
      }
    },
    async cleanup(){
      if(!owned.has(value) || (launched && !closed))throw new Error('WORKSPACE_STILL_ACTIVE');
      const current=await plainDir(root);
      if(current.ino!==identity.ino || current.dev!==identity.dev)throw new Error('WORKSPACE_IDENTITY_CHANGED');
      const currentDownload=await plainDir(downloads);
      if(currentDownload.ino!==downloadIdentity.ino || currentDownload.dev!==downloadIdentity.dev)throw new Error('WORKSPACE_IDENTITY_CHANGED');
      // Never use rm(recursive). Reject reparse nodes before deleting any child.
      const files=[],dirs=[];
      async function inspect(dir){
        let directory;try{directory=await plainDir(dir);}catch(e){if(dir!==root&&e.code==='ENOENT')return;throw e;}
        for(const entry of await fs.readdir(dir,{withFileTypes:true})){
          const target=path.join(dir,entry.name);let st;
          try{st=await fs.lstat(target);}catch(e){if(e.code==='ENOENT')continue;throw e;}
          if(st.isSymbolicLink())throw new Error('UNSAFE_WORKSPACE');
          if(st.isDirectory())await inspect(target);else if(st.isFile())files.push({target,ino:st.ino,dev:st.dev});else throw new Error('UNSAFE_WORKSPACE');
        }
        dirs.push({dir,ino:directory.ino,dev:directory.dev});
      }
      await inspect(root);
      for(const f of files)await retryOwnedFile(async()=>{let st;try{await plainDir(path.dirname(f.target));st=await fs.lstat(f.target);}catch(e){if(e.code==='ENOENT')return;throw e;}if(st.isSymbolicLink()||st.ino!==f.ino||st.dev!==f.dev)throw new Error('WORKSPACE_IDENTITY_CHANGED');await fs.unlink(f.target).catch(e=>{if(e.code!=='ENOENT')throw e;});});
      for(const d of dirs)await retryOwnedFile(async()=>{let st;try{st=await plainDir(d.dir);}catch(e){if(d.dir!==root&&e.code==='ENOENT')return;throw e;}if(st.ino!==d.ino||st.dev!==d.dev)throw new Error('WORKSPACE_IDENTITY_CHANGED');await fs.rmdir(d.dir).catch(e=>{if(d.dir===root||e.code!=='ENOENT')throw e;});});
      // Keep downloaded user artifacts; remove this new directory only if empty.
      await plainDir(downloads);await fs.rmdir(downloads).catch(e=>{if(e.code!=='ENOTEMPTY')throw e;});
      owned.delete(value);
    },
  });
}
