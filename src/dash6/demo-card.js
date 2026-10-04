import {LitElement,html,css} from 'lit';
import {bindThemePreferences,unbindThemePreferences} from './material.js';

// A deliberately isolated playground: service calls update browser-local states.
// No HA connection, real entities, API, subscriptions or credentials are forwarded.
const initialStates=()=>{
 const stamp=new Date().toISOString();
 const state=(entity_id,name,value,attributes={})=>({entity_id,state:value,attributes:{friendly_name:name,...attributes},last_changed:stamp,last_updated:stamp,context:{id:'demo',parent_id:null,user_id:null}});
 const light={supported_features:44,supported_color_modes:['hs','color_temp'],color_mode:'hs',brightness:184,hs_color:[215,70],rgb_color:[55,130,230],min_color_temp_kelvin:2000,max_color_temp_kelvin:6500,color_temp_kelvin:3000,effect_list:['Aucun','Aurora','Pulse'],effect:'Aucun'};
 return Object.fromEntries([
  state('light.demo_lampe','Stehlampe','on',light),
  state('light.demo_links','Links','on',{...light,brightness:145}),
  state('light.demo_rechts','Rechts','on',{...light,brightness:220}),
  state('light.demo_gruppe','Wohnzimmer Ambiente','on',{...light,entity_id:['light.demo_links','light.demo_rechts']}),
  state('switch.demo_steckdose','Steckdose','on'),
  state('sensor.demo_leistung','Leistung','23.8',{unit_of_measurement:'W',device_class:'power'}),
  state('sensor.demo_energie','Energie','1.42',{unit_of_measurement:'kWh',device_class:'energy'}),
  state('fan.demo_luefter','Ventilator','on',{percentage:45,supported_features:9}),
  state('cover.demo_rollo','Rollo','open',{current_position:65,supported_features:15}),
  state('climate.demo_thermostat','Raumthermostat','heat',{current_temperature:21.2,temperature:22,target_temp_low:20,target_temp_high:24,min_temp:5,max_temp:30,target_temp_step:.5,hvac_modes:['off','heat','cool','heat_cool'],hvac_action:'heating',preset_modes:['comfort','eco'],preset_mode:'comfort',supported_features:19}),
 ].map(s=>[s.entity_id,s]));
};
class DemoCard extends LitElement{
 static properties={_notice:{state:true}};
 static styles=css`:host{display:block;min-width:0}.label{display:flex;justify-content:space-between;gap:8px;padding:8px 2px;color:var(--secondary-text-color);font:12px var(--primary-font-family,sans-serif)}.notice{min-height:18px;padding:5px 2px;font-size:11px;color:var(--secondary-text-color)}.slot{min-width:0}`;
 setConfig(config){if(!config.card?.type?.startsWith('custom:dash6-'))throw Error('Eine DASH6-Karte für die Demo auswählen.');if(config.card.type==='custom:dash6-demo-card')throw Error('Demo-Karten nicht ineinander verschachteln.');this._config=structuredClone(config);this._states=initialStates();this._child?.remove();this._child=null;this._notice='Alle Werte sind simuliert.';this.requestUpdate();}
 set hass(value){this._realLocale=value?.locale;this._localize=value?.localize;this._language=value?.language;this._makeChild();this._sync();}
 connectedCallback(){super.connectedCallback();bindThemePreferences(this);this._makeChild();}
 disconnectedCallback(){unbindThemePreferences(this);super.disconnectedCallback();}
 updated(){this._makeChild();const slot=this.renderRoot.querySelector('.slot');if(slot&&this._child?.parentNode!==slot)slot.append(this._child);}
 _makeChild(){if(!this._config||this._child)return;const tag=this._config.card.type.slice(7);if(!customElements.get(tag))return;this._child=document.createElement(tag);this._child.setConfig({...this._config.card,discovery:{enabled:false},graph:{show:false},history:false});this._sync();}
 _sync(){if(!this._child)return;const unavailable=async()=>[];this._child.hass={states:this._states,locale:this._realLocale||{language:'de',number_format:'language',time_format:'24',date_format:'language',first_weekday:'monday'},language:this._language||'de',localize:this._localize||((key)=>key),config:{unit_system:{temperature:'°C',length:'km',mass:'kg'},time_zone:'Europe/Berlin',components:[]},themes:{themes:{},darkMode:true},user:{name:'Demo',is_admin:false},areas:{},devices:{},entities:{},callService:(domain,service,data)=>this._simulate(domain,service,data),callWS:unavailable,callApi:unavailable,fetchWithAuth:async()=>new Response('[]'),connection:{addEventListener:()=>{},subscribeEvents:async()=>()=>{},subscribeMessage:async()=>()=>{},sendMessagePromise:unavailable},formatEntityName:s=>s.attributes.friendly_name||s.entity_id,formatEntityState:s=>({on:'Ein',off:'Aus',heat:'Heizen',open:'Geöffnet',closed:'Geschlossen'}[s.state]||s.state),formatEntityAttributeValue:(s,a)=>String(s.attributes[a]??''),formatEntityAttributeName:(_s,a)=>a};}
 async _simulate(domain,service,data={}){
  const ids=Array.isArray(data.entity_id)?data.entity_id:[data.entity_id];
  const next=structuredClone(this._states);
  const apply=id=>{const s=next[id];if(!s)return;
   if(service==='toggle')s.state=s.state==='on'?'off':'on';
   else if(service==='turn_off')s.state='off';
   else if(service==='turn_on')s.state='on';
   if(data.brightness_pct!==undefined)s.attributes.brightness=Math.round(data.brightness_pct*2.55);
   if(data.brightness!==undefined)s.attributes.brightness=data.brightness;
   for(const key of ['hs_color','rgb_color','color_temp_kelvin','effect','percentage','temperature','target_temp_low','target_temp_high','preset_mode'])if(data[key]!==undefined)s.attributes[key]=data[key];
   if(data.hs_color)s.attributes.color_mode='hs';if(data.rgb_color)s.attributes.color_mode='rgb';if(data.color_temp_kelvin)s.attributes.color_mode='color_temp';
   if(data.hvac_mode)s.state=data.hvac_mode;
   if(domain==='cover'){const p=data.position??(service==='close_cover'?0:service==='open_cover'?100:s.attributes.current_position);s.attributes.current_position=p;s.state=p===0?'closed':'open';}
   s.last_updated=new Date().toISOString();
  };
  for(const id of ids){apply(id);for(const member of next[id]?.attributes?.entity_id||[])apply(member);}
  this._states=next;this._notice=`Simulation: ${domain}.${service}`;this._sync();this.requestUpdate();return {};
 }
 render(){return html`<div class="label"><span>${this._config?.title||'Interaktive Demo'}</span><span>Simulation · keine Geräte</span></div><div class="slot"></div><div class="notice" role="status">${this._notice}</div>`;}
 static getStubConfig(){return {type:'custom:dash6-demo-card',card:{type:'custom:dash6-govee-light-card-v2',entity:'light.demo_lampe',name:'Stehlampe',controls:{mode:'combo'}}};}
 getCardSize(){return 4;}
}
customElements.define('dash6-demo-card',DemoCard);
window.customCards??=[];window.customCards.push({type:'dash6-demo-card',name:'Liquid Glass · Interaktive Demo',description:'DASH6-Karten mit isolierten simulierten Zuständen und ohne Gerätezugriff.',preview:true});
