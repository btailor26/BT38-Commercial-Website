import {scan,eventStream} from './commercial-events.js';
import {hash,appKey,jsonRecord} from './partner-policy.js';
const uuid=x=>/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(x||'');
const root=(workspace,owner)=>'messages/threads/'+workspace+'/'+owner+'/';
const cursor=m=>m.created_at+'|'+m.id;
const fail=(message,status=400)=>{throw Object.assign(Error(message),{status});};
export const applicationConversation=async owner=>({id:await hash('partner:'+owner+':application'),workspace:'partner',owner,reference:'application',subject:'Partner application',status:'open'});
const threadKey=async t=>root(t.workspace,await hash(t.owner))+t.id+'.json';
const messagePrefix=id=>'messages/items/'+id+'/';
const receiptKey=async(t,user)=>'messages/read/'+t.id+'/'+await hash(user)+'.json';
function messageView(m,admin){return {...m,sender:admin?m.sender:m.sender_role==='admin'?'BT38 administration':m.owner};}
async function accessible(store,id,user,admin,workspace){const candidates=await scan(store,admin?'messages/threads/':root(workspace,await hash(user)));let t=candidates.find(t=>t.id===id);if(!t&&admin){for(const a of await scan(store,'referrals/applications/')){const v=await applicationConversation(a.owner);if(v.id===id){t={...v,name:a.name,company:a.company,email:a.email,application_status:a.status};break;}}}if(!t&&workspace==='partner'){const v=await applicationConversation(user);if(v.id===id&&await jsonRecord(store,await appKey(user)))t=v;}if(!t||!admin&&(t.owner!==user||t.workspace!==workspace))fail('Conversation not found.',404);return t;}
export async function messageWrite(store,t,{id=crypto.randomUUID(),content,sender,sender_role='admin',type='message',at=new Date().toISOString()}){
 const key=await threadKey(t),old=await store.get(key),prior=old?await old.json():t;
 at=new Date(Math.max(Date.parse(at),Date.parse(prior.last_at||'1970-01-01')+1)).toISOString();
 const item={id,conversation_id:t.id,owner:t.owner,workspace:t.workspace,reference:t.reference,sender,sender_role,participants:[t.owner,'authorised_administrators'],content,created_at:at,type};
 const next={...prior,...t,last_at:at,last_message_id:id,updated_at:at};
 return {message:item,thread:next,writes:[{key,body:JSON.stringify(next),etag:old?.etag??null},{key:messagePrefix(t.id)+id+'.json',body:JSON.stringify(item),etag:null}]};
}
export async function applicationMessageWrites(store,application,actor,type,explanation){const t=await applicationConversation(application.owner);t.name=application.name;t.company=application.company;t.email=application.email;t.application_status=application.status;return messageWrite(store,t,{sender:actor,sender_role:type==='application_submitted'?'owner':'admin',type,content:explanation,at:application.updated_at});}
async function projection(event,store,{user,admin,view}){if(!['message','message_read'].includes(event.kind))return null;const item=await jsonRecord(store,event.key);if(!item||!admin&&(item.owner!==user||item.workspace!==view))return null;if(event.kind==='message_read'){if(item.reader!==user)return null;return {kind:'message_read',receipt:item};}const thread=await jsonRecord(store,await threadKey({id:item.conversation_id,workspace:item.workspace,owner:item.owner}));return {kind:'message',message:messageView(item,admin),thread};}
export async function messagingApi(req,env,url,h){const user=req.headers.get('oai-authenticated-user-id'),email=req.headers.get('oai-authenticated-user-email'),adminPath=url.pathname.startsWith('/api/admin/'),admin=!!user&&h.ADMIN(req,env),workspace=url.searchParams.get('workspace')||'partner';
 if(!user||!email)return h.json({error:'Sign in with Google to continue.'},401);if(adminPath&&!admin)return h.json({error:'Administrator access required.'},403);if(!['partner','customer'].includes(workspace))return h.json({error:'Choose a workspace.'},400);if(req.method!=='GET'&&req.headers.get('origin')!==url.origin)return h.json({error:'Invalid origin.'},403);
 try{const store=env.BUCKET,path=url.pathname;
 if(path.endsWith('/events')&&req.method==='GET')return eventStream(req,env,{user,admin:adminPath,view:workspace,project:projection});
 if(req.method==='GET'){const started=new Date().toISOString()+'|';let threads=await scan(store,adminPath?'messages/threads/':root(workspace,await hash(user)));
 const apps=adminPath?await scan(store,'referrals/applications/'):workspace==='partner'?[await jsonRecord(store,await appKey(user))].filter(Boolean):[];
 for(const a of apps){const t=await applicationConversation(a.owner);if(!threads.some(x=>x.id===t.id))threads.push({...t,name:a.name,company:a.company,email:a.email,application_status:a.status,created_at:a.created_at});}
 const messages=[],receipts=[];for(const t of threads){messages.push(...await scan(store,messagePrefix(t.id)));const r=await jsonRecord(store,await receiptKey(t,user));if(r)receipts.push(r);}
 return h.json({threads,messages:messages.sort((a,b)=>cursor(a).localeCompare(cursor(b))).map(m=>messageView(m,adminPath)),receipts,cursor:started});}
 const d=await h.body(req);
 if(path.endsWith('/read')&&req.method==='POST'){if(typeof d.conversation_id!=='string'||!uuid(d.message_id))fail('Choose a saved message.');const t=await accessible(store,d.conversation_id,user,adminPath,workspace),m=await jsonRecord(store,messagePrefix(t.id)+d.message_id+'.json');if(!m)fail('Message not found.',404);const key=await receiptKey(t,user),old=await store.get(key),prior=old?await old.json():null,next={conversation_id:t.id,owner:t.owner,workspace:t.workspace,reader:user,through:cursor(m),read_at:new Date().toISOString()};if(prior?.through>=next.through)return h.json({receipt:prior});const ok=await store.put(key,JSON.stringify(next),old?{onlyIf:{etagMatches:old.etag}}:{onlyIf:{etagDoesNotMatch:'*'}});if(ok===null)fail('Read status changed. Retry.',409);return h.json({receipt:next});}
 if(req.method!=='POST')fail('Not found.',404);if(!uuid(d.id)||typeof d.content!=='string'||!d.content.trim()||d.content.length>6000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(d.content))fail('Enter a message of 1–6000 characters.');
 let t;if(d.conversation_id)t=await accessible(store,d.conversation_id,user,adminPath,workspace);else if(workspace==='customer'&&!adminPath){if(!await jsonRecord(store,'customers/accounts/'+await hash(user)+'.json'))fail('Complete your customer company profile first.',409);if(typeof d.subject!=='string'||!d.subject.trim()||d.subject.length>150)fail('Enter a subject of up to 150 characters.');t={id:await hash('customer:'+user+':'+d.id),workspace,owner:user,reference:'customer',subject:d.subject.trim(),status:'open',created_at:new Date().toISOString()};}else fail('Choose an application conversation.');
 const prior=await jsonRecord(store,messagePrefix(t.id)+d.id+'.json');if(prior){if(prior.sender!==user||prior.content!==d.content.trim())fail('Message reference conflict.',409);return h.json({thread:t,message:messageView(prior,adminPath)});}
 const write=await messageWrite(store,t,{id:d.id,content:d.content.trim(),sender:user,sender_role:adminPath?'admin':'owner'});if(!await store.atomicUpdate(write.writes))fail('Conversation changed. Retry your message.',409);return h.json({thread:write.thread,message:messageView(write.message,adminPath)},201);
 }catch(e){return h.json({error:e.status?e.message:'Messaging is temporarily unavailable. Your saved history is preserved.'},e.status||503);}}
