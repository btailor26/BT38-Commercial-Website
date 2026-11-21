import assert from 'node:assert/strict';
import {generateKeyPair,SignJWT,exportJWK,createLocalJWKSet} from 'jose';
import {googleAuthApi,googleIdentity} from '../worker/google-auth.js';
import worker from '../worker/index.js';
const origin='https://site.example.invalid',env={GOOGLE_CLIENT_ID:'test-client.apps.googleusercontent.com',GOOGLE_SESSION_SIGNING_KEY:'test-session-key-'.repeat(4),CUSTOMER_AUTH_PROVIDER:'google'};
const json=(v,status=200)=>Response.json(v,{status});const body=req=>req.json();
const {privateKey,publicKey}=await generateKeyPair('RS256'),jwk={...await exportJWK(publicKey),kid:'test-google'};const keys=createLocalJWKSet({keys:[jwk]});
const req=(path,d,cookie='',o=origin)=>new Request(origin+path,{method:'POST',headers:{origin:o,'Content-Type':'application/json',cookie},body:JSON.stringify(d)});
const cookieValue=(response,name)=>response.headers.getSetCookie().find(c=>c.startsWith(name+'=')).split(';')[0];
let r=await googleAuthApi(req('/api/auth/google/start',{returnTo:'/signup'}),env,new URL(origin+'/api/auth/google/start'),{json,body},keys);assert.equal(r.status,200);const config=await r.json(),state=cookieValue(r,'__Host-bt38-google-start');assert.ok(r.headers.getSetCookie()[0].includes('HttpOnly'));
const token=async(extra={},aud=env.GOOGLE_CLIENT_ID)=>new SignJWT({email:'alice@gmail.com',email_verified:true,name:'Alice',nonce:config.nonce,...extra}).setProtectedHeader({alg:'RS256',kid:'test-google'}).setSubject('google-user-123').setIssuer('https://accounts.google.com').setAudience(aud).setIssuedAt().setExpirationTime('1h').sign(privateKey);
async function complete(credential,cookie=state,o=origin){return googleAuthApi(req('/api/auth/google/complete',{credential},cookie,o),env,new URL(origin+'/api/auth/google/complete'),{json,body},keys);}
assert.equal((await complete(await token(),'')).status,401);assert.equal((await complete(await token({nonce:'wrong'}))).status,401);assert.equal((await complete(await token({},'other-client'))).status,401);assert.equal((await complete(await token({email_verified:false}))).status,401);assert.equal((await complete(await token({email:'other@external.example'}))).status,401);assert.equal((await complete(await token(),state,'https://other.example.invalid')).status,403);
r=await complete(await token());assert.equal(r.status,200);assert.equal((await r.json()).redirect,'/signup');const cookie=cookieValue(r,'__Host-bt38-google');
assert.ok(r.headers.getSetCookie().some(c=>c.startsWith('__Host-bt38-google-start=;')));
const identity=await googleIdentity(new Request(origin+'/api/customer/account',{headers:{cookie}}),env,new URL(origin));assert.equal(identity.id,'google:google-user-123');assert.equal(identity.email,'alice@gmail.com');
assert.equal(await googleIdentity(new Request('https://other.example.invalid/',{headers:{cookie}}),env,new URL('https://other.example.invalid')),null);
assert.equal(await googleIdentity(new Request(origin,{headers:{cookie:cookie+'x'}}),env,new URL(origin)),null);
const data=new Map();env.BUCKET={async get(k){return data.has(k)?{json:async()=>JSON.parse(data.get(k)),text:async()=>data.get(k)}:null},async put(k,v){data.set(k,v)},async list({prefix}){return {objects:[...data.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false}}};
const forged={'oai-authenticated-user-id':'forged-user','oai-authenticated-user-email':'fake@example.invalid'};
assert.equal((await worker.fetch(new Request(origin+'/api/customer/account',{headers:forged}),env,{})).status,401);
r=await worker.fetch(new Request(origin+'/api/customer/account',{method:'POST',headers:{origin,cookie,'Content-Type':'application/json',...forged},body:JSON.stringify({company:'Example',name:'Alice',country:'GB'})}),env,{});assert.equal(r.status,200);assert.equal((await r.json()).profile.owner,'google:google-user-123');
r=await worker.fetch(new Request(origin+'/api/customer/account',{headers:{cookie}}),env,{});assert.equal((await r.json()).profile.email,'alice@gmail.com');
r=await googleAuthApi(req('/api/auth/logout',{},cookie),env,new URL(origin+'/api/auth/logout'),{json,body},keys);assert.equal(r.status,200);assert.ok(r.headers.getSetCookie()[0].includes('Max-Age=0'));
for(const path of ['/signup','/login','/partner','/auth/google']){const response=await worker.fetch(new Request(origin+path),env,{});assert.equal(response.status,200);const h=await response.text();assert.ok(!h.includes('Continue with ChatGPT'));}
console.log('Passed: signed Google tokens, audience/nonce/email checks, CSRF, secure session cookies, session audience binding, forged identity rejection, customer ownership and logout.');
