import test from 'node:test';import assert from 'node:assert/strict';import net from 'node:net';
import {PassThrough} from 'node:stream';
import {authority,destination,validatePeer,normalizeIp,connectionFilter} from '../scripts/connection-filter.mjs';
const own=()=>[],publicLookup=async()=>[{address:'8.8.8.8',family:4},{address:'2606:4700:4700::1111',family:6}];
test('authority rejects credentials, numeric encodings, localhost and malformed ports',()=>{
 for(const input of ['u:p@example.com:443','127.0.0.1:443','2130706433:443','0x7f000001:443','0177.0.0.1:443','[::ffff:127.0.0.1]:443','localhost:443','localhost.:443','example.com:0','example.com:99999','example.com:443/path','example.com:443?token=x'])assert.throws(()=>authority(input));
 assert.equal(authority('EXAMPLE.COM:8443').origin,'https://example.com:8443');
});
test('all DNS answers must be public and not a local interface, including public interface IPs',async()=>{
 const result=await destination('example.com:443',{lookup:publicLookup,ownAddresses:own});assert.equal(result.address,'8.8.8.8');
 for(const address of ['127.0.0.1','192.168.1.1','::1','fc00::1','::ffff:8.8.8.8'])await assert.rejects(destination('example.com:443',{lookup:async()=>[{address:'8.8.8.8',family:4},{address,family:6}],ownAddresses:own}),{code:'PROXY_DNS_NONPUBLIC_OR_SELF'});
 await assert.rejects(destination('example.com:443',{lookup:publicLookup,ownAddresses:()=>['8.8.8.8']}),{code:'PROXY_DNS_NONPUBLIC_OR_SELF'});
 await assert.rejects(destination('example.com:443',{lookup:async()=>[],ownAddresses:own}),{code:'PROXY_DNS_NONPUBLIC_OR_SELF'});
 await assert.rejects(destination('example.com:443',{lookup:()=>new Promise(()=>{}),ownAddresses:own,timeoutMs:20}),{code:'PROXY_DNS_UNKNOWN'});
});
test('literal selected IP and port must match the actual connected peer; DNS is never repeated',async()=>{
 let lookups=0;const target=await destination('example.com:443',{lookup:async()=>{lookups++;return publicLookup();},ownAddresses:own});
 validatePeer({remoteAddress:'8.8.8.8',remotePort:443},target,own);assert.equal(lookups,1);
 for(const peer of [{remoteAddress:'1.1.1.1',remotePort:443},{remoteAddress:'127.0.0.1',remotePort:443},{remoteAddress:'8.8.8.8',remotePort:444}])assert.throws(()=>validatePeer(peer,target,own),{code:'PROXY_PEER_MISMATCH'});
 assert.throws(()=>validatePeer({remoteAddress:'8.8.8.8',remotePort:443},target,()=>['8.8.8.8']),{code:'PROXY_PEER_MISMATCH'});
 assert.equal(normalizeIp('2606:4700:4700:0:0:0:0:1111'),'2606:4700:4700::1111');
});
test('owned loopback proxy rejects private CONNECT/upgrade before any outbound dial',async()=>{
 let dials=0;const proxy=await connectionFilter({fixtureOrigin:'http://127.0.0.1:49189',ownAddresses:own,dial:()=>{dials++;throw Error('unexpected dial');}});
 async function send(value){const socket=net.connect({host:'127.0.0.1',port:proxy.port});let out='';socket.on('data',b=>out+=b);socket.end(value);await new Promise((resolve,reject)=>{socket.once('close',resolve);socket.once('error',reject);});return out;}
 try{
  assert.match(await send('CONNECT 127.0.0.1:443 HTTP/1.1\r\nHost: 127.0.0.1:443\r\n\r\n'),/^HTTP\/1.1 502/);
  assert.match(await send('GET http://127.0.0.1:49190/socket HTTP/1.1\r\nHost: 127.0.0.1:49190\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n'),/^HTTP\/1.1 403/);
  assert.match(await send('GET http://127.0.0.1:4489/private HTTP/1.1\r\nHost: 127.0.0.1:4489\r\n\r\n'),/^HTTP\/1.1 403/);
  assert.equal(dials,0);assert.equal(proxy.stats().connectDenied,1);assert.equal(proxy.stats().upgradeDenied,1);
 }finally{await proxy.close();await proxy.close();}
});
test('actual CONNECT handler dials only selected literal IP and keeps opaque bytes out of diagnostics',async()=>{
 let dialOptions,lookups=0;const proxy=await connectionFilter({fixtureOrigin:'http://127.0.0.1:49189',ownAddresses:own,lookup:async()=>{lookups++;return publicLookup();},dial:options=>{
  dialOptions=options;const stream=new PassThrough();stream.remoteAddress='8.8.8.8';stream.remotePort=443;stream.setTimeout=()=>stream;queueMicrotask(()=>stream.emit('connect'));return stream;
 }});
 const client=net.connect({host:'127.0.0.1',port:proxy.port});let output='';client.on('data',bytes=>output+=bytes);
 try{
  client.write('CONNECT example.com:443 HTTP/1.1\r\nHost: example.com:443\r\n\r\n');
  for(let n=0;n<30&&!output.includes('200 Connection Established');n++)await new Promise(r=>setTimeout(r,5));
  assert.match(output,/200 Connection Established/);assert.deepEqual(dialOptions,{host:'8.8.8.8',port:443,family:4});assert.equal(lookups,1);assert.equal(proxy.stats().connectAllowed,1);
  assert.deepEqual(Object.keys(proxy.stats()).sort(),['connectAllowed','connectDenied','denialCodes','httpDenied','httpFixture','openSockets','peerRejected','upgradeDenied'].sort());
 }finally{client.destroy();await proxy.close();}
});
