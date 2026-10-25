// Geometry and paint only: do not rebuild charts or intercept tooltip events.
const surfaceCSS=`
:host [data-dash6-graph-frame]{--dash6-graph-current-opacity:var(--dash6-graph-instance-opacity,var(--dash6-graph-opacity,.5))}
@media(hover:hover){:host [data-dash6-graph-frame]:hover{--dash6-graph-current-opacity:var(--dash6-graph-instance-hover-opacity,var(--dash6-graph-hover-opacity,.8))}}
:host #card[data-dash6-graph-header] #container{position:static!important}
:host #card[data-dash6-graph-header] div#device,:host #card[data-dash6-graph-header] div#icon{position:absolute!important;left:12px!important;top:12px!important;width:88px!important;padding:0!important;margin:0!important;align-self:start!important;--dash6-satin-switch-track-top:0px}
:host #card[data-dash6-graph-header] #title,:host #card[data-dash6-graph-header] #status{position:absolute!important;left:112px!important;right:var(--dash6-header-values-width,110px)!important;width:auto!important;min-width:0!important;padding:0!important;margin:0!important;align-self:start!important}
:host #card[data-dash6-graph-header] div#device:has(dash6-fan-mode-switch){width:120px!important}
:host #card[data-dash6-graph-header]:has(div#device dash6-fan-mode-switch) :is(#title,#status){left:140px!important}
:host #card[data-dash6-graph-header] #title{top:12px!important}
:host #card[data-dash6-graph-header] #status{top:33px!important}
:host #card[data-dash6-graph-header] #slot_1,:host #card[data-dash6-graph-header] #slot_2{position:absolute!important;right:12px!important;width:auto!important;padding:0!important;margin:0!important}
:host #card[data-dash6-graph-header] #slot_1{top:12px!important}
:host #card[data-dash6-graph-header] #slot_2{top:33px!important}
`;
const sheet=new CSSStyleSheet();sheet.replaceSync(surfaceCSS);
export function bindGraphSurface(host,config={},givenFrame){
 const root=host.shadowRoot,frame=givenFrame||root?.querySelector('ha-card#card,ha-card.card');
 const layer=frame?.querySelector(':scope > .power-graph,#graph');if(!frame||!layer)return {sync(){},dispose(){}};
 if(!root.adoptedStyleSheets.includes(sheet))root.adoptedStyleSheets=[...root.adoptedStyleSheets,sheet];
 frame.style.minHeight=`${Math.max(100,parseFloat(getComputedStyle(frame).minHeight)||0,Number(config.min_height??config.height)||0)}px`;
 frame.setAttribute('data-dash6-graph-frame','');frame.toggleAttribute('data-dash6-graph-header',config.align_header!==false);
 for(const [key,name] of [['opacity','--dash6-graph-instance-opacity'],['hover_opacity','--dash6-graph-instance-hover-opacity']]){const value=config[key];if(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value)))frame.style.setProperty(name,String(Math.max(0,Math.min(1,Number(value)))));else frame.style.removeProperty(name);}
 const controls='input[type=range],ha-control-slider,ha-slider,.scenes button,.shoe-scenes button,.scene-buttons button,.scene-recess button,[data-scene-state]';
 const shifted=new Map();
 const sync=()=>{
  if(!frame.isConnected)return;
  const targets=new Set([frame,...frame.querySelectorAll('.head,.controls,.slider-wrap,#container,.scenes,.shoe-scenes,.scene-buttons,.scene-recess,'+controls)]);for(const old of tracked)if(!targets.has(old)){resize.unobserve(old);tracked.delete(old);}for(const target of targets)if(!tracked.has(target)){tracked.add(target);resize.observe(target);}
  const a=frame.getBoundingClientRect();if(!a.width||!a.height)return;
  const boundaries=[...frame.querySelectorAll(controls)].filter(e=>e.getClientRects().length&&!e.closest('[aria-hidden=true],[hidden]')&&getComputedStyle(e).visibility!=='hidden');
  const boundary=boundaries.sort((x,y)=>x.getBoundingClientRect().top-y.getBoundingClientRect().top)[0];
  if(boundary){
   const block=boundary.closest('.controls,.scenes,.shoe-scenes,.scene-buttons,.scene-recess')||boundary;
   const measured=boundary.getBoundingClientRect().top-a.top-parseFloat(getComputedStyle(frame).borderTopWidth||0)-8;
   let saved=shifted.get(block);
   if(measured<99.9||saved){
    if(!saved){saved={value:block.style.getPropertyValue('margin-top'),priority:block.style.getPropertyPriority('margin-top'),base:parseFloat(getComputedStyle(block).marginTop)||0,extra:0};shifted.set(block,saved);}
    const extra=Math.max(0,saved.extra+100-measured);
    if(Math.abs(extra-saved.extra)>.2){saved.extra=extra;block.style.setProperty('margin-top',`${saved.base+extra}px`,'important');}
   }
  }
  const height=boundary?Math.max(0,boundary.getBoundingClientRect().top-a.top-parseFloat(getComputedStyle(frame).borderTopWidth||0)-8)+'px':'100%';
  for(const [key,value]of Object.entries({top:'0',left:'0',right:'0',bottom:boundary?'auto':'0',width:'100%',height,margin:'0',padding:'0'}))if(layer.style.getPropertyValue(key)!==value||layer.style.getPropertyPriority(key)!=='important')layer.style.setProperty(key,value,'important');
 };
 let pending=0,disposed=false;const schedule=()=>{if(pending||disposed)return;pending=requestAnimationFrame(()=>{pending=0;if(!disposed)sync();});};
 const tracked=new Set([frame]);const resize=new ResizeObserver(schedule);resize.observe(frame);
 const mutation=new MutationObserver(schedule);mutation.observe(frame,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','aria-hidden']});
 sync();return {sync,dispose(){disposed=true;if(pending)cancelAnimationFrame(pending);resize.disconnect();mutation.disconnect();for(const [block,saved]of shifted){if(saved.value)block.style.setProperty('margin-top',saved.value,saved.priority);else block.style.removeProperty('margin-top');}}};
}
