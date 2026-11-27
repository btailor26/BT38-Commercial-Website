import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from 'playwright';
import worker from '../runtime/worker.js';
import {FileStore} from '../runtime/file-store.js';
const dir=await mkdtemp(join(tmpdir(),'bt38-public-'));
const origin='https://public.example.invalid',env={BUCKET:new FileStore(dir),GOOGLE_CLIENT_ID:'fixture.apps.googleusercontent.com',GOOGLE_SESSION_SIGNING_KEY:'local-ui-test-key-'.repeat(4)};
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
for(const width of [1440,390]){
const context=await browser.newContext({viewport:{width,height:900}});
await context.route('**/*',async route=>{const q=route.request();if(new URL(q.url()).origin!==origin)return route.abort();const response=await worker.fetch(new Request(q.url(),{method:q.method(),headers:await q.allHeaders(),...(!['GET','HEAD'].includes(q.method())?{body:q.postDataBuffer()}:{})}),env,{});await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
for(const path of ['/','/services','/integrations','/solutions','/about','/contact','/work-with-us','/login','/signup']){
const response=await page.goto(origin+path);assert.equal(response.status(),200,path);await page.locator('main').waitFor();
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Horizontal overflow '+path+' '+width);
if(path==='/integrations'){assert.equal(await page.locator('.package-offer').count(),4);assert.ok(await page.locator('.package-comparison tbody tr').count()>60);await page.getByRole('link',{name:'Discuss Essential ↗',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/contact');}
if(path==='/login'){assert.equal(await page.locator('main a[href^="/partner"]').count(),0);assert.equal(await page.locator('main a[href^="/auth/google"]').count(),1);}
if(path==='/contact'){assert.equal(await page.locator('#quote-form').count(),1);assert.equal(await page.locator('main a[href^="tel:"]').count(),0);}
if(path==='/work-with-us'){assert.equal(await page.locator('main a[href="/partner/login"]').count(),1);}
}
assert.deepEqual(errors,[]);await context.close();
}
}finally{await browser.close();await rm(dir,{recursive:true,force:true});}
console.log('Public desktop and mobile routes, layout and selected actions passed');
