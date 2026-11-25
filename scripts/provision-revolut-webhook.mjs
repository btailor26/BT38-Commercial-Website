// Explicit operator action; never run on startup or on routine deployment.
const origin='https://www.bt38inv.com/api/checkout/webhook';
const key=process.env.REVOLUT_PRODUCTION_API_SECRET_KEY;
const version=process.env.REVOLUT_MERCHANT_API_VERSION;
if(!key||!version) throw Error('Existing merchant credentials required');
async function request(path,method='GET',body){
 const r=await fetch('https://merchant.revolut.com/api/'+path,{method,headers:{Authorization:'Bearer '+key,'Revolut-Api-Version':version,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error('Merchant API returned HTTP '+r.status);
 return r.json();
}
const listing=await request('webhooks');
const rows=Array.isArray(listing)?listing:listing?.webhooks;
if(!Array.isArray(rows))throw Error('Unrecognised webhook listing; refusing creation');
const matches=rows.filter(w=>w.url===origin);
if(matches.length>1)throw Error('Duplicate commercial webhooks require operator review');
let webhook;
if(matches.length===1){
 if(!matches[0].id)throw Error('Missing webhook ID');
 webhook=await request('webhooks/'+encodeURIComponent(matches[0].id));
}else{
 if(!process.argv.includes('--create'))throw Error('No commercial webhook found; explicit --create required');
 webhook=await request('webhooks','POST',{url:origin,events:['ORDER_COMPLETED']});
}
if(!webhook.id||webhook.url!==origin||!Array.isArray(webhook.events)||!webhook.events.includes('ORDER_COMPLETED')||typeof webhook.signing_secret!=='string'||!webhook.signing_secret||/[\r\n]/.test(webhook.signing_secret))throw Error('Webhook configuration incomplete');
// stdout is intended exclusively for a secure secret-import pipe.
process.stdout.write('REVOLUT_WEBHOOK_SIGNING_SECRET='+webhook.signing_secret+'\n');
