// Test-only ownership is held in this process. Never clean a user-supplied tree.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
export async function freshSandbox(label='abw-test') {
  const parent=path.resolve(process.env.ABW_TEST_TMP||os.tmpdir());
  const plain=async p=>{const s=await fs.lstat(p);if(s.isSymbolicLink()||(await fs.realpath(p)).toLowerCase()!==path.resolve(p).toLowerCase())throw new Error('TEST_LINK_REFUSED');return s;};
  if(!(await plain(parent)).isDirectory())throw new Error('TEST_PARENT_REQUIRED');
  const root=await fs.mkdtemp(path.join(parent,label+'-'));
  const identity=await plain(root);
  return {root,async cleanup(){
    const now=await plain(root);if(now.ino!==identity.ino||now.dev!==identity.dev)throw new Error('TEST_IDENTITY_CHANGED');
    const files=[],dirs=[];
    async function scan(dir){const s=await plain(dir);for(const name of await fs.readdir(dir)){const p=path.join(dir,name),st=await plain(p);if(st.isDirectory())await scan(p);else if(st.isFile())files.push([p,st]);else throw new Error('TEST_NODE_REFUSED');}dirs.push([dir,s]);}
    await scan(root); // Reject every link before deleting anything.
    for(const [p,s] of files){await plain(path.dirname(p));const n=await plain(p);if(n.ino!==s.ino||n.dev!==s.dev)throw new Error('TEST_IDENTITY_CHANGED');await fs.unlink(p);}
    for(const [p,s] of dirs){const n=await plain(p);if(n.ino!==s.ino||n.dev!==s.dev)throw new Error('TEST_IDENTITY_CHANGED');await fs.rmdir(p);}
  }};
}
