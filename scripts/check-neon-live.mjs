// Connection arrives only through hidden stdin; it is never persisted or logged.
import {NeonRecordStore} from '../worker/neon-record-store.js';
import assert from 'node:assert/strict';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for hidden database configuration.');
let input='';for await(const chunk of process.stdin){input+=chunk.toString();if(input.includes('\n'))break;}
try{const {connection}=JSON.parse(input.trim());const store=new NeonRecordStore(connection),prefix='meta/verification/';
await store.put(prefix+'connect.json',JSON.stringify({purpose:'BT38inv website database connection verification',checked_at:new Date().toISOString()}));
assert.equal((await (await store.get(prefix+'connect.json')).json()).purpose,'BT38inv website database connection verification');
const key=prefix+'conditional-'+crypto.randomUUID()+'.json';const results=await Promise.all([store.put(key,'{"ok":true}',{onlyIf:{etagDoesNotMatch:'*'}}),store.put(key,'{"ok":true}',{onlyIf:{etagDoesNotMatch:'*'}})]);assert.equal(results.filter(Boolean).length,1);
await store.delete(key);assert.equal(await store.get(key),null);
assert.equal(await store.put(key,'{"ok":true}',{onlyIf:{etagDoesNotMatch:'*'}}),null);
const listing=await store.list({prefix,limit:1});assert.equal(listing.objects.length,1);
const roles=await store.query("SELECT current_database() AS db, pg_has_role(current_user,'neon_superuser','member') AS admin");assert.equal(roles[0].db,'bt38inv_website');assert.equal(roles[0].admin,false);
console.log(JSON.stringify({database:roles[0].db,checks:'write/read, atomic create, tombstone protection, prefix listing, restricted role',passed:true}));
}catch{console.error('Database integration verification could not complete from this environment.');process.exitCode=1;}finally{if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.destroy();}
