import frontend from '../.generated/public-frontend.json' with {type:'json'};
const PREFIX='public-chat/conversations/',COOKIE='__Host-bt38-public-chat',TTL=30*24*60*60*1000;
const normal=s=>s.toLowerCase().normalize('NFKC').replace(/[^a-z0-9£]+/g,' ').trim();
const stop=new Set('a an the is are do does i my me you your can could what how it to of for on and with or in we us bt38'.split(' '));
const tokens=s=>[...new Set(normal(s).split(' ').filter(w=>w.length>2&&!stop.has(w)))];
const contact='Please use the BT38 enquiry form so we can review your requirements and respond through the existing system.';
export function publicAnswer(message){
 const q=normal(message),words=tokens(message),fallback={text:contact,href:'/contact'};
 if(/\b(demonstration|demo|quote|quotation|bespoke requirements|enquiry|contact|my project|my business|call|video|whatsapp|live agent|password|customer account|commission|admin|refund my|order status)\b/.test(q))return fallback;
 const topics=[[/\b(pricing|prices|packages|cost)\b/,'How much does a system cost?'],[/\b(audit|£99)\b/,'What is included in the £99 Business Systems Audit?'],[/\b(existing systems?|replace)\b/,'Do I need to replace my existing systems?'],[/\b(customer service|chatbot|chat assistant)\b/,'Can you automate customer service?'],[/\b(source code)\b/,'Will I receive the source code?']];
 // Specific questions outrank broad topic words (e.g. hosting charges versus package pricing).
 const ranked=frontend.knowledge.map(item=>{const kw=tokens(item.question),overlap=words.filter(w=>kw.includes(w)).length;return {item,overlap,score:overlap/(Math.max(kw.length,words.length)||1)};}).sort((a,b)=>b.score-a.score);
 let item;if(ranked[0]?.score>=.55&&ranked[0].overlap>=2&&(ranked[0].score>(ranked[1]?.score||0)+.05||normal(ranked[0].item.question)===q))item=ranked[0].item;
 if(!item)for(const [pattern,question]of topics)if(pattern.test(q)&&words.length<=7&&words.every(w=>tokens(question).includes(w)||['pricing','prices','packages','cost','audit','£99','existing','systems','replace','chatbot','assistant','service','customer','source','code'].includes(w))){item=frontend.knowledge.find(i=>i.question===question);break;}
 return item?{text:item.answer,href:item.source}:fallback;
}
function token(req){const values=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(COOKIE+'='));return values.length===1&&/^[a-f0-9]{64}\.\d{13}$/.test(values[0].slice(COOKIE.length+1))?values[0].slice(COOKIE.length+1):null;}
const cookie=(value,age=2592000)=>`${COOKIE}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
export async function publicChatApi(req,env,url,{json,digest}){
 if(req.method!=='POST')return json({error:'Submit a message to use the assistant.'},405);
 if(req.headers.get('origin')!==url.origin)return json({error:'Invalid request origin.'},403);
 if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return json({error:'Submit a JSON message.'},415);
 if(!env.BUCKET?.atomicUpdate)return json({error:'Chat is unavailable. Please use the enquiry form.'},503);
 let data;try{const text=await req.text();if(text.length>4000)throw Error();data=JSON.parse(text);if(!data||Array.isArray(data)||typeof data!=='object')throw Error();}catch{return json({error:'Invalid message.'},400);}
 const existingToken=token(req),now=Date.now(),expiry=t=>Number(t.split('.')[1]),conversationKey=async t=>PREFIX+String(expiry(t)).padStart(13,'0')+'-'+await digest(t)+'.json';
 if(data.action==='forget'){
  if(existingToken){const key=await conversationKey(existingToken);if(await env.BUCKET.get(key))await env.BUCKET.delete(key);}
  const r=json({ok:true});r.headers.set('Set-Cookie',cookie('',0));return r;
 }
 if(typeof data.message!=='string'||!data.message.trim()||data.message.length>1000||/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(data.message)||!/^[-a-f0-9]{36}$/.test(data.id||''))return json({error:'Enter a question of 1–1000 characters.'},400);
 if(/(?:password|api[_ -]?key|secret|cvv|card[_ -]?number)\s*[:=]|\b(?:\d[ -]?){13,19}\b/i.test(data.message))return json({error:'Do not send passwords, credentials or payment details. Please ask about public website information only.'},400);
 if(existingToken&&expiry(existingToken)<=now)return json({error:'This conversation has expired. Clear the conversation to start again.'},410);
 let capability=existingToken||[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('')+'.'+(now+TTL),key=await conversationKey(capability);
 // Trusted Fly proxy identity, hashed before persistence. Never use a browser-provided conversation ID.
 const network=await digest('bt38-public-chat|'+(req.headers.get('fly-client-ip')||'unidentified'));
 const rateKeys=[['minute',Math.floor(now/60000),8,60000],['day',Math.floor(now/86400000),100,86400000]].map(([kind,bucket,max,unit])=>{const expires_at=(bucket+2)*unit;return {key:`public-chat/limits/${String(expires_at).padStart(13,'0')}-${network}-${kind}-${bucket}.json`,max,expires_at};});
 for(let attempt=0;attempt<3;attempt++){
  let obj=await env.BUCKET.get(key),prior=obj?await obj.json():null;
  // Unknown/cleared capabilities are rotated; caller-controlled timestamps never set retention.
  if(!prior&&existingToken){capability=[...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join('')+'.'+(now+TTL);key=await conversationKey(capability);obj=null;}
  if(prior&&prior.expires_at<=now){const r=json({error:'This conversation has expired. Clear the conversation to start again.'},410);return r;}
  if(prior?.turns?.some(t=>t.id===data.id)){const turn=prior.turns.find(t=>t.id===data.id);if(turn.visitor.text!==data.message.trim())return json({error:'Message reference already used.'},409);return json({messages:prior.turns.flatMap(t=>[t.visitor,t.assistant]),knowledge_version:frontend.knowledgeVersion});}
  if((prior?.turns?.length||0)>=40)return json({error:'Conversation limit reached. Clear this conversation or use the enquiry form.'},429);
  const rates=await Promise.all(rateKeys.map(async r=>{const obj=await env.BUCKET.get(r.key);return {...r,obj,value:obj?await obj.json():null};}));
  if(rates.some(r=>(r.value?.count||0)>=r.max))return json({error:'Message limit reached. Please try later or use the enquiry form.'},429);
  const answer=publicAnswer(data.message),at=new Date(now).toISOString(),turn={id:data.id,visitor:{role:'visitor',text:data.message.trim(),at},assistant:{role:'assistant',...answer,at,knowledge_version:frontend.knowledgeVersion}};
  const conversation={created_at:prior?.created_at||at,expires_at:prior?.expires_at||now+TTL,turns:[...(prior?.turns||[]),turn]};
  const writes=[{key,body:JSON.stringify(conversation),etag:obj?.etag??null},...rates.map(r=>({key:r.key,body:JSON.stringify({count:(r.value?.count||0)+1,expires_at:r.expires_at}),etag:r.obj?.etag??null}))];
  if(await env.BUCKET.atomicUpdate(writes)){
   // Bounded namespace-only expiry cleanup, triggered by a submitted message; no timer or routine polling.
   if(env.BUCKET.purgeExpiredPublicChats)await env.BUCKET.purgeExpiredPublicChats(now,20);
   const response=json({messages:conversation.turns.flatMap(t=>[t.visitor,t.assistant]),knowledge_version:frontend.knowledgeVersion});response.headers.set('Set-Cookie',cookie(capability,Math.max(1,Math.floor((conversation.expires_at-now)/1000))));return response;
  }
 }
 return json({error:'Another message is being saved. Please retry.'},409);
}
