import {scopedHass,watchRegistries} from './shared-data.js';
// All domain blocks in a connection share these read-only registry snapshots.
// Registry change events invalidate the existing shared-data cache first.
const connections=new WeakMap();
export function watchDomainRoom(hass,listener){
 const connection=hass?.connection?.__dash6ActualConnection||hass?.connection;
 if(!connection?.sendMessagePromise){listener(localRoomData(hass));return ()=>{};}
 let state=connections.get(connection);
 if(!state){
  state={listeners:new Set(),generation:0};connections.set(connection,state);
  state.load=async()=>{
   const generation=++state.generation;
   try{
    const scoped=scopedHass(hass),read=type=>scoped.connection.sendMessagePromise({type});
    const [entities,devices,areas]=await Promise.all(['entity','device','area'].map(kind=>read('config/'+kind+'_registry/list')));
    if(generation!==state.generation)return;
    state.value={entities,devices,areas};state.error=null;for(const fn of state.listeners)fn(state.value);
   }catch(error){if(generation===state.generation){state.error=error;for(const fn of state.listeners)fn(null,error);}}
  };
  state.stop=watchRegistries(hass,kind=>{if(['entity','device','area'].includes(kind))state.load();});state.load();
  state.ready=()=>state.load();connection.addEventListener?.('ready',state.ready);
 }
 state.listeners.add(listener);if(state.value)listener(state.value);else if(state.error)listener(null,state.error);
 return ()=>{state.listeners.delete(listener);if(!state.listeners.size){state.generation++;state.stop?.();connection.removeEventListener?.('ready',state.ready);connections.delete(connection);}};
}
export function localRoomData(hass){return {entities:Object.entries(hass?.entities||{}).map(([entity_id,value])=>({entity_id,...value})),devices:Object.entries(hass?.devices||{}).map(([id,value])=>({id,...value})),areas:Object.entries(hass?.areas||{}).map(([area_id,value])=>({area_id,...value}))};}
export function roomDomainEntities(data,hass,area,domain,exclusions=new Set()){
 const areaIds=new Set((data?.areas||[]).filter(value=>value.area_id===area||value.id===area||value.name===area).map(value=>value.area_id||value.id));areaIds.add(area);
 const devices=new Map((data?.devices||[]).map(value=>[value.id,value]));
 return (data?.entities||[]).filter(value=>{
  const id=value.entity_id||value.id,live=hass?.entities?.[id];
  return id?.split('.')[0]===domain&&hass?.states?.[id]&&!value.hidden_by&&!value.disabled_by&&!live?.hidden_by&&!live?.disabled_by&&!exclusions.has(id)&&areaIds.has(value.area_id||devices.get(value.device_id)?.area_id);
 }).map(value=>value.entity_id||value.id).sort((a,b)=>(hass.states[a].attributes?.friendly_name||a).localeCompare(hass.states[b].attributes?.friendly_name||b,hass?.language));
}
export function roomDomainCards(config,ids,hass,now=Date.now()){
 const substitute=(value,entity)=>typeof value==='string'?value.replaceAll('this.entity_id',entity):Array.isArray(value)?value.map(item=>substitute(item,entity)):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,substitute(item,entity)])):value;
 const cards=ids.map(entity=>({...substitute(config.dynamic_card||{type:'tile'},entity),entity}));
 if(config.domain==='scene'){
  const latest=cards.reduce((best,card)=>{const time=Date.parse(hass?.states?.[card.entity]?.state)||0;return time>best.time?{entity:card.entity,time}:best;},{entity:'',time:0});
  for(const card of cards){const skin=card.dash6_css||card.card_mod||{};card.dash6_css={...skin,class:[...new Set([...(skin.class||'').split(/\s+/).filter(Boolean),'dash6-scene-64'])].join(' ')};card.dash6_active=card.entity===latest.entity&&latest.time>now-43200000;}
 }
 return cards;
}
