// Public navigation is local; no requests or storage reads occur when opening chat.
const header=document.querySelector('body>header');
if(header){const align=()=>{const height=`${header.offsetHeight+8}px`;document.documentElement.style.setProperty('--header-height',height);document.documentElement.style.setProperty('--bt38-header-height',height);};align();if(typeof ResizeObserver!=='undefined')new ResizeObserver(align).observe(header);}
const params=new URLSearchParams(location.search);
for(const a of document.querySelectorAll('a[href]')){const url=new URL(a.href,location.href);if(url.origin!==location.origin)continue;for(const name of ['ref','agreement'])if(params.has(name)&&!url.searchParams.has(name))url.searchParams.set(name,params.get(name));a.href=url.pathname+url.search+url.hash;}
const nav=()=>document.querySelectorAll('header nav a').forEach(a=>{const url=new URL(a.href);if(url.pathname===location.pathname&&(!url.hash||url.hash===(location.hash||'#home')))a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});nav();addEventListener('hashchange',nav);
const callback=()=>{const d=document.getElementById('description');if(d&&!d.value)d.value='Please contact me to arrange a call. My time zone and preferred times are: ';};document.querySelectorAll('a[href$="#quote-form"]').forEach(a=>a.addEventListener('click',callback));if(params.get('intent')==='callback')callback();
const launch=document.getElementById('btchat-launch');let loaded;
launch?.addEventListener('click',async()=>{try{loaded??=import('/assets/chat.js');const chat=await loaded;chat.toggle();}catch{loaded=null;launch.textContent='Chat unavailable — use Contact';launch.onclick=()=>location.assign('/contact');}});
