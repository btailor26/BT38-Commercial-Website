import {applicationInput,configuredTerms,approveFixture} from './partner-fixtures.mjs';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SignJWT} from 'jose';
import worker from '../runtime/worker.js';
import original from '../worker/index.js';
import {FileStore} from '../runtime/file-store.js';
const dir=await mkdtemp(join(tmpdir(),'bt38-test-')),origin='https://example.invalid';
const env={BUCKET:new FileStore(dir),ADMIN_EMAIL:'admin@gmail.com',GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com',GOOGLE_SESSION_SIGNING_KEY:'local-test-key-'.repeat(4)};
const cookie=async(sub,email)=>'__Host-bt38-google='+await new SignJWT({purpose:'session',email}).setProtectedHeader({alg:'HS256'}).setSubject(sub).setIssuer('bt38-website').setAudience(origin).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(env.GOOGLE_SESSION_SIGNING_KEY));
const admin=await cookie('admin-sub','admin@gmail.com'),alice=await cookie('alice-sub','alice@gmail.com');
const call=(path,method='GET',data,c='',extra={})=>worker.fetch(new Request(origin+path,{method,headers:{origin,cookie:c,'Content-Type':'application/json',...extra},...(data?{body:JSON.stringify(data)}:{})}),env,{});
try{
for(const path of ['/','/services','/integrations','/solutions','/about','/contact','/work-with-us','/partner','/account','/account/onboarding','/account/billing','/account/support','/signup','/login','/admin','/auth/google'])assert.equal((await call(path)).status,200,path);
assert.equal((await call('/api/admin','GET',null,'',{'oai-authenticated-user-id':'forged','oai-authenticated-user-email':env.ADMIN_EMAIL})).status,401);
assert.equal((await call('/api/admin','GET',null,alice)).status,403);
assert.equal((await call('/api/admin','GET',null,admin)).status,200);
assert.equal((await call('/api/customer/admin/overview','GET',null,admin)).status,200);
assert.equal((await call('/api/storage/import','POST',{},'')).status,403);
const redirect=await call('/signin-with-chatgpt?returnTo=/admin');assert.equal(redirect.status,302);assert.equal(new URL(redirect.headers.get('location')).pathname,'/auth/google');
assert.equal((await call('/api/customer/account','POST',{name:'Alice',company:'Example',country:'GB'},alice)).status,200);
assert.equal((await (await call('/api/customer/account','GET',null,alice)).json()).profile.owner,'google:alice-sub');
assert.equal((await call('/api/partner/profile','POST',applicationInput({name:'Alice',country:'GB'}),alice)).status,200);
const terms={...configuredTerms,version:'local-fixture'};await env.BUCKET.put('referrals/settings.json',JSON.stringify(terms));await approveFixture(env.BUCKET,'google:alice-sub',terms);assert.equal((await call('/api/referral/account','GET',null,alice)).status,200);
const lead={kind:'enquiry',id:crypto.randomUUID(),started:Date.now()-5000,privacy:true,name:'Local test',company:'Example',email:'lead@example.invalid',country:'UK',service:'API Integration',description:'Test only'};
assert.equal((await call('/api/submit','POST',lead)).status,200);
const reopened=new FileStore(dir);assert.ok(await reopened.get('records/enquiry/'+lead.id+'.json'));
const result=await Promise.all([reopened.put('atomic','{}',{onlyIf:{etagDoesNotMatch:'*'}}),reopened.put('atomic','{}',{onlyIf:{etagDoesNotMatch:'*'}})]);assert.equal(result.filter(Boolean).length,1);
// Source page and script bytes remain identical except the admin sign-in wording.
for(const path of ['/','/partner','/app.js','/referral.js','/account.js','/checkout.js']){const a=await (await call(path)).text(),b=await (await original.fetch(new Request(origin+path),env,{})).text();assert.equal(a,b.replaceAll('Sign in with ChatGPT','Sign in with Google'),path);}
console.log('Passed: standalone Google admin/customer/partner sessions, forged header rejection, pages/scripts preserved, enquiry persistence, local atomic creates and import protection.');
}finally{await rm(dir,{recursive:true,force:true});}
