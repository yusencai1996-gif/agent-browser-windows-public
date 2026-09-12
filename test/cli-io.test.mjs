import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {decodeJson,readInput,saveImage} from '../src/cli-io.mjs';
import {ROOT} from '../src/local-control.mjs';
test('JSON accepts Unicode quotes/newlines in UTF8/BOM and PS UTF16LE',()=>{
  const p={text:'中文 "引号"\n第二行'},s=JSON.stringify(p);
  for(const bytes of [Buffer.from(s),Buffer.from('\uFEFF'+s),Buffer.concat([Buffer.from([255,254]),Buffer.from(s,'utf16le')])])assert.deepEqual(decodeJson(bytes),p);
  assert.throws(()=>decodeJson(Buffer.from('{bad')),/INVALID_JSON/);
});
test('no input flag is empty object without waiting for pipe EOF',async()=>assert.deepEqual(await readInput(null),{}));
test('screenshot scope and no-overwrite are enforced',async()=>{
  const file=path.join(ROOT,'artifacts',`test-${randomUUID()}.png`);
  const r={structuredContent:{ok:true},content:[{type:'image',mimeType:'image/png',data:Buffer.from('synthetic bytes').toString('base64')}]};
  await assert.rejects(saveImage(r,path.join(ROOT,'outside.png')),/OUTPUT_SCOPE/);
  for(const name of ['file.png:stream','NUL.png','con','COM1.jpg','LPT².png','trailing.','trailing '])await assert.rejects(saveImage(r,path.join(ROOT,'artifacts',name)),/OUTPUT_SCOPE/);
  try{await saveImage(r,file);await assert.rejects(saveImage(r,file),/OUTPUT_EXISTS/);assert.equal(await fs.readFile(file,'utf8'),'synthetic bytes');}finally{await fs.unlink(file).catch(()=>{});}
});
