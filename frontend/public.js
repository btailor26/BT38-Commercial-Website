// Navigation keeps the approved layout and uses existing application routes.
document.querySelectorAll('nav a').forEach(a=>{if(a.pathname===location.pathname)a.setAttribute('aria-current','page');});
document.querySelectorAll('a[href="#quote-form"]').forEach(a=>{if(a.textContent.includes('Request a Call'))a.addEventListener('click',()=>{const d=document.getElementById('description');if(d&&!d.value)d.value='Please contact me to arrange a call. My time zone and preferred times are: ';});});
