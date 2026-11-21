import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SignJWT} from 'jose';
import worker from '../runtime/worker.js';
import {FileStore} from '../runtime/file-store.js';
import {earnings,summaries} from '../worker/commercial-api.js';
import {NeonRecordStore} from '../worker/neon-record-store.js';
const dir=await mkdtemp(join(tmpdir(),'bt38-commercial-')),origin='https://portal.example.invalid',env={BUCKET:new FileStore(dir),ADMIN_EMAIL:'admin@gmail.com',GOOGLE_CLIENT_ID:'test.apps.googleusercontent.com',GOOGLE_SESSION_SIGNING_KEY:'test-portal-session-'.repeat(3)};
const hash=async s=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');
const cookie=async(sub,email)=>'__Host-bt38-google='+await new SignJWT({purpose:'session',email}).setProtectedHeader({alg:'HS256'}).setSubject(sub).setIssuer('bt38-website').setAudience(origin).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(env.GOOGLE_SESSION_SIGNING_KEY));
const admin=await cookie('admin','admin@gmail.com'),alice=await cookie('alice','alice@gmail.com'),bob=await cookie('bob','bob@gmail.com'),customer=await cookie('buyer','buyer@customer.invalid');
async function call(path,method='GET',data,c='',extra={}){return worker.fetch(new Request(origin+path,{method,headers:{origin,cookie:c,'Content-Type':'application/json',...extra},...(data?{body:JSON.stringify(data)}:{})}),env,{});}
async function get(path,c=alice){const r=await call(path,'GET',null,c);assert.equal(r.status,200,path);return r.json();}
const profile={name:'Alice',company:'Alice agency',phone:'0123456789',country:'GB',website:'https://example.invalid',specialism:'B2B introductions',network:'Existing professional network',accepted:true};
const lead=(email='buyer@customer.invalid',company='Buyer company')=>({id:crypto.randomUUID(),company,name:'Buyer',email,phone:'',country:'GB',website:'',service:'API Integration',requirements:'Connect the existing order platform.',description:'Customer requested a discussion about connecting orders.',additional_notes:'',authorised:true});
let signal,reader;
try{
 for(const path of ['/partner','/partner/signup','/partner/login','/work-with-us','/account','/faqs'])assert.equal((await call(path)).status,200,path);
 assert.equal((await call('/api/portal/partner')).status,401);assert.equal((await call('/api/portal/partner','GET',null,'',{'oai-authenticated-user-id':'fake','oai-authenticated-user-email':'admin@gmail.com'})).status,401);
 assert.equal((await call('/api/admin/commercial','GET',null,alice)).status,403);
 const prior={...profile,owner:'google:alice',email:'alice@gmail.com',created_at:'2026-01-01T00:00:00Z',custom_existing:'preserved'};await env.BUCKET.put('referrals/profiles/'+await hash('google:alice')+'.json',JSON.stringify(prior));
 assert.equal((await call('/api/portal/partner/profile','POST',profile,alice)).status,200);let snapshot=await get('/api/portal/partner');assert.equal(snapshot.profile.created_at,prior.created_at);assert.equal(snapshot.profile.custom_existing,'preserved');assert.equal(snapshot.link,null);
 assert.equal((await call('/api/customer/account','POST',{company:'Alice customer company',name:'Alice',country:'GB'},alice)).status,200);
 assert.equal((await get('/api/portal/partner')).profile.owner,'google:alice');assert.equal((await get('/api/customer/account')).profile.owner,'google:alice');
 assert.equal((await call('/api/portal/referrals','POST',{...lead(),authorised:false},alice)).status,400);
 const pending=lead('pending@buyer.invalid','Pending buyer');let result=await call('/api/portal/referrals','POST',pending,alice);assert.equal(result.status,201);let first=(await result.json()).referral;assert.equal(first.terms_pending,true);
 let action={id:first.id,expected_stage:'submitted',stage:'under_review',explanation:'Reviewing the introduction.'};assert.equal((await call('/api/admin/commercial/update','POST',action,alice)).status,403);assert.equal((await call('/api/admin/commercial/update','POST',action,admin)).status,200);
 assert.equal((await call('/api/admin/commercial/update','POST',{...action,expected_stage:'under_review',stage:'qualified'},admin)).status,409);
 const terms={commission_bps:500,hold_days:0,payout_days:15,operator:'Local test business',contact:origin+'/contact',scope:'Eligible software project receipts after completed delivery and customer acceptance.',enabled:true,confirmed:true};const tr=await call('/api/admin/referral-settings','POST',terms,admin);assert.equal(tr.status,200);const published=await tr.json();
 assert.equal((await call('/api/portal/partner/profile','POST',{...profile,terms_version:'stale'},alice)).status,409);
 assert.equal((await call('/api/portal/partner/profile','POST',{...profile,terms_version:published.version,accept_pending:true},alice)).status,200);
 assert.equal((await call('/api/portal/partner/profile','POST',{...profile,name:'Bob',terms_version:published.version},bob)).status,200);
 snapshot=await get('/api/portal/partner');assert.ok(snapshot.link);assert.equal(snapshot.referrals[0].terms_pending,false);
 signal=new AbortController();const stream=await worker.fetch(new Request(origin+'/api/portal/events?after='+encodeURIComponent(snapshot.cursor),{headers:{cookie:alice},signal:signal.signal}),env,{});assert.equal(stream.headers.get('Content-Type'),'text/event-stream');reader=stream.body.getReader();await reader.read();
 const d=lead();result=await call('/api/portal/referrals','POST',d,alice);assert.equal(result.status,201);const saved=(await result.json()).referral;assert.equal((await call('/api/portal/referrals','POST',d,alice)).status,200);assert.equal((await get('/api/portal/partner')).referrals.filter(x=>x.id===d.id).length,1);
 let eventText='';for(let i=0;i<20&&!eventText.includes(d.id);i++){let timer;const event=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Push event not delivered')),2000)})]);clearTimeout(timer);eventText+=new TextDecoder().decode(event.value);}assert.ok(eventText.includes(d.id),eventText);assert.ok(!eventText.includes('buyer@customer.invalid'));signal.abort();await reader.cancel();
 const duplicate=await call('/api/portal/referrals','POST',{...lead(),company:'Duplicate company'},bob);assert.equal(duplicate.status,201);assert.equal((await duplicate.json()).duplicate,true);const bobView=await get('/api/portal/partner',bob);assert.equal(bobView.referrals.length,1);assert.equal(bobView.referrals[0].conflict,true);assert.ok(!JSON.stringify(bobView).includes('alice@gmail.com'));
 async function advance(stage,extra={}){const all=await get('/api/admin/commercial',admin),r=all.referrals.find(x=>x.id===d.id),expected_stage=r.progress?.stage||'submitted';const out=await call('/api/admin/commercial/update','POST',{id:d.id,expected_stage,stage,explanation:'Authorised test update: '+stage,...extra},admin);assert.equal(out.status,200,stage+' '+await out.clone().text());return (await out.json()).referral;}
 assert.equal((await call('/api/admin/commercial/update','POST',{id:d.id,expected_stage:'submitted',stage:'completed',explanation:'Invalid jump'},admin)).status,400);
 await advance('under_review');await advance('qualified');await advance('requirements_discussed');
 await advance('quotation_issued',{quote:{reference:'QUOTE-TEST',amount_pence:120000,net_pence:100000,customer_summary:'Authorised customer scope.'}});
 snapshot=await get('/api/portal/partner');assert.equal(snapshot.summary.potential_pence,5000);assert.equal(snapshot.summary.lifetime_earned_pence,0);assert.ok(!JSON.stringify(snapshot.referrals.find(x=>x.id===d.id)).includes('customer_summary'));
 await advance('project_approved');snapshot=await get('/api/portal/partner');assert.equal(snapshot.summary.projects_won,1);
 assert.equal((await call('/api/admin/'+d.id,'PATCH',{kind:'enquiry',status:'Lost',notes:'bypass',assigned:''},admin)).status,409);
 const receipt={enquiry_id:d.id,payment_reference:'verified-test-receipt',type:'payment',net_pence:100000,note:'Confirmed eligible settled receipt',verified:true};result=await call('/api/admin/referral-receipt','POST',receipt,admin);assert.equal(result.status,200);const entry=await result.json();
 snapshot=await get('/api/portal/partner');assert.equal(snapshot.summary.pending_pence,5000);assert.equal(snapshot.summary.lifetime_earned_pence,0);assert.equal(snapshot.summary.potential_pence,0);
 const commission={id:entry.id,action:'approve',confirmed:true,explanation:'Verified completion, acceptance and clearance.',expected_payment_at:'2026-12-01'};
 assert.equal((await call('/api/admin/commercial/commission','POST',commission,admin)).status,409);assert.equal((await call('/api/admin/referral-paid','POST',{id:entry.id,payout_reference:'bypass'},admin)).status,409);
 await advance('payment_received');await advance('in_progress');await advance('completed');await advance('accepted',{customer_accepted:true});await advance('clearance');
 result=await call('/api/admin/commercial/commission','POST',commission,admin);assert.equal(result.status,200,await result.clone().text());snapshot=await get('/api/portal/partner');assert.equal(snapshot.summary.approved_pence,5000);assert.equal(snapshot.summary.lifetime_earned_pence,5000);assert.equal(snapshot.summary.next_payment,'2026-12-01');
 assert.equal((await call('/api/admin/commercial/commission','POST',{...commission,action:'paid',payout_reference:'actual-payout',paid_pence:999},admin)).status,400);
 result=await call('/api/admin/commercial/commission','POST',{...commission,action:'paid',payout_reference:'actual-payout',paid_pence:5000},admin);assert.equal(result.status,200,await result.clone().text());snapshot=await get('/api/portal/partner');assert.equal(snapshot.summary.paid_pence,5000);assert.equal(snapshot.summary.approved_pence,0);
 assert.equal((await call('/api/admin/referral-receipt','POST',{...receipt,payment_reference:'verified-test-refund',type:'refund',net_pence:-20000,original_reference:receipt.payment_reference},admin)).status,200);snapshot=await get('/api/portal/partner');assert.equal(snapshot.summary.paid_pence,5000);assert.equal(snapshot.summary.reversed_pence,1000);assert.equal(snapshot.summary.recovery_due_pence,1000);assert.equal(snapshot.summary.lifetime_earned_pence,4000);
 // Customer ownership is explicit; it is never claimed simply by matching an email.
 await env.BUCKET.put('customers/accounts/'+await hash('google:buyer')+'.json',JSON.stringify({owner:'google:buyer',email:'buyer@customer.invalid',name:'Buyer',company:'Buyer company'}));
 assert.equal((await get('/api/portal/customer',customer)).referrals.length,0);assert.equal((await call('/api/admin/commercial/link-customer','POST',{id:d.id,customer_owner:'google:buyer',confirmed:true},admin)).status,200);const mine=await get('/api/portal/customer',customer);assert.equal(mine.referrals.length,1);assert.equal(mine.referrals[0].quotation.amount_pence,120000);assert.equal((await get('/api/portal/customer',bob)).referrals.length,0);
 assert.ok(!JSON.stringify(mine).includes('commission_pence'));assert.equal(mine.referrals[0].potential_pence,undefined);
 assert.ok((await get('/api/portal/faqs')).items.length>=10);new Function(await (await call('/portal.js')).text());
 // PostgreSQL event writes and concurrent financial mutations use single parameterised statements.
 const queries=[];const sql={query:async(text,params)=>{queries.push({text,params});return text.includes('AS updated')?[{updated:2}]:[{revision:2}];}};const store=new NeonRecordStore('test-events',null,{sql});await store.commitWithEvent('records/enquiry/test','{}',{onlyIf:{etagMatches:'1'}},'referrals/events/test','{}');assert.ok(queries.at(-1).text.includes('pg_notify'));assert.ok(queries.at(-1).text.includes('revision=$4::bigint'));
 assert.equal(await store.commitBatch([{key:'a',body:'{}',etag:'1'},{key:'b',body:'{}',etag:'2'}],[{key:'event',body:'{}'}]),true);assert.ok(queries.at(-1).text.includes('FOR UPDATE'));
 // Estimates alone never create earned money.
 assert.equal(earnings([],[]).lifetime_earned_pence,0);assert.equal(summaries([],[]).next_payment,null);
 console.log('Passed: dual roles and preserved profile, separate journeys, authenticated direct referrals, idempotency, duplicate flags, own-only timelines/quotes, valid transitions, live push without polling, strict commission approval/payment, refunds/recovery, event SQL and atomic financial updates.');
}finally{signal?.abort();try{await reader?.cancel();}catch{}await rm(dir,{recursive:true,force:true});}
