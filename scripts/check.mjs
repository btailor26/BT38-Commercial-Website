import assert from 'node:assert/strict';
import {SignJWT} from 'jose';
import worker from '../worker/index.js';
const data=new Map();const BUCKET={async get(k){const v=data.get(k);return v===undefined?null:{text:async()=>v,json:async()=>JSON.parse(v)}},async put(k,v){data.set(k,v)},async delete(k){data.delete(k)},async list({prefix}){return {objects:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false}}};
const env={BUCKET,ADMIN_EMAIL:'admin@example.invalid',GOOGLE_CLIENT_ID:'test-client.apps.googleusercontent.com',GOOGLE_SESSION_SIGNING_KEY:'local-smoke-test-signing-key-'.repeat(3)},origin='https://test.invalid';
async function testSession(email){return '__Host-bt38-google='+await new SignJWT({purpose:'session',email}).setProtectedHeader({alg:'HS256'}).setSubject('smoke-test-'+email).setIssuer('bt38-website').setAudience(origin).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(env.GOOGLE_SESSION_SIGNING_KEY));}
const adminCookie=await testSession(env.ADMIN_EMAIL),visitorCookie=await testSession('unauthorised@example.invalid');
async function call(path,method='GET',value,auth){let headers={origin,'Content-Type':'application/json'};if(auth)headers.cookie=auth===env.ADMIN_EMAIL?adminCookie:visitorCookie;return worker.fetch(new Request(origin+path,{method,headers,...(value?{body:JSON.stringify(value)}:{})}),env,{});}
for(const path of ['/','/services','/integrations','/solutions','/about','/contact','/work-with-us','/privacy'])assert.equal((await call(path)).status,['/services','/integrations','/about','/faqs'].includes(path)?308:200,path);
const adminRedirect=await call('/admin');assert.equal(adminRedirect.status,302,'Unauthenticated administrator sign-in redirect');assert.equal(adminRedirect.headers.get('location'),origin+'/auth/google?returnTo=%2Fadmin');
assert.equal((await call('/admin','GET',null,'unauthorised@example.invalid')).status,403,'Signed non-admin must not access administrator page');
assert.equal((await call('/admin','GET',null,env.ADMIN_EMAIL)).status,200,'Signed administrator must reach dashboard');
assert.equal((await worker.fetch(new Request(origin+'/admin',{headers:{'oai-authenticated-user-id':'spoofed','oai-authenticated-user-email':env.ADMIN_EMAIL}}),env,{})).status,302,'Forged identity headers must not bypass sign-in');
assert.equal((await call('/api/admin')).status,401);assert.equal((await call('/api/admin','GET',null,'unauthorised@example.invalid')).status,403);
let d={kind:'enquiry',id:crypto.randomUUID(),started:Date.now()-5000,privacy:true,name:'Test enquiry',company:'QA',email:'qa@example.invalid',country:'UK',service:'API Integration',description:'Local-only test'};
assert.equal((await call('/api/submit','POST',{...d,email:'invalid'})).status,400);assert.equal((await call('/api/submit','POST',{...d,company_fax:'spam'})).status,400);
let r=await call('/api/submit','POST',d);assert.equal(r.status,200);const ref=(await r.json()).reference;assert.ok(ref.startsWith('BT38-E-'));
assert.equal((await (await call('/api/submit','POST',d)).json()).reference,ref);assert.equal([...data.keys()].filter(k=>k.startsWith('records/')).length,1);
assert.equal((await call('/api/submit','POST',{...d,id:crypto.randomUUID()})).status,429);
// The existing throttle takes precedence. After it clears, the same details are a duplicate.
for(const key of [...data.keys()].filter(key=>key.startsWith('limits/')))data.delete(key);
const duplicateResponse=await call('/api/submit','POST',{...d,id:crypto.randomUUID()});
assert.equal(duplicateResponse.status,409);
assert.match((await duplicateResponse.json()).error,/Duplicate record/);
assert.equal([...data.keys()].filter(k=>k.startsWith('records/')).length,1);
let rows=await (await call('/api/admin','GET',null,env.ADMIN_EMAIL)).json();assert.equal(rows.records.length,1);
assert.equal((await call('/api/admin/'+d.id,'PATCH',{kind:'enquiry',status:'Quoted',assigned:'Sales',notes:'Test update'},env.ADMIN_EMAIL)).status,200);
rows=await (await call('/api/admin','GET',null,env.ADMIN_EMAIL)).json();assert.equal(rows.records[0].status,'Quoted');
assert.equal((await call('/api/admin/'+d.id+'?kind=enquiry','DELETE',null,env.ADMIN_EMAIL)).status,200);
let partner={...d,kind:'partner',id:crypto.randomUUID(),email:'partner@example.invalid',city:'Leicester',applicant_type:'Individual professional',years:'4–7 years',experience:'API delivery',participation:'Available for individual projects only',availability:'Project-dependent',initial_income:'Yes',categories:['API Integration Specialist'],commercial:['Open to discussion']};assert.equal((await call('/api/submit','POST',partner)).status,200);
assert.equal((await call('/api/admin','GET',null,'unauthorised@example.invalid')).status,403);
const script=await (await call('/app.js')).text();new Function(script);
console.log('Passed: all pages, client syntax, form validation, anti-spam, persistent submission, idempotency, access control, admin update, deletion and partnership application.');
