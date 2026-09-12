import {test} from 'node:test';
import assert from 'node:assert/strict';
import Ajv from 'ajv';
import {TOOLS,validCommand} from '../src/tools.mjs';
export const samples={tabs:{action:'new'},navigate:{url:'http://127.0.0.1/'},snapshot:{},read_text:{format:'text'},query:{selector:'li'},
  fill:{fields:[{selector:'#name',text:'hello'}]},click:{selector:'button'},type:{selector:'#name',text:'hello'},key:{key:'Tab'},scroll:{to:'bottom'},
  eval:{expr:'1+1'},screenshot:{full:true},download:{url:'http://127.0.0.1/file'},wait:{for:'selector',value:'main'}};
test('each of 14 tool schemas accepts its own example and rejects unknown injection fields',()=>{
  assert.equal(TOOLS.length,14);const ajv=new Ajv({strict:false});
  for(const tool of TOOLS){assert.ok(validCommand(tool.name,samples[tool.name]),tool.name);assert.equal(validCommand(tool.name,{...samples[tool.name],__hc:'click'}),false);const validate=ajv.compile(tool.outputSchema);assert.ok(validate({ok:true,untrusted:true,data:{}}));assert.ok(validate({ok:false,untrusted:false,error:{code:'REVOKED'}}));}
});
test('required selector/ref, snapshot and timeout semantics reject invalid calls',()=>{
  for(const [name,p] of [['click',{}],['click',{ref:'e1'}],['fill',{fields:[{ref:'e1',text:'x'}]}],['wait',{for:'text'}],['tabs',{action:'select'}],['navigate',{url:'x',action:'back'}],['download',{url:'x',timeout:30000}]])assert.equal(validCommand(name,p),false,`${name} ${JSON.stringify(p)}`);
  assert.ok(validCommand('fill',{snapshotId:'snap',fields:[{ref:'e1',text:'x'}]}));
});
