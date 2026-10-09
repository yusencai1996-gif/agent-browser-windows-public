import test from 'node:test';import assert from 'node:assert/strict';import {inputTool} from '../scripts/input.mjs';
function context(overrides={}){const sent=[];return {sent,args:{name:'click',p:{selector:'#card'},deadline:performance.now()+3000,fixture:false,resolve:async()=>({visible:true,disabled:false,sensitive:false,type:'',tag:'DIV',x:20,y:100,frameBlocked:false}),active:async()=>({tag:'BODY',frameBlocked:false}),read:async()=>({}),allowPublicLink:async()=>{},cdp:async(method,params)=>sent.push({method,params}),...overrides}};}
test('known child-frame target and a containing parent hit are refused before trusted input',async()=>{
 const c=context({resolve:async()=>({visible:true,type:'',tag:'DIV',frameBlocked:true})});await assert.rejects(inputTool(c.args),{code:'INPUT_FRAME_UNSUPPORTED'});assert.equal(c.sent.length,0);
});
test('focused child frame cannot receive keyboard input',async()=>{
 const c=context({name:'key',p:{key:'ArrowDown'},active:async()=>({tag:'IFRAME',frameBlocked:true})});await assert.rejects(inputTool(c.args),{code:'INPUT_FRAME_UNSUPPORTED'});assert.equal(c.sent.length,0);
});
test('credential and public submit restrictions remain before any event',async()=>{
 const c=context({resolve:async()=>({visible:true,sensitive:true,type:'password',tag:'INPUT'})});await assert.rejects(inputTool(c.args),{code:'INPUT_RESTRICTED'});assert.equal(c.sent.length,0);
 const submit=context({resolve:async()=>({visible:true,sensitive:false,type:'submit',tag:'BUTTON'})});await assert.rejects(inputTool(submit.args),{code:'PUBLIC_SUBMISSION_RESTRICTED'});assert.equal(submit.sent.length,0);
});
test('ordinary root-document readonly click remains available',async()=>{
 const c=context();assert.equal((await inputTool(c.args)).clicked,true);assert.equal(c.sent.length,2);
});
test('Tab enters iframe: stop next Enter and preserve the Tab key-up/partial evidence',async()=>{
 let frame=false;const sent=[];const c=context({name:'key',p:{key:['Tab','Enter']},active:async()=>({tag:frame?'IFRAME':'BODY',frameBlocked:frame}),cdp:async(_method,p)=>{sent.push(p);if(p.type==='rawKeyDown'&&p.key==='Tab')frame=true;}});
 await assert.rejects(inputTool(c.args),error=>error.code==='INPUT_FRAME_UNSUPPORTED'&&error.data.partial&&error.data.actionsRequested===2);
 assert.deepEqual(sent.map(x=>[x.type,x.key]),[['rawKeyDown','Tab'],['keyUp','Tab']]);
});
test('repeat and every wheel re-check focus instead of reusing the first check',async()=>{
 let frame=false,count=0;const repeat=context({name:'key',p:{key:'Tab',repeat:2},active:async()=>({tag:frame?'IFRAME':'BODY',frameBlocked:frame}),cdp:async(_m,p)=>{count++;if(p.type==='rawKeyDown')frame=true;}});
 await assert.rejects(inputTool(repeat.args),{code:'INPUT_FRAME_UNSUPPORTED'});assert.equal(count,2);
 let wheelFrame=false,wheels=0;const scroll=context({name:'scroll',p:{to:'bottom',times:3},active:async()=>({tag:'BODY',wheelFrameBlocked:wheelFrame}),cdp:async()=>{wheels++;wheelFrame=true;}});
 await assert.rejects(inputTool(scroll.args),error=>error.code==='INPUT_FRAME_UNSUPPORTED'&&error.data.partial);assert.equal(wheels,1);
});
