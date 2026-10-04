import {LitElement,html,css} from 'lit';
import {loadProfile} from './profiles-store.js';
import './config-editor.js';
// Retain the complete native editor and replacement semantics of the verified v35 release.
class ProfileEditor extends LitElement{
 static properties={hass:{attribute:false},_config:{state:true},_source:{state:true},_nativeEditor:{state:true},_error:{state:true}};
 static styles=css`:host{display:block;min-width:0}h3{margin:16px 0 8px}.error{color:var(--error-color)}`;
 async setConfig(c){this._config=structuredClone(c);const token=this._token=(this._token||0)+1;try{const source=c.profile?await loadProfile(c.profile):c.definition;if(token!==this._token)return;this._source={...structuredClone(source||{}),...structuredClone(c.overrides||{})};const helpers=await window.loadCardHelpers(),mapped=window.__dash6Cards.mapCards(this._source),definition=mapped.type==='custom:dash6-render-card'?mapped.definition:mapped,editor=await helpers.createCardElement(definition).constructor.getConfigElement?.();if(token!==this._token)return;if(editor&&editor.localName!=='dash6-profile-editor'){editor.hass=this.hass;await editor.setConfig(definition);editor.addEventListener('config-changed',e=>{e.stopPropagation();this.saveDefinition(e.detail.config)});this._nativeEditor=editor;}else this._nativeEditor=null;this._error='';}catch(error){this._error=error.message||String(error);}}
 updated(){if(this._nativeEditor)this._nativeEditor.hass=this.hass;}
 change(patch){this._config={...this._config,...patch};this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:structuredClone(this._config)},bubbles:true,composed:true}));}
 replace(c){this._config=structuredClone(c);this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:structuredClone(this._config)},bubbles:true,composed:true}));}
 saveDefinition(c){this._source=structuredClone(c);this.change(this._config.profile?{overrides:structuredClone(c)}:{definition:structuredClone(c)});}
 render(){if(!this._config)return html``;return html`<p>${this._config.profile||'DASH6-Karte'} · ${this._source?.type||''}</p>${this._error?html`<p class="error">${this._error}</p>`:''}${this._nativeEditor||''}${this._source?html`<details ?open=${!this._nativeEditor}><summary>Alle Einstellungen der eingebetteten Karte</summary><dash6-config-editor .hass=${this.hass} ._config=${this._source} @config-changed=${e=>{e.stopPropagation();this.saveDefinition(e.detail.config)}}></dash6-config-editor></details>`:''}<details><summary>Rahmen, Bereich und Profil-Einstellungen</summary><dash6-config-editor .hass=${this.hass} ._config=${this._config} @config-changed=${e=>{e.stopPropagation();this.replace(e.detail.config)}}></dash6-config-editor></details>`;}
}
customElements.define('dash6-profile-editor',ProfileEditor);
