import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {freshSandbox} from './test-sandbox.mjs';
const source=path.resolve(import.meta.dirname,'..');
const box=await freshSandbox('abw-unit');
let dependencyLink=false;
try {
  // Only repository payload; no local runtime, credentials or artifacts are copied.
  for(const folder of ['src','extension','vendor','test','scripts'])await fs.cp(path.join(source,folder),path.join(box.root,folder),{recursive:true,errorOnExist:true,force:false,filter:async p=>{if((await fs.lstat(p)).isSymbolicLink())throw new Error('TEST_SOURCE_LINK');return true;}});
  await fs.copyFile(path.join(source,'package.json'),path.join(box.root,'package.json'));
  await fs.symlink(path.join(source,'node_modules'),path.join(box.root,'node_modules'),'junction');dependencyLink=true;
  await fs.mkdir(path.join(box.root,'.local'));
  const tests=(await fs.readdir(path.join(box.root,'test'))).filter(n=>n.endsWith('.test.mjs')).sort().map(n=>'test/'+n);
  const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--test','--test-concurrency=1',...tests],{cwd:box.root,env:process.env,stdio:'inherit',windowsHide:true});p.on('error',reject);p.on('exit',resolve);});
  process.exitCode=code??1;
} finally {
  if(dependencyLink)await fs.unlink(path.join(box.root,'node_modules'));
  await box.cleanup();
}
