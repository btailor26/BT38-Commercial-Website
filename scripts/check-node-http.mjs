import http from 'node:http';
import {applicationInput,configuredTerms} from './partner-fixtures.mjs';
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SignJWT} from 'jose';
const built=spawnSync(process.execPath,['scripts/build-standalone.mjs'],{stdio:'inherit'});assert.equal(built.status,0);
// Fly must never activate development disk storage, even with a bad NODE_ENV override.
for(const environment of [{NODE_ENV:'production'},{NODE_ENV:'development',FLY_APP_NAME:'bt38-commercial-website'}]){
 const result=spawnSync(process.execPath,['runtime/server.js'],{env:{...process.env,...environment,WEBSITE_DATABASE_URL:'',PUBLIC_ORIGIN:'https://www.bt38inv.com'},encoding:'utf8'});
 assert.notEqual(result.status,0);assert.match(result.stderr,/Production requires HTTPS PUBLIC_ORIGIN/);
 assert.doesNotMatch(result.stdout,/listening/);assert.doesNotMatch(result.stderr,/EACCES/);
}
const directory=await mkdtemp(join(tmpdir(),'bt38-node-')),port=43219,origin='https://node-test.example.invalid',key='local-only-node-session-'.repeat(3);
const server=spawn(process.execPath,['runtime/server.js'],{env:{...process.env,PORT:String(port),NODE_ENV:'development',WEBSITE_DATABASE_URL:'',PUBLIC_ORIGIN:origin,LOCAL_DATA_DIR:directory,GOOGLE_CLIENT_ID:'local-test.apps.googleusercontent.com',GOOGLE_SESSION_SIGNING_KEY:key,ADMIN_EMAIL:'admin@gmail.com'},stdio:['ignore','pipe','pipe']});
let abort,reader;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server did not start')),8000);server.on('error',reject);server.stdout.on('data',d=>{if(d.toString().includes('listening')){clearTimeout(timer);resolve();}});server.once('exit',code=>{if(code)reject(Error('Server exited before verification'));});});
 const cookie='__Host-bt38-google='+await new SignJWT({email:'alice@gmail.com',purpose:'session'}).setProtectedHeader({alg:'HS256'}).setSubject('alice').setIssuer('bt38-website').setAudience(origin).setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(key));
 const call=(path,method='GET',body,signal,asCookie=cookie)=>fetch('http://127.0.0.1:'+port+path,{method,headers:{cookie:asCookie,origin,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal});
 assert.equal((await call('/')).status,200);assert.equal((await call('/api/portal/partner/profile','POST',applicationInput({name:'Alice',company:'Local QA'}))).status,200);
 const adminCookie='__Host-bt38-google='+await new SignJWT({email:'admin@gmail.com',purpose:'session'}).setProtectedHeader({alg:'HS256'}).setSubject('admin').setIssuer('bt38-website').setAudience(origin).setIssuedAt().setExpirationTime('5m').sign(new TextEncoder().encode(key));
 const terms=await (await call('/api/admin/referral-settings','POST',{...configuredTerms,contact:origin+'/contact'},null,adminCookie)).json();
 assert.equal((await call('/api/admin/partners/review','POST',{owner:'google:alice',expected_status:'submitted',status:'approved',approved_model:'lead_introduction',confirmed:true,explanation:'Local Node verification approval.'},null,adminCookie)).status,200);
 assert.equal((await call('/api/portal/partner/accept-terms','POST',{accepted:true,version:terms.version})).status,200);
 const upload=await fetch('http://127.0.0.1:'+port+'/api/portal/partner/documents',{method:'POST',headers:{cookie,origin,'Content-Type':'application/octet-stream','X-File-Name':'node-profile.txt','X-Document-Id':crypto.randomUUID()},body:'Professional profile. '.repeat(3000)});assert.equal(upload.status,201,'Uploads larger than the JSON body limit must use the bounded file route.');
 const initial=await (await call('/api/portal/partner')).json();abort=new AbortController();const stream=await call('/api/portal/events?after='+encodeURIComponent(initial.cursor),'GET',null,abort.signal);assert.equal(stream.status,200);reader=stream.body.getReader();await reader.read();
 const id=crypto.randomUUID(),result=await call('/api/portal/referrals','POST',{id,company:'Node HTTP buyer',name:'Buyer',email:'buyer@example.invalid',phone:'',country:'GB',website:'',service:'API integration',requirements:'Local test',description:'Local HTTP/SSE verification',additional_notes:'',authorised:true});assert.equal(result.status,201);
 let content='';for(let i=0;i<20&&!content.includes(id);i++){let timer;const part=await Promise.race([reader.read(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('SSE did not stream through the Node adapter')),3000)})]);clearTimeout(timer);content+=new TextDecoder().decode(part.value);}assert.ok(content.includes(id));
 console.log('Passed: independent Node HTTP startup, authenticated profile/referral routes, incremental SSE response streaming and disconnect cleanup.');
}finally{abort?.abort();try{await reader?.cancel();}catch{}server.kill('SIGTERM');await new Promise(resolve=>server.once('exit',resolve));await rm(directory,{recursive:true,force:true});}

const canonical=spawn(process.execPath,['runtime/server.js'],{env:{...process.env,PORT:String(port),NODE_ENV:'production',WEBSITE_DATABASE_URL:'postgresql://unused.invalid/test',PUBLIC_ORIGIN:'https://www.bt38inv.com'},stdio:['ignore','pipe','pipe']});
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Canonical server did not start')),8000);canonical.stdout.on('data',d=>{if(d.toString().includes('listening')){clearTimeout(timer);resolve();}});canonical.once('exit',()=>reject(Error('Canonical server exited')));});
 const response=await new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port,path:'/contact?service=API',headers:{Host:'bt38inv.com'}},r=>{r.resume();resolve(r);}).on('error',reject);});
 assert.equal(response.statusCode,308);assert.equal(response.headers.location,'https://www.bt38inv.com/contact?service=API');
 assert.equal((await fetch('http://127.0.0.1:'+port+'/',{headers:{Host:'bt38-commercial-website.fly.dev'}})).status,200);
 console.log('Passed: apex canonical redirect preserves paths/queries; Fly preview stays available.');
}finally{canonical.kill('SIGTERM');await new Promise(resolve=>canonical.once('exit',resolve));}
