import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ensureHost} from '../src/host-startup.mjs';
const id='11111111-1111-4111-8111-111111111111';

test('own bounded launch re-reads after stale AUTH and releases only authenticated matching host',async()=>{
 let probes=0,launched=0,released=0;
 const result=await ensureHost({startupId:id,timeoutMs:1000,probe:async()=>{switch(++probes){case 1:throw new Error('HOST_OFFLINE');case 2:throw new Error('HOST_STARTING');case 3:throw new Error('AUTH');default:return {startupId:id,pid:123,bootstrapReady:true,hostReady:released===1};}},launch:async expected=>{assert.equal(expected,id);launched++;return 123;},release:async expected=>{assert.equal(expected,id);released++;}});
 assert.equal(result,true);assert.equal(launched,1);assert.equal(released,1);assert.ok(probes>=5);
});

test('existing host AUTH is never retried and another startup is never released',async()=>{
 let launches=0,releases=0;
 await assert.rejects(ensureHost({startupId:id,probe:async()=>{throw new Error('AUTH');},launch:async()=>launches++}),/AUTH/);assert.equal(launches,0);
 let probes=0;await assert.rejects(ensureHost({startupId:id,probe:async()=>{if(++probes===1)return {bootstrapReady:true};throw new Error('AUTH');},release:async()=>releases++,launch:async()=>launches++}),/AUTH/);assert.equal(releases,0);
});

test('missing or competing startup identity and PID refuse release',async()=>{
 for(const state of [{pid:123},{startupId:'22222222-2222-4222-8222-222222222222',pid:123},{startupId:id,pid:999}]){
  let probes=0,releases=0;await assert.rejects(ensureHost({startupId:id,probe:async()=>{if(!probes++)throw new Error('HOST_OFFLINE');return {...state,bootstrapReady:true};},launch:async()=>123,release:async()=>releases++}),/HOST_START_PROTOCOL/);assert.equal(releases,0);
 }
});

test('AUTH after release and endless stale AUTH remain failures',async()=>{
 let probes=0,releases=0;await assert.rejects(ensureHost({startupId:id,timeoutMs:1000,probe:async()=>{if(!probes++)throw new Error('HOST_OFFLINE');if(releases)throw new Error('AUTH');return {startupId:id,pid:123,bootstrapReady:true};},launch:async()=>123,release:async()=>releases++}),/AUTH/);assert.equal(releases,1);
 probes=0;await assert.rejects(ensureHost({startupId:id,timeoutMs:15,probe:async()=>{if(!probes++)throw new Error('HOST_OFFLINE');throw new Error('AUTH');},launch:async()=>123}),/HOST_START_TIMEOUT/);
});
