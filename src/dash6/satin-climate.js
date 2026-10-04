import {inDashboardScope} from './scope.js';
// Presentation only. Thermostats keep their original surface, gauge and dialogs.
const thermostatKinds=new Set(['dash6-thermostat-card','hui-thermostat-card','mushroom-climate-card']);
const kinds=new Set([...thermostatKinds,'ha-state-control-climate-temperature','ha-control-circular-slider','ha-control-slider','dash6-cover-slider','mushroom-slider','ha-control-select-menu','ha-outlined-icon-button']);
const modeKinds=new Set(['hui-climate-hvac-modes-card-feature','ha-state-control-climate-hvac-mode']);
let nextLens=0;
export function thermostatAncestor(node){
 for(let current=node;current;current=current.assignedSlot||current.parentNode||current.host)if(thermostatKinds.has(current.localName))return current;
 return null;
}
function within(node,predicate){for(let current=node;current;current=current.assignedSlot||current.parentNode||current.host)if(predicate(current))return true;return false;}
export function thermostatModeGroup(group){
 return within(group,node=>modeKinds.has(node.localName))&&!within(group,node=>node.localName==='dialog'||node.getAttribute?.('role')==='menu');
}
function presetControl(host){
 return within(host,node=>node.localName==='hui-climate-preset-modes-card-feature'||node.localName==='ha-state-control-climate-preset-mode'||node.classList?.contains('preset-button'))&&!within(host,node=>node.localName==='dialog'||node.getAttribute?.('role')==='menu');
}
export const satinClimateCSS=`
/* Shared legacy tokens are restored only inside thermostats. The five explicitly
   chosen controls use Satin below; card height and gauge geometry are untouched. */
:host([data-dash6-satin-thermostat-base]){
 --dash5-inner-background:radial-gradient(90% 55% at 15% 0%,rgba(255,255,255,.12),transparent 66%),linear-gradient(145deg,rgba(29,43,57,.48),rgba(13,25,39,.44));
 --dash5-inner-border:1px solid rgba(230,245,255,.35);
 --dash5-inner-shadow:inset 0 1px 0 rgba(255,255,255,.46),inset 1px 0 0 rgba(255,255,255,.14),inset 0 -2px 0 rgba(3,10,18,.24),0 4px 7px rgba(0,0,0,.18),0 14px 30px rgba(0,0,0,.24);
 --dash5-inner-filter:blur(11px) saturate(1.12);
 --ha-card-background:rgba(24,29,37,.68);--ha-card-border:1px solid rgba(230,245,255,.35);--ha-card-box-shadow:var(--dash5-inner-shadow);
 --dash6-button-background:radial-gradient(ellipse at 35% 0%,rgba(255,255,255,.18),transparent 56%),linear-gradient(155deg,rgba(58,67,82,var(--dash6-button-opacity)),rgba(12,18,28,var(--dash6-button-opacity)));
 --dash6-button-border:1px solid rgba(229,241,255,.30);
 --dash6-button-shadow:inset 0 1px 1px rgba(255,255,255,.44),inset 0 -1px 1px rgba(0,0,0,.48),0 var(--dash6-button-elevation) calc(var(--dash6-button-elevation) * 2.6) rgba(0,0,0,.34),0 1px 2px rgba(0,0,0,.28);
 --dash6-button-radius:18px;
 --dash6-button-pressed-shadow:inset 0 1px 2px rgba(255,255,255,.22),inset 0 -1px 2px rgba(0,0,0,.4),0 1px 3px rgba(0,0,0,.28);
}
:host(dash6-thermostat-card[data-dash6-satin-climate]) .features>.preset-button,
:host(ha-control-select-menu[data-dash6-satin-climate]) .select-anchor,
:host(ha-outlined-icon-button[data-dash6-satin-climate]) button{
 background:var(--dash6-satin-button-background)!important;border:var(--dash6-satin-button-border)!important;box-shadow:var(--dash6-satin-button-shadow)!important;border-radius:8px!important;backdrop-filter:var(--dash6-satin-control-filter)!important;-webkit-backdrop-filter:var(--dash6-satin-control-filter)!important;
}
:host(dash6-thermostat-card[data-dash6-satin-climate]) .features>.preset-button:active,
:host(ha-control-select-menu[data-dash6-satin-climate]) .select-anchor:active,
:host(ha-outlined-icon-button[data-dash6-satin-climate]) button:active{box-shadow:var(--dash6-satin-button-pressed-shadow)!important;scale:.97;translate:0 1px}
:host(ha-control-select-menu[data-dash6-satin-climate]) .select-anchor::before{background:none!important;opacity:0!important}
:host(ha-control-slider[data-dash6-satin-climate]) .slider,:host(dash6-cover-slider[data-dash6-satin-climate]) .slider,:host(mushroom-slider[data-dash6-satin-climate]) .slider{
 border:0!important;border-radius:11px!important;background:var(--dash6-satin-control-background)!important;isolation:isolate;
}
:host(ha-control-slider[data-dash6-satin-climate]) .slider::before,:host(dash6-cover-slider[data-dash6-satin-climate]) .slider::before,:host(mushroom-slider[data-dash6-satin-climate]) .slider::before{
 content:'';position:absolute;inset:0;z-index:3;pointer-events:none;border-radius:inherit;box-shadow:var(--dash6-satin-control-shadow);background:var(--dash6-satin-slider-gloss);
}
:host(ha-control-slider[data-dash6-satin-climate]) .slider-track-background,:host(dash6-cover-slider[data-dash6-satin-climate]) .slider-track-background,:host(mushroom-slider[data-dash6-satin-climate]) .slider-track-background{background:var(--dash6-satin-control-background)!important;opacity:1!important}
:host(ha-control-slider[data-dash6-satin-climate]) .slider-track-cursor,:host(dash6-cover-slider[data-dash6-satin-climate]) .slider-track-cursor,:host(mushroom-slider[data-dash6-satin-climate]) .slider-track-indicator{
 box-sizing:border-box;border-radius:8px!important;border:var(--dash6-satin-lens-border)!important;background:var(--dash6-satin-lens-background)!important;box-shadow:var(--dash6-satin-lens-shadow)!important;transition:scale var(--dash6-satin-elastic-duration,420ms) cubic-bezier(.22,1.5,.36,1);
}
:host(ha-control-circular-slider[data-dash6-satin-climate]) [data-dash6-satin-handle]{transition:stroke-width var(--dash6-satin-elastic-duration,420ms) cubic-bezier(.22,1.5,.36,1)!important}
:host(ha-control-circular-slider[data-dash6-satin-climate]) .target[data-dash6-satin-handle-pressed]{stroke-width:21px!important}
:host(ha-control-circular-slider[data-dash6-satin-climate]) .target-border[data-dash6-satin-handle-pressed]{stroke-width:27px!important}
:host(ha-control-slider[data-dash6-satin-climate]) .pressed .slider-track-cursor,:host(dash6-cover-slider[data-dash6-satin-climate]) .pressed .slider-track-cursor,:host(mushroom-slider[data-dash6-satin-climate]) .controlled .slider-track-indicator{scale:var(--dash6-satin-slider-press-scale,1.30)}
@media(hover:hover){:host(ha-control-slider[data-dash6-satin-climate]) .slider:hover .slider-track-cursor,:host(dash6-cover-slider[data-dash6-satin-climate]) .slider:hover .slider-track-cursor,:host(mushroom-slider[data-dash6-satin-climate]) .slider:hover .slider-track-indicator{scale:var(--dash6-satin-slider-hover-scale,1.045)}}
@media(prefers-reduced-motion:reduce){:host([data-dash6-satin-climate]) [data-dash6-satin-handle],:host([data-dash6-satin-climate]) .slider-track-cursor,:host([data-dash6-satin-climate]) .slider-track-indicator{transition:none!important;scale:1!important}}
`;
export function satinClimateCandidate(host){
 if(!kinds.has(host?.localName))return false;
 if(!thermostatAncestor(host))return host.localName!=='ha-control-circular-slider'&&host.localName!=='ha-state-control-climate-temperature';
 return thermostatKinds.has(host.localName)||host.localName==='ha-control-circular-slider'||(['ha-control-select-menu','ha-outlined-icon-button'].includes(host.localName)&&presetControl(host));
}
export function isNestedNativeThermostat(host){return host?.localName==='hui-thermostat-card'&&!!thermostatAncestor(host.parentNode||host.getRootNode().host);}
export function bindSatinClimate(host){
 let defs=null,svg=null,observer=null,pointerKey=null;const originals=new Map();
 const ns='http://www.w3.org/2000/svg';
 function restore(){
  observer?.disconnect();observer=null;svg?.removeEventListener('pointerdown',pointerDown,true);window.removeEventListener('pointerup',pointerEnd,true);window.removeEventListener('pointercancel',pointerEnd,true);pointerKey=null;
  for(const [path,values] of originals){for(const [name,value] of Object.entries(values))value===null?path.style.removeProperty(name):path.style.setProperty(name,value[0],value[1]);path.removeAttribute('data-dash6-satin-handle');path.removeAttribute('data-dash6-satin-handle-pressed');}
  originals.clear();defs?.remove();defs=null;svg=null;
 }
 function pressed(){
  const active=pointerKey||(svg?.classList.contains('pressed')?host._activeSlider||'value':null);
  for(const path of originals.keys()){
   const border=path.classList.contains('target-border')?path:path.parentElement.querySelector('.target-border');
   const key=['low','high','value'].find(name=>border?.classList.contains(name))||'value';
   path.toggleAttribute('data-dash6-satin-handle-pressed',!!active&&key===active);
  }
 }
 function pointerDown(event){
  const group=event.composedPath().find(node=>node?.localName==='g'&&node.querySelector(':scope>.target-border'));
  if(!group)return;
  const border=group.querySelector(':scope>.target-border');pointerKey=['low','high','value'].find(name=>border.classList.contains(name))||'value';pressed();
 }
 function pointerEnd(){pointerKey=null;pressed();}
 function handles(on){
  if(host.localName!=='ha-control-circular-slider')return;
  if(!on){restore();return;}
  const current=host.shadowRoot?.querySelector('svg');if(!current)return;
  if(svg&&svg!==current)restore();svg=current;
  if(!defs){
   defs=document.createElementNS(ns,'defs');defs.id='dash6-satin-handles-'+(++nextLens);
   const add=(parent,name,values)=>{const node=document.createElementNS(ns,name);for(const [key,value] of Object.entries(values))node.setAttribute(key,value);parent.append(node);return node;};
   for(const [suffix,stops] of [['body',[['0%','#ffffff','.94'],['24%','#ecf6ff','.69'],['52%','#728b9d','.58'],['82%','#e4f3ff','.83'],['100%','#526d83','.77']]],['edge',[['0%','#ffffff','.95'],['45%','#cddfeb','.55'],['100%','#708da4','.72']]]]){
    const gradient=add(defs,'linearGradient',{id:defs.id+'-'+suffix,x1:'0',y1:'0',x2:'.4',y2:'1'});for(const [offset,color,opacity] of stops)add(gradient,'stop',{offset,'stop-color':color,'stop-opacity':opacity});
   }
   const filter=add(defs,'filter',{id:defs.id+'-gloss',x:'-40%',y:'-40%',width:'180%',height:'180%','color-interpolation-filters':'sRGB'});
   add(filter,'feOffset',{in:'SourceAlpha',dx:'0',dy:'1',result:'shift'});add(filter,'feGaussianBlur',{in:'shift',stdDeviation:'.5',result:'soft'});add(filter,'feComposite',{in:'SourceAlpha',in2:'soft',operator:'out',result:'rim'});add(filter,'feFlood',{'flood-color':'white','flood-opacity':'.88',result:'white'});add(filter,'feComposite',{in:'white',in2:'rim',operator:'in',result:'highlight'});const merge=add(filter,'feMerge',{});for(const value of ['SourceGraphic','highlight'])add(merge,'feMergeNode',{in:value});svg.prepend(defs);
   observer=new MutationObserver(pressed);observer.observe(svg,{attributes:true,attributeFilter:['class']});svg.addEventListener('pointerdown',pointerDown,{capture:true,passive:true});window.addEventListener('pointerup',pointerEnd,{capture:true,passive:true});window.addEventListener('pointercancel',pointerEnd,{capture:true,passive:true});
  }
  for(const path of svg.querySelectorAll('.target,.target-border'))if(!originals.has(path)){
   const values={};for(const name of ['stroke','filter'])values[name]=path.style.getPropertyValue(name)?[path.style.getPropertyValue(name),path.style.getPropertyPriority(name)]:null;originals.set(path,values);
   path.setAttribute('data-dash6-satin-handle','');path.style.setProperty('stroke','url(#'+defs.id+'-'+(path.classList.contains('target-border')?'edge':'body')+')','important');path.style.setProperty('filter','url(#'+defs.id+'-gloss)','important');
  }
  pressed();
 }
 const api={update(){const on=inDashboardScope()&&satinClimateCandidate(host)&&getComputedStyle(host).getPropertyValue('--dash6-satin-enabled').trim()==='1';host.toggleAttribute('data-dash6-satin-climate',on);host.toggleAttribute('data-dash6-satin-thermostat-base',on&&thermostatKinds.has(host.localName));handles(on);},dispose(){host.removeAttribute('data-dash6-satin-climate');host.removeAttribute('data-dash6-satin-thermostat-base');restore();}};
 api.update();return api;
}
