import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';import {tmpdir} from 'node:os';
import {SignJWT} from 'jose';import worker from '../runtime/worker.js';import {FileStore} from '../runtime/file-store.js';
import {applicationInput,configuredTerms} from './partner-fixtures.mjs';import {memoryObjects} from './agreement-fixtures.mjs';import {hash,appKey} from '../worker/partner-policy.js';
const dir=await mkdtemp(join(tmpdir(),'bt38-agreements-')),origin='https://agreements.example.invalid',objects=memoryObjects(),env={BUCKET:new FileStore(dir),PRIVATE_UPLOADS:objects,ADMIN_EMAIL:'admin@gmail.com',GOOGLE_CLIENT_ID:'fixture.apps.googleusercontent.com',GOOGLE_SESSION_SIGNING_KEY:'agreements-local-only-'.repeat(4)};
const cookie=async sub=>'__Host-bt38-google='+await new SignJWT({email:sub+'@gmail.com',purpose:'session'}).setProtectedHeader({alg:'HS256'}).setSubject(sub).setIssuer('bt38-website').setAudience(origin).setIssuedAt().setExpirationTime('1h').sign(new TextEncoder().encode(env.GOOGLE_SESSION_SIGNING_KEY));
const admin=await cookie('admin'),alice=await cookie('alice'),bob=await cookie('bob'),owner='google:alice';
const call=(path,method='GET',body,as=admin,headers={})=>worker.fetch(new Request(origin+path,{method,headers:{cookie:as,Origin:origin,'Content-Type':'application/json',...headers},...(body!==undefined?{body:body instanceof Uint8Array?body:JSON.stringify(body)}:{})}),env,{});
const ok=async response=>{const r=await response;assert.ok(r.ok,await r.clone().text());return r.json();};
const upload=async(model,name='agreement.txt',bytes=new TextEncoder().encode('SYNTHETIC LOCAL TEST DOCUMENT. Not a commercial agreement.'),as=admin)=>{const id=crypto.randomUUID();const r=await call('/api/admin/partners/agreement-templates','POST',bytes,as,{'Content-Type':'application/octet-stream','X-Document-Id':id,'X-Commercial-Model':model,'X-Document-Version':'local-'+id,'X-File-Name':name});return r;};
const templates={};let settings;
const issue=async(model,extra={})=>{const id=crypto.randomUUID();return call('/api/admin/partners/agreements','POST',{id,owner,model,template_id:templates[model]?.id||crypto.randomUUID(),commission_bps:model==='full_sales'?1000:500,settings_version:settings.version,responsibilities:'Synthetic test responsibilities.',eligibility:'Synthetic test eligible verified receipts only.',payment_conditions:'Synthetic test payment after agreed clearance.',confirmed:true,...extra});};
const accept=(a,as=alice,extra={})=>call('/api/portal/partner/agreements/'+a.id+'/accept','POST',{accepted:true,document_hash:a.document_hash,document_version:a.document_version,declaration:a.declaration,...extra},as);
const referral=agreement_id=>({agreement_id,id:crypto.randomUUID(),company:'Synthetic buyer '+crypto.randomUUID(),name:'Buyer',email:crypto.randomUUID()+'@example.invalid',phone:'',country:'GB',website:'',service:'Software',requirements:'Test requirement',description:'Test opportunity',additional_notes:'',authorised:true});
let fetchBefore=globalThis.fetch;
try{
 for(const path of ['/admin-workspace.js','/portal.js','/referral.js','/sales.js'])new Function(await(await call(path)).text());
 assert.equal((await call('/api/admin/partners/agreement-templates','GET',undefined,alice)).status,403);assert.equal((await call('/api/admin/partners/agreements','GET',undefined,'')).status,401);
 await ok(call('/api/portal/partner/application','POST',applicationInput({approved_models:['full_sales'],agreement_ids:['forged'],terms_acceptance:{accepted_by:owner}}),alice));
 const initial=await ok(call('/api/portal/partner','GET',undefined,alice));assert.equal(initial.application.approved_models,undefined);assert.deepEqual(initial.agreements,[]);
 settings=await ok(call('/api/admin/referral-settings','POST',{...configuredTerms,models:{lead_introduction:500,bt38_warm_lead:500,full_sales:1000}}));assert.deepEqual(Object.keys(settings.models).sort(),['bt38_warm_lead','full_sales','lead_introduction']);
 await ok(call('/api/admin/partners/review','POST',{owner,expected_status:'submitted',status:'approved',approved_models:['full_sales','bt38_warm_lead'],confirmed:true,explanation:'Synthetic fixture approval for two independent models.'}));
 let p=await ok(call('/api/portal/partner','GET',undefined,alice));assert.equal(p.access.active,false);assert.equal(p.application.terms_acceptance,null);
 assert.equal((await call('/api/portal/partner/accept-terms','POST',{accepted:true,version:settings.version},alice)).status,409);
 assert.equal((await issue('lead_introduction')).status,409);
 for(const model of ['full_sales','bt38_warm_lead']){const t=(await ok(upload(model))).template;assert.equal(t.active,false);templates[model]=t;await ok(call('/api/admin/partners/agreement-templates/'+t.id,'PATCH',{active:true,explanation:'Activate local test document version.'}));}
 let a=(await ok(issue('full_sales'))).agreement;assert.equal(a.status,'issued');assert.equal(a.acceptance,null);assert.equal((await ok(call('/api/portal/partner','GET',undefined,alice))).access.active,false);
 assert.equal((await accept(a,bob)).status,404);assert.equal((await accept(a,alice,{accepted:false})).status,409);assert.equal((await accept(a,alice,{document_hash:'stale'})).status,409);
 assert.equal((await call('/api/admin/partners/agreements/'+a.id+'/accept?owner='+encodeURIComponent(owner),'POST',{accepted:true})).status,403);
 await ok(accept(a));p=await ok(call('/api/portal/partner','GET',undefined,alice));assert.equal(p.access.active,true);assert.equal(p.agreements[0].document.object_key,undefined);assert.equal(p.agreements[0].acceptance.accepted_by,owner);
 const repeated=await ok(accept(a));assert.equal(repeated.agreement.acceptance.accepted_at,p.agreements[0].acceptance.accepted_at);
 assert.equal((await call('/api/portal/partner/agreements/'+a.id+'/content','GET',undefined,bob)).status,404);assert.equal((await call('/api/portal/partner/agreements/'+a.id+'/content','GET',undefined,alice)).status,200);
 const firstLead=(await ok(call('/api/portal/referrals','POST',referral(a.id),alice))).referral;assert.equal(firstLead.commission_bps,1000);assert.equal(firstLead.agreement_id,a.id);
 const warm=(await ok(issue('bt38_warm_lead'))).agreement;await ok(accept(warm));p=await ok(call('/api/portal/partner','GET',undefined,alice));assert.equal(p.access.models.length,2);
 assert.equal((await call('/api/portal/referrals','POST',referral(warm.id),alice)).status,403);
 const id=crypto.randomUUID();await env.BUCKET.put('records/enquiry/'+id+'.json',JSON.stringify({id,reference:'TEST-WARM',company:'Warm buyer',name:'Contact',email:'warm@example.invalid',status:'New',progress:{stage:'submitted'},sales:{activities:[]},date:new Date().toISOString()}));
 const assigned=await ok(call('/api/admin/commercial/assign-warm-lead','POST',{id,partner_owner:owner,expected_stage:'submitted',confirmed:true,explanation:'Assign synthetic BT38-provided warm lead.'}));assert.equal(assigned.referral.referral.agreement_id,warm.id);assert.equal(assigned.referral.referral.commission_bps,500);
 await ok(call('/api/sales?workspace=partner','POST',{enquiry_id:id,action:'activity',kind:'call',content:'Synthetic warm sales call.'},alice));
 assert.equal((await call('/api/sales?workspace=partner','POST',{enquiry_id:id,action:'quote_approve',confirmed:true},alice)).status,403);
 const ak='/api/admin/partners/agreements/'+warm.id+'?owner='+encodeURIComponent(owner);await ok(call(ak,'PATCH',{status:'suspended',confirmed:true,explanation:'Suspend only the synthetic warm agreement.'}));
 assert.equal((await call('/api/sales?workspace=partner','POST',{enquiry_id:id,action:'activity',kind:'call',content:'Should be blocked.'},alice)).status,403);
 assert.equal((await call('/api/portal/referrals','POST',referral(a.id),alice)).status,201);assert.equal((await ok(call('/api/portal/partner','GET',undefined,alice))).access.models.length,1);
 await ok(call(ak,'PATCH',{status:'accepted',confirmed:true,explanation:'Reactivate previously accepted agreement.'}));
 // Later programme publication cannot rewrite or invalidate an accepted document agreement.
 settings=await ok(call('/api/admin/referral-settings','POST',{...configuredTerms,models:{lead_introduction:500,bt38_warm_lead:500,full_sales:1200}}));
 const retained=await ok(call('/api/portal/partner','GET',undefined,alice));assert.equal(retained.agreements.find(g=>g.id===a.id).commission_bps,1000);assert.equal(retained.referrals.find(r=>r.id===firstLead.id).commission_bps,1000);
 assert.equal((await issue('full_sales')).status,400);const variant=(await ok(issue('full_sales',{variation_authorised:true,variation_reason:'Explicit synthetic individually agreed rate variation.'}))).agreement;assert.equal(variant.variation.baseline_bps,1200);
 const revised=(await ok(issue('full_sales',{commission_bps:1200,supersedes:a.id}))).agreement;assert.equal((await ok(call('/api/portal/partner','GET',undefined,alice))).agreements.find(g=>g.id===a.id).status,'accepted');await ok(accept(revised));p=await ok(call('/api/portal/partner','GET',undefined,alice));assert.equal(p.agreements.find(g=>g.id===a.id).status,'superseded');assert.equal(p.referrals.find(r=>r.id===firstLead.id).commission_bps,1000);
 await ok(call('/api/sales?workspace=partner','POST',{enquiry_id:firstLead.id,action:'activity',kind:'follow_up',content:'Historical lead retains original agreement rights.'},alice));
 assert.equal((await call('/api/portal/referrals','POST',referral(a.id),alice)).status,403);
 // Record preservation and administrator amendments retain original applicant content.
 const managed=(await ok(call('/api/admin/partners/applications'))).applications.find(a=>a.owner===owner);await ok(call('/api/admin/partners/manage','POST',{owner,expected_updated_at:managed.updated_at,company:'Updated trading name',phone:'0123456789',internal_notes:'PRIVATE ADMIN NOTE',account_status:'active',explanation:'Correct contact information.'}));
 const secretFree=await ok(call('/api/portal/partner','GET',undefined,alice));assert.ok(!JSON.stringify(secretFree.application).includes('PRIVATE ADMIN NOTE'));const amended=(await ok(call('/api/admin/partners/applications'))).applications.find(a=>a.owner===owner);assert.equal(amended.original_application.company,applicationInput().company);assert.ok(amended.admin_history.length);
 // Quarantined agreements cannot be activated, downloaded or issued.
 const pdf=new TextEncoder().encode('%PDF-1.7\nSynthetic fixture only\n%%EOF');const q=(await ok(upload('full_sales','fixture.pdf',pdf))).template;assert.equal(q.state,'quarantined');assert.equal((await call('/api/admin/partners/agreement-templates/'+q.id,'PATCH',{active:true,explanation:'Try releasing unscanned PDF.'})).status,409);
 assert.equal((await call('/api/admin/partners/agreement-templates/'+q.id+'/content')).status,409);
 const savedObjects=objects.files;const issued=p.agreements.find(g=>g.id===revised.id);const location=[...savedObjects.keys()].find(k=>k.includes(issued.document_hash));savedObjects.set(location,new TextEncoder().encode('tampered'));
 assert.equal((await call('/api/portal/partner/agreements/'+revised.id+'/content','GET',undefined,alice)).status,409);
 // Reads do not mutate any record, including audit history or acceptance evidence.
 const snapshot=JSON.stringify(env.BUCKET.data);await ok(call('/api/admin/partners/agreement-templates'));await ok(call('/api/admin/partners/agreements'));await ok(call('/api/portal/partner','GET',undefined,alice));assert.equal(JSON.stringify(env.BUCKET.data),snapshot);
 console.log('Passed: separate approval/issue/acceptance, immutable document evidence, owner-only acceptance/downloads, multi-model sales permissions, independent suspension, explicit variations, replacement acceptance, original lead rates, audit history, quarantined uploads and read-only GETs.');
}finally{globalThis.fetch=fetchBefore;await rm(dir,{recursive:true,force:true});}
