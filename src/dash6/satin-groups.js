import {inDashboardScope} from './scope.js';
import {thermostatAncestor,thermostatModeGroup} from './satin-climate.js';
// Material only: original controls retain selection, keyboard handling and actions.
const controllers=new WeakMap();
const itemSelector='button,[role=button],[role=radio],[role=tab],[role=checkbox],[role=menuitemradio],[role=menuitemcheckbox],ha-control-button,ha-outlined-icon-button,ha-icon-button,ha-button,mushroom-button';
const knownGroups='.device-tabs,.shoe-scenes,.scene-buttons,.button-group,.modes,.preset-options,.mode-buttons,.preset-buttons,.transport,.actions,.buttons,.choice-grid,.room-grid,.dock-grid,.empty-mode-grid,.actions-row,[role=tablist],[role=radiogroup],[role=group],[role=toolbar],[role=menu]';
export const satinGroupCSS=`
[data-dash6-satin-group]{isolation:isolate;box-sizing:border-box!important;border-radius:10px!important;background:var(--dash6-satin-control-background)!important;border:var(--dash6-satin-control-border)!important;box-shadow:var(--dash6-satin-control-shadow)!important;gap:0!important;padding:3px!important}
[data-dash6-satin-group][data-dash6-satin-group-static]{position:relative!important}
[data-dash6-satin-group]::before{background:none!important;box-shadow:none!important;opacity:0!important}
[data-dash6-satin-group]>[data-dash6-satin-group-item]{position:relative;z-index:2!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:8px!important;scale:1!important;translate:0!important;margin-inline:0!important}
[data-dash6-satin-group]>[data-dash6-satin-group-item]::before{background:none!important;opacity:0!important}
[data-dash6-satin-group]>[data-dash6-satin-group-item]:focus-visible{outline:2px solid var(--primary-color)!important;outline-offset:-2px}
[data-dash6-satin-group]>[data-dash6-satin-group-item]:active{box-shadow:var(--dash6-satin-button-pressed-shadow)!important}
[data-dash6-satin-group]>.dash6-satin-group-lens{position:absolute!important;z-index:1!important;pointer-events:none!important;box-sizing:border-box!important;margin:0!important;border-radius:8px!important;background:var(--dash6-satin-lens-background)!important;border:var(--dash6-satin-lens-border)!important;box-shadow:var(--dash6-satin-lens-shadow)!important;transition:transform var(--dash6-satin-elastic-duration,420ms) cubic-bezier(.22,1.3,.36,1),width 250ms ease,height 250ms ease,opacity 150ms ease,scale 380ms cubic-bezier(.22,1.5,.36,1);transform-origin:center}
:host(mushroom-button-group) [data-dash6-satin-group]{width:100%!important}
:host(mushroom-button-group) [data-dash6-satin-group] ::slotted(*){margin-inline:0!important;--bg-color:transparent;--bg-color-disabled:transparent;--control-border-radius:8px}
:host(ha-control-button-group) [data-dash6-satin-group] ::slotted(*){margin-inline:0!important;--control-button-background-color:transparent;--control-button-background-opacity:0;--control-button-border-radius:8px}
@media(prefers-reduced-motion:reduce){[data-dash6-satin-group]>.dash6-satin-group-lens{transition:none!important;scale:1!important}}
`;
function directItems(group){const slot=group.querySelector(':scope>slot');if(slot)return slot.assignedElements({flatten:true}).filter(el=>el.matches(itemSelector));return [...group.children].filter(el=>el.matches(itemSelector));}
function selected(item){const sources=[item];if(item.shadowRoot)sources.push(...item.shadowRoot.querySelectorAll('[aria-pressed],[aria-selected],[aria-checked],.selected,.active'));return sources.some(el=>['aria-pressed','aria-selected','aria-checked'].some(name=>el.getAttribute(name)==='true')||el.classList.contains('selected')||el.classList.contains('active'));}
export function satinGroupCandidate(group){
 if(group?.nodeType!==1||group.getRootNode().host?.localName==='dash6-glass-segments')return false;
 if(thermostatAncestor(group)&&!thermostatModeGroup(group))return false;
 const host=group.getRootNode().host;
 if(['ha-tab-group','ha-tabs','wa-tab-group','app-toolbar'].includes(host?.localName))return false;
 if(host?.localName==='dash6-vacuum-card'&&group.classList.contains('actions-row'))return false;
 const explicit=group.matches(knownGroups)||['ha-control-select','ha-control-button-group','mushroom-button-group'].includes(host?.localName)&&group.classList.contains('container');
 return explicit&&directItems(group).length>=2;
}
export function bindSatinGroup(group){
 if(controllers.has(group))return controllers.get(group);if(!satinGroupCandidate(group))return;
 const lenses=new Map(),marked=new Set(),nestedObservers=new Map(),staticPosition=getComputedStyle(group).position==='static';let queued=false,disposed=false;
 function lensFor(item){if(lenses.has(item))return lenses.get(item);const lens=document.createElement('span');lens.className='dash6-satin-group-lens';lens.setAttribute('aria-hidden','true');group.append(lens);lenses.set(item,lens);return lens;}
 function update(){
  queued=false;if(disposed)return;const enabled=inDashboardScope()&&satinGroupCandidate(group)&&getComputedStyle(group).getPropertyValue('--dash6-satin-enabled').trim()==='1';group.toggleAttribute('data-dash6-satin-group',enabled);group.toggleAttribute('data-dash6-satin-group-static',enabled&&staticPosition);
  const items=directItems(group),activeItems=enabled?items.filter(selected):[];
  if(activeItems.length===1&&lenses.size===1&&!lenses.has(activeItems[0])){const lens=lenses.values().next().value;lenses.clear();lenses.set(activeItems[0],lens);}
  for(const item of marked)if(!enabled||!items.includes(item)){item.removeAttribute('data-dash6-satin-group-item');marked.delete(item);resize.unobserve(item);}
  if(enabled)for(const item of items)if(!marked.has(item)){item.setAttribute('data-dash6-satin-group-item','');marked.add(item);resize.observe(item);}
  for(const item of items)if(item.shadowRoot&&!nestedObservers.has(item.shadowRoot)){const o=new MutationObserver(schedule);o.observe(item.shadowRoot,{subtree:true,attributes:true,attributeFilter:['aria-pressed','aria-selected','aria-checked','class'],childList:true});nestedObservers.set(item.shadowRoot,o);}
  for(const [item,lens] of lenses)if(!activeItems.includes(item)){lens.remove();lenses.delete(item);}if(!enabled)return;
  const base=group.getBoundingClientRect(),scrollX=group.scrollLeft,scrollY=group.scrollTop;
  for(const item of activeItems){const lens=lensFor(item),box=item.getBoundingClientRect();lens.style.width=box.width+'px';lens.style.height=Math.max(0,box.height-2)+'px';lens.style.left='0';lens.style.top='0';lens.style.transform=`translate(${box.left-base.left+scrollX-group.clientLeft}px,${box.top-base.top+scrollY-group.clientTop+1}px)`;lens.style.opacity='1';}
 }
 function schedule(){if(!queued&&!disposed){queued=true;queueMicrotask(update);}}
 const observer=new MutationObserver(records=>{if(records.some(r=>r.type==='attributes'&&!r.target.classList?.contains('dash6-satin-group-lens')||r.type==='childList'&&[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&!n.classList?.contains('dash6-satin-group-lens'))))schedule();});
 observer.observe(group,{subtree:true,attributes:true,attributeFilter:['aria-pressed','aria-selected','aria-checked','class','disabled'],childList:true});
 const resize=new ResizeObserver(schedule);resize.observe(group);
 const over=event=>{const item=event.composedPath().find(el=>marked.has(el));for(const [target,lens] of lenses)target===item&&!item.disabled&&item.getAttribute('aria-disabled')!=='true'?lens.style.scale='var(--dash6-satin-segment-hover-scale,1.035)':lens.style.removeProperty('scale');};
 const reset=()=>{for(const lens of lenses.values())lens.style.removeProperty('scale');};
 const press=event=>{const item=event.composedPath().find(el=>marked.has(el));if(!item||item.disabled||item.getAttribute('aria-disabled')==='true')return;const lens=lenses.get(item);if(lens)lens.style.scale='.97';};
 const listeners={pointerover:over,pointerleave:reset,pointerdown:press,pointerup:reset,pointercancel:reset,lostpointercapture:reset,slotchange:schedule};for(const [name,handler] of Object.entries(listeners))group.addEventListener(name,handler);
 const api={update,dispose(){disposed=true;observer.disconnect();for(const o of nestedObservers.values())o.disconnect();resize.disconnect();for(const [name,handler] of Object.entries(listeners))group.removeEventListener(name,handler);for(const lens of lenses.values())lens.remove();for(const item of marked)item.removeAttribute('data-dash6-satin-group-item');group.removeAttribute('data-dash6-satin-group');group.removeAttribute('data-dash6-satin-group-static');controllers.delete(group);}};controllers.set(group,api);update();return api;
}
