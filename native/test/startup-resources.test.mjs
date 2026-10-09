import test from 'node:test';import assert from 'node:assert/strict';import {startupResources} from '../scripts/startup-resources.mjs';
test('fixture succeeds then proxy fails: close owned fixture, preserve original error, no child spawn',async()=>{
 let closed=0,spawned=0;const original=Object.assign(new Error('synthetic-denied'),{code:'EACCES'});
 await assert.rejects((async()=>{await startupResources(async()=>({origin:'http://127.0.0.1:49189',close:async()=>closed++}),async()=>{throw original});spawned++;})(),error=>error===original&&error.code==='EACCES');
 assert.equal(closed,1);assert.equal(spawned,0);
});
test('cleanup failure does not replace the original startup failure',async()=>{
 const original=Object.assign(new Error('synthetic-denied'),{code:'EACCES'});
 await assert.rejects(startupResources(async()=>({origin:'http://127.0.0.1:49189',close:async()=>{throw Object.assign(new Error('close'),{code:'OWN_CLOSE_FAILED'});}}),async()=>{throw original}),error=>error===original&&error.resourceCleanupCode==='OWN_CLOSE_FAILED');
});
