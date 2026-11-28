// Bundle complete editable approved pages/assets; derive assistant answers from their visible content.
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';import {parse} from 'parse5';
const manifest=JSON.parse(await readFile('frontend/manifest.json','utf8')),pages={},assets={};
for(const [route,page]of Object.entries(manifest.pages))pages[route]=await readFile(page.file,'utf8');
const definitions={...manifest.assets};for(const [name,mime]of [['public.css','text/css'],['public-bindings.css','text/css'],['public.js','application/javascript'],['carousel.js','application/javascript'],['chat.js','application/javascript']])definitions['/assets/'+name]={file:'frontend/'+name,mime:mime+'; charset=utf-8'};
for(const [route,asset]of Object.entries(definitions)){const bytes=await readFile(asset.file),sha=createHash('sha256').update(bytes).digest('hex');if(asset.sha256&&asset.sha256!==sha)throw Error('Approved asset integrity mismatch: '+asset.file);assets[route]={mime:asset.mime,base64:bytes.toString('base64'),sha256:sha};}
const attr=(n,key)=>n.attrs?.find(a=>a.name===key)?.value;
const walk=(n,predicate)=>[...(predicate(n)?[n]:[]),...(n.childNodes||[]).flatMap(c=>walk(c,predicate))];
const text=n=>n.nodeName==='#text'?n.value:['script','style'].includes(n.tagName)?'':(n.childNodes||[]).map(text).join(' ');
const clean=n=>text(n).replace(/\s+/g,' ').trim();const home=parse(pages['/']);
const knowledge=walk(home,n=>n.tagName==='details').map(n=>{const summary=n.childNodes.find(c=>c.tagName==='summary');return {question:clean(summary),answer:n.childNodes.filter(c=>c!==summary).map(clean).join(' ').replace(/\s+/g,' ').trim(),source:'/#faqs'};});
if(knowledge.length!==27)throw Error('All 27 approved FAQ answers must be present.');
for(const id of ['services','price','about']){const section=walk(home,n=>attr(n,'id')===id)[0];if(!section)throw Error('Missing approved section '+id);}
// General topics map to specific public FAQs, never a second manually maintained answer list.
const knowledgeVersion=createHash('sha256').update(pages['/']).digest('hex');
await mkdir('.generated',{recursive:true});await writeFile('.generated/public-frontend.json',JSON.stringify({pages,assets,knowledge,knowledgeVersion}));
console.log(`Built ${Object.keys(pages).length} approved public pages, ${Object.keys(manifest.assets).length} original assets and ${knowledge.length} source-derived answers.`);
