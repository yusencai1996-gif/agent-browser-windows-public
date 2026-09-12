import os from 'node:os';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {acquireSharedProfile} from '../src/shared-profile.mjs';
import {payloadPath} from '../scripts/runtime-update-safety.mjs';
test('shared profile is exclusive and reopening preserves existing data/settings',async()=>{
 const local=path.join(process.env.ABW_TEST_TMP||os.tmpdir(),`profile-test-${randomUUID()}`);await fs.mkdir(local,{recursive:true});
 const first=await acquireSharedProfile(local);assert.equal(first.fresh,true);const marker=path.join(first.profile,'synthetic.txt');await fs.writeFile(marker,'keep');
 await assert.rejects(acquireSharedProfile(local),/PROFILE_IN_USE/);await first.release();
 const second=await acquireSharedProfile(local);assert.equal(second.fresh,false);assert.equal(await fs.readFile(marker,'utf8'),'keep');await second.release();
 await fs.unlink(marker);await fs.rmdir(first.profile);await fs.unlink(path.join(local,'profiles/shared.identity.json'));await fs.rmdir(path.join(local,'profiles'));await fs.rmdir(local);
});
test('unknown existing shared directory is never adopted or deleted',async()=>{
 const local=path.join(process.env.ABW_TEST_TMP||os.tmpdir(),`profile-test-${randomUUID()}`);const profile=path.join(local,'profiles/shared');await fs.mkdir(profile,{recursive:true});await fs.writeFile(path.join(profile,'keep'),'unknown');
 await assert.rejects(acquireSharedProfile(local),/UNKNOWN_PROFILE/);assert.equal(await fs.readFile(path.join(profile,'keep'),'utf8'),'unknown');
 await fs.unlink(path.join(profile,'keep'));await fs.rmdir(profile);await fs.rmdir(path.dirname(profile));await fs.rmdir(local);
});
test('upgrade/rollback path guard excludes persistent profiles in all forms',()=>{for(const p of ['profiles/shared/Preferences','src/../.local/profiles/shared/Cookies','PROFILES/shared/x'])assert.throws(()=>payloadPath(path.resolve('synthetic-install'),p),/Scope/);});
