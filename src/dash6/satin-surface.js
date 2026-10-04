import {inDashboardScope} from './scope.js';
import {satinGroupCSS,bindSatinGroup,satinGroupCandidate} from './satin-groups.js';
import {satinClimateCSS,satinClimateCandidate,bindSatinClimate,thermostatAncestor} from './satin-climate.js';
/* Staged Satin material. Discovery is event driven; entity updates do not scan the page. */
const modes=new Map(), roots=new Map(), cards=new Set(), groups=new Map(),climates=new Map(),themeScopes=new Map();
let started=false, active=false, queued=false, pruneQueued=false, renderRefreshFrame=0, pointerFrame=0, pointerCard=null, pointerX=0, pointerY=0;
const structural=new Set(['ultra-card','dash6-ultra-card','dash6-stack-card','dash6-embedded-card','grid-layout','masonry-layout','layout-card','dash6-pill-layout','dash6-inline-pill-layout','hui-heading-card','embedded-view-card','dash6-embedded-view-card','mini-graph-card','hui-vertical-stack-card','hui-horizontal-stack-card','hui-grid-card','auto-entities','dash6-auto-entities']);
const themeScopeKinds=new Set(['hui-view-container','hui-root','ha-panel-lovelace','hui-view','hui-sections-view','hui-masonry-view','hui-panel-view','ultra-card','dash6-ultra-card','embedded-view-card','dash6-embedded-view-card','dash6-embedded-card']);
const STYLE='dash6-satin-surface-style';
export const satinSurfaceCSS=`
[data-dash6-satin-surface],#embedded-sidebar-modal[data-dash6-satin-surface]{
 background:radial-gradient(ellipse 95% 75% at var(--dash6-satin-pointer-x,32%) var(--dash6-satin-pointer-y,0%),rgba(255,255,255,calc(var(--dash6-satin-hover-gloss,.20) * var(--dash6-satin-hovered,0))),transparent 64%),var(--dash6-satin-card-background)!important;
 border:var(--dash6-satin-card-border)!important;border-bottom-color:var(--dash6-satin-card-bottom-edge,rgba(255,255,255,.045))!important;
 box-shadow:var(--dash6-satin-card-shadow)!important;backdrop-filter:var(--dash6-satin-card-filter)!important;-webkit-backdrop-filter:var(--dash6-satin-card-filter)!important;
 border-radius:var(--dash5-card-radius,16px)!important;background-clip:padding-box!important;
 transition:box-shadow var(--dash6-satin-gloss-duration,180ms) ease,border-color var(--dash6-satin-gloss-duration,180ms) ease!important;
}
[data-dash6-satin-surface].dash5-thin-flush{padding-top:0px!important;padding-bottom:0px!important}
:host([data-satin]) .slider,:host([data-satin]) input[type=range].slider{
 border:0!important;box-shadow:var(--dash6-satin-control-shadow)!important;
 background-image:var(--dash6-satin-slider-gloss),var(--track)!important;
}
@media(prefers-reduced-transparency:reduce){[data-dash6-satin-surface],#embedded-sidebar-modal[data-dash6-satin-surface]{background:var(--dash6-solid-surface)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}}
@media(prefers-reduced-motion:reduce){[data-dash6-satin-surface],#embedded-sidebar-modal[data-dash6-satin-surface]{transition:none!important}}
${satinGroupCSS}
${satinClimateCSS}
`;
function enabled(host){return getComputedStyle(host).getPropertyValue('--dash6-satin-enabled').trim()==='1';}
function scope(){return inDashboardScope()||document.documentElement.hasAttribute('data-dash6-satin-preview');}
function updateMode(host,callback){
 const value=scope()&&enabled(host), old=host.hasAttribute('data-satin');
 host.toggleAttribute('data-satin',value);
 if(old!==value){callback?.(value);if(typeof host.requestUpdate==='function')host.requestUpdate();else host.update?.();}
 return value;
}
export function bindSatinMode(host,onChange){
 modes.set(host,{onChange,seenConnected:host.isConnected});updateMode(host,onChange);startSatinSurfaces();
 if(scope()){
  // Register composed ancestors directly too: a control may live in a native or
  // embedded shadow tree before global discovery reaches its theme container.
  for(let node=host;node;node=node.assignedSlot||node.parentNode||node.host)if(themeScopeKinds.has(node.localName))observeThemeScope(node);
  queueRenderRefresh();
 }
}
export function unbindSatinMode(host){modes.delete(host);host.removeAttribute('data-satin');}
function eligible(card){
 const host=card.getRootNode().host;
 if(structural.has(host?.localName))return false;
 if(thermostatAncestor(card)||host?.classList?.contains('dash6-background-graph'))return false;
 if(host?.classList?.contains('dash5-transparent')||host?.classList?.contains('dash5-navigation-link')||host?.classList?.contains('dash6-nav-lens'))return false;
 if(card.classList.contains('tab-body')||host?.closest?.('.power-graph,.background-graph,.graph-overlay,#graph'))return false;
 if(['transparent','none'].includes(card.style.getPropertyValue('background').trim()))return false;
 if(card.classList.contains('dash5-transparent')||card.classList.contains('dash5-navigation-link'))return false;
 // Legacy light cards render their outer surface as a div; other .card nodes are content.
 if(card.localName!=='ha-card'&&!card.hasAttribute('data-dash6-satin-card'))return /^(dash6|dash5)-.*light-(card|dialog)/.test(host?.localName||'')&&card.classList.contains('card');
 return true;
}
function updateCard(card){const on=active&&enabled(card)&&eligible(card);card.toggleAttribute('data-dash6-satin-surface',on);if(on)ensureStyle(card.getRootNode());}
function addCard(card){if(!cards.has(card))cards.add(card);updateCard(card);}
function observeThemeScope(host){
 if(themeScopes.has(host))return;
 // HA applies view-theme variables after inner controls can already be connected.
 // Observe semantic theme hosts, not all element styles: slider drag and pointer
 // gloss must not trigger page-wide refreshes. Only the gate/class signature matters.
 const signature=()=>host.style.getPropertyValue('--dash6-satin-enabled').trim()+'|'+host.className;
 const item={signature:signature(),observer:null};
 item.observer=new MutationObserver(()=>{const next=signature();if(next!==item.signature){item.signature=next;queueRefresh();}});
 item.observer.observe(host,{attributes:true,attributeFilter:['style','class']});themeScopes.set(host,item);
 // Also cover a warm mount/reparent after a theme host was already populated.
 queueRefresh();
}
function discover(node){
 if(!active)return;
 if(node.nodeType===1){
  if(themeScopeKinds.has(node.localName))observeThemeScope(node);
  const mode=modes.get(node);if(mode){mode.seenConnected=node.isConnected;updateMode(node,mode.onChange);}
  if(node.matches('ha-card,[data-dash6-satin-card],.card'))addCard(node);
  if(satinGroupCandidate(node)){const group=bindSatinGroup(node);if(group){groups.set(node,group);ensureStyle(node.getRootNode());}}
  if(node.shadowRoot)observeRoot(node.shadowRoot);
  if(satinClimateCandidate(node)){if(!climates.has(node))climates.set(node,bindSatinClimate(node));else climates.get(node).update();if(node.shadowRoot)ensureStyle(node.shadowRoot);}
 }
 for(const child of node.children||[])discover(child);
}
function ensureStyle(root){
 const item=roots.get(root);if(!item)return;
 if(!item.style){item.style=document.createElement('style');item.style.id=STYLE;item.style.textContent=satinSurfaceCSS;}
 const parent=root.nodeType===11?root:document.head;
 if(item.style.parentNode!==parent)parent.append(item.style);
}
function observeRoot(root){
 if(!active||roots.has(root))return;
 const item={style:null,observer:null};
 item.observer=new MutationObserver(records=>{
  if(!active)return;
  let removed=false;
  for(const record of records){
   for(const node of record.addedNodes)if(node.nodeType===1&&node.id!==STYLE)discover(node);
   if(record.target.nodeType===1&&satinGroupCandidate(record.target)&&!groups.has(record.target)){const group=bindSatinGroup(record.target);if(group){groups.set(record.target,group);ensureStyle(root);}}
   if(record.removedNodes.length)removed=true;
  }
  if(item.style&&root.nodeType===11&&root.host.isConnected&&item.style.parentNode!==root)ensureStyle(root);
  climates.get(root.host)?.update();
  if(removed)queuePrune();
 });
 roots.set(root,item);item.observer.observe(root,{childList:true,subtree:true});discover(root);
}
function queuePrune(){if(pruneQueued)return;pruneQueued=true;queueMicrotask(()=>{pruneQueued=false;prune();});}
function prune(){
 for(const [host,item] of themeScopes)if(!host.isConnected){item.observer.disconnect();themeScopes.delete(host);}
 for(const [host,controller] of climates)if(!host.isConnected){controller.dispose();climates.delete(host);}
 for(const [group,controller] of groups)if(!group.isConnected){controller.dispose();groups.delete(group);}
 for(const card of cards)if(!card.isConnected)cards.delete(card);
 for(const [root,item] of roots)if(root.host&&!root.host.isConnected){item.observer.disconnect();item.style?.remove();roots.delete(root);}
 for(const [host,item] of modes)if(item.seenConnected&&!host.isConnected)modes.delete(host);
}
export function refreshSatinSurfaces(){
 queued=false;syncScope();prune();
 for(const [host,item] of modes){if(host.isConnected)item.seenConnected=true;updateMode(host,item.onChange);}
 for(const card of cards)updateCard(card);
 for(const controller of groups.values())controller.update();
 for(const controller of climates.values())controller.update();
}
function queueRenderRefresh(){
 if(renderRefreshFrame||!scope())return;
 // HA can set the view's inline theme in one microtask and propagate/adopt its
 // shadow styles in a later render. Reconcile once before the following paint.
 // Only mount/theme events schedule this frame; pointer/drag updates never do.
 renderRefreshFrame=requestAnimationFrame(()=>{renderRefreshFrame=0;if(scope())refreshSatinSurfaces();});
}
function queueRefresh(){queueRenderRefresh();if(queued)return;queued=true;queueMicrotask(refreshSatinSurfaces);}
function leave(){
 if(pointerFrame)cancelAnimationFrame(pointerFrame);pointerFrame=0;
 pointerCard?.style.removeProperty('--dash6-satin-hovered');pointerCard=null;
}
function move(event){
 if(!active||event.pointerType==='touch')return;
 const card=event.composedPath().find(el=>el?.hasAttribute?.('data-dash6-satin-surface'));
 if(!card){leave();return;}
 if(card!==pointerCard){leave();pointerCard=card;card.style.setProperty('--dash6-satin-hovered','1');}
 pointerX=event.clientX;pointerY=event.clientY;
 if(!pointerFrame)pointerFrame=requestAnimationFrame(()=>{
  pointerFrame=0;if(!pointerCard?.isConnected)return;
  const r=pointerCard.getBoundingClientRect();
  pointerCard.style.setProperty('--dash6-satin-pointer-x',Math.max(0,Math.min(100,(pointerX-r.left)/(r.width||1)*100))+'%');
  pointerCard.style.setProperty('--dash6-satin-pointer-y',Math.max(0,Math.min(100,(pointerY-r.top)/(r.height||1)*100))+'%');
 });
}
function syncScope(){
 const next=scope();if(next===active)return;active=next;
 if(active){observeRoot(document);document.addEventListener('pointermove',move,{passive:true});document.addEventListener('pointerleave',leave,{passive:true});}
 else{
  if(renderRefreshFrame)cancelAnimationFrame(renderRefreshFrame);renderRefreshFrame=0;
  leave();document.removeEventListener('pointermove',move);document.removeEventListener('pointerleave',leave);
  for(const card of cards)card.removeAttribute('data-dash6-satin-surface');cards.clear();for(const controller of groups.values())controller.dispose();groups.clear();
  for(const controller of climates.values())controller.dispose();climates.clear();
  for(const item of themeScopes.values())item.observer.disconnect();themeScopes.clear();
  for(const item of roots.values()){item.observer.disconnect();item.style?.remove();}roots.clear();
 }
}
export function startSatinSurfaces(){
 if(started||typeof document==='undefined')return;started=true;
 // Shadow creation is reported once, and ignored completely outside DASH6.
 const attach=window.Element.prototype.attachShadow;
 window.Element.prototype.attachShadow=function(options){const root=attach.call(this,options);if(active&&options.mode==='open')queueMicrotask(()=>{if(active&&this.isConnected)observeRoot(root);});return root;};
 const themeObserver=new MutationObserver(queueRefresh);
 themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['style','class','data-dash6-satin-preview']});
 const app=document.querySelector('home-assistant');if(app)themeObserver.observe(app,{attributes:true,attributeFilter:['style','class']});
 window.addEventListener('blur',leave);
 for(const event of ['dash6-theme-settings-changed','location-changed','popstate','theme-changed'])window.addEventListener(event,queueRefresh);
 syncScope();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startSatinSurfaces,{once:true});else startSatinSurfaces();}
