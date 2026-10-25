import {createCardElement} from './native.js';
import {createDemoRuntime} from './package/demo-runtime.js';
const status=document.querySelector('#runtime-status');
const json=async path=>{const r=await fetch(path,{cache:'no-store'});if(!r.ok)throw Error(path+': '+r.status);return r.json();};
const isCopy=new URLSearchParams(location.search).get('dashboard')!=='gallery';
const [data,themeTable,modules]=await Promise.all(['demo-runtime-data','themes','modules'].map(name=>json('package/'+name+'.json')));
const dashboard=data.dashboards[isCopy?'liquid-glass-demo':'liquid-glass-gallery'];
for(const [key,value]of Object.entries(themeTable['DASH6 Satin Glass']))if(typeof value==='string'&&!key.startsWith('card-mod-'))document.documentElement.style.setProperty('--'+key,value);
document.documentElement.style.setProperty('--lovelace-background',"url('package/assets/liquid-glass-living-room.jpg')");
const runtime=createDemoRuntime(data,{assetRoot:new URL('package/',location.href).href});
let mounted=[],currentView='demo';
const base={demo_browser:true,user:{id:'public-demo',name:'Demo',is_admin:true},language:'de',translationMetadata:{translations:{de:{isRTL:false}}},locale:{language:'de',number_format:'language',time_format:'24',date_format:'language',first_weekday:'monday'},config:{components:['frontend','lovelace','liquid_glass'],unit_system:{temperature:'°C',length:'km',mass:'kg',pressure:'hPa'},time_zone:'Europe/Berlin',version:'2026.10.3'},themes:{themes:themeTable,default_theme:'DASH6 Satin Glass',darkMode:true},localize:key=>({'component.climate.entity_component._.state.off':'Aus','component.climate.entity_component._.state.heat':'Heizen','component.climate.entity_component._.state.cool':'Kühlen','component.climate.entity_component._.state.heat_cool':'Heizen/Kühlen'}[key]||key.split('.').at(-1).replaceAll('_',' ')),formatEntityState:s=>s.state,formatEntityAttributeValue:(s,key)=>String(s.attributes?.[key]??''),formatEntityAttributeName:(_s,k)=>k};
let hass=runtime.hass(base);
window.demoPreview={dashboard,hass,runtime,ready:false,errors:[]};
function publish(){hass=runtime.hass(base);for(const card of mounted)card.hass=hass;const app=document.querySelector('home-assistant');if(app)app.hass=hass;window.demoPreview.hass=hass;status.textContent='Bereit · lokale Browser-Simulation · echte Custom Cards und GUI-Editoren';}
runtime.subscribe(publish);
const reset=()=>runtime.reset();
try{
 for(const url of modules)await import(new URL(url,location.href));
 await import('./package/dash6-cards.js');await import('./package/vacuum-dock-card.js');await import('./package/room-loader.js');
 const originalFetch=window.fetch.bind(window);window.fetch=(url,options)=>originalFetch(typeof url==='string'&&url.startsWith('/local/liquid-glass/')?'package/'+url.slice('/local/liquid-glass/'.length):url,options);
 const preview=document.querySelector('#preview'),app=document.createElement('home-assistant');app.hass=hass;preview.append(app);let node=app;
 for(const tag of ['home-assistant-main','ha-panel-lovelace','hui-root']){const child=document.createElement(tag);node.attachShadow({mode:'open'}).append(child);node=child;}
 const root=node;root.lovelace={config:dashboard,urlPath:isCopy?'liquid-glass-demo':'liquid-glass-gallery',mode:'storage',editMode:false,saveConfig:async next=>{root.lovelace.config=next;}};
 root.attachShadow({mode:'open'}).innerHTML='<style>hui-view-container{display:block}.preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;align-items:start}.preview-grid>*{min-width:0}.wide{grid-column:1/-1}@media(max-width:760px){.preview-grid{grid-template-columns:minmax(0,1fr)}}</style><hui-view-container></hui-view-container>';
 const view=root.shadowRoot.querySelector('hui-view-container');view.attachShadow({mode:'open'}).innerHTML='<style>.preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;align-items:start}.preview-grid>*{min-width:0}.wide{grid-column:1/-1}@media(max-width:760px){.preview-grid{grid-template-columns:minmax(0,1fr)}}</style><div class="preview-grid" id="sections"></div>';const grid=view.shadowRoot.querySelector('.preview-grid');
 function showView(path,update=true){const v=dashboard.views.find(v=>v.path===path)||dashboard.views[0];currentView=v.path;grid.style.gridTemplateColumns=v.type==='panel'?'minmax(0,1fr)':'';view.viewConfig=v;view.lovelace=root.lovelace;mounted=[];grid.replaceChildren();
  const cards=v.sections?.flatMap(s=>s.cards)||v.cards||[];
  // Restore authored row order from the two sections used by the HA showroom.
  const ordered=v.path==='demo'?Array.from({length:cards.length},(_,i)=>(v.sections[i%2]?.cards||[])[Math.floor(i/2)]).filter(Boolean):cards;
  for(const c of ordered){const child=createCardElement(c);const inner=c.card?.card||c.card||c;child.dataset.cardType=inner.type;child.dataset.title=c.card?.title||inner.name||inner.type;if(inner.type==='markdown')child.classList.add('wide');child.hass=hass;grid.append(child);mounted.push(child);}
  document.querySelectorAll('#view-tabs button').forEach(b=>b.setAttribute('aria-current',b.dataset.view===v.path?'page':'false'));
  if(update){const url=new URL(location.href);url.searchParams.set('view',v.path);history.replaceState(null,'',url);}
 }
 for(const v of dashboard.views){if(v.subview)continue;const b=document.createElement('button');b.textContent=v.title;b.dataset.view=v.path;b.onclick=()=>showView(v.path);document.querySelector('#view-tabs').append(b);}
 document.querySelector('#reset-demo').onclick=()=>{reset();showView(currentView);};
 window.addEventListener('location-changed',()=>{const path=location.pathname.split('/').filter(Boolean).at(-1);if(dashboard.views.some(v=>v.path===path))showView(path);});
 window.addEventListener('popstate',()=>showView(new URLSearchParams(location.search).get('view')||'demo',false));
 showView(new URLSearchParams(location.search).get('view')||(isCopy?'home':'demo'));window.demoPreview.ready=true;window.demoPreview.showView=showView;status.textContent='Bereit · lokale Browser-Simulation · echte Custom Cards, Detaildialoge und GUI';
}catch(error){window.demoPreview.errors.push(error.message);status.textContent='Demo konnte nicht vollständig geladen werden';const p=document.createElement('p');p.className='fatal';p.textContent=error.message;document.querySelector('#preview').append(p);console.error(error);}
