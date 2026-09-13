import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {freshSandbox} from '../scripts/test-sandbox.mjs';
test('local request has an absolute deadline despite trickled bytes and handles aborted replies',async()=>{
 const box=await freshSandbox('wp16-request'),root=path.resolve(import.meta.dirname,'..');await fs.mkdir(path.join(box.root,'src'));await fs.mkdir(path.join(box.root,'.local'));
 for(const file of ['local-control.mjs','runtime-log.mjs','diagnostic-schema.mjs'])await fs.copyFile(path.join(root,'src',file),path.join(box.root,'src',file));await fs.copyFile(path.join(root,'package.json'),path.join(box.root,'package.json'));await fs.writeFile(path.join(box.root,'.local/host.json'),JSON.stringify({token:'synthetic-only'}));
 const {PIPE,request}=await import(pathToFileURL(path.join(box.root,'src/local-control.mjs')).href);let abort=false;
 const server=http.createServer((req,res)=>{req.resume();res.writeHead(200);res.write('{"ok":');if(abort){setTimeout(()=>res.destroy(),10);return;}const timer=setInterval(()=>res.write(' '),10);res.on('close',()=>clearInterval(timer));});await new Promise(r=>server.listen(PIPE,r));
 try{const began=performance.now();await assert.rejects(request('status',{}, {timeoutMs:70}),/HOST_TIMEOUT/);assert.ok(performance.now()-began<500);abort=true;await assert.rejects(request('status',{}, {timeoutMs:500}),/HOST_PROTOCOL/);}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await box.cleanup();}
});
