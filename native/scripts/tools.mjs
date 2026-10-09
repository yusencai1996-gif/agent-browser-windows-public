import Ajv from 'ajv';
const string={type:'string',minLength:1,maxLength:4096},tabId={type:'integer',minimum:1,maximum:2147483647};
const obj=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const bool={type:'boolean'},target={ref:string,snapshotId:string,selector:string};const located={anyOf:[{required:['selector']},{required:['ref','snapshotId']}]};
const definitions={
 tabs:obj({action:{enum:['list','new','select','close']},tabId,url:string,label:{type:'string',maxLength:40},focus:{type:'boolean'}},['action']),
 navigate:{...obj({tabId,url:string,action:{enum:['back','forward','reload']}}),oneOf:[{required:['url']},{required:['action']}]},
 snapshot:obj({tabId}),
 query:{...obj({tabId,selector:string,contains:string,extract:{type:'object',maxProperties:20,additionalProperties:string},html:{anyOf:[{type:'boolean'},{type:'integer',minimum:1,maximum:20000}]},limit:{type:'integer',minimum:1,maximum:1000}}),anyOf:[{required:['selector']},{required:['contains']}]},
 read_text:obj({tabId,format:{enum:['markdown','text']},ref:string,snapshotId:string}),
 screenshot:obj({tabId,full:{type:'boolean'}}),
 click:{...obj({tabId,...target}),...located},
 type:{...obj({tabId,...target,text:{type:'string',maxLength:8192},clear:bool,submit:bool},['text']),...located},
 fill:obj({tabId,snapshotId:string,fields:{type:'array',minItems:1,maxItems:30,items:{...obj({...target,text:{type:'string',maxLength:8192},value:string,check:bool,clear:bool}),anyOf:[{required:['selector']},{required:['ref']}]}},submit:bool},['fields']),
 key:obj({tabId,ref:string,snapshotId:string,key:{anyOf:[string,{type:'array',items:string,minItems:1,maxItems:10}]},repeat:{type:'integer',minimum:1,maximum:10}},['key']),
 scroll:obj({tabId,to:{enum:['top','bottom']},times:{type:'integer',minimum:1,maximum:10},wait:{type:'integer',minimum:0,maximum:1000}},['to']),
};
const descriptions={click:'Owned browser trusted mouse click.',type:'Owned browser text insertion; public forms restricted.',fill:'Bounded real browser input, text/select/checkbox.',key:'Restricted real browser keys.',scroll:'Bounded browser wheel input.',tabs:'Owned tabs; experimental capacity two tasks, four real pages per task.',navigate:'Navigate owned top-level page under default public HTTPS or optional explicit top-level origins; page resources and APIs use public transport; real back/forward/reload.',snapshot:'Bounded top document refs; previous snapshot invalidated.',query:'Bounded CSS/text extraction from top document.',read_text:'Top-document main content; markdown is plain text, without structural conversion. Optional bound ref.',screenshot:'Original PNG CapturePreview; full:true unsupported.'};
export const TOOLS=Object.entries(definitions).map(([name,inputSchema])=>({name,description:descriptions[name],inputSchema}));
const ajv=new Ajv({strict:false});const validators=new Map(TOOLS.map(t=>[t.name,ajv.compile(t.inputSchema)]));
export function valid(name,p){return !!validators.get(name)?.(p)&&(!(name==='read_text')||!!p.ref===!!p.snapshotId)&&(!(name==='fill')||p.fields.every(f=>!!f.selector||!!f.ref&&!!(f.snapshotId||p.snapshotId)))&&(!(name==='key')||!p.ref||!!p.snapshotId);}
