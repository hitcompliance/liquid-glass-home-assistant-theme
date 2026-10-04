import './config-editor.js';
import {LitElement,html} from 'lit';
import {defaults} from './media-card.js';
class MediaEditor extends LitElement{
 static properties={hass:{attribute:false},_config:{state:true}};
 setConfig(c){this._config={...defaults,...c};}
 render(){return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${[{name:'name',label:'Name',selector:{text:{}}},{name:'apple_entity',label:'Apple TV',selector:{entity:{domain:'media_player'}}},{name:'apple_remote',label:'Apple-TV-Fernbedienung',selector:{entity:{domain:'remote'}}},{name:'fire_entity',label:'Fernseher / Fire TV (ADB)',selector:{entity:{domain:'media_player'}}},{name:'apple_device_type',label:'Firemote-Modell Apple TV',selector:{text:{}}},{name:'fire_device_type',label:'Firemote-Modell Fernseher',selector:{text:{}}}]} .computeLabel=${x=>x.label} @value-changed=${e=>{e.stopPropagation();this._config={...this._config,...e.detail.value};this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));}}></ha-form><details><summary>Alle Einstellungen</summary><dash6-config-editor .hass=${this.hass} ._config=${this._config} @config-changed=${e=>{e.stopPropagation();this._config=e.detail.config;this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));}}></dash6-config-editor></details>`;}
}
customElements.define('dash6-media-editor',MediaEditor);