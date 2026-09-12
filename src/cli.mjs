#!/usr/bin/env node
// Dependency-free entry permits setup/doctor before npm install.
const command=process.argv[2];
try {
  const {validateArguments}=await import('./arguments.mjs');validateArguments(command,process.argv.slice(3));
  if(Number(process.versions.node.split('.')[0])<26)throw new Error('NODE_26_REQUIRED');
  const {doctor,setup}=await import('./setup.mjs');
  if(command==='setup'||command==='doctor'){
    const data=command==='setup'?await setup({resumable:process.argv.includes('--resumable')}):await doctor();
    console.log(JSON.stringify({ok:command==='setup'||data.ready,untrusted:false,data}));
    if(!data.ready)process.exitCode=1;
  }else{
    const state=await doctor();
    if(!state.checks.dependencies)throw new Error('DEPENDENCIES_MISSING');
    if(command==='start'&&!state.ready)throw new Error(state.required);
    await import('./commands.mjs');
  }
}catch(e){const code=/^[A-Z_0-9]+$/.test(e.message)?e.message:'COMMAND_FAILED';if(command!=='mcp'&&command!=='serve')console.log(JSON.stringify({ok:false,untrusted:false,error:{code}}));console.error(code);process.exitCode=1;}
