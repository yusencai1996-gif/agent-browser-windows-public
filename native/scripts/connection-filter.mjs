// App-owned transport backstop. HTTPS remains opaque browser-to-site TLS.
// Never logs request paths, headers, bodies, cookie/auth values, or capabilities.
import http from 'node:http';import net from 'node:net';import dns from 'node:dns/promises';import os from 'node:os';
import {canonicalOrigin,publicAddress} from './scope.mjs';

const failure=code=>Object.assign(new Error(code),{code});
export function normalizeIp(address){
 if(typeof address!=='string')return '';
 const bare=address.split('%')[0];if(net.isIP(bare)===4)return bare;
 if(net.isIP(bare)===6){try{return new URL('http://['+bare+']/').hostname.slice(1,-1).toLowerCase();}catch{return '';}}
 return '';
}
export function interfaceAddresses(){return Object.values(os.networkInterfaces()).flat().filter(Boolean).map(x=>normalizeIp(x.address)).filter(Boolean);}
export function authority(value){
 if(typeof value!=='string'||value.length>2048||!/^[a-zA-Z0-9.-]+:[1-9][0-9]{0,4}$/.test(value))throw failure('PROXY_AUTHORITY_REJECTED');
 const url=new URL('https://'+value);if(Number(url.port||443)>65535||Number(url.port||443)<1)throw failure('PROXY_AUTHORITY_REJECTED');
 const origin=canonicalOrigin(url.origin);return {hostname:url.hostname,port:Number(url.port||443),origin};
}
async function timed(promise,ms,code){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>timer=setTimeout(()=>reject(failure(code)),ms))]);}finally{clearTimeout(timer);}}
export async function destination(value,{lookup=dns.lookup,ownAddresses=interfaceAddresses,timeoutMs=2000}={}){
 const target=authority(value),addresses=await timed(lookup(target.hostname,{all:true}),timeoutMs,'PROXY_DNS_UNKNOWN');
 const own=new Set(ownAddresses().map(normalizeIp));
 if(!addresses.length||addresses.length>128||addresses.some(x=>!publicAddress(x.address)||own.has(normalizeIp(x.address))))throw failure('PROXY_DNS_NONPUBLIC_OR_SELF');
 // Prefer reachable ordinary IPv4; DNS does not run again during the dial.
 const ordered=[...addresses].sort((a,b)=>Number(a.family)-Number(b.family));
 return {...target,address:normalizeIp(ordered[0].address),family:ordered[0].family};
}
export function validatePeer(socket,target,ownAddresses=interfaceAddresses){
 const peer=normalizeIp(socket.remoteAddress),own=new Set(ownAddresses().map(normalizeIp));
 if(!peer||!publicAddress(socket.remoteAddress)||own.has(peer)||peer!==target.address||socket.remotePort!==target.port)throw failure('PROXY_PEER_MISMATCH');
}

export async function connectionFilter({fixtureOrigin,lookup=dns.lookup,dial=options=>net.connect(options),ownAddresses=interfaceAddresses,maxConnections=128}={}){
 const fixture=new URL(fixtureOrigin);if(fixture.protocol!=='http:'||fixture.hostname!=='127.0.0.1'||fixture.username||fixture.password||fixture.pathname!=='/'||fixture.search||fixture.hash||!fixture.port)throw failure('PROXY_FIXTURE_SCOPE');
 const sockets=new Set(),stats={connectAllowed:0,connectDenied:0,httpFixture:0,httpDenied:0,upgradeDenied:0,peerRejected:0,denialCodes:{}};let closing=false,activeDials=0,closePromise;
 const server=http.createServer({maxHeaderSize:16384},(request,response)=>{
  let url;try{url=new URL(request.url);}catch{request.resume();response.writeHead(403);response.end('Blocked');stats.httpDenied++;return;}
  // The only non-TLS path is this broker's synthetic fixture, never private APIs.
  if(closing||!['GET','HEAD'].includes(request.method)||url.origin!==fixture.origin||url.username||url.password||request.url.length>8192){request.resume();response.writeHead(403);response.end('Blocked');stats.httpDenied++;return;}
  stats.httpFixture++;
  const upstream=http.request({hostname:'127.0.0.1',port:Number(fixture.port),method:request.method,path:url.pathname+url.search,headers:{host:fixture.host,connection:'close'}},reply=>{
   response.writeHead(reply.statusCode||502,reply.headers);reply.pipe(response);
  });
  upstream.setTimeout(5000,()=>upstream.destroy());upstream.on('error',()=>{if(!response.headersSent)response.writeHead(502);response.end('Fixture unavailable');});request.resume();upstream.end();
 });
 server.headersTimeout=5000;server.requestTimeout=12000;
 server.on('connection',socket=>{sockets.add(socket);socket.on('error',()=>socket.destroy());socket.on('close',()=>sockets.delete(socket));socket.setTimeout(60000,()=>socket.destroy());if(closing||sockets.size>maxConnections*2)socket.destroy();});
 const reject=(socket,code=403)=>{if(!socket.destroyed)socket.end('HTTP/1.1 '+code+' Blocked\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');};
 server.on('upgrade',(_request,socket)=>{stats.upgradeDenied++;reject(socket);});
 server.on('clientError',(_error,socket)=>reject(socket,400));
 server.on('connect',async(request,client,head)=>{
  if(closing||activeDials>=maxConnections){stats.connectDenied++;reject(client,503);return;}
  activeDials++;
  let upstream;
  try{
   const target=await destination(request.url,{lookup,ownAddresses});if(closing||client.destroyed)throw failure('PROXY_CLOSED');
   upstream=dial({host:target.address,port:target.port,family:target.family});sockets.add(upstream);upstream.on('close',()=>sockets.delete(upstream));
   client.once('error',()=>upstream.destroy());
   await timed(new Promise((resolve,reject)=>{upstream.once('connect',resolve);upstream.once('error',reject);}),5000,'PROXY_CONNECT_UNKNOWN');
   validatePeer(upstream,target,ownAddresses);if(closing||client.destroyed)throw failure('PROXY_CLOSED');
   stats.connectAllowed++;
   // No TLS interception and no parsing of the encrypted application stream.
   client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head?.length)upstream.write(head);
   upstream.setTimeout(60000,()=>upstream.destroy());client.pipe(upstream);upstream.pipe(client);
   client.once('close',()=>upstream.destroy());upstream.once('close',()=>client.destroy());
  }catch(error){stats.connectDenied++;const code=/^[A-Z0-9_]{1,80}$/.test(error.code||'')?error.code:'PROXY_CONNECT_FAILED';stats.denialCodes[code]=(stats.denialCodes[code]||0)+1;if(error.code==='PROXY_PEER_MISMATCH')stats.peerRejected++;upstream?.destroy();reject(client,502);}
  finally{activeDials--;}
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return {port:server.address().port,stats(){return {...stats,denialCodes:{...stats.denialCodes},openSockets:sockets.size};},close(){return closePromise??=(async()=>{closing=true;for(const socket of sockets)socket.destroy();await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()));})();}};
}
