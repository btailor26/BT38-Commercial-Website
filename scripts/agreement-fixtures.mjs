// Synthetic documents for isolated tests only. Never import this module into production.
import assert from 'node:assert/strict';
export function memoryObjects(){const files=new Map();return {files,put:async(k,b)=>files.set(k,new Uint8Array(b)),get:async k=>files.has(k)?{arrayBuffer:async()=>files.get(k).slice().buffer}:null,delete:async k=>files.delete(k)};}
export async function issueAcceptFixture({worker,env,origin,admin,partner,owner,model='lead_introduction',supersedes,fetcher}){
 if(env&&!env.PRIVATE_UPLOADS)env.PRIVATE_UPLOADS=memoryObjects();const run=fetcher||(req=>worker.fetch(req,env,{}));
 const call=async(path,method='GET',body,cookie=admin,headers={})=>run(new Request(origin+path,{method,headers:{Origin:origin,cookie,'Content-Type':'application/json',...headers},...(body!==undefined?{body:body instanceof Uint8Array?body:JSON.stringify(body)}:{})}));
 const settings=await(await call('/api/admin/referral-settings')).json(),id=crypto.randomUUID();
 let r=await call('/api/admin/partners/agreement-templates','POST',new TextEncoder().encode('LOCAL TEST DOCUMENT ONLY. '+id),admin,{'Content-Type':'application/octet-stream','X-Document-Id':id,'X-Commercial-Model':model,'X-Document-Version':'fixture-'+id,'X-File-Name':'fixture.txt'});assert.equal(r.status,201,await r.clone().text());
 r=await call('/api/admin/partners/agreement-templates/'+id,'PATCH',{active:true,explanation:'Activate isolated fixture document.'});assert.equal(r.status,200,await r.clone().text());
 r=await call('/api/admin/partners/agreements','POST',{id:crypto.randomUUID(),owner,model,template_id:id,commission_bps:settings.models[model]??(model==='full_sales'?1000:500),settings_version:settings.version,responsibilities:'Local test commercial responsibilities only.',eligibility:'Local test eligibility on verified eligible receipts.',payment_conditions:'Local test payment after agreed eligibility and clearance.',confirmed:true,supersedes});assert.equal(r.status,201,await r.clone().text());const a=(await r.json()).agreement;
 r=await call('/api/portal/partner/agreements/'+a.id+'/accept','POST',{accepted:true,document_hash:a.document_hash,document_version:a.document_version,declaration:a.declaration},partner);assert.equal(r.status,200,await r.clone().text());return (await r.json()).agreement;
}
