import {bindThemePreferences,unbindThemePreferences} from './material.js';
import {LitElement,html} from 'lit';
import {initialize} from './vacuum-runtime.js';
import DEFAULT from './vacuum-default.json';
class Dash6VacuumCard extends LitElement {
 static properties={hass:{attribute:false}};
 static async getConfigElement(){await import('./vacuum-editor.js');return document.createElement('dash6-vacuum-editor');}
 static getStubConfig(){return {...DEFAULT};}
 setConfig(config){
  if(!config.entity?.startsWith('vacuum.'))throw Error('Eine vacuum-Entity wird benötigt.');
  const next={...DEFAULT,...structuredClone(config),entities:{...DEFAULT.entities,...config.entities}};
  const signature=JSON.stringify(next);if(signature===this._signature)return;
  this.shadowRoot?.querySelectorAll('dialog[open]').forEach(d=>d.close());
  this._config=next;this._signature=signature;initialize(this,next);this.requestUpdate();
 }
 getCardSize(){return 10;}
 getGridOptions(){return {columns:12,min_columns:6};}
 render(){return html``;}
 connectedCallback(){super.connectedCallback();bindThemePreferences(this);}
 disconnectedCallback(){unbindThemePreferences(this);super.disconnectedCallback();this.shadowRoot?.querySelectorAll('dialog[open]').forEach(d=>d.close());}
}
customElements.define('dash6-vacuum-card',Dash6VacuumCard);
window.customCards??=[];window.customCards.push({type:'dash6-vacuum-card',name:'DASH6 Staubsauger und Dock',description:'Eigene Karte mit integrierter Geometrie, Dock- und Wartungsdialogen.',preview:true});
