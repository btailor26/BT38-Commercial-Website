// Optional live verification. Hidden stdin only; no records, schemas or credentials are changed.
import assert from 'node:assert/strict';
import {Client,neonConfig} from '@neondatabase/serverless';
import {NeonRecordStore} from '../worker/neon-record-store.js';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for hidden restricted website connection.');
let input='';for await(const chunk of process.stdin){input+=chunk.toString();if(input.includes('\n'))break;}
let client,timer;
try{
 const {connection}=JSON.parse(input.trim()),store=new NeonRecordStore(connection);
 const info=await store.query('SELECT current_database() AS database_name,current_user AS role_name');assert.equal(info[0].database_name,'bt38inv_website');assert.equal(info[0].role_name,'bt38inv_website_app');
 const before=await store.query("SELECT record_key,md5(body) AS fingerprint FROM website.records WHERE site_id='bt38inv' AND NOT deleted ORDER BY record_key");
 const captured=[],stub=new NeonRecordStore('fake',null,{sql:{query:async(text,params)=>{captured.push({text,params});return [];}}});
 await stub.commitWithEvent('meta/test-not-written','{}',{onlyIf:{etagMatches:'1'}},'meta/event-not-written','{}');await stub.commitWithEvent('meta/test-not-written','{}',{onlyIf:{etagDoesNotMatch:'*'}},'meta/event-not-written','{}');await stub.commitBatch([{key:'meta/a-not-written',body:'{}',etag:'1'},{key:'meta/b-not-written',body:'{}',etag:'1'}],[{key:'meta/event-not-written',body:'{}'}]);
 for(const {text,params}of captured)await store.query('EXPLAIN '+text,params);
 const direct=new URL(connection);direct.hostname=direct.hostname.replace('-pooler.','.');neonConfig.webSocketConstructor=WebSocket;client=new Client({connectionString:direct.toString(),connectionTimeoutMillis:10000});client.on('error',()=>{});await client.connect();await client.query('LISTEN bt38_website_events');const id=crypto.randomUUID();const received=new Promise((resolve,reject)=>{timer=setTimeout(()=>reject(Error('Notification timeout')),15000);client.on('notification',message=>{try{if(JSON.parse(message.payload).id===id)resolve();}catch{}});});await store.query("SELECT pg_notify('bt38_website_events',$1)",[JSON.stringify({id,date:new Date().toISOString(),kind:'diagnostic',key:'meta/verification/not-a-record-'+id,audience:[]})]);await received;clearTimeout(timer);
 const after=await store.query("SELECT record_key,md5(body) AS fingerprint FROM website.records WHERE site_id='bt38inv' AND NOT deleted ORDER BY record_key");assert.deepEqual(after,before);
 console.log(JSON.stringify({database:'bt38inv_website',role:'bt38inv_website_app',passed:true,checks:'read-only connection, event/CAS/atomic SQL plans, live LISTEN/NOTIFY, unchanged record fingerprints',records:after.length}));
}catch{console.error('Live read-only event verification did not complete. No record mutations were attempted.');process.exitCode=1;}finally{clearTimeout(timer);if(client)await client.end().catch(()=>{});if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.destroy();}
