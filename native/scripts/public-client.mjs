// Public CLI discovery and actionable diagnostics around the fixed WP19 engine.
// No state/profile reads, scope changes, input inspection, or legacy compatibility.
import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {TOOLS} from './tools.mjs';
import {DEFAULT_ORIGINS} from './scope.mjs';
import {result,MAX_OUTPUT} from './wire.mjs';
import {stdoutUntil,outputFailedExit} from './output.mjs';

import {NODE,VERSION,runtimeEnvironment} from './deployment.mjs';
const ENGINE=path.join(import.meta.dirname,'cli.mjs');
const migrationDocument=path.resolve(import.meta.dirname,'../README.md');
const commands=['help','tools','schema','version','status','start','task','call','end','stop','mcp'];
const registration='abw task MY_TASK --agent-name MY_AGENT --display-name PURPOSE';
const inputExamples={
 powershell:'$payload = @{action="new"; url="https://sou.zhaopin.com/"} | ConvertTo-Json -Compress; $payload | & ".\\abw.cmd" call tabs --task MY_TASK --input -',
 gitBash:'cat input.json | ./abw.cmd call tabs --task MY_TASK --input -',
 encoding:'PowerShell先将Console.OutputEncoding和$OutputEncoding设为UTF8；仅JSON字节进入stdin并关闭EOF。',
};

export function discovery(argv){
 const [command,subject,extra]=argv;
 const help=command==='help'||(command==='--help'&&argv.length===1)||
  (commands.includes(command)&&subject==='--help'&&argv.length===2)||
  (command==='call'&&TOOLS.some(t=>t.name===subject)&&extra==='--help'&&argv.length===3);
 if(help)return result(true,{version:VERSION,commands,migrationDocument,usage:{
  help:'abw help | abw --help | abw task --help',
  tools:'abw tools',schema:'abw schema TOOL | abw tools schema TOOL | abw tools/schema TOOL',
  version:'abw version',status:'abw status',start:'abw start --claim-id PUBLIC_UUID',
  task:registration,call:'abw call TOOL --task MY_TASK --input -',
  end:'abw end MY_TASK',stop:'abw stop --expect-instance OWN_VERIFIED_CLAIM',
  mcp:'abw.cmd mcp --task MY_TASK',
 },limits:{tasks:2,pagesPerTask:4,taskIdMax:40,optionalTopNavigationOriginsMax:8,inputBytesMax:60000,inputDeadlineMs:5000},
 origins:{defaultMode:"public-https",navigationOrigins:null,optionalExplicitMax:8,publicStaticResources:true,immutable:true,explicitHttps:true,wildcards:false},
 stdin:inputExamples,ownership:'已有shared服务不能认领停止。只结束自己的任务；stop还须核验实际路径、父子、born/claim且无人类/pending/其它任务。',
 migration:'新版11工具，文件输入改为stdin；旧14/OpenCLI/diagnostics/scope修改命令未兼容。查当前工具schema，不反复盲试。',
 });
 if(command==='tools'&&argv.length===1)return result(true,{version:VERSION,tools:TOOLS});
 const requested=(command==='schema'||command==='tools/schema')&&argv.length===2?subject:
  command==='tools'&&subject==='schema'&&argv.length===3?extra:null;
 if(requested!==null){const tool=TOOLS.find(t=>t.name===requested);return tool?result(true,{version:VERSION,tool}):
  {...result(false,null,'UNKNOWN_TOOL'),error:{code:'UNKNOWN_TOOL',advice:{action:'使用abw tools查看当前11工具，再用abw schema TOOL。',tools:TOOLS.map(t=>t.name)}}};}
 return null;
}

