// Dashboard YAML is the source of truth. This module also runs in the migration
// compiler; it has no browser, profile-store or Home Assistant write dependency.
import {inDashboardScope} from './scope.js';
const entityPattern=/\b([a-z_]+\.[a-z0-9_]+)\b/g;
const domains=new Set('air_quality alarm_control_panel alert assist_satellite automation binary_sensor button calendar camera climate conversation counter cover date datetime device_tracker event fan geo_location group humidifier image image_processing input_boolean input_button input_datetime input_number input_select input_text light lock lawn_mower media_player notify number person plant proximity remote scene schedule script select sensor siren stt sun switch text time timer todo tts update vacuum valve wake_word water_heater weather zone'.split(' '));
export function extractEntityReferences(value,output=new Set()){
 if(typeof value==='string'){for(const match of value.matchAll(entityPattern))if(domains.has(match[1].split('.')[0]))output.add(match[1]);}
 else if(Array.isArray(value))for(const item of value)extractEntityReferences(item,output);
 else if(value&&typeof value==='object')for(const [key,item]of Object.entries(value)){extractEntityReferences(key,output);if(!(['service','action','perform_action'].includes(key)&&typeof item==='string'))extractEntityReferences(item,output);}
 return [...output].sort();
}
export function domainCards(config){return [...(config?.cards||[]),...(config?.custom_cards||[])];}
export function domainHeadingCards(config){
 const collect=cards=>cards.flatMap(card=>card.type==='heading'?[card]:['vertical-stack','custom:vertical-stack-in-card','custom:dash6-stack-card'].includes(card.type)?collect(card.cards||[]):[]);
 if(config?.show_heading===false)return [];if(config?.heading)return [{type:'heading',heading:config.heading}];return collect(config?.cards||[]);
}
export function domainDefinitionConfig(source){
 const config=structuredClone(source),strip=cards=>cards.filter(card=>card.type!=='heading').map(card=>card.cards&&['vertical-stack','custom:vertical-stack-in-card','custom:dash6-stack-card'].includes(card.type)?{...card,cards:strip(card.cards)}:card);
 config.cards=domainCards(config);
 if(config.area&&config.domain){config.cards=[...domainHeadingCards(source),...strip(config.cards)];config.combine=true;}
 return config;
}
export function buildDomainRegistry(config,dashboardName='default'){
 const registry={version:1,dashboards:{[dashboardName]:{views:{}}}};
 const views=registry.dashboards[dashboardName].views;
 for(const [index,view]of (config?.views||[]).entries()){
  const viewKey=String(view.path??view.title??index),sections={};
  const walk=(value,path=[])=>{
   if(!value||typeof value!=='object')return;
   if(value.type==='custom:dash6-domain-card'){
    const key=String(value.block_id||value.domain||Object.keys(sections).length);
    sections[key]={domain:value.domain||null,area:value.area||null,exclusions:[...new Set([...(sections[key]?.exclusions||[]),...extractEntityReferences(domainCards(value))])].sort()};
    return;
   }
   // Directly configured special cards outside domain wrappers also own all
   // their helpers. Structural/dynamic containers only recurse into real cards.
   const structural=new Set(['custom:auto-entities','custom:dash6-auto-entities','custom:ultra-card','custom:dash6-ultra-card','custom:vertical-stack-in-card','custom:dash6-stack-card','custom:layout-card','custom:mod-card','custom:dash6-inline-layout','custom:embedded-view-card','custom:dash6-embedded-view-card']);
   if(['custom:auto-entities','custom:dash6-auto-entities'].includes(value.type))return;
   if(value.type?.startsWith('custom:')&&!structural.has(value.type)){
    const exclusions=extractEntityReferences(value);if(exclusions.length)sections['fixed:'+path.join('/') ]={domain:exclusions[0].split('.')[0],area:value.area||null,exclusions};return;
   }
   for(const [key,child]of Object.entries(value))if(key!=='dash6_registry')Array.isArray(child)?child.forEach((item,index)=>walk(item,[...path,key,index])):walk(child,[...path,key]);
  };
  walk(view);views[viewKey]={title:view.title||viewKey,sections};
 }
 return registry;
}
export function registryExclusions(registry,dashboardName,viewNames){
 const ids=new Set(),views=registry?.dashboards?.[dashboardName]?.views||{};
 for(const name of new Set(viewNames))for(const section of Object.values(views[name]?.sections||{}))for(const id of section.exclusions||[])ids.add(id);
 return ids;
}
const viewLinks=new WeakMap();
export function relatedDomainViews(config,names){
 let links=config&&viewLinks.get(config);
 if(!links){
 const views=config?.views||[],keys=views.map((view,index)=>String(view.path??view.title??index));links=new Map(keys.map(key=>[key,new Set()]));
 const connect=(a,b)=>{if(links.has(a)&&links.has(b)){links.get(a).add(b);links.get(b).add(a);}};
 views.forEach((view,index)=>{
  const walk=value=>{if(!value||typeof value!=='object')return;if(['custom:embedded-view-card','custom:dash6-embedded-view-card'].includes(value.type)){const target=String(value.view??'');connect(keys[index],links.has(target)?target:keys[Number(target)]);}for(const [key,item]of Object.entries(value))if(key!=='dash6_registry')Array.isArray(item)?item.forEach(walk):walk(item);};walk(view);
  const base=keys[index].match(/^(.*)-inhalt(?:-\d+)?$/)?.[1];if(base)connect(keys[index],base);
 });
 if(config&&typeof config==='object')viewLinks.set(config,links);
 }
 const result=new Set(names);for(const name of result)for(const linked of links.get(name)||[])result.add(linked);return [...result];
}
const derived=new WeakMap();
const loadedDashboards={};
export function domainRegistrySnapshot(){return structuredClone({version:1,dashboards:loadedDashboards});}
function publishRegistry(registry,dashboardName){
 if(typeof window==='undefined'||typeof location==='undefined'||!inDashboardScope())return;
 for(const [name,dashboard]of Object.entries(registry.dashboards||{}))if(name===dashboardName||!Object.hasOwn(loadedDashboards,name))loadedDashboards[name]=dashboard;
 if(!Object.getOwnPropertyDescriptor(window,'__dash6DomainRegistry'))Object.defineProperty(window,'__dash6DomainRegistry',{configurable:true,get:domainRegistrySnapshot});
}
export function resolvedDomainRegistry(config,dashboardName){
 if(!config||typeof config!=='object')return {version:1,dashboards:{}};
 let cache=derived.get(config);if(!cache){cache=new Map();derived.set(config,cache);}
 if(!cache.has(dashboardName))cache.set(dashboardName,{version:1,dashboards:{...config.dash6_registry?.dashboards,...buildDomainRegistry(config,dashboardName).dashboards}});
 // Derive current declarations, rather than trusting stale persisted exclusions.
 publishRegistry(cache.get(dashboardName),dashboardName);
 return cache.get(dashboardName);
}
export function dashboardContext(element,config={}){
 let node=element,lovelace=null,host=null;const viewNames=[];
 while(node){
  if(node.viewConfig){const view=node.viewConfig;viewNames.push(String(view.path??view.title??node.index??''));}
  const candidate=node.lovelace||node._lovelace;
  if(candidate?.config?.views){lovelace=candidate;host=node;}
  node=node.parentElement||node.getRootNode?.().host;
 }
 const dashboardName=config.dashboard||lovelace?.urlPath||globalThis.location?.pathname.split('/').filter(Boolean)[0]||'default';
 if(config.view)viewNames.unshift(String(config.view));
 return {lovelace,host,dashboardName,viewNames:[...new Set(viewNames)],config:lovelace?.rawConfig||lovelace?.config};
}
export function replaceDomainConfig(dashboard,previous,next,dashboardName,viewName){
 const clone=structuredClone(dashboard);let count=0;
 for(const [index,view]of (clone.views||[]).entries()){
  const key=String(view.path??view.title??index);if(viewName&&key!==viewName)continue;
  const walk=(value)=>{
   if(!value||typeof value!=='object')return value;
   if(value.type==='custom:dash6-domain-card'&&((previous.block_id&&value.block_id===previous.block_id)||JSON.stringify(value)===JSON.stringify(previous))){count++;return structuredClone(next);}
   if(Array.isArray(value))return value.map(walk);
   return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='dash6_registry'?item:walk(item)]));
  };
  clone.views[index]=walk(view);
 }
 if(count!==1)throw Error(count?'Der Abschnitt ist nicht eindeutig zugeordnet.':'Der Abschnitt wurde im Dashboard nicht gefunden. Bitte die Ansicht neu laden.');
 clone.dash6_registry={...clone.dash6_registry,version:1,dashboards:{...clone.dash6_registry?.dashboards,...buildDomainRegistry(clone,dashboardName).dashboards}};
 return clone;
}
