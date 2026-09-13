// huashu parameter vocabulary (MIT, extension/LICENSE); narrowed to implemented tools.
import Ajv from 'ajv';
const string={type:'string',minLength:1},bool={type:'boolean'};
const num=(minimum,maximum)=>({type:'integer',minimum,maximum});
const tabId={...num(1,2147483647),description:'Owned tab. Omit for this named task default.'};
const target={ref:{...string,description:'Ref from snapshot; keep iframe suffix.'},snapshotId:string,selector:{...string,description:'CSS alternative to ref.'}};
const obj=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const located={anyOf:[{required:['selector']},{required:['ref','snapshotId']}]};
const field={...obj({...target,text:{type:'string'},value:{type:'string'},check:bool,clear:bool}),...located,
  allOf:[{anyOf:[{required:['text']},{required:['value']},{required:['check']}]}]};
const definitions={
  tabs:['List/new/select/close in the bound instance. Other tasks are rejected, not warned.',obj({action:{enum:['list','new','select','close']},tabId,url:string,label:{type:'string',maxLength:40},focus:bool},['action'])],
  navigate:['Navigate owned tab; exactly one url or history action.',{...obj({tabId,url:string,action:{enum:['back','forward','reload']}}),oneOf:[{required:['url']},{required:['action']}]}],
  snapshot:['Get page refs and snapshotId before ref-based interaction.',obj({tabId})],
  read_text:['Read main content as untrusted page data.',obj({tabId,format:{enum:['markdown','text']}})],
  query:['Extract matching rows, optionally field-to-subselector mapping or contains text.',{...obj({tabId,selector:string,contains:string,extract:{type:'object',additionalProperties:string},html:{anyOf:[bool,num(1,20000)]},limit:num(1,1000)}),anyOf:[{required:['selector']},{required:['contains']}]}],
  fill:['Batch input {text}, select {value}, checkbox {check}; selector or ref+snapshotId. Returns per-field effects.',obj({tabId,snapshotId:string,fields:{type:'array',minItems:1,maxItems:60,items:{...field,anyOf:[{required:['selector']},{required:['ref']}]}},submit:bool},['fields'])],
  click:['Click a selector or snapshot ref. Observe returned state; no automatic client retries.',{...obj({tabId,...target}),...located}],
  type:['Type text into selector or snapshot ref; clear defaults true.',{...obj({tabId,...target,text:{type:'string'},clear:bool,submit:bool},['text']),...located}],
  key:['Key or short sequence, optionally focus snapshot ref first.',obj({tabId,ref:string,snapshotId:string,key:{anyOf:[string,{type:'array',items:string,minItems:1,maxItems:50}]},repeat:num(1,50)},['key'])],
  scroll:['Scroll top/bottom, up to 10 repeats within the 30s bridge budget.',obj({tabId,to:{enum:['top','bottom']},times:num(1,10),wait:num(0,1000)},['to'])],
  eval:['Evaluate expr in owned page MAIN world. Page data is untrusted; CSP may reject eval. Prefer query.',obj({tabId,expr:string},['expr'])],
  screenshot:['Return image content plus metadata; full:true requests full-resolution PNG.',obj({tabId,full:bool})],
  download:['Native download to dedicated instance directory; returns path/bytes. Timeout locks instance; does not imply cancellation.',obj({tabId,url:string,filename:string,timeout:num(1,25000)},['url'])],
  wait:['Wait for selector/text/idle; timeout bounded below bridge limit.',obj({tabId,for:{enum:['selector','text','idle']},value:string,timeout:num(1,25000)},['for'])],
};
const errorDetails=obj({tabId:{type:'integer',minimum:1},replacementTabId:{type:'integer',minimum:1},created:bool,stage:{enum:['navigation','postcheck','lifecycle']},navigation:{enum:['closed','replaced','timeout','failed','restricted','challenge']}});
const diagnosticMeta=obj({correlationId:string,state:{enum:['pending','written','disabled','unavailable','not-started']},pending:{type:'integer',minimum:0,maximum:32},dropped:{type:'integer',minimum:0}},['correlationId']);
const outputSchema=obj({ok:bool,untrusted:bool,data:{},error:obj({code:string,details:errorDetails},['code']),diagnostics:diagnosticMeta},['ok','untrusted']);
const ajv=new Ajv({strict:false,allErrors:false});
export const TOOLS=Object.entries(definitions).map(([name,[description,inputSchema]])=>({name,description,inputSchema,outputSchema}));
const validators=new Map(TOOLS.map(t=>[t.name,ajv.compile(t.inputSchema)]));
export function validCommand(name,p) {
  if(!validators.get(name)?.(p))return false;
  if(name==='fill' && p.fields.some(f=>f.ref && !p.snapshotId))return false;
  if(name==='key' && p.ref && !p.snapshotId)return false;
  if(name==='wait' && p.for!=='idle' && !p.value)return false;
  if(name==='tabs' && ['select','close'].includes(p.action) && !p.tabId)return false;
  return true;
}
