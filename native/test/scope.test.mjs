import test from 'node:test';import assert from 'node:assert/strict';
import {originsForTask,nativeScope,canonicalOrigin,allowedUrl,publicOrigin,publicAddress} from '../scripts/scope.mjs';
const deadline=()=>performance.now()+3000;
const publicDns=async()=>[{address:'93.184.216.34',family:4},{address:'2606:4700:4700::1111',family:6}];
test('default task is public HTTPS, explicit task retains eight-origin top navigation scope',()=>{
 assert.equal(originsForTask(undefined),null);assert.equal(nativeScope(null),'PUBLIC_HTTPS_V1');
 assert.deepEqual(originsForTask(['https://example.com']),['https://example.com']);
 assert.throws(()=>originsForTask(Array.from({length:9},(_,i)=>`https://site${i}.example.com`)),{code:'INVALID_ORIGINS'});
 assert.throws(()=>originsForTask(['https://example.com','https://example.com']),{code:'DUPLICATE_ORIGIN'});
});
test('public default accepts a different public HTTPS site/port, explicit top scope fails without DNS widening',async()=>{
 assert.equal((await allowedUrl('https://public.example.com/read',null,'http://127.0.0.1:49189',deadline(),publicDns)).mode,'public-https');
 assert.equal((await allowedUrl('https://public.example.com:8443/read',null,'http://127.0.0.1:49189',deadline(),publicDns)).origin,'https://public.example.com:8443');
 let resolved=false;await assert.rejects(allowedUrl('https://other.example.com/', ['https://example.com'],'http://127.0.0.1:49189',deadline(),async()=>{resolved=true;return publicDns();}),{code:'ORIGIN_OUT_OF_SCOPE'});assert.equal(resolved,false);
});
test('URL credentials, IP/localhost/file/http/local domain are still rejected before DNS',async()=>{
 for(const url of ['https://user:password@example.com/','https://127.0.0.1/','https://2130706433/','https://0x7f000001/','https://0177.0.0.1/','https://[::1]/','https://[::ffff:127.0.0.1]/','https://localhost/','https://localhost./','https://server.local/','file:///example/data','http://example.com/'])await assert.rejects(allowedUrl(url,null,'http://127.0.0.1:49189',deadline(),publicDns));
 for(const origin of ['https://example.com:*','https://*.example.com','https://example.com/path','https://example.com?secret=x'])assert.throws(()=>canonicalOrigin(origin));
});
test('DNS mixed public/private and IPv6 special ranges fail closed',async()=>{
 for(const address of ['10.1.2.3','127.0.0.1','169.254.1.2','192.168.1.2','100.64.1.1','::1','fc00::1','fe80::1','::ffff:93.184.216.34','2001:db8::1','2002:0102::1','3fff::1'])assert.equal(publicAddress(address),false,address);
 assert.equal(publicAddress('2606:4700:4700::1111'),true);
 await assert.rejects(publicOrigin('https://example.com',deadline(),async()=>[{address:'93.184.216.34',family:4},{address:'fc00::1',family:6}]),{code:'DNS_NONPUBLIC'});
 await assert.rejects(publicOrigin('https://example.com',deadline(),async()=>[]),{code:'DNS_NONPUBLIC'});
});
