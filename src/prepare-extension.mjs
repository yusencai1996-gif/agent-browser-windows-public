// Only the fresh runtime copy is changed. A content-addressed entry URL prevents
// Chromium's persisted service-worker script cache from executing an older build.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
export async function prepareExtension(dir){
 const root=path.resolve(dir),digest=createHash('sha256');
 const placeholder='export const config={port:0,instanceId:"unconfigured"};';
 async function scan(folder){const s=await fs.lstat(folder);if(!s.isDirectory()||s.isSymbolicLink()||(await fs.realpath(folder)).toLowerCase()!==folder.toLowerCase())throw new Error('UNSAFE_EXTENSION');for(const name of (await fs.readdir(folder)).sort()){const file=path.join(folder,name),st=await fs.lstat(file);if(st.isSymbolicLink())throw new Error('UNSAFE_EXTENSION');if(st.isDirectory())await scan(file);else if(st.isFile()&&st.nlink===1){const relative=path.relative(root,file).replaceAll('\\','/');if(/\.(?:js|mjs|html|css)$/.test(name)||relative==='manifest.json'){const bytes=relative==='config.js'?Buffer.from(placeholder):await fs.readFile(file);digest.update(JSON.stringify(relative)+':'+bytes.length+':').update(bytes);}}else throw new Error('UNSAFE_EXTENSION');}}
 await scan(root);const file=path.join(root,'manifest.json'),manifest=JSON.parse(await fs.readFile(file,'utf8'));
 if(manifest.background?.service_worker!=='background.js')throw new Error('UNSAFE_EXTENSION');
 await fs.writeFile(path.join(root,'config.js'),placeholder);
 const entry=`background.${digest.digest('hex').slice(0,24)}.js`;
 await fs.writeFile(path.join(root,entry),await fs.readFile(path.join(root,'background.js')),{flag:'wx'});await fs.unlink(path.join(root,'background.js'));
 manifest.background.service_worker=entry;await fs.writeFile(file,JSON.stringify(manifest,null,2));return manifest;
}
