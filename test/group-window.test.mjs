import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../extension/background.js',import.meta.url),'utf8'),body=source.slice(source.indexOf('async function syncGroup('),source.indexOf('async function resyncMarks('));
// Mutations occur while actual syncGroup awaits Chrome/storage, not before it runs.
function scenario({human=false,moved=false,internal=false,type='normal',staleOwner=false,storedWindow=null,initialGroup=-1,onOwnerRead,onGroupRead}={}){
 const calls=[],ungrouped=[];let reads=0;
 const state={tab:{id:10,windowId:42,groupId:initialGroup,url:'synthetic'},group:storedWindow===null?null:{id:9,windowId:storedWindow,title:'Synthetic'}};
 const sandbox={groupKey:id=>'agentGroup:'+id,groupTitleOk:title=>title==='Synthetic',GROUP_TITLE:'Synthetic',
  ownersOfTab:async()=>{await Promise.resolve();onOwnerRead?.(state);return staleOwner?[]:[{sid:'owned',group:'blue'}];},
  management:{isHumanWindow:id=>human||id===99},protectedPageUrl:()=>internal,
  chrome:{windows:{get:async()=>({type})},tabs:{
   get:async()=>{if(moved&&reads++)state.tab.windowId=43;return {...state.tab};},
   group:async options=>{calls.push(options);return 7;},ungroup:async id=>ungrouped.push(id)},
   tabGroups:{get:async()=>{const result=state.group&&{...state.group};onGroupRead?.(state);return result;},update:async()=>{}},
   storage:{local:{get:async()=>storedWindow===null?{}:{'agentGroup:owned':9},set:async()=>{}}}}};
 return {calls,ungrouped,run:vm.runInNewContext(body+'\nsyncGroup',sandbox)};
}
test('new auxiliary group is bound to the exact tab window, never current window',async()=>{const s=scenario();await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,1);assert.equal(s.calls[0].createProperties.windowId,42);assert.equal(s.calls[0].tabIds,10);});
test('human and management windows are not modified by group decoration',async()=>{for(const input of [{human:true},{internal:true}]){const s=scenario(input);await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,0);}});
test('a changed tab window cancels grouping instead of moving it back',async()=>{const s=scenario({moved:true});await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,0);});
test('popup windows and ended ownership are not grouped',async()=>{for(const input of [{type:'popup'},{staleOwner:true}]){const s=scenario(input);await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,0);}});
test('a stored group in another window cannot move the owned page',async()=>{const s=scenario({storedWindow:77});await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,1);assert.equal(s.calls[0].groupId,undefined);assert.equal(s.calls[0].createProperties.windowId,42);});
test('an existing same-window group is reused without changing windows',async()=>{const s=scenario({storedWindow:42});await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,1);assert.equal(s.calls[0].groupId,9);assert.equal(s.calls[0].createProperties,undefined);});
test('drag into a human window during owner lookup cancels decoration',async()=>{const s=scenario({onOwnerRead:state=>{state.tab.windowId=99;}});await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,0);});
test('a user group assigned during owner lookup is preserved',async()=>{const s=scenario({onOwnerRead:state=>{state.tab.groupId=123;}});await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,0);});
test('a stored destination moved during owner lookup is not reused',async()=>{const s=scenario({storedWindow:42,onOwnerRead:state=>{state.group.windowId=77;}});await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,0);});
test('a stored destination renamed during owner lookup is preserved',async()=>{const s=scenario({storedWindow:42,onOwnerRead:state=>{state.group.title='User group';}});await s.run(10,[{sid:'owned',group:'blue'}]);assert.equal(s.calls.length,0);});
test('ungroup preserves a user group assigned during the group lookup',async()=>{const s=scenario({storedWindow:42,initialGroup:9,staleOwner:true,onGroupRead:state=>{state.tab.groupId=123;}});await s.run(10,[]);assert.equal(s.ungrouped.length,0);});
test('an unchanged own group is removed when no live owners remain',async()=>{const s=scenario({storedWindow:42,initialGroup:9,staleOwner:true});await s.run(10,[]);assert.deepEqual(s.ungrouped,[10]);});
