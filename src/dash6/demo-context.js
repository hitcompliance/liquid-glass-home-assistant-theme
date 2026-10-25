// HA 2026.10 native pickers/controls consume Lit contexts rather than .hass.
// Answer only requests originating inside a marked demo, before HA's root
// provider can supply real registries or service methods. This includes portals.
const groups=new WeakMap();
export function contextValue(h,key){
 const values={states:h.states,services:h.services,entities:h.entities,devices:h.devices,areas:h.areas,floors:h.floors,
  hassRegistries:{entities:h.entities,devices:h.devices,areas:h.areas,floors:h.floors},
  hassApi:{callService:h.callService,callApi:h.callApi,callApiRaw:h.callApiRaw,callWS:h.callWS,sendWS:h.sendWS,fetchWithAuth:h.fetchWithAuth,hassUrl:h.hassUrl},
  hassConnection:{connection:h.connection,connected:true,debugConnection:false,hassUrl:h.hassUrl},connection:h.connection,
  hassConfig:{config:h.config,user:h.user,userData:{},systemData:{}},config:h.config,user:h.user,userData:{},
  labels:[],extendedEntities:Object.values(h.entities),configEntries:[{entry_id:'demo',domain:'liquid_glass',title:'Lokale Demo',state:'loaded'}],
  manifests:{liquid_glass:{domain:'liquid_glass',name:'Liquid Glass Demo'}},related:undefined,
  hassFormatters:Object.fromEntries(Object.entries(h).filter(([k])=>k.startsWith('formatEntity'))),
  hassInternationalization:{language:h.language,selectedLanguage:h.selectedLanguage,locale:h.locale,localize:h.localize,translationMetadata:h.translationMetadata,loadBackendTranslation:h.loadBackendTranslation,loadFragmentTranslation:h.loadFragmentTranslation},
  localize:h.localize,locale:h.locale,hassUi:{themes:h.themes,selectedTheme:h.selectedTheme,panels:{},narrow:h.narrow},themes:h.themes,selectedTheme:h.selectedTheme,panels:{}};
 return Object.hasOwn(values,key)?{value:values[key]}:null;
}

if(typeof window!=='undefined')window.addEventListener('context-request',event=>{
 const context=event.composedPath().map(e=>e.hass||e._hass).find(h=>h?.__liquidGlassDemoRuntime);
 if(!context||typeof event.callback!=='function')return;
 const found=contextValue(context,event.context);if(!found)return;
 event.stopImmediatePropagation();
 const runtime=context.__liquidGlassDemoRuntime;
 let group=groups.get(runtime);
 if(!group){group={listeners:new Set(),unsubscribe:null};groups.set(runtime,group);}
 if(!event.subscribe){event.callback(found.value);return;}
 const item={key:event.context,callback:event.callback,context};group.listeners.add(item);
 const unsubscribe=()=>{group.listeners.delete(item);if(!group.listeners.size){group.unsubscribe?.();group.unsubscribe=null;}};
 item.unsubscribe=unsubscribe;
 group.unsubscribe||=runtime.subscribe(()=>{for(const row of group.listeners){const value=contextValue(runtime.hass(row.context),row.key);row.callback(value.value,row.unsubscribe);}});
 event.callback(found.value,unsubscribe);
},true);
