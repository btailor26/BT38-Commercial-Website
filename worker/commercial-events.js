import {Client,neonConfig} from '@neondatabase/serverless';
const channel='bt38_website_events';
const localListeners=new Set();
export const visibleTo=(event,user,admin)=>admin||event.kind==='programme'||event.audience?.includes(user);
export async function scan(store,prefix){let result=[],cursor;do{const p=await store.list({prefix,cursor});for(const o of p.objects){const item=await store.get(o.key);if(item)result.push(await item.json());}cursor=p.truncated?p.cursor:undefined;}while(cursor);return result;}
async function makeEvent(target,key,value){
 const item=JSON.parse(value),audience=[];let referral=item;
 if(key.startsWith('referrals/ledger/')){const obj=await target.get('records/enquiry/'+item.enquiry_id+'.json');referral=obj?await obj.json():{};const p=item.code?await target.get('referrals/partners/'+item.code+'.json'):null;if(p)audience.push((await p.json()).owner);}
 if(item.owner&&/^(referrals\/applications\/|referrals\/documents\/)/.test(key))audience.push(item.owner);if(referral.referral?.owner)audience.push(referral.referral.owner);if(referral.customer_owner)audience.push(referral.customer_owner);
 const event={id:crypto.randomUUID(),date:new Date().toISOString(),key,referral_id:referral.id||null,audience:[...new Set(audience)],kind:key==='referrals/settings.json'?'programme':key.startsWith('referrals/ledger/')?'commission':key.startsWith('referrals/applications/')?'application':key.startsWith('referrals/documents/')?'document':'referral'};
 return {key:'referrals/events/'+event.date+'-'+event.id+'.json',body:JSON.stringify(event),event};
}
export function eventStore(store){if(!store)return store;return new Proxy(store,{get(target,name){
 if(name==='atomicUpdate')return async writes=>{const events=await Promise.all(writes.map(w=>makeEvent(target,w.key,w.body)));let ok;
 if(target.commitBatch)ok=await target.commitBatch(writes,events);else if(target.batch){ok=await target.batch(writes,events);if(ok)for(const {event}of events)for(const fn of localListeners)fn(event);}else throw Error('Atomic commercial updates require Neon or the independent file store.');
 return ok;
 };
 if(name!=='put'){const value=target[name];return typeof value==='function'?value.bind(target):value;}
 return async(key,value,options)=>{if(!/^(records\/enquiry\/|referrals\/(ledger|applications|documents)\/|referrals\/settings\.json$)/.test(key))return target.put(key,value,options);
 const saved=await makeEvent(target,key,value);let result;
 if(target.commitWithEvent)result=await target.commitWithEvent(key,value,options,saved.key,saved.body);else{result=await target.put(key,value,options);if(result!==null){await target.put(saved.key,saved.body);for(const fn of localListeners)fn(saved.event);}}
 return result;};
 }});}
// One authenticated push connection while a dashboard is open; no database polling.
export async function eventStream(req,env,{user,admin,view,project}){
 if(!user)return Response.json({error:'Sign in required.'},{status:401});
 const encoder=new TextEncoder(),last=req.headers.get('last-event-id')||new URL(req.url).searchParams.get('after');
 let client,heartbeat,closed=false,controller;const tasks=new Set();
 const send=(name,data,id)=>{if(!closed)controller.enqueue(encoder.encode((id?'id: '+id+'\n':'')+'event: '+name+'\ndata: '+JSON.stringify(data)+'\n\n'));};
 const pending=[];let replaying=true;const seen=new Set();
 const deliver=async event=>{if(closed||seen.has(event.id)||!visibleTo(event,user,admin))return;seen.add(event.id);const projection=await project(event,env.BUCKET,{user,admin,view});if(projection)send('change',projection,event.date+'|'+event.id);};
 const onEvent=event=>{if(replaying){pending.push(event);return;}const p=deliver(event).catch(()=>send('unavailable',{message:'Refresh to reconnect.'}));tasks.add(p);p.finally(()=>tasks.delete(p));};
 const cleanup=()=>{if(closed)return;closed=true;clearInterval(heartbeat);localListeners.delete(onEvent);if(client)client.end().catch(()=>{});try{controller.close();}catch{}};
 const stream=new ReadableStream({async start(c){controller=c;send('connecting',{connected:false});req.signal.addEventListener('abort',cleanup,{once:true});
 try{
  if(env.WEBSITE_DATABASE_URL){if(globalThis.WebSocket)neonConfig.webSocketConstructor=globalThis.WebSocket;const direct=new URL(env.WEBSITE_DATABASE_URL);direct.hostname=direct.hostname.replace('-pooler.','.');client=new Client({connectionString:direct.toString(),connectionTimeoutMillis:10000});client.on('error',()=>{send('unavailable',{message:'Live connection interrupted. Reconnect to recover saved updates.'});cleanup();});client.on('notification',message=>{try{onEvent(JSON.parse(message.payload));}catch{}});await client.connect();await client.query('LISTEN '+channel);}else localListeners.add(onEvent);
  if(last){if(last.length>150)throw Error('Invalid cursor');const events=await scan(env.BUCKET,'referrals/events/');for(const event of events.filter(e=>Date.parse(e.date)>=Date.parse(last.split('|')[0])-60000).sort((a,b)=>(a.date+'|'+a.id).localeCompare(b.date+'|'+b.id)))await deliver(event);}
  replaying=false;for(const e of pending)onEvent(e);send('ready',{connected:true});heartbeat=setInterval(()=>{if(!closed)controller.enqueue(encoder.encode(': heartbeat\n\n'));},20000);
 }catch{send('unavailable',{message:'Live updates unavailable. Your saved records remain available using Refresh.'});cleanup();}
 },cancel(){cleanup();}});
 return new Response(stream,{headers:{'Content-Type':'text/event-stream','Cache-Control':'no-store','X-Accel-Buffering':'no','X-Content-Type-Options':'nosniff'}});
}
