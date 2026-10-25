import {html} from 'lit';
import {glassSettingsPreview,glassSettingNames} from './glass-settings-preview.js';
import {themeSaveActions,clearSavedThemePreferences} from './theme-defaults.js';
customElements.whenDefined('dash6-theme-editor-card').then(()=>{
 const p=customElements.get('dash6-theme-editor-card').prototype;
 if(p._glassPreviewLive)return;p._glassPreviewLive=true;
 const connected=p.connectedCallback,disconnected=p.disconnectedCallback;
 p.connectedCallback=function(){connected.call(this);this._defaultsListener=()=>{this._values=window.__dash6ThemeSettings?.readPreferences?.()||this._values;this.requestUpdate();};window.addEventListener('dash6-theme-defaults-updated',this._defaultsListener);};
 p.disconnectedCallback=function(){window.removeEventListener('dash6-theme-defaults-updated',this._defaultsListener);disconnected.call(this);};
 const reset=p.reset;p.reset=function(...args){clearSavedThemePreferences();this._saveStatus='';return reset.apply(this,args);};
 const render=p.render;
 p.render=function(){
  const preferences=this.preferences(),controls=window.__dash6ThemeSettings.themeControls;
  const visit=value=>{
   if(Array.isArray(value))return value.map(visit);
   if(!value?.strings||!value?.values)return value;
   const footer=!this.constructor.themeSaveActionsVersion&&value.strings.join('').includes('Theme-Vorgaben wiederherstellen');
   const schema=value.values.find(v=>Array.isArray(v)&&v.some(s=>s?.name==='light_glass_opacity'));
   if(schema&&value.strings.join('').includes('<ha-form')){
    value.values=value.values.map(v=>v===schema?schema.filter(s=>!glassSettingNames.includes(s.name)):v);
    return html`${glassSettingsPreview(this,preferences,controls)}<details><summary>Weitere Einstellungen für Bedienflächen und Bewegung</summary>${value}</details>${footer?themeSaveActions(this):''}`;
   }
   value.values=value.values.map(visit);
   if(footer)return html`${value}${themeSaveActions(this)}`;
   return value;
  };
  return visit(render.call(this));
 };
});
