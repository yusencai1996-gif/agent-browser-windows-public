import {writableInstall,findNpm} from './install-policy.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import net from 'node:net';
import {ROOT,LOCAL,STATE,PIPE,request,secureLocal} from './local-control.mjs';
const require=createRequire(path.join(ROOT,'package.json'));
export async function doctor(){
  const node=Number(process.versions.node.split('.')[0])>=26;
  const writable=await writableInstall(ROOT);
  let dependencies=true,browser=false;
  try{for(const name of ['ws','ajv','@modelcontextprotocol/sdk/client/index.js','playwright']){const resolved=require.resolve(name);if(!resolved.startsWith(path.join(ROOT,'node_modules')+path.sep))throw new Error();}}catch{dependencies=false;}
  if(dependencies){process.env.PLAYWRIGHT_BROWSERS_PATH=path.join(LOCAL,'browsers');try{const {chromium}=await import('playwright');await fs.access(chromium.executablePath());browser=true;}catch{}}
  const online=await request('status').then(()=>true,()=>false);
  return {ready:node&&writable&&dependencies&&browser,checks:{node26:node,writableInstall:writable,dependencies,browser},online,installRoot:ROOT,browserDirectory:path.join(LOCAL,'browsers'),required:!node?'NODE_26_REQUIRED':!writable?'WRITABLE_WINDOWS_INSTALL_REQUIRED':!dependencies?'DEPENDENCIES_MISSING':!browser?'BROWSER_MISSING':null};
}
async function run(args,env){await new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{cwd:ROOT,env,windowsHide:true,stdio:['ignore','pipe','pipe']});p.stdout.on('data',b=>process.stderr.write(b));p.stderr.on('data',b=>process.stderr.write(b));p.on('error',()=>reject(new Error('SETUP_FAILED')));p.on('exit',code=>code===0?resolve():reject(new Error('SETUP_FAILED')));});}
export async function setup({resumable=false}={}){
  let state=await doctor();
  if(state.online){if(state.ready)return {...state,changed:false};throw new Error('STOP_HOST_BEFORE_SETUP');}
  if(!state.checks.node26 || !state.checks.writableInstall)throw new Error(state.required);
  await secureLocal();
  const lock=net.createServer(socket=>socket.end());
  await new Promise((resolve,reject)=>{lock.once('error',()=>reject(new Error('HOST_OR_SETUP_ACTIVE')));lock.listen(PIPE,resolve);});
  try{
  await fs.unlink(STATE).catch(e=>{if(e.code!=='ENOENT')throw e;});
  const receipt=path.join(LOCAL,'setup.json');const digest=createHash('sha256').update(await fs.readFile(path.join(ROOT,'package-lock.json'))).digest('hex');
  let old;try{old=JSON.parse(await fs.readFile(receipt,'utf8'));}catch{}
  const env={...process.env,PLAYWRIGHT_BROWSERS_PATH:path.join(LOCAL,'browsers'),TEMP:path.join(LOCAL,'setup-temp'),TMP:path.join(LOCAL,'setup-temp')};
  await fs.mkdir(env.TEMP,{recursive:true});
  let changed=false;
  if(!state.checks.dependencies || old?.lock!==digest){
    const npm=await findNpm();
    await run([npm,'ci','--ignore-scripts','--no-audit','--no-fund','--cache',path.join(LOCAL,'npm-cache')],env);changed=true;
  }
  // Dynamic import is first attempted only after dependencies exist.
  state=await doctor();
  if(!state.checks.browser){
    if(resumable){const {installResumable}=await import('./browser-download.mjs');await installResumable(ROOT,env);}
    else await run([path.join(ROOT,'node_modules/playwright/cli.js'),'install','--no-shell','chromium'],env);
    changed=true;
  }
  state=await doctor();if(!state.ready)throw new Error(state.required || 'SETUP_FAILED');
  await fs.writeFile(receipt,JSON.stringify({lock:digest}));return {...state,changed};
  }finally{await new Promise(resolve=>lock.close(resolve));}
}
