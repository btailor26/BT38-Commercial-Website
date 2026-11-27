const carousel=document.querySelector('.carousel'),frame=document.getElementById('frame');
if(carousel&&frame){
 const slides=[...frame.querySelectorAll('.slide')],dots=[...carousel.querySelectorAll('.dot')];let i=0,start=null;
 function show(n){if(!slides.length)return;i=(n%slides.length+slides.length)%slides.length;slides.forEach((s,j)=>s.hidden=j!==i);dots.forEach((d,j)=>d.setAttribute('aria-current',String(j===i)));}
 frame.querySelector('#prev').onclick=()=>show(i-1);frame.querySelector('#next').onclick=()=>show(i+1);dots.forEach((d,j)=>d.onclick=()=>show(j));
 frame.addEventListener('touchstart',e=>{start=null;if(e.touches.length!==1||e.target.closest('button'))return;const t=e.changedTouches[0];start={id:t.identifier,x:t.clientX,y:t.clientY};},{passive:true});
 frame.addEventListener('touchcancel',()=>{start=null;},{passive:true});
 frame.addEventListener('touchend',e=>{if(!start)return;const t=[...e.changedTouches].find(t=>t.identifier===start.id);const a=start;start=null;if(!t)return;const dx=t.clientX-a.x,dy=t.clientY-a.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)show(i+(dx<0?1:-1));},{passive:true});
 carousel.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();show(i+(e.key==='ArrowRight'?1:-1));}});
 show(0);
}
