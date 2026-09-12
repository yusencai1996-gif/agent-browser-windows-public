import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {ROOT} from './local-control.mjs';
export function decodeJson(bytes){
  if(bytes.length>1024*1024)throw new Error('INPUT_TOO_LARGE');
  let text;
  try{if(bytes[0]===254&&bytes[1]===255)throw new Error();if(bytes[0]===255&&bytes[1]===254){if(bytes.length%2)throw new Error();text=new TextDecoder('utf-16le',{fatal:true}).decode(bytes.subarray(2));}else text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('INPUT_ENCODING');}
  if(!text.trim())throw new Error('INPUT_EMPTY');
  try{return JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('INVALID_JSON');}
}
export async function readInput(file,stdin=process.stdin,{timeoutMs=5000}={}){
  if(!file)return {};
  if(file!=='-'){
    if(/^[\s]*[\[{]/.test(file))throw new Error('INPUT_FILE_EXPECTED');
    if(file.includes('\0')||/[<>"|?*]/.test(file)||/:(?![\\/])/.test(file)||/^\\\\/.test(file)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(path.basename(file)))throw new Error('INPUT_PATH_INVALID');
    let handle;
    try{handle=await fs.open(path.resolve(file),'r');const stat=await handle.stat();if(!stat.isFile())throw new Error('INPUT_NOT_FILE');if(stat.size>1024*1024)throw new Error('INPUT_TOO_LARGE');return decodeJson(await handle.readFile());}
    catch(e){if(e.code==='ENOENT')throw new Error('INPUT_NOT_FOUND');if(['EACCES','EPERM'].includes(e.code))throw new Error('INPUT_ACCESS_DENIED');if(e.code==='EINVAL')throw new Error('INPUT_PATH_INVALID');if(e.code)throw new Error('INPUT_READ_FAILED');throw e;}finally{await handle?.close();}
  }
  if(stdin.isTTY)throw new Error('INPUT_STDIN_REQUIRED');
  return new Promise((resolve,reject)=>{
    const chunks=[];let size=0;
    const finish=(error,value)=>{clearTimeout(timer);stdin.off('data',data);stdin.off('end',end);stdin.off('error',failed);stdin.pause();error?reject(error):resolve(value);};
    const data=c=>{const b=Buffer.isBuffer(c)?c:Buffer.from(c);size+=b.length;if(size>1024*1024)return finish(new Error('INPUT_TOO_LARGE'));chunks.push(b);};
    const end=()=>{try{finish(null,decodeJson(Buffer.concat(chunks)));}catch(e){finish(e);}};
    const failed=()=>finish(new Error('INPUT_READ_FAILED'));
    const timer=setTimeout(()=>finish(new Error('INPUT_TIMEOUT')),timeoutMs);
    stdin.on('data',data);stdin.once('end',end);stdin.once('error',failed);
    if(stdin.readableEnded)end();else stdin.resume();
  });
}
export async function saveImage(result,requested){
  const image=result.content.find(c=>c.type==='image');
  if(!image)return result.structuredContent;
  const base=path.join(ROOT,'artifacts');
  const output=requested?path.resolve(ROOT,requested):path.join(base,`screenshot-${randomUUID()}.${image.mimeType==='image/png'?'png':'jpg'}`);
  const name=path.basename(output);
  if(/[<>:"|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name)
    || /^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(name))throw new Error('OUTPUT_SCOPE');
  // Only files directly in artifacts; no nested/junction traversal or overwrite.
  if(path.dirname(output).toLowerCase()!==base.toLowerCase())throw new Error('OUTPUT_SCOPE');
  await fs.mkdir(base,{recursive:true});
  const stat=await fs.lstat(base);
  if(stat.isSymbolicLink() || (await fs.realpath(base)).toLowerCase()!==base.toLowerCase())throw new Error('OUTPUT_SCOPE');
  const bytes=Buffer.from(image.data,'base64');
  let file;try{file=await fs.open(output,'wx');await file.writeFile(bytes);}catch(e){throw new Error(e.code==='EEXIST'?'OUTPUT_EXISTS':'OUTPUT_WRITE_FAILED');}finally{await file?.close();}
  return {ok:true,untrusted:true,data:{path:output,mimeType:image.mimeType,bytes:bytes.length}};
}
