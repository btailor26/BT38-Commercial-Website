// Bundle the actual editable approved HTML/CSS/JS and image files for the existing Worker runtime.
import {readFile,mkdir,writeFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('frontend/manifest.json','utf8')),pages={},assets={};
for(const [route,page]of Object.entries(manifest.pages))pages[route]=await readFile(page.file,'utf8');
pages['/price']=pages['/integrations'];
const definitions={...manifest.assets,'/assets/public.css':{file:'frontend/public.css',mime:'text/css; charset=utf-8'},'/assets/faqs.css':{file:'frontend/faqs.css',mime:'text/css; charset=utf-8'},'/assets/public-bindings.css':{file:'frontend/public-bindings.css',mime:'text/css; charset=utf-8'},'/assets/public.js':{file:'frontend/public.js',mime:'application/javascript; charset=utf-8'},'/assets/carousel.js':{file:'frontend/carousel.js',mime:'application/javascript; charset=utf-8'}};
for(const [route,asset]of Object.entries(definitions)){const bytes=await readFile(asset.file),sha=createHash('sha256').update(bytes).digest('hex');if(asset.sha256&&asset.sha256!==sha)throw Error('Approved asset integrity mismatch: '+asset.file);assets[route]={mime:asset.mime,base64:bytes.toString('base64'),sha256:sha};}
await mkdir('.generated',{recursive:true});await writeFile('.generated/public-frontend.json',JSON.stringify({pages,assets}));
console.log('Built nine approved public pages and '+Object.keys(manifest.assets).length+' original image assets.');
