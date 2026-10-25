import {globalRules,normalizeNames,exclusionLabels,filterGlobalCards} from './global-exclusions.js';
import {dashboardContext,entityDomains} from './domain-registry.js';

export function availableExclusionDomains(hass,draft){
 return [...new Set([...entityDomains,...Object.keys(hass?.states||{}).map(id=>id.split('.')[0])])].filter(domain=>/^[a-z_]+$/.test(domain)&&!Object.hasOwn(draft,domain)).sort();
}

const supportedDashboards=new Set(['dash-6','liquid-glass-demo','liquid-glass-gallery','liquid-glass-hue-demo']);
const active=()=>supportedDashboards.has(location.pathname.split('/').filter(Boolean)[0]);
const context=element=>{const own=dashboardContext(element);if(own.config)return own;let found=own;visit(document,node=>{if(node.localName==='hui-root'){const candidate=dashboardContext(node);if(candidate.dashboardName==='dash-6'&&candidate.config)found=candidate;}});return found;};
const rulesFor=element=>globalRules(context(element).config);
function visit(root,callback){for(const child of root.children||[]){callback(child);visit(child,callback);if(child.shadowRoot)visit(child.shadowRoot,callback);}}
function refresh(){visit(document,element=>{if(element.localName==='dash6-domain-card')element._draw?.();else if(element.localName==='dash6-auto-entities'||element.localName==='auto-entities')element.update_entities?.();else if(element.localName==='dash6-room-slot-card'&&element._lastRoomResult)element._result?.(element._lastRoomResult);});}

// A compatibility layer also serves installed DASH6 bundles. Source and existing
// deployments share exactly the same matcher, with no device/service writes.
for(const tag of ['dash6-domain-card','dash6-auto-entities','auto-entities','dash6-room-slot-card'])customElements.whenDefined(tag).then(()=>{
 const proto=customElements.get(tag).prototype;
 if(tag==='dash6-domain-card'){
  const original=proto._roomCards;
  if(original)proto._roomCards=function(...args){const result=original.apply(this,args);return active()?filterGlobalCards(result,this.hass,rulesFor(this))||[]:result;};
 }else if(tag==='dash6-room-slot-card'){
  const original=proto._result;
  if(original)proto._result=function(result,error){
   if(!active()||error||!result||this._slot?.index===undefined)return original.call(this,result,error);
   const index=this._slot.index,next=structuredClone(result);let cards=next[index];
   if(typeof cards==='string'){try{cards=JSON.parse(cards);}catch{return original.call(this,result,error);}}
   next[index]=filterGlobalCards(cards,this._hass,rulesFor(this))||[];
   const answer=original.call(this,next,error);this._lastRoomResult=result;return answer;
  };
 }else{
  const original=proto.update_card;
  if(original)proto.update_card=function(entities,...args){return original.call(this,active()?filterGlobalCards(entities,this.hass,rulesFor(this))||[]:entities,...args);};
 }
});

