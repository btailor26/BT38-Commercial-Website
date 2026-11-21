// Local browser QA fixtures only. Never imported by the deployment entrypoints.
import http from 'node:http';
import {Readable} from 'node:stream';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import app from '../worker/index.js';
import {FileStore} from '../runtime/file-store.js';
const dataDir=await mkdtemp(join(tmpdir(),'bt38-preview-')),BUCKET=new FileStore(dataDir),user='qa-browser-preview',email='qa@example.invalid';
const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(user)))].map(x=>x.toString(16).padStart(2,'0')).join('');
await BUCKET.put('referrals/profiles/'+hash+'.json',JSON.stringify({owner:user,email,name:'QA Preview Partner',company:'Local QA fixtures',country:'United Kingdom',phone:'',website:'',specialism:'Technical and commercial introductions',network:'Illustrative local browser QA only.',application_terms:{version:'application-v1'},created_at:new Date().toISOString()}));
const env={BUCKET,ADMIN_EMAIL:email},port=Number(process.argv[process.argv.indexOf('--port')+1]||4173);
http.createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const headers={...req.headers,'oai-authenticated-user-id':user,'oai-authenticated-user-email':email};const abort=new AbortController();res.on('close',()=>abort.abort());const r=await app.fetch(new Request('http://'+req.headers.host+req.url,{method:req.method,headers,signal:abort.signal,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})}),env,{});const outgoing=Object.fromEntries(r.headers);delete outgoing['set-cookie'];if(r.headers.getSetCookie().length)outgoing['set-cookie']=r.headers.getSetCookie();res.writeHead(r.status,outgoing);if(r.body)Readable.fromWeb(r.body).on('error',()=>res.destroy()).pipe(res);else res.end();}catch{res.writeHead(500);res.end('Local QA unavailable');}}).listen(port,'0.0.0.0',()=>console.log('Local QA fixture preview on '+port));
process.on('SIGTERM',async()=>{await rm(dataDir,{recursive:true,force:true});process.exit(0)});
