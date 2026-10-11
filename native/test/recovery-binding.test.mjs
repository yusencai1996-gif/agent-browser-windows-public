// Source-level binding checks only. No processes, Profile or service state are opened.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),read=p=>fs.readFile(path.join(root,p),'utf8');
test('public recovery helpers use the same generated exact binding and source version',async()=>{
 const [owner,recovery,acl,deploy]=await Promise.all(['scripts/start-owner.ps1','scripts/recover-dead-state.ps1','scripts/prepare-state.ps1','scripts/deployment.mjs'].map(read));
 for(const text of [owner,recovery]){assert.match(text,/Get-Content .*binding\.json.*-Encoding UTF8/);assert.match(text,/\$binding\.root/);assert.match(text,/\$binding\.node/);assert.doesNotMatch(text,/[CF]:\\|0\.1\.0-wp19/);assert.equal(['Codex'+'Projects','Codex'+'Deliveries','wp19-c-'+'shared'].some(marker=>text.includes(marker)),false);}
 assert.match(recovery,/\$recoveryProfile=\$binding\.profile/);assert.match(recovery,/\$recoveryPs=\$binding\.powershell/);
 const version=deploy.match(/export const VERSION='([^']+)'/)[1];assert.ok(recovery.includes(`$recoveryVersion='${version}'`));assert.ok(acl.includes(version));
 const ownerLock=owner.match(/Local\\AgentBrowser\.Native\.Start\./)[0];assert.ok(recovery.includes(ownerLock));
});
test('recovery pipe and all protected instance mutex names match the current native sources',async()=>{
 const [recovery,gate,gui]=await Promise.all(['scripts/recover-dead-state.ps1','src/pipe-gate.cpp','src/main.cpp'].map(read));
 assert.match(gate,/pipe\\\\AgentBrowserNative\./);assert.ok(recovery.includes('pipe\\AgentBrowserNative.'));assert.doesNotMatch(recovery,/ABW19PW/);
 for(const name of ['Local\\AgentBrowser.WP19C.CLI','Local\\AgentBrowser.WP19D.CLI','Local\\AgentBrowser.WP19E.CLI']){assert.ok(recovery.includes(name));assert.ok(gui.includes(name.replaceAll('\\','\\\\')));}
});
