// Validate before any stdin read, host launch, grant or page operation.
const contract={start:[0,['--instance','--opencli-extension'],['--visible','--headless','--temporary']],overview:[0,['--instance'],[]],show:[0,['--instance','--window-id'],[]],minimize:[0,['--instance','--window-id'],[]],call:[1,['--task','--input','--output'],[]],mcp:[0,['--task'],[]],task:[1,['--instance'],[]],schema:[1,[],[]],end:[1,[],[]],revoke:[1,[],[]],'close-browser':[1,[],[]],status:[0,[],[]],stop:[0,[],[]],tools:[0,[],[]],serve:[0,[],[]],setup:[0,[],['--resumable']],'opencli-config':[0,['--extension'],[]],doctor:[0,[],[]],help:[0,[],[]],'--help':[0,[],[]],'-h':[0,[],[]]};
export function validateArguments(command,args){
 if(command==='diagnostics')return validateArgumentsFor([0,['--limit','--correlation','--since'],['--on','--off']],args);
 return validateArgumentsFor(contract[command||'help'],args);
}
function validateArgumentsFor(spec,args){
 if(!spec)throw new Error('UNKNOWN_COMMAND');const [count,valued,booleans]=spec;let positional=0;const seen=new Set();
 for(let i=0;i<args.length;i++){const a=args[i];if(a.startsWith('-')){if(!valued.includes(a)&&!booleans.includes(a))throw new Error('UNKNOWN_OPTION');if(seen.has(a))throw new Error('DUPLICATE_OPTION');seen.add(a);if(valued.includes(a)){const value=args[++i];if(value===undefined||value===''||(value.startsWith('--')))throw new Error('OPTION_VALUE_REQUIRED');}}else{if(i!==positional||++positional>count)throw new Error('UNEXPECTED_ARGUMENT');}}
 if(positional!==count)throw new Error('ARGUMENT_REQUIRED');
}