export function withAdvice(reply,argv){
 if(!reply||typeof reply!=='object'||typeof reply.ok!=='boolean')return reply;
 const code=reply.error?.code;
 if(code==='ORIGIN_OUT_OF_SCOPE')reply.error.advice={
  action:'此任务主动设置了顶层导航业务范围，目标不在集合。可只重建本人任务并省略--allow-origin使用默认正常公网HTTPS，或更正显式业务范围；公共静态资源不需列CDN名单。不要重启shared或结束他人任务。',
  registrationExample:registration,limits:'可选显式顶层导航最多8个HTTPS origin；默认公网HTTPS不需逐域声明，注册后的模式不热改。',
  privacy:'提示不回显页面URL、query或请求内容。示例域不是自动授权。',
  helpCommand:'abw help',migrationDocument,
 };
 if(code==='INPUT_STDIN_ONLY')reply.error.advice={action:'--input只接受-。将JSON管道传入stdin并关闭EOF；文件内容可由调用者管道传入，不能将文件路径作为--input值。',examples:inputExamples,helpCommand:'abw help',migrationDocument};
 if(code==='UNSUPPORTED'||code==='INVALID_ARGUMENTS')reply.error.advice={action:'使用abw help和abw tools；当前新版不兼容旧14/OpenCLI/diagnostics/scope修改命令。'};
 return reply;
}

// Injectable transport is for deterministic offline tests, never selected by CLI args/env.
export async function runPublicClient(argv,{spawnChild=spawn,writeReply=stdoutUntil}={}){
 const local=discovery(argv);
 if(local){await writeReply(JSON.stringify(local)+'\n');return local.ok?0:1;}
 const mcp=argv[0]==='mcp';
 let child;
 try{child=spawnChild(NODE,[ENGINE,...argv],{stdio:mcp?'inherit':['inherit','pipe','inherit'],windowsHide:true,env:runtimeEnvironment()});}
 catch{if(mcp)process.stderr.write('NEW_ENGINE_ENTRY_UNAVAILABLE\n');else await writeReply(JSON.stringify(result(false,null,'NEW_ENGINE_ENTRY_UNAVAILABLE'))+'\n');return 1;}
 const relays=new Map(['SIGINT','SIGTERM'].map(signal=>[signal,()=>{if(child.exitCode===null)child.kill(signal);} ]));
 for(const [signal,relay] of relays)process.on(signal,relay);
 let stdout=Buffer.alloc(0),oversized=false;
 if(!mcp)child.stdout.on('data',bytes=>{if(oversized)return;if(stdout.length+bytes.length>MAX_OUTPUT){oversized=true;return;}stdout=Buffer.concat([stdout,bytes]);});
 try{
  let code;
  try{code=await new Promise((resolve,reject)=>{child.once('error',()=>reject(new Error('NEW_ENGINE_ENTRY_UNAVAILABLE')));child.once('close',resolve);});}
  catch{if(mcp)process.stderr.write('NEW_ENGINE_ENTRY_UNAVAILABLE\n');else await writeReply(JSON.stringify(result(false,null,'NEW_ENGINE_ENTRY_UNAVAILABLE'))+'\n');return 1;}
  // MCP remains byte-for-byte inherited; no help/advice or extra stdout JSON.
  if(mcp)return Number.isInteger(code)?code:1;
  if(oversized){await writeReply(JSON.stringify(result(false,null,'OUTPUT_LIMIT'))+'\n');return 1;}
  // Preserve child exit-only failures (including native output guard exit74).
  if(!stdout.length){if(code===0){await writeReply(JSON.stringify(result(false,null,'INVALID_ENGINE_RESPONSE'))+'\n');return 1;}return Number.isInteger(code)?code:1;}
  let reply;
  try{reply=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(stdout));if(!reply||Array.isArray(reply)||typeof reply.ok!=='boolean'||(!reply.ok&&typeof reply.error?.code!=='string'))throw Error('INVALID_ENGINE_RESPONSE');}
  catch{await writeReply(JSON.stringify(result(false,null,'INVALID_ENGINE_RESPONSE'))+'\n');return Number.isInteger(code)&&code!==0?code:1;}
  await writeReply(JSON.stringify(withAdvice(reply,argv))+'\n');
  return Number.isInteger(code)?code:1;
 }finally{for(const [signal,relay] of relays)process.removeListener(signal,relay);}
}

if(path.resolve(process.argv[1]||'')===fileURLToPath(import.meta.url)){
 try{process.exitCode=await runPublicClient(process.argv.slice(2));}
 catch{outputFailedExit();}
}
