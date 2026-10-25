import {materialThemeText} from './glass-theme-text.js';
// Material defaults only; explicit status colours stay on their existing elements.
import {inDashboardScope} from './scope.js';
const roots=new Map(),originals=new Map();let frame=0;
function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;refresh();});}
function restore(e){const old=originals.get(e);if(!old)return;for(const [key,value]of old)value?e.style.setProperty(key,value):e.style.removeProperty(key);originals.delete(e);}

function refresh(){
 const active=inDashboardScope();
 for(const e of originals.keys())if(!active||!e.isConnected)restore(e);
 if(!active)return;
 const visit=root=>{
  if(!roots.has(root)){const observer=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&n.localName!=='style')))schedule();});observer.observe(root,{childList:true,subtree:true});roots.set(root,observer);}
  for(const e of root.querySelectorAll('*')){
   const host=e.getRootNode().host,thin=e.matches('.glass-light,.area-body,.section-heading,.overview')||(e.matches('.frame,.heading')&&/domain|inline|room-loader/.test(host?.localName||'')),dark=!thin&&(e.matches('[data-dash6-satin-surface],.glass-dark')||(host?.localName==='dash6-area-header'&&e.localName==='ha-card'));
   if(thin||dark){const color=getComputedStyle(e).getPropertyValue('--dash6-'+(thin?'light':'dark')+'-glass-text-color').trim(),theme=materialThemeText(e),custom=/^#[\da-f]{6}$/i.test(color),values={'--dash6-material-theme-primary-text-color':theme.primary,'--dash6-material-theme-secondary-text-color':theme.secondary,'--primary-text-color':custom?color:theme.primary,'--secondary-text-color':custom?color:theme.secondary};if(!originals.has(e))originals.set(e,new Map([...Object.keys(values),'color'].map(k=>[k,e.style.getPropertyValue(k)])));for(const [k,v]of Object.entries(values))if(e.style.getPropertyValue(k)!==v)e.style.setProperty(k,v);if(!originals.get(e).get('color'))e.style.color=custom?color:theme.primary;}
   if(e.shadowRoot)visit(e.shadowRoot);
  }
 };
 for(const [root,observer]of roots)if(root.host&&!root.host.isConnected){observer.disconnect();roots.delete(root);}
 visit(document);
}
for(const event of ['dash6-theme-settings-changed','location-changed','popstate'])window.addEventListener(event,schedule);
schedule();
