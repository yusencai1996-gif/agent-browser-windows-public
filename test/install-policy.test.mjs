import {test} from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {writableInstall,findNpm} from '../src/install-policy.mjs';
import {freshSandbox} from '../scripts/test-sandbox.mjs';
test('writable Windows installs allow either drive without changing the environment',async()=>{
 for(const root of ['C:/Tools/abw','E:/工具/abw'])assert.equal(await writableInstall(root,{platform:'win32',access:async()=>{}}),true);
 assert.equal(await writableInstall('C:/protected',{platform:'win32',access:async()=>{throw new Error('denied');}}),false);
 assert.equal(await writableInstall('/tmp/abw',{platform:'linux',access:async()=>{}}),false);
});
test('npm can be found on an absolute PATH entry independently of node',async()=>{
 const base=path.resolve('npm-location');const wanted=path.join(base,'node_modules/npm/bin/npm-cli.js');
 const result=await findNpm({execPath:path.resolve('node-location/node.exe'),env:{PATH:base},access:async p=>{if(p!==wanted)throw new Error();}});assert.equal(result,wanted);
 await assert.rejects(findNpm({execPath:path.resolve('missing/node.exe'),env:{PATH:''},access:async()=>{throw new Error();}}),/NPM_REQUIRED/);
});
test('test cleanup refuses junctions and preserves outside data',async()=>{
 const box=await freshSandbox(),outside=await freshSandbox();const file=path.join(outside.root,'keep');await fs.writeFile(file,'synthetic');
 const link=path.join(box.root,'link');await fs.symlink(outside.root,link,'junction');
 try{await assert.rejects(box.cleanup(),/TEST_LINK_REFUSED/);assert.equal(await fs.readFile(file,'utf8'),'synthetic');}finally{await fs.unlink(link);await box.cleanup();await outside.cleanup();}
});