class ExclusionEditor extends HTMLElement{
 connectedCallback(){this.render();}
 configure(dialog){this.dialog=dialog;this.base=structuredClone(dialog._params.lovelaceConfig);this.initial=globalRules(this.base);this.draft=structuredClone(this.initial);this.dirty=false;this.pickerOpen=false;this.render();}
 render(){
  if(!this.dialog)return;
  this.replaceChildren();
  const header=document.createElement('div');header.style.cssText='display:flex;align-items:center;gap:12px';
  const heading=document.createElement('h3');heading.textContent='Globale Auto-Entities-Ausschlüsse';heading.style.flex='1';header.append(heading);
  const available=availableExclusionDomains(this.dialog.hass||document.querySelector('home-assistant')?.hass,this.draft);
  const add=document.createElement('button');add.type='button';add.textContent='+';add.setAttribute('aria-label','Domain-Ausschlussliste hinzufügen');add.setAttribute('aria-expanded',String(this.pickerOpen));add.title='Domain-Ausschlussliste hinzufügen';add.disabled=!available.length;add.style.cssText='flex:none;min-width:44px;min-height:44px;border:1px solid var(--divider-color);border-radius:12px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit;font-size:24px;cursor:pointer';
  add.addEventListener('click',()=>{this.pickerOpen=!this.pickerOpen;this.render();this.querySelector('select')?.focus();});header.append(add);this.append(header);
  if(this.pickerOpen&&available.length){
   const label=document.createElement('label');label.textContent='Domain für neue Ausschlussliste';label.style.cssText='display:block;margin:0 0 16px';
   const select=document.createElement('select');select.setAttribute('aria-label','Domain für neue Ausschlussliste');select.style.cssText='display:block;box-sizing:border-box;width:100%;max-width:100%;min-height:44px;margin-top:6px;padding:10px;border:1px solid var(--divider-color);border-radius:12px;background:var(--secondary-background-color);color:var(--primary-text-color);font:inherit';
   const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Domain auswählen …';placeholder.disabled=true;placeholder.selected=true;select.append(placeholder);
   for(const domain of available){const option=document.createElement('option');option.value=domain;option.textContent=exclusionLabels[domain]?exclusionLabels[domain]+' · '+domain:domain;select.append(option);}
   select.addEventListener('change',()=>{const domain=select.value;if(!available.includes(domain)||Object.hasOwn(this.draft,domain))return;this.draft[domain]=[];this.dirty=true;this.pickerOpen=false;this.render();this.querySelector(`[data-domain="${domain}"]`)?.focus();});label.append(select);this.append(label);
  }
  const hint=document.createElement('p');hint.textContent='Ein Namensbestandteil pro Zeile. Groß-/Kleinschreibung spielt keine Rolle. Gilt für dynamische Listen in allen DASH6-Räumen; Fachkarten, Pills und Diagramme behalten ihre Messwerte.';this.append(hint);
  for(const domain of Object.keys(this.draft)){
   const title=exclusionLabels[domain]||domain;
   const label=document.createElement('label');label.textContent=title+' · '+domain;label.style.cssText='display:block;margin:16px 0 6px';
   const input=document.createElement('textarea');input.setAttribute('aria-label',title+' ausschließen');input.rows=Math.min(7,Math.max(3,this.draft[domain].length));input.value=this.draft[domain].join('\n');input.style.cssText='display:block;box-sizing:border-box;width:100%;min-height:88px;padding:12px;border:1px solid var(--divider-color);border-radius:12px;color:var(--primary-text-color);background:var(--secondary-background-color);font:inherit;resize:vertical';
   input.dataset.domain=domain;
   input.addEventListener('input',()=>{this.draft[domain]=normalizeNames(input.value);this.dirty=true;this.status.textContent='Ungespeicherter Entwurf';});label.append(input);this.append(label);
  }
  const note=document.createElement('p');note.textContent='Weitere bestehende Regeln bleiben aktiv: Sensoren ohne tado/tado_hijack und ohne Energie-, Leistungs- oder Feuchtigkeits-Geräteklassen; Kontakte ohne tado/tado_hijack. Raumbezogene Einzel- und Hilfsentitäten werden weiterhin separat ausgeschlossen.';this.append(note);
  this.status=document.createElement('p');this.status.setAttribute('role','status');this.status.textContent=this.dirty?'Ungespeicherter Entwurf':'';this.append(this.status);
  const save=document.createElement('button');save.type='button';save.textContent='Ausschlüsse speichern';save.style.cssText='min-height:44px;padding:10px 16px;border-radius:12px;border:1px solid var(--divider-color);background:var(--primary-color);color:var(--text-primary-color);font:inherit;cursor:pointer';
  save.addEventListener('click',async()=>{
   save.disabled=true;
   try{
    const params=this.dialog._params,live=context(this.dialog).config||params.lovelaceConfig;
    if(!params.saveConfig||params.dashboard?.mode==='yaml')throw Error('Dashboard kann hier nicht gespeichert werden.');
    if(JSON.stringify(globalRules(live))!==JSON.stringify(this.initial))throw Error('Die Ausschlüsse wurden inzwischen geändert. Dialog neu öffnen.');
    const next={...structuredClone(live),dash6_global_exclusions:structuredClone(this.draft)};
    await params.saveConfig(next);params.lovelaceConfig=next;
    // Keep an already prepared background draft from restoring obsolete rules.
    if(this.dialog._backgroundConfig)this.dialog._backgroundConfig={...this.dialog._backgroundConfig,dash6_global_exclusions:structuredClone(this.draft)};
    this.initial=structuredClone(this.draft);this.dirty=false;this.status.textContent='Ausschlüsse gespeichert. Sie gelten auf allen Geräten.';
    window.dispatchEvent(new Event('dash6-domain-registry-changed'));refresh();
   }catch(error){this.status.textContent='Speichern fehlgeschlagen: '+(error.message||error);}finally{save.disabled=false;}
  });this.append(save);
 }
}
if(!customElements.get('dash6-global-exclusions-editor'))customElements.define('dash6-global-exclusions-editor',ExclusionEditor);
customElements.whenDefined('dialog-lovelace-dashboard-detail').then(()=>{
 const proto=customElements.get('dialog-lovelace-dashboard-detail').prototype,updated=proto.updated;
 proto.updated=function(...args){
  updated?.apply(this,args);
  const host=this.shadowRoot?.querySelector('ha-dialog'),existing=host?.querySelector('dash6-global-exclusions-editor');
  if(!supportedDashboards.has(this._params?.urlPath)||!this._open||this._currTab==='tab-background'){existing?.remove();return;}
  if(host&&!existing&&this._params.lovelaceConfig){const editor=document.createElement('dash6-global-exclusions-editor');editor.configure(this);host.append(editor);}
 };
});
