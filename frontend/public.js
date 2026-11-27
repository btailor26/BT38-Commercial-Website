// Navigation keeps the approved layout and uses existing application routes.
document.querySelectorAll('nav a').forEach(a=>{if(a.pathname===location.pathname)a.setAttribute('aria-current','page');});
document.querySelectorAll('a[href="#quote-form"]').forEach(a=>{if(a.textContent.includes('Request a Call'))a.addEventListener('click',()=>{const d=document.getElementById('description');if(d&&!d.value)d.value='Please contact me to arrange a call. My time zone and preferred times are: ';});});

// Track actual header height for anchor navigation without polling.
const stickyHeader=document.querySelector('body > header');if(stickyHeader){const alignHeader=()=>document.documentElement.style.setProperty('--bt38-header-height',`${stickyHeader.offsetHeight+8}px`);alignHeader();if(typeof ResizeObserver!=='undefined')new ResizeObserver(alignHeader).observe(stickyHeader);}
