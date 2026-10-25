import {scopedCustomElements as customElements} from './scoped-elements.js';
import {LitElement,html,css,nothing} from 'lit';

export const showcaseDetails=type=>type.includes('lightgroup')||type.includes('shoe-cabinet')||type.includes('govee-light')?[['light','Licht-/Segmentdetails']]:type.includes('appletv')||type==='custom:dash6-media-card'?[['media','TV & Fernbedienungen']]:type.includes('vacuum')?[['clean','Räume & Reinigung'],['dock','Basisstation'],...(type==='custom:dash6-vacuum-card'?[['maintenance','Verschleißteile']]:[])]:type.includes('thermostat')?[['presets','Preset-Auswahl']]:/ikea|homepod|plant/.test(type)?[['info','Entity & Verlauf']]:[];
class Showcase extends LitElement{
 static properties={_child:{state:true},_editor:{state:true},_error:{state:true},_hasGui:{state:true},_draft:{state:true}};
 static styles=css`:host{display:block;min-width:0}.sample{display:grid;gap:10px}.caption{display:flex;gap:10px;align-items:baseline;justify-content:space-between;padding:8px 2px 0}h2{font:600 16px/1.4 var(--primary-font-family,system-ui);margin:0}.tag{font:11px system-ui;color:var(--secondary-text-color)}.tools{display:flex;flex-wrap:wrap;gap:8px;padding:0 2px 6px}.tools button{font:12px/1.3 system-ui;cursor:pointer;min-height:36px;border:1px solid var(--divider-color,#8885);border-radius:10px;padding:8px 12px;color:var(--primary-text-color,#fff);background:var(--secondary-background-color,#222)}.note{font:12px/1.5 system-ui;color:var(--secondary-text-color);padding:0 2px}.error{color:var(--error-color,#f88)}dialog{color:var(--primary-text-color,#fff);background:var(--primary-background-color,#1b2026);border:1px solid var(--divider-color,#888);border-radius:20px;width:min(850px,calc(100vw - 32px));max-height:calc(100dvh - 32px);box-sizing:border-box;padding:20px}dialog::backdrop{background:#0009}header,footer{display:flex;align-items:center;justify-content:space-between;gap:12px}footer{justify-content:flex-end;margin-top:16px}button{font:inherit;cursor:pointer;padding:9px 14px;min-height:40px;border-radius:10px;border:1px solid var(--divider-color,#888);background:var(--card-background-color,#222);color:inherit}.editor{margin:16px 0}pre{font:12px/1.5 monospace;overflow:auto;max-height:200px;white-space:pre-wrap}details{margin-top:12px}`;
 setConfig(c){if(!c.card?.type)throw Error('Eine Beispielkarte ist erforderlich.');this._config=structuredClone(c);this._build();}
 set hass(h){this._hass=h;if(this._child)this._child.hass=h;if(this._editor)this._editor.hass=h;}
 connectedCallback(){super.connectedCallback();this._build();}
 disconnectedCallback(){this.shadowRoot?.querySelector('dialog[open]')?.close();super.disconnectedCallback();}
 async _build(){
  if(!this._config||!this.isConnected)return;
  const token=this._token=(this._token||0)+1;
  try{const helpers=await window.loadCardHelpers();const child=await helpers.createCardElement(this._config.card);if(token!==this._token)return;child.hass=this._hass;this._child=child;this._hasGui=typeof child.constructor.getConfigElement==='function';this._error='';}catch(e){this._error=e.message;}
 }
 async details(action){
  const c=this._child;if(!c)return;
  try{
   if(action==='light')c.open();
   if(action==='media')await c.openDialog();
   if(action==='clean')c._openCustom();
   if(action==='dock')c._openDock();
   if(action==='maintenance')c._openMaintenance(c._config.stats?.default?.[0]?.entity);
   if(action==='presets')c.openPresets();
   if(action==='info')c.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:c._config?.entity||c._config?.entities?.temperature},bubbles:true,composed:true}));
  }catch(e){this._error=e.message;}
 }
 async configure(){
  try{this._draft=structuredClone(this._config.card);const editor=await this._child.constructor.getConfigElement();editor.hass=this._hass;editor.setConfig(this._draft);editor.addEventListener('config-changed',e=>{e.stopPropagation();this._draft=structuredClone(e.detail.config);});this._editor=editor;await this.updateComplete;this.shadowRoot.querySelector('dialog').showModal();}catch(e){this._error=e.message;}
 }
 async save(){
  this._config={...this._config,card:structuredClone(this._draft)};this.shadowRoot.querySelector('dialog').close();this._editor=null;await this._build();
 }
 render(){const type=this._config?.card?.type||'',details=showcaseDetails(type);return html`<section class="sample">${this._config?.minimal?nothing:html`<header class="caption"><h2>${this._config?.title||this._config?.card?.name||type.replace('custom:dash6-','')}</h2><span class="tag">Virtuelle Demo</span></header>`}${this._child||nothing}<div class="tools">${details.map(([action,label])=>html`<button data-detail=${action} @click=${()=>this.details(action)}>${label}</button>`)}${this._hasGui?html`<button data-configure @click=${this.configure}>GUI konfigurieren</button>`:nothing}</div>${details.length?html`<div class="note">Die Detailansichten gehören zur echten Karte. Lichtgruppen und TV öffnen ihre Ansicht auch über den Kartenhintergrund.</div>`:nothing}${this._error?html`<p class="error" role="alert">${this._error}</p>`:nothing}</section><dialog aria-label="Karte über GUI konfigurieren"><header><h2>GUI · ${this._config?.title||type}</h2><button aria-label="Konfiguration schließen" @click=${()=>this.shadowRoot.querySelector('dialog').close()}>×</button></header><p class="note">Der echte Karteneditor. Änderungen gelten für diese Demo-Vorschau; die verwaltete Dashboard-YAML bleibt erhalten.</p><div class="editor">${this._editor||nothing}</div><details><summary>Resultierende Konfiguration</summary><pre>${JSON.stringify(this._draft,null,2)}</pre></details><footer><button @click=${()=>this.shadowRoot.querySelector('dialog').close()}>Abbrechen</button><button @click=${this.save}>In Demo übernehmen</button></footer></dialog>`;}
 getCardSize(){return (this._child?.getCardSize?.()||4)+2;}
}
customElements.define('dash6-showcase-card',Showcase);
