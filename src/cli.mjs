#!/usr/bin/env node
import {initDiagnostics,logEvent,finishDiagnostics,diagnosticInfo} from './runtime-log.mjs';
// Dependency-free entry permits setup/doctor before npm install.
const command=process.argv[2];
initDiagnostics(command==='serve'?'host':'cli');logEvent('cli_begin',{action:command,...(command==='call'?{tool:process.argv[3]}:{}),state:'begin'});
try {
  const {validateArguments}=await import('./arguments.mjs');validateArguments(command,process.argv.slice(3));
  if(Number(process.versions.node.split('.')[0])<26)throw new Error('NODE_26_REQUIRED');
  const {doctor,setup}=await import('./setup.mjs');
  if(command==='diagnostics'){
    const {LOCAL,secureLocal}=await import('./local-control.mjs');await secureLocal();
    const {configureDiagnostics,readDiagnostics}=await import('./diagnostic-store.mjs');
    const argv=process.argv.slice(3),value=(key,fallback)=>{const i=argv.indexOf(key);return i<0?fallback:argv[i+1];};
    if(argv.includes('--on')&&argv.includes('--off'))throw new Error('INCOMPATIBLE_OPTIONS');
    if(argv.includes('--on')||argv.includes('--off'))await configureDiagnostics(LOCAL,argv.includes('--on'));
    const data=await readDiagnostics(LOCAL,{limit:Number(value('--limit',100)),correlationId:value('--correlation'),since:value('--since')});
    await finishDiagnostics();
    console.log(JSON.stringify({ok:true,untrusted:false,data,diagnostics:diagnosticInfo()}));
  }else if(command==='setup'||command==='doctor'){
    const data=command==='setup'?await setup({resumable:process.argv.includes('--resumable')}):await doctor();
    console.log(JSON.stringify({ok:command==='setup'||data.ready,untrusted:false,data,diagnostics:diagnosticInfo()}));
    if(!data.ready)process.exitCode=1;
  }else{
    const state=await doctor();
    if(!state.checks.dependencies)throw new Error('DEPENDENCIES_MISSING');
    if(command==='start'&&!state.ready)throw new Error(state.required);
    await import('./commands.mjs');
  }
}catch(e){const code=/^[A-Z_0-9]+$/.test(e.message)?e.message:'COMMAND_FAILED';logEvent('cli_result',{action:command,state:'error',code});if(command!=='mcp'&&command!=='serve')console.log(JSON.stringify({ok:false,untrusted:false,error:{code},diagnostics:diagnosticInfo()}));console.error(code);process.exitCode=1;}
finally{if(command!=='mcp'&&command!=='serve'){logEvent('cli_result',{action:command,state:process.exitCode?'error':'ok',exitCode:process.exitCode||0});await finishDiagnostics();}}
