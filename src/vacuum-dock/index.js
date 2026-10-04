import {bindThemePreferences,unbindThemePreferences} from '../dash6/material.js';
import {LitElement,html} from 'lit';
import {normalizeConfig,TYPE} from './config.js';
import {initialize} from './runtime.js';
import './editor.js';
export class VacuumDockCard extends LitElement{
 static properties={hass:{attribute:false}};
 static getConfigElement(){return document.createElement('vacuum-dock-card-editor');}
 static getStubConfig(hass,entities=[]){return {type:TYPE,entity:entities.find(e=>e.startsWith('vacuum.'))||Object.keys(hass?.states||{}).find(e=>e.startsWith('vacuum.'))||''};}
 setConfig(c){const config=normalizeConfig(c);this.shadowRoot?.querySelectorAll('dialog[open]').forEach(d=>d.close());this._config=config;initialize(this,config);this.requestUpdate();}
 getCardSize(){return 10;}
 getGridOptions(){return {columns:12,min_columns:6};}
 render(){return html``;}
 connectedCallback(){super.connectedCallback();bindThemePreferences(this);}
 disconnectedCallback(){unbindThemePreferences(this);super.disconnectedCallback();this.shadowRoot?.querySelectorAll('dialog[open]').forEach(d=>d.close());}
 updated(){this.setAttribute('lang',this._de?.()?'de':'en');}
}
if(!customElements.get('vacuum-dock-card'))customElements.define('vacuum-dock-card',VacuumDockCard);
window.customCards=window.customCards||[];
if(!window.customCards.some(c=>c.type==='vacuum-dock-card'))window.customCards.push({type:'vacuum-dock-card',name:'Vacuum Dock Card',description:'Touch-friendly vacuum and dock controls with a visual setup assistant.',preview:true});
