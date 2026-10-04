import {LitElement,html} from 'lit';
import './config-editor.js';
export class ExternalEditor extends LitElement{
 static properties={hass:{attribute:false},_editor:{state:true},_error:{state:true},_config:{state:true}};
 async setConfig(config){this._config=structuredClone(config);const token=this._token=(this._token||0)+1;try{const helpers=await window.loadCardHelpers();const card=helpers.createCardElement(config);const editor=await card.constructor.getConfigElement?.()||document.createElement('dash6-config-editor');if(token!==this._token)return;editor.hass=this.hass;await editor.setConfig(config);editor.addEventListener('config-changed',e=>{e.stopPropagation();this._config=structuredClone(e.detail.config);this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));});this._editor=editor;this._error='';}catch(e){if(token!==this._token)return;this._error='Der Originaleditor ist nicht verfügbar: '+(e.message||e);const editor=document.createElement('dash6-config-editor');editor.setConfig(config);editor.addEventListener('config-changed',e=>{e.stopPropagation();this._config=structuredClone(e.detail.config);this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));});this._editor=editor;}}
 updated(){if(this._editor)this._editor.hass=this.hass;}
 render(){return html`${this._error?html`<p>${this._error}</p>`:''}${this._editor||html`<p>Karteneditor wird geladen …</p>`}${this._editor?.localName!=='dash6-config-editor'&&this._config?html`<details><summary>Vollständige Konfiguration als Formular</summary><dash6-config-editor .hass=${this.hass} ._config=${this._config} @config-changed=${e=>{e.stopPropagation();this._config=structuredClone(e.detail.config);this._editor?.setConfig(this._config);this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));}}></dash6-config-editor></details>`:''}`;}
}
customElements.define('dash6-external-editor',ExternalEditor);

class InlineEditor extends ExternalEditor{
 static properties={...ExternalEditor.properties,config:{attribute:false}};
 updated(changed){super.updated(changed);if(changed.has('config')&&this.config&&JSON.stringify(this.config)!==JSON.stringify(this._config))this.setConfig(this.config);}
}
customElements.define('dash6-inline-editor',InlineEditor);
