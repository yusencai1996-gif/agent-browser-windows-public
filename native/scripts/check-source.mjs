// Source-only integrity/privacy gate. No local bindings or browser state are read.
import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..'),manifest=JSON.parse(await fs.readFile(path.join(root,'SOURCE-MANIFEST.json'),'utf8'));
const actual=[];async function walk(dir){for(const entry of await fs.readdir(dir,{withFileTypes:true})){
 const file=path.join(dir,entry.name),stat=await fs.lstat(file);if(stat.isSymbolicLink())throw Error('SOURCE_LINK');
 if(stat.isDirectory()){if(entry.name==='.git'||(dir===root&&['.state','.local','captures','dist','obj'].includes(entry.name)))throw Error('SOURCE_STATE');await walk(file);}else actual.push(path.relative(root,file).replaceAll('\\','/'));
}}
await walk(root);const expected=manifest.files.map(f=>f.path).concat('SOURCE-MANIFEST.json').sort();
if(JSON.stringify(actual.sort())!==JSON.stringify(expected))throw Error('SOURCE_FILESET');
for(const file of manifest.files){
 if(!/^[A-Za-z0-9_.\-/]+$/.test(file.path)||file.path.split('/').includes('..')||/\.(exe|dll|obj|pdb|lib)$/i.test(file.path))throw Error('SOURCE_PAYLOAD');
 const bytes=await fs.readFile(path.join(root,file.path));if(bytes.length!==file.bytes||createHash('sha256').update(bytes).digest('hex')!==file.sha256)throw Error('SOURCE_HASH');
 // Keep this check itself readable without placing full private-path strings in exports.
 const markers=['Codex'+'Projects','Codex'+'Deliveries','Codex'+'Temp','Users/'+'Administrator','Users\\'+'Administrator','wp19-c-'+'shared','-----BE'+'GIN PRIVATE KEY'];
 const text=bytes.toString('utf8');if(markers.some(marker=>text.includes(marker)))throw Error('SOURCE_PRIVATE_DATA');
}
console.log(JSON.stringify({sourceFiles:manifest.files.length,manifest:'matched',privacy:'passed',browserStarted:false}));
