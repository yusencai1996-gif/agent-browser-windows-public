// Records are produced from these fixed fields, never from an Error or command object.
export const LOG_FORMAT='abw-diagnostics-v1';
const roles=new Set(['cli','host','worker']);
const phases=new Set(['cli_begin','cli_result','host_spawn','host_ready','host_release','startup_abort','browser_launch','chromium_launch','extension_load','extension_bootstrap','window_ready','browser_ready','worker_exit','request_begin','request_end','cleanup']);
phases.add('extension_context');
phases.add('extension_selection');
phases.add('bridge_state');
phases.add('extension_activation');
const actions=new Set(['start','serve','health','startup-release','status','browser','overview','show','minimize','call','grant','task','end','revoke','stop','close-browser','mcp','setup','doctor','diagnostics','other']);
const toolNames=new Set(['tabs','navigate','snapshot','read_text','query','fill','click','type','key','scroll','eval','screenshot','download','wait']);
const codes=new Set(['HOST_OFFLINE','HOST_STARTING','HOST_STOPPING','HOST_TIMEOUT','HOST_START_TIMEOUT','HOST_START_EXITED','HOST_START_DISCONNECTED','HOST_SPAWN_FAILED','HOST_START_PROTOCOL','HOST_START_CANCELLED','HOST_ERROR','HOST_PROTOCOL','INSTANCE_CLOSED','INSTANCE_STARTING','INSTANCE_MODE_MISMATCH','INSTANCE_OFFLINE','INVALID_INSTANCE_NAME','BROWSER_START_TIMEOUT','BROWSER_START_FAILED','BROWSER_START_PROTOCOL','BROWSER_SPAWN_FAILED','BROWSER_EXITED','BROWSER_DISCONNECTED','BROWSER_CLOSE_UNCONFIRMED','CLEANUP_INCOMPLETE','PROFILE_IN_USE','UNKNOWN_PROFILE','UNSAFE_PROFILE','UNSAFE_WORKSPACE','TASK_PAUSED','REVOKED','COMMAND_FAILED','EACCES','EPERM','ENOSPC','EBUSY','INTERNAL']);
export const validCorrelation=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
for(const code of ['HOST_LAUNCHER_TIMEOUT','BROWSER_BOOTSTRAP_TIMEOUT','EXTENSION_LOAD_FAILED','EXTENSION_LOAD_UNCONFIRMED','EXTENSION_ID_UNCONFIRMED','EXTENSION_WORKER_FAILED','EXTENSION_BOOTSTRAP_FAILED','BROWSER_WINDOW_FAILED','BROWSER_START_CANCELLED','BROWSER_ID_UNCONFIRMED'])codes.add(code);
codes.add('EXTENSION_CONTEXT_TIMEOUT');codes.add('EXTENSION_CONTEXT_UNAVAILABLE');
codes.add('EXTENSION_WORKER_REPLACED');
codes.add('EXTENSION_WORKER_UNCONFIRMED');
codes.add('EXTENSION_ACTIVATION_TIMEOUT');
codes.add('HOST_VERSION_MISMATCH');codes.add('UNSAFE_EXTENSION');
for(const code of ['BRIDGE_REPLACED','BRIDGE_DISCONNECTED','BRIDGE_COMMAND_TIMEOUT','BRIDGE_TRANSPORT_ERROR','CLIENT_DISCONNECTED','RESPONSE_DELIVERY_FAILED','OUTCOME_UNKNOWN'])codes.add(code);
export function diagnosticRecord(input){
 if(!input||!roles.has(input.role)||!phases.has(input.phase)||!validCorrelation(input.correlationId))return null;
 if(typeof input.utc!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(input.utc)||!Number.isFinite(Date.parse(input.utc)))return null;
 if(typeof input.version!=='string'||!/^\d{1,3}\.\d{1,3}\.\d{1,3}(?:-alpha\.\d{1,3})?$/.test(input.version))return null;
 const out={format:LOG_FORMAT,utc:input.utc,elapsedMs:Math.max(0,Math.min(1e12,Math.round(Number(input.elapsedMs)||0))),version:input.version,role:input.role,correlationId:input.correlationId,phase:input.phase};
 for(const key of ['pid','ppid','childPid'])if(Number.isSafeInteger(input[key])&&input[key]>0&&input[key]<2**32)out[key]=input[key];
 if(input.action!==undefined)out.action=actions.has(input.action)?input.action:'other';
 if(input.tool!==undefined)out.tool=toolNames.has(input.tool)?input.tool:'other';
 if(['begin','ready','ok','error','exit','timeout'].includes(input.state))out.state=input.state;
 if(input.code!==undefined)out.code=codes.has(input.code)?input.code:'INTERNAL';
 if(Number.isInteger(input.exitCode)&&input.exitCode>=0&&input.exitCode<=255)out.exitCode=input.exitCode;
 return out;
}
