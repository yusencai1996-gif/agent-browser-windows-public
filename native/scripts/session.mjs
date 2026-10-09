// Private state is read only inside this program, never printed or put in argv/env.
import fs from 'node:fs/promises';import path from 'node:path';import {STATE,request,fail} from './wire.mjs';
import {taskFile} from './alias.mjs';
export async function session(alias,expected){const state=JSON.parse(await fs.readFile(taskFile(STATE,alias),'utf8'));if(expected&&state.claimId!==expected)throw fail('INSTANCE_NOT_OWNED');return state;}
export async function invoke(alias,name,input={},extras={},expected){let state;try{state=await session(alias,expected);}catch(e){throw fail(e.code==='INSTANCE_NOT_OWNED'?e.code:'TASK_NOT_FOUND');}return request({op:'call',cap:state.cap,name,input,...extras});}
export async function management(op,params={},expected){let state;try{state=JSON.parse(await fs.readFile(path.join(STATE,'service.json'),'utf8'));}catch{throw fail('SERVICE_NOT_READY');}if(expected&&state.claimId!==expected)throw fail('INSTANCE_NOT_OWNED');return request({op,cap:state.cap,...params});}
export async function end(alias,expected){const state=await session(alias,expected);return request({op:'end',cap:state.cap});}
