import fs from 'node:fs/promises';import path from 'node:path';import {fail} from './wire.mjs';
export function aliasKey(alias){if(typeof alias!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(alias))throw fail('INVALID_TASK');return alias.toLowerCase();}
export function taskFile(state,alias){return path.join(state,`task-${aliasKey(alias)}.json`);}
export async function claimAlias(aliases,state,alias,value,fsOps=fs){const key=aliasKey(alias);if(aliases.has(key))throw fail('TASK_ALIAS_EXISTS');const file=taskFile(state,key);try{await fsOps.writeFile(file,JSON.stringify(value),{flag:'wx'});}catch(e){if(e.code==='EEXIST')throw fail('TASK_STATE_EXISTS');throw e;}aliases.add(key);return {key,file};}
