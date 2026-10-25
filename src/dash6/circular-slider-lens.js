const controllers=new WeakMap();
const write=(node,key,value)=>{if(node.style.getPropertyValue(key)!==value)node.style.setProperty(key,value);};
// This material is exclusive to DASH6; other dashboards keep their existing lens.
const glassGaugeScope=()=>location.pathname==='/dash-6'||location.pathname.startsWith('/dash-6/');
const glassGaugeCSS=`
 :host([data-dash6-satin-climate]) svg .background{opacity:0!important}
 :host([data-dash6-satin-climate]) svg .arc-clear,:host([data-dash6-satin-climate]) svg .arc-colored,:host([data-dash6-satin-climate]) svg .arc-active{opacity:0!important}
 :host([data-dash6-satin-climate]) svg .inactive .arc{opacity:0!important}
 [data-dash6-circular-tint],[data-dash6-circular-warm],[data-dash6-circular-active]{position:absolute;inset:0;pointer-events:none;background:var(--dash6-circular-tint,transparent);
  mask-image:radial-gradient(circle closest-side,transparent 83.2%,#000 84.2% 96.8%,transparent 98%);
  -webkit-mask-image:radial-gradient(circle closest-side,transparent 83.2%,#000 84.2% 96.8%,transparent 98%)}
 [data-dash6-circular-warm]{background:var(--dash6-circular-warm,transparent)}
 [data-dash6-circular-active]{background:var(--dash6-circular-active,transparent)}
 [data-dash6-circular-body]{position:absolute;inset:0;pointer-events:none;opacity:.5}
 /* Fixed CSS light layers inherit the same live native ranges as the body.
    No SVG copies, animation, extra observers or per-frame blur updates. */
 [data-dash6-circular-halo],[data-dash6-circular-core]{position:absolute;inset:0;pointer-events:none;mix-blend-mode:screen}
 [data-dash6-circular-halo]{filter:blur(5px);opacity:.48}
 [data-dash6-circular-core]{filter:blur(.7px);opacity:.52}
 [data-dash6-circular-core] [data-dash6-circular-tint],
 [data-dash6-circular-core] [data-dash6-circular-warm],
 [data-dash6-circular-core] [data-dash6-circular-active]{
  mask-image:radial-gradient(circle closest-side,transparent 85%,rgba(0,0,0,.3) 88%,#000 90% 92%,rgba(0,0,0,.3) 94%,transparent 96%);
  -webkit-mask-image:radial-gradient(circle closest-side,transparent 85%,rgba(0,0,0,.3) 88%,#000 90% 92%,rgba(0,0,0,.3) 94%,transparent 96%)}
 [data-dash6-circular-trough]{position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(circle closest-side,transparent 83.2%,rgba(3,9,15,.28) 84.4%,rgba(3,9,15,.22) 86%,transparent 90%,rgba(255,255,255,.12) 93.2%,rgba(4,12,20,.16) 96.6%,transparent 98%);
  mask-image:conic-gradient(from 225deg,#000 0deg 270deg,transparent 270deg);-webkit-mask-image:conic-gradient(from 225deg,#000 0deg 270deg,transparent 270deg)}
 [data-dash6-circular-trough]::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(circle closest-side,transparent 88.4%,rgba(255,255,255,.14) 90%,rgba(255,255,255,.88) 91.3%,rgba(255,255,255,.74) 92.2%,rgba(255,255,255,.20) 93.8%,transparent 95.4%);
  mask-image:conic-gradient(from 225deg,transparent 0deg,rgba(0,0,0,.22) 22deg,#000 45deg 112deg,transparent 144deg 175deg,rgba(0,0,0,.8) 208deg 237deg,transparent 268deg);
  -webkit-mask-image:conic-gradient(from 225deg,transparent 0deg,rgba(0,0,0,.22) 22deg,#000 45deg 112deg,transparent 144deg 175deg,rgba(0,0,0,.8) 208deg 237deg,transparent 268deg)}
 [data-dash6-tube-cap]{position:absolute;pointer-events:none;width:7.3%;height:7.3%;top:82.02%;left:17.98%;transform:translate(-50%,-50%);border-radius:50%;box-sizing:border-box;border:0;box-shadow:none;
  background:radial-gradient(ellipse at 25% 24%,rgba(255,255,255,.4),transparent 50%),radial-gradient(circle at 58% 58%,rgba(3,9,15,.22),transparent 68%),var(--dash6-tube-start,transparent)}
 [data-dash6-tube-cap=end]{left:82.02%;background:radial-gradient(ellipse at 25% 24%,rgba(255,255,255,.4),transparent 50%),radial-gradient(circle at 58% 58%,rgba(3,9,15,.22),transparent 68%),var(--dash6-tube-end,transparent)}
 @media(prefers-reduced-transparency:reduce){
  [data-dash6-circular-body],[data-dash6-circular-halo],[data-dash6-circular-core]{display:none}
  :host([data-dash6-satin-climate]) svg .arc-colored{opacity:.55!important}
  :host([data-dash6-satin-climate]) svg .arc-active{opacity:1!important}
  :host([data-dash6-satin-climate]) svg .inactive .arc{opacity:0!important}
 }
`;

