import os from 'node:os';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {createOwnedWorkspace} from '../src/owned-workspace.mjs';
async function fixture(){const root=path.join(process.env.ABW_TEST_TMP||os.tmpdir(),`owned-${randomUUID()}`);await fs.mkdir(root,{recursive:true});return {root,finish:async()=>{for(const name of ['sessions','downloads'])await fs.rmdir(path.join(root,name));await fs.rmdir(root);}};}
test('current workspace cleans only after its browser close and retains downloaded artifact',async()=>{
  const f=await fixture(),w=await createOwnedWorkspace(f.root);let failClose=true;
  const resource=await w.launch(async()=>({close:async()=>{if(failClose)throw new Error('close failed');}}));
  await fs.writeFile(path.join(w.runtime,'owner.json'),JSON.stringify({path:'synthetic-unrelated'}));
  const artifact=path.join(w.downloads,'retained.txt');await fs.writeFile(artifact,'user artifact');
  await assert.rejects(w.cleanup(),/STILL_ACTIVE/);await assert.rejects(resource.close());await assert.rejects(w.cleanup(),/STILL_ACTIVE/);
  failClose=false;await resource.close();await w.cleanup();await assert.rejects(fs.access(w.root));assert.equal(await fs.readFile(artifact,'utf8'),'user artifact');await fs.unlink(artifact);await fs.rmdir(w.downloads);await f.finish();
});
test('replaced download root identity is refused before deleting the session',async()=>{
  const f=await fixture(),w=await createOwnedWorkspace(f.root),moved=w.downloads+'-moved';
  await fs.rename(w.downloads,moved);await fs.mkdir(w.downloads);
  await assert.rejects(w.cleanup(),/IDENTITY_CHANGED/);await fs.access(w.profile);
  await fs.rmdir(w.downloads);await fs.rename(moved,w.downloads);await w.cleanup();await f.finish();
});
test('junction child rejects cleanup without touching external file',async()=>{
  const f=await fixture(),w=await createOwnedWorkspace(f.root),outside=path.join(f.root,'outside');await fs.mkdir(outside);await fs.writeFile(path.join(outside,'keep.txt'),'keep');
  const link=path.join(w.runtime,'link');await fs.symlink(outside,link,'junction');
  await assert.rejects(w.cleanup(),/UNSAFE_WORKSPACE/);assert.equal(await fs.readFile(path.join(outside,'keep.txt'),'utf8'),'keep');
  await fs.unlink(link);await w.cleanup();await fs.unlink(path.join(outside,'keep.txt'));await fs.rmdir(outside);await f.finish();
});
test('replaced root identity is refused, not deleted by a disk owner record',async()=>{
  const f=await fixture(),w=await createOwnedWorkspace(f.root),moved=w.root+'-moved';
  await fs.rename(w.root,moved);await fs.mkdir(w.root);
  await assert.rejects(w.cleanup(),/IDENTITY_CHANGED/);await fs.rmdir(w.root);await fs.rename(moved,w.root);await w.cleanup();await f.finish();
});
