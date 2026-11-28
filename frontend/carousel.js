// A gesture belongs to one pointer and may advance only once. pan-y leaves vertical scrolling to the browser.
const carousel=document.querySelector('.carousel'),frame=document.getElementById('frame');
if(carousel&&frame){
 const slides=[...frame.querySelectorAll('.slide')],dots=[...carousel.querySelectorAll('.dot')];let i=0,start=null;
 function show(n){if(!slides.length)return;i=(n%slides.length+slides.length)%slides.length;slides.forEach((s,j)=>s.hidden=j!==i);dots.forEach((d,j)=>d.setAttribute('aria-current',String(j===i)));}
 frame.querySelector('#prev')?.addEventListener('click',()=>show(i-1));frame.querySelector('#next')?.addEventListener('click',()=>show(i+1));dots.forEach((d,j)=>d.addEventListener('click',()=>show(j)));
 frame.addEventListener('pointerdown',e=>{start=null;if(!e.isPrimary||e.pointerType==='mouse'||e.target.closest('button,a,input'))return;start={id:e.pointerId,x:e.clientX,y:e.clientY,done:false};});
 function move(e){if(!start||e.pointerId!==start.id||start.done)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dy)>20&&Math.abs(dy)>Math.abs(dx)){start.done=true;return;}if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5){start.done=true;show(i+(dx<0?1:-1));}}
 frame.addEventListener('pointermove',move);frame.addEventListener('pointerup',e=>{move(e);start=null;});frame.addEventListener('pointercancel',()=>{start=null;});
 carousel.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select'))return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(i+(e.key==='ArrowRight'?1:-1));}});
 show(0);
}