// An HTML SliderLens at each native SVG endpoint. No SVG scene copies, URL
// filters or device commands; the original SVG remains the only hit target.
export function syncCircularSliderLens(host,on=host.hasAttribute('data-dash6-satin-climate')&&getComputedStyle(host).getPropertyValue('--dash6-satin-enabled').trim()==='1'){
 const svg=host.shadowRoot?.querySelector('svg'),old=controllers.get(host),glass=glassGaugeScope();
 if(!on||!svg||!host.isConnected){old?.dispose();controllers.delete(host);return;}
 if(old?.svg===svg&&old.glass===glass){old.sync();return;}
 old?.dispose();
 const root=host.shadowRoot,items=new Map();let frame=0,pointer=null,hover=null;
 const savedPosition=[host.style.getPropertyValue('position'),host.style.getPropertyPriority('position')];
 if(getComputedStyle(host).position==='static')host.style.setProperty('position','relative');
 const layer=document.createElement('div');layer.dataset.dash6CircularLenses='';layer.setAttribute('aria-hidden','true');
 layer.style.cssText='position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:2';
 const paint='<div data-dash6-circular-tint></div><div data-dash6-circular-warm></div><div data-dash6-circular-active></div>';
 layer.innerHTML=glass?'<style>'+glassGaugeCSS+'</style><div data-dash6-circular-halo>'+paint+'</div><div data-dash6-circular-core>'+paint+'</div><div data-dash6-circular-body>'+paint+'<div data-dash6-tube-cap="start"></div><div data-dash6-tube-cap="end"></div></div><div data-dash6-circular-trough></div>':"<div data-dash6-circular-trough style=\"position:absolute;inset:0;pointer-events:none;background:radial-gradient(circle closest-side,transparent 83.5%,rgba(0,0,0,.55) 84.5%,rgba(0,0,0,.12) 88%,rgba(255,255,255,.06) 91%,rgba(255,255,255,.32) 95%,transparent 97%);mask-image:conic-gradient(from 225deg,#000 0deg 270deg,transparent 270deg);-webkit-mask-image:conic-gradient(from 225deg,#000 0deg 270deg,transparent 270deg)\"></div>";root.append(layer);
 function syncTint(selector,property){
  if(!glass)return;
  const segments=[];
  for(const arc of svg.querySelectorAll(selector)){
   if(arc.closest('.inactive'))continue;
   try{
    const style=getComputedStyle(arc),length=arc.getTotalLength(),dash=parseFloat(arc.getAttribute('stroke-dasharray')||style.strokeDasharray);
    const rawOffset=parseFloat(arc.getAttribute('stroke-dashoffset')||'0');
    // HA may emit "--0.5" for an arc starting at the lower bound. The browser
    // ignores that invalid attribute; use the actual rendered CSS offset.
    const offset=Number.isFinite(rawOffset)?rawOffset:parseFloat(style.strokeDashoffset);
    if(!(length>0&&dash>0&&Number.isFinite(offset)))continue;
    const start=Math.max(0,Math.min(270,-offset/length*270)),end=Math.max(start,Math.min(270,(-offset+dash)/length*270));
    let color=style.stroke;
    // Heating's main body uses the previous full-strength interval orange.
    // Only its actual-to-target interval shifts toward red; cooling is unchanged.
    if(property==='--dash6-circular-active'&&arc.classList.contains('low'))color=`color-mix(in srgb,${color} 55%,#f32b1c)`;
    if(end>start)segments.push({start,end,color});
   }catch{/* Native geometry is unavailable while the gauge is hidden. */}
  }
  const stops=[...new Set([0,270,...segments.flatMap(s=>[s.start,s.end])])].sort((a,b)=>a-b),paint=[];
  for(let i=0;i<stops.length-1;i++){
   const middle=(stops[i]+stops[i+1])/2,color=segments.findLast(s=>s.start<=middle&&s.end>=middle)?.color||'transparent';
   paint.push(`${color} ${stops[i]}deg ${stops[i+1]}deg`);
  }
  write(layer,property,`conic-gradient(from 225deg,${paint.join(',')},transparent 270deg 360deg)`);
  if(property==='--dash6-circular-tint'){
   write(layer,'--dash6-tube-start',segments.findLast(s=>s.start<1)?.color||'transparent');
   write(layer,'--dash6-tube-end',segments.findLast(s=>s.end>269)?.color||'transparent');
  }
 }
 function restore(item){for(const [path,[value,priority]]of item.originals)value?path.style.setProperty('stroke-opacity',value,priority):path.style.removeProperty('stroke-opacity');item.lens.remove();}
 function sync(){
  if(!host.isConnected)return;
  const bounds=host.getBoundingClientRect(),sx=bounds.width/(host.offsetWidth||bounds.width||1),sy=bounds.height/(host.offsetHeight||bounds.height||1);
  const current=new Set();
  syncTint('.arc-colored','--dash6-circular-tint');
  syncTint('.arc-colored.low','--dash6-circular-warm');
  syncTint('.arc-active','--dash6-circular-active');
  for(const path of svg.querySelectorAll('.target')){
   if(path.closest('defs'))continue;
   const group=path.parentElement;current.add(group);let item=items.get(group);
   if(!item){const lens=document.createElement('dash6-slider-lens');lens.setAttribute('circular','');item={path,lens,originals:new Map(),x:0,y:0,size:0};items.set(group,item);layer.append(lens);}
   for(const target of group.querySelectorAll('.target,.target-border'))if(!item.originals.has(target)){
    item.originals.set(target,[target.style.getPropertyValue('stroke-opacity'),target.style.getPropertyPriority('stroke-opacity')]);target.style.setProperty('stroke-opacity','0','important');
   }
   item.lens.toggleAttribute('glass-tube',glass);
   const control=group.querySelector('[role=slider]')||path;
   const disabled=control.getAttribute('aria-disabled')==='true'||control.getAttribute('aria-readonly')==='true';
   item.lens.toggleAttribute('disabled',disabled);
   item.lens.toggleAttribute('touching',!disabled&&pointer===group);
   item.lens.toggleAttribute('hovering',!disabled&&hover===group);
   try{
    const matrix=path.getScreenCTM();if(!matrix)continue;
    const length=path.getTotalLength(),offset=parseFloat(path.getAttribute('stroke-dashoffset')||getComputedStyle(path).strokeDashoffset);
    const local=path.getPointAtLength(Number.isFinite(offset)?Math.max(0,Math.min(length,-offset)):length/2);
    const point=new DOMPoint(local.x,local.y).matrixTransform(matrix);
    const width=parseFloat(getComputedStyle(control).strokeWidth)||20;
    item.x=(point.x-bounds.left)/sx;item.y=(point.y-bounds.top)/sy;
    item.size=Math.max(16,width*1.45)*Math.hypot(matrix.a,matrix.b)/sx;
    write(item.lens,'--lens-x',item.x+'px');write(item.lens,'--lens-y',item.y+'px');write(item.lens,'--lens-diameter',item.size+'px');
    const track=group.querySelector('.arc-colored')||path;
    const color=getComputedStyle(track).stroke;write(item.lens,'--track',`linear-gradient(${color},${color})`);
   }catch{/* A hidden native gauge has no geometry until its next layout. */}
  }
  for(const [group,item]of items)if(!current.has(group)){restore(item);items.delete(group);if(pointer===group)pointer=null;if(hover===group)hover=null;}
 }
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(()=>{frame=0;sync();});};
 function nearest(event){
  const b=host.getBoundingClientRect(),sx=b.width/(host.offsetWidth||b.width||1),sy=b.height/(host.offsetHeight||b.height||1);
  const x=(event.clientX-b.left)/sx,y=(event.clientY-b.top)/sy;
  return [...items].filter(([,i])=>!i.lens.hasAttribute('disabled')).map(([group,i])=>({group,d:Math.hypot(x-i.x,y-i.y),reach:i.size*.85})).sort((a,b)=>a.d-b.d).find(i=>i.d<=i.reach)?.group||null;
 }
 const down=event=>{if(event.button!==undefined&&event.button!==0)return;pointer=nearest(event);schedule();};
 const move=event=>{hover=event.pointerType==='touch'?null:nearest(event);schedule();};
 const end=event=>{pointer=null;hover=event?.pointerType==='mouse'?nearest(event):null;schedule();};
 const leave=()=>{hover=null;schedule();};
 const observer=new MutationObserver(schedule);observer.observe(svg,{subtree:true,childList:true,attributes:true,attributeFilter:['d','stroke-dasharray','stroke-dashoffset','transform','stroke-width','class','aria-disabled','aria-readonly']});
 const resize=new ResizeObserver(schedule);resize.observe(host);resize.observe(svg);
 // Native custom-element lifecycle callbacks are captured at registration.
 // Observe composed owner roots too, so an already registered HA control is
 // cleaned up even when its prototype disconnect hook is not called by the UA.
 const lifecycle=new MutationObserver(()=>{if(!host.isConnected){controller.dispose();controllers.delete(host);}});
 for(let node=host;node;){const owner=node.getRootNode();lifecycle.observe(owner,{childList:true,subtree:true});node=owner.host;}
 svg.addEventListener('pointerdown',down,{capture:true,passive:true});svg.addEventListener('pointermove',move,{capture:true,passive:true});svg.addEventListener('pointerleave',leave,{passive:true});
 window.addEventListener('pointerup',end,{capture:true,passive:true});window.addEventListener('pointercancel',end,{capture:true,passive:true});
 const controller={svg,glass,sync,dispose(){
  observer.disconnect();resize.disconnect();lifecycle.disconnect();cancelAnimationFrame(frame);
  svg.removeEventListener('pointerdown',down,true);svg.removeEventListener('pointermove',move,true);svg.removeEventListener('pointerleave',leave);
  window.removeEventListener('pointerup',end,true);window.removeEventListener('pointercancel',end,true);
  for(const item of items.values())restore(item);items.clear();layer.remove();
  if(!savedPosition[0])host.style.removeProperty('position');else host.style.setProperty('position',...savedPosition);
 }};controllers.set(host,controller);sync();return controller;
}
