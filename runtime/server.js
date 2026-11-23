import http from 'node:http';
import {Readable} from 'node:stream';
import worker from '../dist/server/index.js';
import {FileStore} from './file-store.js';
import {FileObjects} from './file-objects.js';
const port=Number(process.env.PORT||3000),production=process.env.NODE_ENV==='production'||!!process.env.FLY_APP_NAME;
if(production&&(!process.env.PUBLIC_ORIGIN?.startsWith('https://')||!process.env.WEBSITE_DATABASE_URL))throw Error('Production requires HTTPS PUBLIC_ORIGIN and the existing dedicated WEBSITE_DATABASE_URL.');
const env={...process.env};if(!env.WEBSITE_DATABASE_URL){env.BUCKET=new FileStore(process.env.LOCAL_DATA_DIR||'.data');env.PRIVATE_UPLOADS=new FileObjects((process.env.LOCAL_DATA_DIR||'.data')+'/uploads');}
http.createServer(async(req,res)=>{try{
 const maximum=req.method==='POST'&&req.url.split('?')[0]==='/api/portal/partner/documents'?Math.min(20*1024*1024,Math.max(1024,Number(env.PARTNER_UPLOAD_MAX_BYTES)||10*1024*1024)):req.url.startsWith('/api/sales/import/parse')?2097152:req.url.startsWith('/api/sales/')?1600000:32768;let length=0,chunks=[];for await(const chunk of req){length+=chunk.length;if(length>maximum){res.writeHead(413);res.end('Request too large');return;}chunks.push(chunk);}
 const origin=process.env.PUBLIC_ORIGIN||'http://localhost:'+port;
 const target=new URL(req.url,origin);if(target.origin!==new URL(origin).origin){res.writeHead(400);res.end('Invalid request target');return;}
 const headers=new Headers();for(const [k,v]of Object.entries(req.headers))if(v!==undefined&&!['host','connection','content-length','transfer-encoding'].includes(k))headers.set(k,Array.isArray(v)?v.join(','):v);
 const abort=new AbortController();res.on('close',()=>abort.abort());const request=new Request(target,{method:req.method,headers,signal:abort.signal,...(!['GET','HEAD'].includes(req.method)?{body:Buffer.concat(chunks)}:{})});
 const response=await worker.fetch(request,env,{waitUntil:promise=>promise.catch(()=>{})});
 const outgoing=Object.fromEntries(response.headers);delete outgoing['set-cookie'];const cookies=response.headers.getSetCookie();if(cookies.length)outgoing['set-cookie']=cookies;
 res.writeHead(response.status,outgoing);if(response.body){Readable.fromWeb(response.body).on('error',()=>res.destroy()).pipe(res);}else res.end();
 }catch{res.writeHead(500,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('The request could not be completed.');}
}).listen(port,'0.0.0.0',()=>console.log('BT38 application listening on port '+port));
