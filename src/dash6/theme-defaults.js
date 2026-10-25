import {html} from 'lit';
import {graphSettingsVariables} from './graph-settings.js';
const FILE='www/dash6-satin/theme-defaults.json',URL='/local/dash6-satin/theme-defaults.json';
const THEME='DASH6 Satin Glass',FILES=['themes/dash6-satin-glass.yaml','themes/liquid-glass.yaml'];
const LOCAL_SAVE_KEY='dash6-satin-theme-saved-v1';
let published={version:1,themes:{}},revision='',loading=false,activeHost=null;
const allowed=key=>/^(dash[56]-|lg-)/.test(key)&&!/[\r\n:]/.test(key);
export function themeDocument(text,name,values){
 const lines=text.split('\n'),headers=[name+':',JSON.stringify(name)+':',"'"+name.replaceAll("'","''")+"':"],start=lines.findIndex(l=>headers.includes(l.trimEnd()));if(start<0)return null;
 let end=start+1;while(end<lines.length&&!/^[^\s#].*:/.test(lines[end]))end++;
 const body=[];for(let i=start+1;i<end;i++){const key=lines[i].match(/^  ([^ :][^:]*):/);if(key&&Object.hasOwn(values,key[1])){while(i+1<end&&/^\s{3,}\S/.test(lines[i+1]))i++;continue;}body.push(lines[i]);}
 const fields=Object.entries(values).filter(([key,v])=>allowed(key)&&typeof v==='string').map(([key,v])=>'  '+key+': '+JSON.stringify(v));
 return [...lines.slice(0,start+1),...fields,...body,...lines.slice(end)].join('\n');
}
async function file(hass,action,path,data=''){
 const r=await hass.callWS({type:'config_editor/ws',action,file:path,data,ext:path.endsWith('.json')?'json':'yaml'});
 if(!r?.msg?.startsWith(action==='load'?'Loaded:':'Saved:'))throw Error(r?.msg||'Dateizugriff fehlgeschlagen');return action==='load'?r.data:r;
}
const refreshEditors=()=>{for(const e of document.querySelectorAll('home-assistant'))e.dispatchEvent(new Event('dash6-defaults-refreshed'));window.dispatchEvent(new Event('dash6-theme-defaults-updated'));};
function themeHost(){const find=r=>{for(const e of r.querySelectorAll('*')){if(e.localName==='hui-view-container'&&getComputedStyle(e).getPropertyValue('--dash6-satin-enabled').trim()==='1')return e;if(e.shadowRoot){const p=find(e.shadowRoot);if(p)return p;}}};return find(document);}
export async function loadThemeDefaults(force=false){
 if(loading)return;loading=true;
 try{const r=await fetch(URL,{cache:'no-store',credentials:'same-origin'});if(!r.ok){if(r.status===404)return;throw Error('Defaults nicht erreichbar');}const next=await r.json();if(next.version!==1||!next.themes)return;published=next;applyPublished(force);
 }catch{/* Keep the confirmed native theme and current preview on a temporary connection failure. */}finally{loading=false;}
}
function localValues(item){try{const saved=JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY)||'null');if(saved?.theme===THEME&&saved.revision===item.revision&&saved.values&&typeof saved.values==='object')return saved.values;}catch{}return item.values;}
function applyPublished(force=false){const item=published.themes[THEME],host=themeHost();if(!host||!item||!window.__dash6ThemeSettings?.replacePreferences)return;const key=THEME+'|'+item.revision;if(force||key!==revision||host!==activeHost){revision=key;activeHost=host;window.__dash6ThemeSettings.replacePreferences(force?item.values:localValues(item));refreshEditors();}}
function allThemeValues(editor,api){const controls=editor.preferences();let browserValues={};try{browserValues=JSON.parse(localStorage.getItem('dash6-satin-theme-preferences-v1')||'{}');}catch{}const all={...api.settingsVariables(controls),...graphSettingsVariables(controls),...api.readPreferences(),...browserValues,_controls:controls};return Object.fromEntries(Object.entries(all).filter(([key,v])=>key==='_controls'||(allowed(key)&&typeof v==='string')));}
export function clearSavedThemePreferences(){localStorage.removeItem(LOCAL_SAVE_KEY);}
export function saveThemeLocally(editor){
 editor._defaultStatus='';
 try{
  const api=window.__dash6ThemeSettings;if(!api?.readPreferences||!api?.replacePreferences)throw Error('Theme-Speicher nicht bereit.');
  const values=allThemeValues(editor,api),previous=localStorage.getItem(LOCAL_SAVE_KEY);
  localStorage.setItem(LOCAL_SAVE_KEY,JSON.stringify({theme:THEME,revision:published.themes[THEME]?.revision??null,values}));
  try{api.replacePreferences(values);}catch(error){if(previous===null)localStorage.removeItem(LOCAL_SAVE_KEY);else localStorage.setItem(LOCAL_SAVE_KEY,previous);throw error;}
  editor._saveStatus='Alle Theme-Einstellungen für diesen Browser gespeichert. Neue gemeinsame Vorgaben haben Vorrang.';
 }catch(error){editor._saveStatus='Nicht gespeichert: '+(error.message||String(error));}
 editor.requestUpdate();
}
export async function saveThemeDefaults(editor){
 const hass=editor.hass;if(!hass?.user?.is_admin)throw Error('Nur Administratoren dürfen Theme-Defaults speichern.');
 const api=window.__dash6ThemeSettings;if(!api?.readPreferences||!api?.replacePreferences)throw Error('Theme-Speicher nicht bereit.');
 editor._defaultStatus='Theme-Defaults werden gesichert und gespeichert …';editor._defaultSaving=true;editor.requestUpdate();
 const changes=[];let previousShared=null;
 try{
  const values=allThemeValues(editor,api);
  const stamp=new Date().toISOString().replaceAll(':','-'),backup='backups/Theme-Defaults/'+stamp+'/';
  const nativeValues=Object.fromEntries(Object.entries(values).filter(([k])=>k!=='_controls'));
  const files=[];for(const path of editor._config?.theme_files||FILES){let original;try{original=await file(hass,'load',path);}catch{continue;}const updated=themeDocument(original,THEME,nativeValues);if(updated!==null)files.push({path,original,updated});}
  if(!files.length)throw Error('Keine passende Theme-Datei gefunden; nichts gespeichert.');
  previousShared=await file(hass,'load',FILE);let shared;try{shared=JSON.parse(previousShared);if(shared.version!==1||!shared.themes)throw Error();}catch{throw Error('Gemeinsame Defaults-Datei ist ungültig.');}
  for(const f of files)await file(hass,'save',backup+f.path.replaceAll('/','__'),f.original);
  if(previousShared!==null)await file(hass,'save',backup+'theme-defaults.json',previousShared);
  const item={revision:stamp,values};shared.themes[THEME]=item;
  for(const f of files){if(await file(hass,'load',f.path)!==f.original)throw Error('Theme-Datei wurde zwischenzeitlich geändert. Bitte erneut speichern.');await file(hass,'save',f.path,f.updated);changes.push(f);if(await file(hass,'load',f.path)!==f.updated)throw Error('Gespeicherte Theme-Datei stimmt nicht überein.');}
  await hass.callService('frontend','reload_themes');
  const json=JSON.stringify(shared,null,2)+'\n';await file(hass,'save',FILE,json);if(await file(hass,'load',FILE)!==json)throw Error('Gemeinsame Defaults konnten nicht bestätigt werden.');
  published=shared;revision='';await loadThemeDefaults(true);editor._defaultStatus='Als Theme-Default für alle Benutzer gespeichert. Geöffnete Ansichten übernehmen die Werte spätestens nach 30 Sekunden. Sicherung: '+backup;
 }catch(error){
  const failures=[];
  if(changes.length&&previousShared!==null)try{await file(hass,'save',FILE,previousShared);}catch{failures.push(FILE);}
  for(const f of changes.reverse())try{await file(hass,'save',f.path,f.original);}catch{failures.push(f.path);}
  if(changes.length)try{await hass.callService('frontend','reload_themes');}catch{failures.push('Themes neu laden');}
  editor._defaultStatus='Nicht gespeichert: '+(error.message||String(error))+(failures.length?' Wiederherstellung bitte prüfen: '+failures.join(', '):'');
 }finally{editor._defaultSaving=false;editor.requestUpdate();}
}
export function themeDefaultButton(editor){return html`<div class="actions">${editor.hass?.user?.is_admin?html`<button ?disabled=${editor._defaultSaving} @click=${()=>saveThemeDefaults(editor)}>Als Theme-Default für alle speichern</button>`:''}</div><p role="status">${editor._defaultStatus||'Gespeicherte Theme-Defaults gelten für alle Benutzer dieses Themes. Änderungen hier sind zunächst eine Vorschau.'}</p>`;}
export function themeSaveActions(editor){return html`<div class="actions" aria-label="Alle Theme-Einstellungen speichern"><button ?disabled=${editor._defaultSaving} @click=${()=>saveThemeLocally(editor)}>Alles speichern</button>${editor.hass?.user?.is_admin?html`<button ?disabled=${editor._defaultSaving} @click=${()=>{editor._saveStatus='';return saveThemeDefaults(editor);}}>Alles für Alle speichern</button>`:''}</div><p role="status" aria-live="polite">${editor._defaultStatus||editor._saveStatus||'Alles speichern: dieser Browser. Alles für Alle speichern: gemeinsame Vorgaben für alle Benutzer dieses Themes.'}</p>`;}
window.addEventListener('location-changed',()=>{activeHost=null;void loadThemeDefaults();});
window.addEventListener('popstate',()=>{activeHost=null;void loadThemeDefaults();});
window.addEventListener('visibilitychange',()=>{if(!document.hidden)void loadThemeDefaults();});
window.addEventListener('dash6-theme-settings-changed',()=>applyPublished());
customElements.whenDefined('hui-view-container').then(()=>{const p=customElements.get('hui-view-container').prototype,connected=p.connectedCallback,updated=p.updated;p.connectedCallback=function(...args){const result=connected?.apply(this,args);requestAnimationFrame(()=>applyPublished());return result;};p.updated=function(...args){const result=updated?.apply(this,args);queueMicrotask(()=>applyPublished());return result;};applyPublished();});
setInterval(()=>{if(!document.hidden)void loadThemeDefaults();},30000);
void loadThemeDefaults();
