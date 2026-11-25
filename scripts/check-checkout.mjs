import {configuredTerms,approveFixture} from './partner-fixtures.mjs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import worker from '../worker/index.js';
const objects=new Map(),origin='https://site.example.invalid';
const BUCKET={async get(k){const v=objects.get(k);return v===undefined?null:{text:async()=>v,json:async()=>JSON.parse(v)}},async put(k,v,opts){if(opts?.onlyIf&&objects.has(k))return null;objects.set(k,v);return {key:k}},async list({prefix}){return {objects:[...objects.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false}}};
const env={BUCKET};
async function call(path,method='GET',d,extra={}){return worker.fetch(new Request(origin+path,{method,headers:{origin,'Content-Type':'application/json','oai-authenticated-user-id':'buyer','oai-authenticated-user-email':'buyer@example.invalid',...extra},...(d?{body:typeof d==='string'?d:JSON.stringify(d)}:{})}),env,{});}
const closed=await (await call('/api/checkout/config')).json();assert.equal(closed.ready,false);
assert.equal((await call('/api/checkout/create','POST',{})).status,503);
assert.equal((await call('/api/checkout/status?id=unknown')).status,404);
for(const path of ['/checkout?product=support','/billing']){const r=await call(path);assert.equal(r.status,200);assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');}
new vm.Script(await (await call('/checkout.js')).text());
Object.assign(env,{CHECKOUT_ENABLED:'true',REVOLUT_PRODUCTION_API_SECRET_KEY:'test-only',REVOLUT_MERCHANT_API_VERSION:'2024-09-01',REVOLUT_WEBHOOK_SIGNING_SECRET:'test-signature-only',RESEND_API_KEY:'test-only',EMAIL_FROM:'billing@example.invalid',INVOICE_SELLER_NAME:'Example supplier Ltd',INVOICE_SELLER_ADDRESS:'Example address',INVOICE_COMPANY_NUMBER:'EXAMPLE',INVOICE_CONTACT_EMAIL:'billing@example.invalid',BILLING_COUNTRY_TAX_JSON:JSON.stringify({GB:{bps:2000,label:'Includes 20% VAT'}}),INVOICE_VAT_NUMBER:'TEST-ONLY'});
let payment={id:'b5e1fa7a-2c1e-4d4c-b232-a0f634f670d1',state:'pending',amount:9900,currency:'GBP',outstanding_amount:9900,checkout_url:'https://checkout.revolut.com/payment-link/example'},writes=0,emails=0,emailFailure=false,emailPayload;
const originalFetch=globalThis.fetch;
globalThis.fetch=async(url,opts)=>{if(url==='https://merchant.revolut.com/api/orders'){writes++;const d=JSON.parse(opts.body);assert.equal(d.amount,9900);assert.equal(d.capture_mode,'automatic');assert.equal(d.merchant_order_data.reference,order.id);payment={...payment,merchant_order_data:{reference:d.merchant_order_data.reference}};assert.ok(opts.headers['Idempotency-Key']);return Response.json(payment,{status:201});}if(url==='https://merchant.revolut.com/api/orders/'+payment.id)return Response.json(payment);if(url==='https://api.resend.com/emails'){emails++;emailPayload=JSON.parse(opts.body);assert.deepEqual(emailPayload.to,['buyer@example.invalid']);assert.ok(opts.headers['Idempotency-Key']);return emailFailure?Response.json({error:'unavailable'},{status:503}):Response.json({id:'mock-email'});}throw Error('Unexpected network request: '+url);};
await call('/api/customer/account','POST',{company:'Buyer company',name:'Buyer',country:'GB'});
const order={id:crypto.randomUUID(),token:'a'.repeat(64),product:'audit',company:'Buyer <script>',name:'Buyer',email:'buyer@example.invalid',address:'1 Sample Street',city:'Example',postcode:'AB1 2CD',country:'GB',accepted:true,amount:1};
const partnerCode='BT38-'+'C'.repeat(20);
const referralTerms={...configuredTerms,version:'test-v1',hold_days:14};await BUCKET.put('referrals/settings.json',JSON.stringify(referralTerms));await approveFixture(BUCKET,'partner',referralTerms);
objects.set('referrals/partners/'+partnerCode+'.json',JSON.stringify({code:partnerCode,email:'partner@example.invalid',owner:'partner',status:'active',terms:{...referralTerms,commission_model:'lead_introduction'}}));order.referral_code=partnerCode;
try{
assert.equal((await call('/api/checkout/create','POST',{...order,country:'ZZ'})).status,400);
assert.equal((await call('/api/checkout/create','POST',{...order,company:''})).status,400);
assert.equal((await call('/api/checkout/create','POST',order,{origin:'https://other.example.invalid'})).status,403);
const created=await call('/api/checkout/create','POST',order);assert.equal(created.status,200);const next=await created.json();assert.ok(next.billing_url.startsWith('/billing?'));
assert.equal((await call('/api/checkout/create','POST',order)).status,200);assert.equal(writes,1);
assert.equal((await call('/api/checkout/create','POST',{...order,email:'other@example.invalid'})).status,409);
const q='?id='+order.id+'&token='+order.token;assert.equal((await call('/api/checkout/status?id='+order.id+'&token='+'b'.repeat(64),'GET',null,{'oai-authenticated-user-id':'other'})).status,404);
assert.equal((await call('/api/checkout/invoice'+q)).status,409);assert.equal(emails,0);
assert.equal((await (await call('/api/checkout/status'+q)).json()).state,'pending');
payment={...payment,state:'authorised',outstanding_amount:0};await call('/api/checkout/status'+q);assert.equal(emails,0);
payment={...payment,state:'completed',amount:1};assert.equal((await call('/api/checkout/status'+q)).status,409);assert.equal(emails,0);
payment.amount=9900;
payment.merchant_order_data.reference='wrong-reference';assert.equal((await call('/api/checkout/status'+q)).status,409);assert.equal(emails,0);payment.merchant_order_data.reference=order.id;
async function webhook(raw,offset=0){const ts=String(Date.now()+offset),key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.REVOLUT_WEBHOOK_SIGNING_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);const signature=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode('v1.'+ts+'.'+raw))),b=>b.toString(16).padStart(2,'0')).join('');return call('/api/checkout/webhook','POST',raw,{'Revolut-Request-Timestamp':ts,'Revolut-Signature':'v1='+signature});}
const event=JSON.stringify({event:'ORDER_COMPLETED',order_id:payment.id});
assert.equal((await call('/api/checkout/webhook','POST',event)).status,401);assert.equal((await webhook(event,-600000)).status,401);
emailFailure=true;assert.equal((await webhook(event)).status,503);assert.equal((await call('/api/checkout/invoice'+q)).status,200);
emailFailure=false;assert.equal((await webhook(event)).status,200);const sent=emails;assert.equal((await webhook(event)).status,200);assert.equal(emails,sent);
const invoice=await (await call('/api/checkout/invoice'+q)).text();assert.ok(invoice.includes('£99.00'));assert.ok(invoice.includes('£82.50'));assert.ok(invoice.includes('£16.50'));assert.ok(invoice.includes('Buyer &lt;script&gt;'));assert.ok(!invoice.includes('Buyer <script>'));assert.ok(invoice.includes('PAID'));assert.ok(emailPayload.html.includes('Invoice'));
const status=await (await call('/api/checkout/status'+q)).json();assert.equal(status.state,'completed');assert.equal(status.invoice_email,'sent');assert.equal(writes,1);
assert.ok(objects.has('records/enquiry/'+order.id+'.json'));
const billing=await (await call('/api/customer/billing')).json();assert.equal(billing.orders.length,1);assert.equal(billing.orders[0].invoice_number,status.invoice_number||billing.orders[0].invoice_number);assert.equal((await call('/api/customer/invoices/'+order.id)).status,200);assert.equal((await call('/api/customer/invoices/'+order.id,'GET',null,{'oai-authenticated-user-id':'other'})).status,409);
const entries=[...objects.entries()].filter(([key])=>key.startsWith('referrals/ledger/')).map(([,v])=>JSON.parse(v));assert.equal(entries.length,1);assert.equal(entries[0].commission_pence,413);const agreementEntries=[...objects.entries()].filter(([key])=>key.startsWith('referrals/agreements/')).map(([,body])=>JSON.parse(body));assert.equal(agreementEntries.length,1);assert.equal(entries[0].terms_version,agreementEntries[0].id);
console.log('Passed: checkout configuration gate, billing details, server price, origin validation, idempotency, private order access, payment mismatch rejection, signed webhooks, no invoice before completed payment, invoice tax totals, email retry and duplicate-event protection.');
}finally{globalThis.fetch=originalFetch;}
