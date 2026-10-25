/** Isolated in-browser demonstration state. No Home Assistant entity is created. */
const PREFIX='liquid_glass_demo_';
const prefix=PREFIX;
export const ownDemoId=id=>typeof id==='string'&&/^[a-z_]+\.liquid_glass_demo_[a-z0-9_]+$/.test(id);
const stamp=()=>new Date().toISOString(),earlier=()=>new Date(Date.now()-3600000).toISOString();
const normalize=t=>String(t).replace(/\r\n/g,'\n').trim();
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

// Inline batches contain nested Jinja macros; a non-greedy regexp truncates
// their bodies. Keep balanced macro boundaries and resolve the shipped inputs.
export function inlineDemoTemplates(template){
 const result=[],tokens=/\{%[-+]?\s*(macro\b[\s\S]*?|endmacro\s*)[-+]?%\}/g;
 let depth=0,outer=null;
 for(const match of template.matchAll(tokens)){
  if(match[1].startsWith('macro')){
   if(depth===0){const index=match[1].match(/__dash6_inline_query_(\d+)\(/)?.[1];outer=index===undefined?null:{index,start:match.index+match[0].length};}
   depth++;
  }else{depth--;if(depth===0&&outer){result.push([outer.index,normalize(template.slice(outer.start,match.index))]);outer=null;}}
 }
 return result;
}

export function createDemoRuntime(data,{assetRoot='/local/liquid-glass/'}={}){
 const asset=path=>new URL(path,new URL(assetRoot,location.href)).href;
 const specs=data.specs,byId=new Map(specs.map(s=>[s.entity_id,s])),own=id=>ownDemoId(id)&&byId.has(id);
 let states={},timer=null,iconReader=null;const listeners=new Set(),templateListeners=new Map(),eventListeners=new Map(),userData=new Map();
 const diagnostics={actions:[],unknownTemplates:new Set(),unsupportedRequests:new Set()};
 const value=(domain,key)=>states[domain+'.'+PREFIX+key];
 const put=(id,state,attrs={})=>{const s=states[id];if(s){s.state=String(state);Object.assign(s.attributes,attrs);s.last_changed=s.last_updated=stamp();}};
 const set=(domain,key,state,attrs={})=>put(domain+'.'+PREFIX+key,state,attrs);
function initial(spec){
 const {domain,key}=spec;let state='on',a={friendly_name:spec.name,liquid_glass_demo:true,...spec.attributes};
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
 if(domain==='media_player'){state='idle';Object.assign(a,{media_title:'Virtueller Demo-Titel',media_artist:'Liquid Glass',entity_picture:asset('assets/liquid-glass-living-room.jpg'),volume_level:.35,is_volume_muted:false,source:'AppleTV',source_list:['AppleTV','HDMI 1','HDMI 3'],supported_features:65535});}
 if(domain==='remote')a.supported_features=0;
 if(domain==='vacuum'){state='docked';Object.assign(a,{fan_speed:'balanced',fan_speed_list:['quiet','balanced','turbo','max'],battery_level:86,supported_features:13244});}
 if(domain==='lock'){state='locked';a.supported_features=1;}
 if(domain==='number'){state='0';Object.assign(a,{min:0,max:60,step:.1,unit_of_measurement:'min',mode:'box'});}
 if(domain==='select'){a.options=key.includes('reinigung')?['vac_and_mop','vacuum','mop']:key.includes('wischintensitat')?['off','mild','moderate','intense']:key.includes('wischroute')?['standard','deep','deep_plus']:key.includes('entleerungsmodus')?['smart','light','balanced','max']:['Lesen','Entspannen'];state=a.options[0];}
 if(domain==='button')state=earlier();
 if(domain==='scene'){
  state=earlier();a.scene_targets=Object.fromEntries(['schuhschrank','schuhschrank_links','schuhschrank_rechts'].map(k=>['light.'+prefix+k,{state:'on',brightness:255,color_mode:'hs',hs_color:key==='weiss'?[0,0]:[215,70]}]));
 }
 if(domain==='update'){state='off';Object.assign(a,{installed_version:'1.0.0',latest_version:'1.0.0',supported_features:1});}
 if(domain==='weather'){state='partlycloudy';Object.assign(a,{temperature:21.5,temperature_unit:'°C',humidity:58,supported_features:1});}
 if(domain==='camera'){state='idle';a.entity_picture=asset('assets/liquid-glass-living-room.jpg');}
 if(spec.initial){state=String(spec.initial.value);Object.assign(a,{unit_of_measurement:spec.initial.unit,device_class:spec.initial.device_class,state_class:spec.initial.state_class});}
 if(spec.scene_targets)a.scene_targets=spec.scene_targets;
 if(spec.attributes?.entity_id)a.entity_id=spec.attributes.entity_id;
 if(spec.attributes?.options){a.options=spec.attributes.options.filter(v=>!['unknown','unavailable'].includes(v));state=a.options[0];}
 if(domain==='event'){state=earlier();a.event_type='press';a.event_types=['press'];}
 if(domain==='binary_sensor'&&spec.attributes?.device_class)a.device_class=spec.attributes.device_class;
 if(domain==='number'){Object.assign(a,Object.fromEntries(Object.entries(spec.attributes||{}).filter(([k])=>['min','max','step','unit_of_measurement'].includes(k))));state=String(Math.max(a.min||0,Math.min(a.max??60,Number(state)||0)));}
 if(domain==='media_player')Object.assign(a,{media_duration:240,media_position:45,media_position_updated_at:stamp()});
 const changed=['button','event','scene'].includes(domain)?earlier():stamp();
 return {entity_id:spec.entity_id,state,attributes:a,last_changed:changed,last_updated:changed,last_reported:changed,context:{id:'demo',parent_id:null,user_id:null}};
}
const entities=Object.fromEntries(specs.map(s=>[s.entity_id,{entity_id:s.entity_id,device_id:'demo-'+(s.device||s.room),area_id:s.area===null?null:'demo-'+(s.area||'DASH6 Demo · '+s.room),platform:'liquid_glass',config_entry_id:'demo',hidden_by:s.hidden?'user':null,disabled_by:null}]));
const devices=Object.fromEntries(specs.map(s=>['demo-'+(s.device||s.room),{id:'demo-'+(s.device||s.room),area_id:s.area===null?null:'demo-'+(s.area||'DASH6 Demo · '+s.room),identifiers:[['liquid_glass','demo_'+s.room]],manufacturer:'Liquid Glass',model:'Virtual device'}]));
const areas=Object.fromEntries(specs.filter(s=>s.area!==null).map(s=>['demo-'+(s.area||'DASH6 Demo · '+s.room),{area_id:s.area===null?null:'demo-'+(s.area||'DASH6 Demo · '+s.room),name:s.area||'DASH6 Demo · '+s.room}]));
function synchronize(){
 set('binary_sensor','turkontakt',value('switch','turkontakt_simulation')?.state||'off');
 const warning=value('switch','schloss_batteriewarnung_simulation')?.state==='on';set('binary_sensor','schloss_batteriewarnung',warning?'on':'off');set('sensor','turkontakt_batterie',warning?15:86);set('sensor','schloss_batterie',warning?15:86);
 set('binary_sensor','anwesenheit',value('switch','anwesenheit')?.state||'off');set('binary_sensor','kuhlschrank_tur',value('switch','kuhlschrank_tur_simulation')?.state||'off');
 const run=value('switch','luftung_force')?.state==='on'||value('fan','luftung')?.state==='on'&&value('binary_sensor','anwesenheit')?.state==='on';
 set('switch','luftung_ausgang',run?'on':'off');set('switch','luftung_force_ausgang',run?'on':'off');set('sensor','luftung_leistung',run?18.5:0);
 for(const group of ['gruppe','schuhschrank']){const s=value('light',group),members=s?.attributes.entity_id||[];if(s)s.state=members.some(id=>states[id]?.state==='on')?'on':'off';}
}

 const groups=new Map(),fanBindings=[],doorBindings=[];
 const visit=node=>{
  if(Array.isArray(node)){node.forEach(visit);return;}if(!node||typeof node!=='object')return;
  if(node.entity?.startsWith('light.')&&node.segments?.length)groups.set(node.entity,node.segments.map(s=>s.entity).filter(own));
  if(node.type==='custom:dash6-fan-card')fanBindings.push(node);
  if(node.type==='custom:dash6-door-card')doorBindings.push(node);
  Object.values(node).forEach(visit);
 };
 Object.values(data.dashboards||{}).forEach(visit);
 const templates=new Map(Object.entries(data.template_sources||{}).map(([hash,source])=>[normalize(source),data.template_results[hash]]));
 function synchronizeAll(){
  synchronize();
  for(const [id,members]of groups){const s=states[id];if(s&&members.length)s.state=members.some(id=>states[id]?.state==='on')?'on':'off';}
  for(const c of fanBindings){
   const force=states[c.force_switch_entity]?.state==='on',automatic=states[c.entity]?.state==='on',presence=states[c.presence_entity]?.state==='on';
   const running=force||automatic&&presence;
   for(const id of [c.running_switch_entity,c.running_force_switch_entity])if(own(id))put(id,running?'on':'off');
   if(own(c.power_entity))put(c.power_entity,running?18.5:0);
  }
 }
 function publish(){
  synchronizeAll();for(const listener of listeners)listener();
  for(const [message,callbacks]of templateListeners)for(const callback of callbacks)queueMicrotask(()=>callback({result:renderTemplate(message)}));
 }
 function reset(){states=Object.fromEntries(specs.map(s=>[s.entity_id,initial(s)]));publish();}
 function history(ids,days=1){
  const end=Date.now(),step=days*86400000/48;
  return ids.filter(own).map(id=>{const s=states[id],raw=Number(s?.state),numeric=Number.isFinite(raw),base=numeric?raw:0;return Array.from({length:49},(_,i)=>({...s,state:numeric?String(Math.max(0,Math.round((base+Math.sin(i/4)*Math.abs(base)*.18)*100)/100)):s.state,last_changed:new Date(end-(48-i)*step).toISOString(),last_updated:new Date(end-(48-i)*step).toISOString()}));});
 }
 function renderTemplate(template){
  const source=normalize(template);
  const batch=inlineDemoTemplates(source);
  if(batch.length)return JSON.stringify(Object.fromEntries(batch.map(([id,t])=>[id,renderTemplate(t)])));
  if(templates.has(source))return templates.get(source);
  // Native Mushroom labels and other simple live state fields.
  const rendered=source.replace(/\{\{\s*states\((['"])([^'"]+)\1\)\s*\}\}/g,(_m,_q,id)=>states[id]?.state??'unknown');
  if(!rendered.includes('{%')&&!rendered.includes('{{'))return rendered;
  const embedded=[...templates.keys()].sort((a,b)=>b.length-a.length).find(t=>source.includes(t));
  if(embedded)return templates.get(embedded);
  diagnostics.unknownTemplates.add(source);throw Error('Unbekannte lokale Demo-Vorlage.');
 }
 const registryRows=type=>Object.values(type==='entity'?entities:type==='device'?devices:type==='area'?areas:{});
 const forecast=(type='daily')=>Array.from({length:type==='hourly'?24:8},(_,i)=>({datetime:new Date(Date.now()+i*(type==='hourly'?3600000:86400000)).toISOString(),condition:i%3?'partlycloudy':'sunny',temperature:21+i%4,templow:13+i%3,precipitation:0,humidity:55,wind_speed:6,wind_bearing:200,is_daytime:true}));
 const media=()=>({title:'Demo-Mediathek',media_class:'directory',media_content_id:'demo',media_content_type:'directory',can_play:false,can_expand:true,children:[{title:'Virtueller Titel',media_class:'music',media_content_id:'demo-track',media_content_type:'music',can_play:true,can_expand:false}]});
 async function callWS(m){
  // Native HA controls request public icon paths separately from entity data.
  // Only this metadata request may use the host; device/history APIs stay local.
  if(m.type==='frontend/get_icons')return iconReader?iconReader(m):{};
  if(m.type==='call_service')return callService(m.domain,m.service,m.service_data||{},m.target||{});
  if(m.type==='get_states')return Object.values(states);
  if(m.type==='lovelace/config'){const key=m.url_path||'liquid-glass-demo';if(data.dashboards[key])return data.dashboards[key];throw Error('Dieses Dashboard gehört nicht zur lokalen Demo.');}
  if(m.type==='lovelace/dashboards/list')return Object.entries(data.dashboards).map(([id,config])=>({id,url_path:id,title:config.title,mode:'yaml',show_in_sidebar:true,require_admin:false}));
  if(m.type?.endsWith('_registry/list'))return registryRows(m.type.match(/config\/(\w+)_registry/)?.[1]);
  if(m.type==='config/entity_registry/get')return entities[m.entity_id]||null;
  if(m.type==='config/device_registry/get')return devices[m.device_id]||null;
  if(m.type==='frontend/get_user_data')return {value:userData.get(m.key)??JSON.parse(localStorage.getItem('dash6-demo-data:'+m.key)||'null')};
  if(m.type==='frontend/set_user_data'){userData.set(m.key,m.value);localStorage.setItem('dash6-demo-data:'+m.key,JSON.stringify(m.value));return {};}
  if(m.type==='liquid_glass/theme_defaults')return {shared:m.values?{version:1,themes:{'DASH6 Satin Glass':{revision:stamp(),values:m.values}}}:data.shared_defaults,backup:'Lokale Demo-Vorschau',changed:0};
  if(m.type?.startsWith('recorder/')){
   const ids=(m.statistic_ids||Object.keys(states).filter(id=>id.startsWith('sensor.'))).filter(own);
   if(m.type.includes('list_statistic'))return ids.map(id=>({statistic_id:id,has_mean:true,has_sum:states[id]?.attributes.device_class==='energy',unit_of_measurement:states[id]?.attributes.unit_of_measurement,name:states[id]?.attributes.friendly_name}));
   return Object.fromEntries(history(ids,m.period==='hour'?7:1).map(rows=>[rows[0].entity_id,rows.map(s=>({start:Date.parse(s.last_updated),end:Date.parse(s.last_updated)+1800000,mean:Number(s.state),min:Number(s.state),max:Number(s.state),state:Number(s.state),sum:Number(s.state),change:.04}))]));
  }
  if(m.type?.startsWith('history/'))return Object.fromEntries(history(m.entity_ids||[]).map(rows=>[rows[0].entity_id,rows.map(s=>({s:s.state,lu:Date.parse(s.last_updated)/1000,lc:Date.parse(s.last_changed)/1000,a:s.attributes}))]));
  if(m.type==='media_player/browse_media'&&own(m.entity_id))return media();
  if(m.type==='weather/subscribe_forecast'&&own(m.entity_id))return {forecast:forecast(m.forecast_type)};
  if(m.type==='camera/get_prefs'&&own(m.entity_id))return {preload_stream:false,orientation:0};
  diagnostics.unsupportedRequests.add(m.type);return {};
 }
 function targets(domain,values,target){
  const ids=[values.entity_id,target?.entity_id].flat().filter(Boolean);
  const areaIds=[values.area_id,target?.area_id].flat().filter(Boolean),deviceIds=[values.device_id,target?.device_id].flat().filter(Boolean);
  for(const [id,e]of Object.entries(entities)){
   const device=devices[e.device_id],area=areas[e.area_id||device?.area_id];
   if((areaIds.some(a=>[e.area_id,device?.area_id,area?.name,byId.get(id)?.room].includes(a))||deviceIds.includes(e.device_id))&&(domain==='homeassistant'||id.startsWith(domain+'.')))ids.push(id);
  }
  if(!ids.length||!ids.every(own))throw Error('Die lokale Demo erlaubt nur ihre eigenen Beispieldaten.');
  return [...new Set(ids)];
 }
 async function callService(domain,service,values={},target={}){
  const ids=targets(domain,values,target);
  states=structuredClone(states);
  diagnostics.actions.push({domain,service,data:structuredClone(values),target:structuredClone(target)});
  if(domain==='weather'&&service==='get_forecasts')return Object.fromEntries(ids.map(id=>[id,{forecast:forecast(values.type)}]));
  for(const id of ids){
   const s=states[id],spec=byId.get(id),kind=id.split('.')[0],key=spec.key;s.last_changed=s.last_updated=stamp();
   if(service==='toggle')s.state=s.state==='on'?'off':'on';if(service==='turn_on')s.state='on';if(service==='turn_off')s.state='off';
   for(const k of ['brightness','hs_color','rgb_color','color_temp_kelvin','effect','percentage','temperature','target_temp_low','target_temp_high','preset_mode','volume_level','is_volume_muted','source','fan_speed'])if(values[k]!==undefined)s.attributes[k]=values[k];
   if(values.hs_color)s.attributes.color_mode='hs';if(values.color_temp_kelvin)s.attributes.color_mode='color_temp';if(values.brightness_pct!==undefined)s.attributes.brightness=Math.round(values.brightness_pct*2.55);
   if(kind==='light')for(const member of groups.get(id)||s.attributes.entity_id||[])if(states[member]){states[member].state=s.state;Object.assign(states[member].attributes,{brightness:s.attributes.brightness,hs_color:s.attributes.hs_color,color_mode:s.attributes.color_mode,color_temp_kelvin:s.attributes.color_temp_kelvin});}
   if(kind==='scene'){s.state=stamp();for(const [targetId,desired]of Object.entries(s.attributes.scene_targets||{}))if(own(targetId)){states[targetId].state=desired.state;Object.assign(states[targetId].attributes,desired);}}
   if(kind==='climate'&&values.hvac_mode)s.state=values.hvac_mode;
   if(kind==='number'&&values.value!==undefined)s.state=String(Math.max(s.attributes.min??0,Math.min(s.attributes.max??100,values.value)));
   if(kind==='select'&&values.option)s.state=values.option;
   if(kind==='cover'){s.attributes.current_position=values.position??(service==='close_cover'?0:service==='open_cover'?100:s.attributes.current_position);s.state=s.attributes.current_position===0?'closed':'open';}
   if(kind==='media_player'){
    if(['media_play','play_media'].includes(service))s.state='playing';if(service==='media_pause')s.state='paused';if(service==='media_play_pause')s.state=s.state==='playing'?'paused':'playing';if(service==='media_stop'||service==='turn_on')s.state='idle';if(service==='select_source')s.attributes.source=values.source;
    if(service==='volume_up'||service==='volume_down')s.attributes.volume_level=Math.max(0,Math.min(1,s.attributes.volume_level+(service==='volume_up'?.05:-.05)));
    if(service==='media_seek')s.attributes.media_position=values.seek_position;
   }
   if(kind==='remote'){s.attributes.last_command=values.command;if(service==='turn_on'||service==='turn_off'){set('media_player',key,service==='turn_on'?'idle':'off');put(spec.linked_player,service==='turn_on'?'idle':'off');}}
   if(kind==='lock'){s.state=service==='lock'?'locked':'unlocked';if(service==='lock'||service==='open'){set('switch','turkontakt_simulation',service==='open'?'on':'off');put(spec.contact_entity,service==='open'?'on':'off');}}
   if(kind==='vacuum')s.state=service==='start'||service==='send_command'?'cleaning':service==='return_to_base'?'docked':service==='pause'?'paused':service==='stop'?'idle':s.state;
   if(kind==='update'){s.state='off';s.attributes.installed_version=s.attributes.latest_version;}
   if(kind==='button'){
    s.state=stamp();if(key==='zurucksetzen'){reset();return {};}
    if(key==='klingeln'){set('binary_sensor','klingel','on');set('sensor','klingel_letzte_aktivitat',stamp());}
    if(key==='turoffner'){set('switch','turkontakt_simulation','on');set('binary_sensor','klingel','off');set('binary_sensor','turkontakt','on');}
    if(spec.demo_action==='open_door')put(spec.contact_entity,'on');
    if(key==='update_verfugbar')set('update','firmware','on',{latest_version:'1.1.0'});
    if(key.endsWith('_zurucksetzen'))set('sensor',key.replace('_zurucksetzen','_restzeit'),300);
   }
   for(const c of doorBindings)if((c.cancel_entities||[]).includes(id)&&['press','open','unlock','lock'].includes(service))for(const ring of [c.ring_entity,...c.ring_entities||[]])if(own(ring))put(ring,ring.startsWith('event.')?earlier():'off');
  }
  publish();return {};
 }
 async function callApi(method,path){
  if(method==='GET'&&path==='config/config_entries/flow_handlers')return ['liquid_glass'];
  if(method==='GET'&&path==='ultra_card_pro_cloud/favorite_colors')return {};
  if(method==='GET'&&path.startsWith('history/')){const ids=new URLSearchParams(path.split('?')[1]).get('filter_entity_id')?.split(',')||[];return history(ids,7);}
  diagnostics.unsupportedRequests.add(method+' '+path);return {};
 }
 const connection={haVersion:'2026.10.3',connected:true,sendMessagePromise:callWS,addEventListener(){},removeEventListener(){},
  subscribeEvents:async(fn,type)=>{const callbacks=eventListeners.get(type)||new Set();eventListeners.set(type,callbacks);callbacks.add(fn);return()=>callbacks.delete(fn);},
  subscribeMessage:async(fn,m)=>{
   if(m.type==='render_template'){const callbacks=templateListeners.get(m.template)||new Set();templateListeners.set(m.template,callbacks);callbacks.add(fn);queueMicrotask(()=>fn({result:renderTemplate(m.template)}));return()=>{callbacks.delete(fn);if(!callbacks.size)templateListeners.delete(m.template);};}
   if(m.type==='weather/subscribe_forecast'&&own(m.entity_id)){queueMicrotask(()=>fn({forecast:forecast(m.forecast_type)}));return()=>{};}
   if(m.type?.startsWith('history/')){queueMicrotask(async()=>fn({type:'history',states:await callWS(m)}));return()=>{};}
   diagnostics.unsupportedRequests.add(m.type);return()=>{};
  }};
 const serviceNames={light:['turn_on','turn_off','toggle'],switch:['turn_on','turn_off','toggle'],fan:['turn_on','turn_off','toggle','set_percentage'],climate:['set_temperature','set_hvac_mode','set_preset_mode'],cover:['open_cover','close_cover','stop_cover','set_cover_position'],media_player:['turn_on','turn_off','media_play','media_pause','media_play_pause','media_stop','media_next_track','media_previous_track','volume_set','volume_up','volume_down','volume_mute','select_source','play_media','media_seek'],remote:['turn_on','turn_off','send_command'],scene:['turn_on'],button:['press'],select:['select_option'],number:['set_value'],lock:['lock','unlock','open'],vacuum:['start','pause','stop','return_to_base','set_fan_speed','send_command'],update:['install'],weather:['get_forecasts']};
 const services=Object.fromEntries(Object.entries(serviceNames).map(([domain,names])=>[domain,Object.fromEntries(names.map(name=>[name,{name,description:'Lokale Demo-Simulation',fields:{},target:{entity:[{domain}]}}]))]));
 function advance(seconds=1){
  const active=fanBindings.filter(c=>Number(states[c.remaining_time_entity]?.state)>0);
  if(!active.length)return;
  states=structuredClone(states);
  for(const c of new Map(active.map(c=>[c.remaining_time_entity,c])).values()){
   const rest=Math.max(0,Number(states[c.remaining_time_entity].state)-seconds/60);
   put(c.remaining_time_entity,rest);if(!rest)put(c.force_switch_entity,'off');
  }
  publish();
 }
 const api={diagnostics,subscribe(fn){listeners.add(fn);timer??=setInterval(()=>advance(),1000);return()=>{listeners.delete(fn);if(!listeners.size){clearInterval(timer);timer=null;}};},reset,advance,callService,callWS,renderTemplate,history,get states(){return states;},
  setState(id,state,attributes={}){if(!own(id))throw Error('Unbekanntes Demo-Ziel');states=structuredClone(states);put(id,state,attributes);publish();},
  hass(base={}){
   if(!base.__liquidGlassDemoRuntime&&!base.demo_browser&&base.callWS&&!iconReader)iconReader=message=>base.callWS(message);
   const h={...base,states:{...states},entities,devices,areas,floors:{},labels:{},services,connection,callWS,callService,callApi,
    sendWS:callWS,callApiRaw:async(method,path)=>new Response(JSON.stringify(await callApi(method,path)),{headers:{'Content-Type':'application/json'}}),
    user:{...base.user,id:'public-demo',name:'Demo',is_admin:!!base.demo_browser},
    config:{...base.config,components:[...new Set([...(base.config?.components||[]),...Object.keys(services)])],unit_system:base.config?.unit_system||{temperature:'°C',length:'km',mass:'kg',pressure:'hPa'},time_zone:base.config?.time_zone||'Europe/Berlin',version:base.config?.version||'2026.10.3'},
    formatEntityName:s=>s.attributes?.friendly_name||s.entity_id,formatEntityId:id=>states[id]?.attributes.friendly_name||id,
    hassUrl:path=>asset(path.startsWith('/local/liquid-glass/')?path.slice('/local/liquid-glass/'.length):'assets/liquid-glass-living-room.jpg'),
    fetchWithAuth:async()=>new Response('[]',{headers:{'Content-Type':'application/json'}})};
   Object.defineProperty(h,'__liquidGlassDemoRuntime',{value:api});return h;
  }};
 reset();return api;
}

const runtimes=new Map();
export function loadDemoRuntime(url=new URL((import.meta.url.includes('/chunks/')?'../':'./')+'demo-runtime-data.json',import.meta.url).href){
 if(!runtimes.has(url))runtimes.set(url,fetch(url).then(r=>{if(!r.ok)throw Error('Demo-Daten: '+r.status);return r.json();}).then(data=>createDemoRuntime(data,{assetRoot:new URL('.',url).href})).catch(error=>{runtimes.delete(url);throw error;}));
 return runtimes.get(url);
}
