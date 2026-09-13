#!/usr/bin/env node
import {ROOT,request} from './local-control.mjs';
import {ensureHost} from './host-startup.mjs';
import {logEvent,diagnosticInfo} from './runtime-log.mjs';
import {TOOLS,validCommand} from './tools.mjs';
import {connectTask} from './tool-client.mjs';
import {readInput,saveImage} from './cli-io.mjs';
import {configureOpencli} from './opencli-extension.mjs';
const [command,...args]=process.argv.slice(2);
const flag=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1];};
const success=data=>console.log(JSON.stringify({ok:true,untrusted:false,data,diagnostics:diagnosticInfo()}));
try{
  if(command==='serve'){await import('./host.mjs');}
  else if(command==='opencli-config'){
    let live=false;try{await request('status');live=true;}catch(e){if(e.message!=='HOST_OFFLINE')throw e;}
    if(live)throw new Error('HOST_MUST_BE_STOPPED');success(await configureOpencli(flag('--extension',null)));
  }
  else if(command==='start'){
    if(args.includes('--headless')&&args.includes('--visible'))throw new Error('INCOMPATIBLE_WINDOW_MODES');
    await ensureHost({event:(phase,extra)=>logEvent(phase,{...extra,action:'start',state:phase==='host_spawn'?'begin':'ready'})});
    success(await request('browser',{name:flag('--instance','main'),headless:args.includes('--headless'),visible:args.includes('--visible'),temporary:args.includes('--temporary'),opencliExtension:flag('--opencli-extension',undefined)}));
  } else if(command==='overview'){const instance=flag('--instance','main');if(await ensureHost({event:(phase,extra)=>logEvent(phase,{...extra,action:'overview',state:phase==='host_spawn'?'begin':'ready'})}))await request('browser',{name:instance});success(await request('overview',{instance}));
  } else if(['show','minimize'].includes(command)){
    const instance=flag('--instance',null);if(!instance)throw new Error('INSTANCE_REQUIRED');
    const id=flag('--window-id',undefined);success(await request(command,{instance,...(id===undefined?{}:{windowId:Number(id)})}));
  } else if(command==='tools')success(TOOLS.map(({name,description})=>({name,description})));
  else if(command==='schema'){
    const tool=TOOLS.find(t=>t.name===args[0]);if(!tool)throw new Error('UNKNOWN_TOOL');success(tool);
  } else if(command==='call'){
    const name=args[0],input=await readInput(flag('--input',null));
    if(!validCommand(name,input))throw new Error('INVALID_ARGUMENT');
    if(flag('--output',null) && name!=='screenshot')throw new Error('OUTPUT_ONLY_SCREENSHOT');
    const client=await connectTask(await request('grant',{name:flag('--task',null)}));
    try{
      const result=await client.call(name,input);
      const output=result.isError?result.structuredContent:await saveImage(result,flag('--output',null));
      console.log(JSON.stringify({...output,diagnostics:diagnosticInfo()}));if(!output.ok){process.exitCode=1;logEvent('cli_result',{action:'call',state:'error',code:output.error?.code});}
    }finally{await client.close();}
  } else if(command==='mcp') {
    const grant=await request('grant',{name:flag('--task',null)});
    const {runMcp}=await import('./mcp.mjs');await runMcp(grant);
  } else if(['status','stop'].includes(command)) {
    const result=await request(command);
    if(command==='stop' && (!result.stopped || !result.cleanupConfirmed)){console.log(JSON.stringify({ok:false,untrusted:false,data:result,error:{code:'CLEANUP_INCOMPLETE'}}));process.exitCode=1;}
    else success(result);
  } else if(['task','end','revoke','close-browser'].includes(command))success(await request(command,{name:args[0],instance:flag('--instance','main')}));
  else if(!command || ['help','--help','-h'].includes(command))success({usage:['diagnostics [--limit 100] [--correlation UUID] [--since ISO_WITH_ZONE] [--on|--off]','overview [--instance main]','opencli-config --extension DIR','setup','doctor','start [--visible|--headless] [--temporary] [--instance main] [--opencli-extension DIR]','show --instance NAME [--window-id ID]','minimize --instance NAME [--window-id ID]','status','task NAME [--instance main]','tools','schema TOOL','call TOOL --task NAME [--input FILE|-] [--output artifacts/NAME.png]','mcp --task NAME','revoke NAME','end NAME','close-browser INSTANCE','stop'],input:'--input - reads UTF-8 stdin; --input FILE reads UTF-8/UTF-16LE BOM JSON; no --input = {}',output:'JSON envelope; screenshot saved under artifacts without overwrite'});
  else throw new Error('UNKNOWN_COMMAND');
}catch(e){const code=/^[A-Z_]+$/.test(e.message)?e.message:'COMMAND_FAILED';
 const hints={INVALID_INSTANCE_NAME:'实例名称只接受1至48位字母、数字、下划线或短横线。',INSTANCE_CLOSED:'此宿主中的实例已关闭；确认无其他工作后停止宿主再启动，或使用新实例名。',INSTANCE_STARTING:'实例仍在启动；查看status与本次diagnostics，不要重复创建或删除锁。',INSTANCE_MODE_MISMATCH:'同名实例的运行模式不同；复用原模式，或使用独立实例名。',HOST_START_TIMEOUT:'宿主未在期限内完成就绪确认；按本次correlationId查diagnostics，勿强杀未知进程。'};
 logEvent('cli_result',{action:command,state:'error',code});if(command!=='mcp'&&command!=='serve')console.log(JSON.stringify({ok:false,untrusted:false,error:{code,...(hints[code]?{hint:hints[code]}:{})},diagnostics:diagnosticInfo()}));console.error(code);process.exitCode=1;}
