import {scopedCustomElements as customElements} from './scoped-elements.js';

const own=id=>typeof id==='string'&&/^[a-z_]+\.liquid_glass_demo_[a-z0-9_]+$/.test(id);
const subset=table=>Object.fromEntries(Object.entries(table||{}).filter(([id])=>own(id)));
// The same live HA connection is used, but every action requires explicit dummy
// IDs. Area/device-wide and target-less services are intentionally unavailable.
export function demoHass(hass){
 const entities=subset(hass.entities),deviceIds=new Set(Object.values(entities).map(e=>e.device_id).filter(Boolean));
 const devices=Object.fromEntries(Object.entries(hass.devices||{}).filter(([id])=>deviceIds.has(id)));
 const areaIds=new Set([...Object.values(entities),...Object.values(devices)].map(e=>e.area_id).filter(Boolean));
 const filterRegistry=(type,rows)=>type.includes('entity_registry')?rows.filter(e=>own(e.entity_id)):type.includes('device_registry')?rows.filter(e=>deviceIds.has(e.id)):rows.filter(e=>areaIds.has(e.area_id||e.id));
 const callService=async(domain,service,data={},target)=>{
  const ids=[data.entity_id,target?.entity_id].flat().filter(Boolean);
  if(!ids.length||!ids.every(own)||data.area_id||data.device_id||target?.area_id||target?.device_id)throw Error('Die Demo erlaubt ausschließlich explizite Dummy-Entities.');
  return hass.callService(domain,service,data,target);
 };
 const callWS=async message=>{
  if(message.type==='get_states')return Object.values(subset(hass.states));
  if(/config\/(entity|device|area)_registry\/list$/.test(message.type))return filterRegistry(message.type,await hass.callWS(message));
  if(message.type==='lovelace/config'&&message.url_path==='liquid-glass-demo')return hass.callWS(message);
  if(message.type?.startsWith('history/')){
   const ids=message.entity_ids||message.filter_entity_id||[];
   if(Array.isArray(ids)&&ids.length&&ids.every(own))return hass.callWS(message);
  }
  if(message.type?.startsWith('recorder/')&&Array.isArray(message.statistic_ids)&&message.statistic_ids.length&&message.statistic_ids.every(own))return hass.callWS(message);
  if(message.type==='weather/subscribe_forecast'&&own(message.entity_id))return hass.callWS(message);
  throw Error('Diese Abfrage gehört nicht zur isolierten Demo.');
 };
 const connection={...hass.connection,sendMessagePromise:callWS,subscribeEvents:async()=>()=>{},
  subscribeMessage:(callback,message)=>{
   if(message.type==='weather/subscribe_forecast'&&own(message.entity_id))return hass.connection.subscribeMessage(callback,message);
   // Dynamic templates must contain the demo namespace; fixed demo IDs/areas
   // ensure they cannot enumerate unrelated devices in a copied dashboard.
   if(message.type==='render_template'&&String(message.template).includes('liquid_glass_demo_'))return hass.connection.subscribeMessage(callback,message);
   return Promise.resolve(()=>{});
  }};
 return {...hass,states:subset(hass.states),entities,devices,areas:Object.fromEntries(Object.entries(hass.areas||{}).filter(([id])=>areaIds.has(id))),callService,callWS,connection,
  callApi:async(method,path)=>{
   if(method==='GET'&&path.startsWith('history/period/')&&decodeURIComponent(path).includes('filter_entity_id=')){
    const ids=new URLSearchParams(path.split('?')[1]).get('filter_entity_id')?.split(',')||[];
    if(ids.length&&ids.every(own))return hass.callApi(method,path);
   }
   throw Error('Die Demo erlaubt keinen allgemeinen API-Zugriff.');
  }};
}

class DemoScope extends HTMLElement{
 setConfig(config){if(!config.card)throw Error('Demo-Karte fehlt.');this._config=config;this._build();}
 set hass(value){this._hass=value;if(this._child)this._child.hass=demoHass(value);}
 connectedCallback(){this.style.display='block';this.style.minWidth='0';this._build();}
 async _build(){
  if(this._child||!this._config||!this.isConnected)return;
  const helpers=await window.loadCardHelpers();
  if(this._child)return;
  const child=helpers.createCardElement(this._config.card);this._child=child;
  if(this._hass)child.hass=demoHass(this._hass);
  this.replaceChildren(child);
 }
 getCardSize(){return this._child?.getCardSize?.()||4;}
 getGridOptions(){return this._child?.getGridOptions?.()||{columns:12,rows:'auto'};}
}
customElements.define('dash6-demo-scope',DemoScope);
