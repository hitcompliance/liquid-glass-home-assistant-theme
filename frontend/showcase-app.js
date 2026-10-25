import {createCardElement} from './native.js';
const prefix='liquid_glass_demo_',own=id=>typeof id==='string'&&/^[a-z_]+\.liquid_glass_demo_[a-z0-9_]+$/.test(id);
const status=document.querySelector('#runtime-status');
const stamp=()=>new Date().toISOString();
const json=async path=>{const r=await fetch(path);if(!r.ok)throw Error(path+': '+r.status);return r.json();};
const [dashboard,specs,themeTable,modules,sharedDefaults,roomConfigs]=await Promise.all(['dashboard','entities','themes','modules','theme-defaults','room-loader-configs'].map(name=>json('package/'+name+'.json')));
for(const [key,value]of Object.entries(themeTable['DASH6 Satin Glass']))if(typeof value==='string'&&!key.startsWith('card-mod-'))document.documentElement.style.setProperty('--'+key,value);
document.documentElement.style.setProperty('--lovelace-background',"url('package/assets/liquid-glass-living-room.jpg')");
let states={},mounted=[],currentView='demo';const subscribers=new Map();
const value=(domain,key)=>states[domain+'.'+prefix+key];
const set=(domain,key,state,attrs={})=>{const s=value(domain,key);if(s){s.state=String(state);Object.assign(s.attributes,attrs);s.last_changed=s.last_updated=stamp();}};
function initial(spec){
 const {domain,key}=spec;let state='on',a={friendly_name:spec.name,liquid_glass_demo:true};
 if(domain==='light')Object.assign(a,{supported_features:4,supported_color_modes:['hs','color_temp'],color_mode:'hs',brightness:184,hs_color:[215,70],rgb_color:[55,130,230],color_temp_kelvin:3000,min_color_temp_kelvin:2000,max_color_temp_kelvin:6500,effect:'Solid',effect_list:['Solid','Aurora','Pulse']});
 if(domain==='light'&&['gruppe','schuhschrank'].includes(key))a.entity_id=(key==='gruppe'?['links','rechts']:['schuhschrank_links','schuhschrank_rechts']).map(k=>'light.'+prefix+k);
 if(domain==='switch')state=/force|kindersicherung|simulation|ausgang/.test(key)?'off':'on';
 if(domain==='sensor'){
  state='24';Object.assign(a,{unit_of_measurement:'W',device_class:'power',state_class:'measurement'});
  if(/temperature|temperatur/.test(key)){state=key.includes('kuhlschrank')?'5.2':'23.1';Object.assign(a,{unit_of_measurement:'°C',device_class:'temperature'});}
  if(/moisture|luftfeuchte/.test(key)){state='42';Object.assign(a,{unit_of_measurement:'%',device_class:'humidity'});}
  if(/illuminance/.test(key)){state='18000';Object.assign(a,{unit_of_measurement:'lx',device_class:'illuminance'});}
  if(/conductivity/.test(key)){state='850';Object.assign(a,{unit_of_measurement:'µS/cm',device_class:undefined});}
  if(/battery|batterie/.test(key)){state='86';Object.assign(a,{unit_of_measurement:'%',device_class:'battery'});}
  if(/energie/.test(key)){state='1.42';Object.assign(a,{unit_of_measurement:'kWh',device_class:'energy',state_class:'total_increasing'});}
  if(/restzeit/.test(key)){state='120';Object.assign(a,{unit_of_measurement:'h',device_class:undefined});}
  if(/fortschritt/.test(key)){state='0';Object.assign(a,{unit_of_measurement:'%',device_class:undefined});}
  if(/dauer/.test(key)){state='0';Object.assign(a,{unit_of_measurement:'min',device_class:undefined});}
  if(/aktivitat/.test(key)){state=stamp();Object.assign(a,{unit_of_measurement:undefined,device_class:'timestamp',state_class:undefined});}
 }
 if(domain==='binary_sensor'){state='off';a.device_class=key==='anwesenheit'?'occupancy':key.includes('tur')?'door':key==='wasser'?'moisture':'problem';}
 if(domain==='fan')Object.assign(a,{percentage:50,supported_features:49});
 if(domain==='climate'){state='heat';Object.assign(a,{current_temperature:21.2,temperature:22,target_temp_low:20,target_temp_high:24,min_temp:5,max_temp:30,target_temp_step:.5,hvac_modes:['off','heat','cool','heat_cool'],hvac_action:'idle',preset_modes:['comfort','eco'],preset_mode:'comfort',supported_features:403});}
 if(domain==='cover'){state='open';Object.assign(a,{current_position:65,supported_features:15});}
 if(domain==='media_player'){state='idle';Object.assign(a,{media_title:'Virtueller Demo-Titel',media_artist:'Liquid Glass',entity_picture:'package/assets/liquid-glass-living-room.jpg',volume_level:.35,is_volume_muted:false,source:'AppleTV',source_list:['AppleTV','HDMI 1','HDMI 3'],supported_features:65535});}
 if(domain==='remote')a.supported_features=0;
 if(domain==='vacuum'){state='docked';Object.assign(a,{fan_speed:'balanced',fan_speed_list:['quiet','balanced','turbo','max'],battery_level:86,supported_features:13244});}
 if(domain==='lock'){state='locked';a.supported_features=1;}
 if(domain==='number'){state='0';Object.assign(a,{min:0,max:60,step:.1,unit_of_measurement:'min',mode:'box'});}
 if(domain==='select'){a.options=key.includes('reinigung')?['vac_and_mop','vacuum','mop']:key.includes('wischintensitat')?['off','mild','moderate','intense']:key.includes('wischroute')?['standard','deep','deep_plus']:key.includes('entleerungsmodus')?['smart','light','balanced','max']:['Lesen','Entspannen'];state=a.options[0];}
 if(domain==='button')state='unknown';
 if(domain==='scene'){
  state='unknown';a.scene_targets=Object.fromEntries(['schuhschrank','schuhschrank_links','schuhschrank_rechts'].map(k=>['light.'+prefix+k,{state:'on',brightness:255,color_mode:'hs',hs_color:key==='weiss'?[0,0]:[215,70]}]));
 }
 if(domain==='update'){state='off';Object.assign(a,{installed_version:'1.0.0',latest_version:'1.0.0',supported_features:1});}
 if(domain==='weather'){state='partlycloudy';Object.assign(a,{temperature:21.5,temperature_unit:'°C',humidity:58,supported_features:1});}
 if(domain==='camera'){state='idle';a.entity_picture='package/assets/liquid-glass-living-room.jpg';}
 return {entity_id:spec.entity_id,state,attributes:a,last_changed:stamp(),last_updated:stamp(),last_reported:stamp(),context:{id:'demo',parent_id:null,user_id:null}};
}
const entities=Object.fromEntries(specs.map(s=>[s.entity_id,{entity_id:s.entity_id,device_id:'demo-'+s.room,area_id:'demo-'+s.room,platform:'liquid_glass',config_entry_id:'demo',hidden_by:null,disabled_by:null}]));
const devices=Object.fromEntries(specs.map(s=>['demo-'+s.room,{id:'demo-'+s.room,area_id:'demo-'+s.room,identifiers:[['liquid_glass','demo_'+s.room]],manufacturer:'Liquid Glass',model:'Virtual device'}]));
const areas=Object.fromEntries(specs.map(s=>['demo-'+s.room,{area_id:'demo-'+s.room,name:'DASH6 Demo · '+s.room}]));
function synchronize(){
 set('binary_sensor','anwesenheit',value('switch','anwesenheit')?.state||'off');set('binary_sensor','kuhlschrank_tur',value('switch','kuhlschrank_tur_simulation')?.state||'off');
 const run=value('switch','luftung_force')?.state==='on'||value('fan','luftung')?.state==='on'&&value('binary_sensor','anwesenheit')?.state==='on';
 set('switch','luftung_ausgang',run?'on':'off');set('switch','luftung_force_ausgang',run?'on':'off');set('sensor','luftung_leistung',run?18.5:0);
 for(const group of ['gruppe','schuhschrank']){const s=value('light',group),members=s?.attributes.entity_id||[];if(s)s.state=members.some(id=>states[id]?.state==='on')?'on':'off';}
}
function reset(){states=Object.fromEntries(specs.map(s=>[s.entity_id,initial(s)]));synchronize();publish();}
function publish(){hass={...hass,states:{...states}};for(const card of mounted)card.hass=hass;status.textContent='Bereit · '+specs.length+' virtuelle Entities · echte Custom Cards und GUI-Editoren';window.demoPreview.hass=hass;}
function simulatedHistory(ids,days=1){const end=Date.now(),step=days*86400000/48;return ids.filter(own).map(id=>{const s=states[id],base=Number(s?.state)||12;return Array.from({length:49},(_,i)=>({...s,state:String(Math.max(0,Math.round((base+Math.sin(i/4)*base*.18)*100)/100)),last_changed:new Date(end-(48-i)*step).toISOString(),last_updated:new Date(end-(48-i)*step).toISOString()}));});}
const registryRows=type=>Object.values(type==='entity'?entities:type==='device'?devices:areas);
async function callWS(m){
 if(m.type==='get_states')return Object.values(states);
 if(m.type==='lovelace/config')return dashboard;
 if(m.type?.endsWith('_registry/list'))return registryRows(m.type.match(/config\/(\w+)_registry/)[1]);
 if(m.type==='frontend/get_user_data')return {value:JSON.parse(localStorage.getItem('dash6-public-data:'+m.key)||'null')};
 if(m.type==='frontend/set_user_data'){localStorage.setItem('dash6-public-data:'+m.key,JSON.stringify(m.value));return {};}
 if(m.type==='liquid_glass/theme_defaults'){const shared=m.values?{version:1,themes:{'DASH6 Satin Glass':{revision:stamp(),values:m.values}}}:sharedDefaults;return {shared,backup:'Browser-Demo · keine HA-Dateien',changed:0};}
 if(m.type?.startsWith('recorder/')){const ids=m.statistic_ids||Object.keys(states).filter(id=>id.startsWith('sensor.'));if(m.type.includes('list_statistic'))return ids.map(id=>({statistic_id:id,has_mean:true,has_sum:states[id]?.attributes.device_class==='energy',unit_of_measurement:states[id]?.attributes.unit_of_measurement,name:states[id]?.attributes.friendly_name}));return Object.fromEntries(simulatedHistory(ids,m.period==='hour'?7:1).map(rows=>[rows[0].entity_id,rows.map(s=>({start:Date.parse(s.last_updated),end:Date.parse(s.last_updated)+1800000,mean:Number(s.state),min:Number(s.state)-1,max:Number(s.state)+1,state:Number(s.state),sum:Number(s.state),change:.04}))]));}
 if(m.type?.startsWith('history/'))return {states:Object.fromEntries(simulatedHistory(m.entity_ids||[]).map(rows=>[rows[0].entity_id,rows.map(s=>({s:s.state,lu:Date.parse(s.last_updated)/1000,lc:Date.parse(s.last_changed)/1000,a:s.attributes}))]))};
 if(m.type==='media_player/browse_media')return {title:'Demo-Mediathek',media_class:'directory',media_content_id:'demo',media_content_type:'directory',can_play:false,can_expand:true,children:[{title:'Virtueller Titel',media_class:'music',media_content_id:'demo-track',media_content_type:'music',can_play:true,can_expand:false}]};
 return {};
}
async function callService(domain,service,data={},target={}){
 const ids=[data.entity_id,target.entity_id].flat().filter(Boolean);if(!ids.length||!ids.every(own)||data.device_id||data.area_id||target.area_id||target.device_id)throw Error('Nur konkrete virtuelle Demo-Entities sind erlaubt.');
 for(const id of ids){const s=states[id];if(!s)continue;const key=id.split('.')[1].slice(prefix.length);s.last_changed=s.last_updated=stamp();
  if(service==='toggle')s.state=s.state==='on'?'off':'on';if(service==='turn_on')s.state='on';if(service==='turn_off')s.state='off';
  for(const k of ['brightness','hs_color','rgb_color','color_temp_kelvin','effect','percentage','temperature','target_temp_low','target_temp_high','preset_mode','volume_level','is_volume_muted','source','fan_speed'])if(data[k]!==undefined)s.attributes[k]=data[k];
  if(data.hs_color)s.attributes.color_mode='hs';if(data.color_temp_kelvin)s.attributes.color_mode='color_temp';if(data.brightness_pct!==undefined)s.attributes.brightness=Math.round(data.brightness_pct*2.55);
  if(domain==='light'&&s.attributes.entity_id)for(const member of s.attributes.entity_id)if(states[member]){states[member].state=s.state;Object.assign(states[member].attributes,{brightness:s.attributes.brightness,hs_color:s.attributes.hs_color,color_mode:s.attributes.color_mode,color_temp_kelvin:s.attributes.color_temp_kelvin});}
  if(domain==='scene')for(const [targetId,desired]of Object.entries(s.attributes.scene_targets||{})){states[targetId].state=desired.state;Object.assign(states[targetId].attributes,desired);}
  if(domain==='climate'&&data.hvac_mode)s.state=data.hvac_mode;
  if(domain==='number'&&data.value!==undefined)s.state=String(data.value);
  if(domain==='select'&&data.option)s.state=data.option;
  if(domain==='cover'){s.attributes.current_position=data.position??(service==='close_cover'?0:service==='open_cover'?100:s.attributes.current_position);s.state=s.attributes.current_position===0?'closed':'open';}
  if(domain==='media_player'){if(['media_play','play_media'].includes(service))s.state='playing';if(service==='media_pause')s.state='paused';if(service==='media_play_pause')s.state=s.state==='playing'?'paused':'playing';if(service==='media_stop'||service==='turn_on')s.state='idle';if(service==='select_source')s.attributes.source=data.source;}
  if(domain==='remote'){s.attributes.last_command=data.command;if(service==='turn_on'||service==='turn_off')set('media_player',key,service==='turn_on'?'idle':'off');}
  if(domain==='lock'){s.state=service==='lock'?'locked':'unlocked';set('binary_sensor','turkontakt',service==='open'?'on':'off');}
  if(domain==='vacuum'){s.state=service==='start'||service==='send_command'?'cleaning':service==='return_to_base'?'docked':service==='pause'?'paused':service==='stop'?'idle':s.state;}
  if(domain==='update'){s.state='off';s.attributes.installed_version=s.attributes.latest_version;}
  if(domain==='button'){s.state=stamp();if(key==='zurucksetzen'){reset();return {};}if(key==='klingeln'){set('binary_sensor','klingel','on');set('sensor','klingel_letzte_aktivitat',stamp());}if(key==='turoffner'){set('binary_sensor','klingel','off');set('binary_sensor','turkontakt','on');}if(key==='update_verfugbar'){set('update','firmware','on',{latest_version:'1.1.0'});}if(key.endsWith('_zurucksetzen'))set('sensor',key.replace('_zurucksetzen','_restzeit'),300);}
 }
 synchronize();publish();document.querySelector('#runtime-status').textContent='Simuliert: '+domain+'.'+service+' · '+ids.join(', ');return {};
}
const connection={haVersion:'2026.9.0',sendMessagePromise:callWS,addEventListener(){},removeEventListener(){},subscribeEvents:async(fn,type)=>{subscribers.set(fn,type);return()=>subscribers.delete(fn);},subscribeMessage:async(fn,m)=>{if(m.type==='render_template')queueMicrotask(()=>{const t=String(m.template);const result=t.includes('Dynamischer Demo-Raum')||t.includes('__dash6_inline_query_')?JSON.stringify({'0':roomConfigs.demo.slots.lights.initial}):t.replace(/\{\{\s*states\(['"]([^'"]+)['"]\)\s*\}\}/g,(_all,id)=>states[id]?.state||'unknown');fn({result});});if(m.type==='weather/subscribe_forecast')queueMicrotask(()=>fn({forecast:[]}));return()=>{};}};
let hass={states,entities,devices,areas,demo_browser:true,user:{id:'public-demo',name:'Demo',is_admin:true},language:'de',translationMetadata:{translations:{de:{isRTL:false}}},locale:{language:'de',number_format:'language',time_format:'24',date_format:'language',first_weekday:'monday'},config:{components:['frontend','lovelace','liquid_glass'],unit_system:{temperature:'°C',length:'km',mass:'kg',pressure:'hPa'},time_zone:'Europe/Berlin',version:'2026.9.0'},themes:{themes:themeTable,default_theme:'DASH6 Satin Glass',darkMode:true},services:{},connection,callWS,callService,localize:key=>({'component.climate.entity_component._.state.off':'Aus','component.climate.entity_component._.state.heat':'Heizen','component.climate.entity_component._.state.cool':'Kühlen','component.climate.entity_component._.state.heat_cool':'Heizen/Kühlen'}[key]||key.split('.').at(-1).replaceAll('_',' ')),formatEntityName:s=>s.attributes?.friendly_name||s.entity_id,formatEntityState:s=>s.state,formatEntityAttributeValue:(s,key)=>String(s.attributes?.[key]??''),formatEntityAttributeName:(_s,k)=>k,formatEntityId:id=>states[id]?.attributes.friendly_name||id,callApi:async(method,path)=>{if(method!=='GET')throw Error('Die öffentliche Demo unterstützt keine Schreib-API.');const ids=new URLSearchParams(path.split('?')[1]).get('filter_entity_id')?.split(',')||[];if(path.startsWith('history/'))return simulatedHistory(ids,7);return {};},fetchWithAuth:async()=>new Response('[]')};
window.demoPreview={dashboard,hass,ready:false,errors:[]};reset();
try{
 for(const url of modules)await import(new URL(url,location.href));
 await import('./package/dash6-cards.js');await import('./package/vacuum-dock-card.js');await import('./package/room-loader.js');
 const preview=document.querySelector('#preview'),app=document.createElement('home-assistant');app.hass=hass;preview.append(app);let node=app;
 for(const tag of ['home-assistant-main','ha-panel-lovelace','hui-root']){const child=document.createElement(tag);node.attachShadow({mode:'open'}).append(child);node=child;}
 const root=node;root.lovelace={config:dashboard,urlPath:'liquid-glass-demo',mode:'storage',editMode:false,saveConfig:async next=>{root.lovelace.config=next;}};
 root.attachShadow({mode:'open'}).innerHTML='<style>hui-view-container{display:block}.preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;align-items:start}.preview-grid>*{min-width:0}.wide{grid-column:1/-1}@media(max-width:760px){.preview-grid{grid-template-columns:minmax(0,1fr)}}</style><hui-view-container></hui-view-container>';
 const view=root.shadowRoot.querySelector('hui-view-container');view.attachShadow({mode:'open'}).innerHTML='<style>.preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:26px;align-items:start}.preview-grid>*{min-width:0}.wide{grid-column:1/-1}@media(max-width:760px){.preview-grid{grid-template-columns:minmax(0,1fr)}}</style><div class="preview-grid" id="sections"></div>';const grid=view.shadowRoot.querySelector('.preview-grid');
 function showView(path,update=true){const v=dashboard.views.find(v=>v.path===path)||dashboard.views[0];currentView=v.path;view.viewConfig=v;view.lovelace=root.lovelace;mounted=[];grid.replaceChildren();
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
 showView(new URLSearchParams(location.search).get('view')||'demo');window.demoPreview.ready=true;window.demoPreview.showView=showView;status.textContent='Bereit · '+specs.length+' virtuelle Entities · echte Custom Cards, Detaildialoge und GUI';
}catch(error){window.demoPreview.errors.push(error.message);status.textContent='Demo konnte nicht vollständig geladen werden';const p=document.createElement('p');p.className='fatal';p.textContent=error.message;document.querySelector('#preview').append(p);console.error(error);}
document.addEventListener('hass-more-info',event=>{const id=event.detail.entityId;if(!own(id))return;const s=states[id],d=document.createElement('dialog');d.setAttribute('aria-label','Demo-Entity & Verlauf');d.style.cssText='color:var(--primary-text-color);background:var(--primary-background-color);border:1px solid #ffffff44;border-radius:20px;max-width:600px;width:calc(100vw - 32px);padding:24px';const h=document.createElement('h2');h.textContent=s?.attributes.friendly_name||id;const p=document.createElement('p');p.textContent=id+' · '+s?.state+' '+(s?.attributes.unit_of_measurement||'');const chart=document.createElement('div');chart.innerHTML='<svg viewBox="0 0 600 150"><path d="M0 110 Q75 30 150 80 T300 60 T450 95 T600 30" fill="none" stroke="#b8ddbd" stroke-width="3"></path></svg><p>Simulierter Verlauf · keine Messung eines realen Geräts.</p>';const close=document.createElement('button');close.textContent='Schließen';close.style.cssText='padding:10px 18px;border-radius:10px';close.onclick=()=>{d.close();d.remove();};d.append(h,p,chart,close);document.body.append(d);d.showModal();});
