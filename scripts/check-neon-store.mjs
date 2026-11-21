import assert from 'node:assert/strict';
import {assertNoBankDetails,NeonRecordStore} from '../worker/neon-record-store.js';
assert.doesNotThrow(()=>assertNoBankDetails({provider_reference:'ref',status:'pending',company_number:'12345'}));
for(const data of [{iban:'example'},{billing:{sort_code:'example'}},{items:[{bankAccountNumber:'example'}]},{card_number:'example'},{bank_details:{anything:'example'}}])assert.throws(()=>assertNoBankDetails(data));
const data=new Map(),events=[];
const sql={async query(text,params){events.push({text,params});const key=params[1];if(text.startsWith('INSERT')){const old=data.get(key);if(text.includes('DO NOTHING')&&old)return [];const deleted=text.includes("'null',true");const row={record_key:key,body:deleted?'null':params[2],deleted,revision:(old?.revision||0)+1};data.set(key,row);return [row];}
if(text.includes('record_key LIKE')){const prefix=key.slice(0,-1).replace(/\\([\\%_])/g,'$1');return [...data.values()].filter(r=>!r.deleted&&r.record_key.startsWith(prefix)&&r.record_key>params[2]).sort((a,b)=>a.record_key.localeCompare(b.record_key)).slice(0,params[3]);}
return data.has(key)?[data.get(key)]:[];},async transaction(queries){return Promise.all(queries)}};
const store=new NeonRecordStore('test-neon-only',null,{sql});assert.equal(events.length,0);
await store.put('records/enquiry/a.json','{"company":"Example"}');assert.equal((await (await store.get('records/enquiry/a.json')).json()).company,'Example');
assert.equal(await store.put('records/enquiry/a.json','{}',{onlyIf:{etagDoesNotMatch:'*'}}),null);
await store.put('records/enquiry/b.json','{}');let page=await store.list({prefix:'records/enquiry/',limit:1});assert.equal(page.truncated,true);const next=await store.list({prefix:'records/enquiry/',limit:1,cursor:page.cursor});assert.equal(next.objects[0].key,'records/enquiry/b.json');
await store.delete('records/enquiry/a.json');assert.equal(await store.get('records/enquiry/a.json'),null);
await assert.rejects(store.put('referrals/bank.json','{"iban":"test"}'));
const legacy={async list(){return {objects:[{key:'records/enquiry/a.json'},{key:'records/enquiry/c.json'}],truncated:false}},async get(k){return {text:async()=>JSON.stringify({legacy:k})}}};
const importing=new NeonRecordStore('test-neon-only',legacy,{sql});const result=await importing.importLegacy();assert.equal(result.examined,2);assert.equal(result.inserted,1);assert.equal(await importing.get('records/enquiry/a.json'),null);assert.ok(await importing.get('records/enquiry/c.json'));assert.equal(await importing.migrationFinished(),true);
for(const call of events)assert.ok(!call.text.includes('Example'));
console.log('Passed: no queries at construction, parameterised statements, JSON records, atomic insert semantics, pagination, tombstones, safe legacy import and bank/card-field rejection.');
