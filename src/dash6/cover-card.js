import {errorIndicator,reportError} from './error-indicator.js';
import {bindThemePreferences,unbindThemePreferences} from './material.js';
import {LitElement,html,css} from 'lit';
import {surface} from './material.js';
export function coverStatus(state,hass){
 if(['unknown','unavailable'].includes(state.state))return hass?.formatEntityState?.(state)||state.state;
 const value=state.attributes.current_position;
 const position=typeof value==='number'&&Number.isFinite(value)?Math.round(Math.min(100,Math.max(0,value))):null;
 if(state.state==='closed'||position===0)return 'geschlossen';
 if(position===100)return 'geöffnet';
 if(position!==null)return state.state==='closing'?`${100-position} % geschlossen`:`${position} % geöffnet`;
 return state.state==='open'?'geöffnet':hass?.formatEntityState?.(state)||state.state;
}
class CoverCard extends LitElement {
 static properties={hass:{attribute:false},_config:{state:true},_error:{state:true}};
 static styles=css`:host{display:block;min-width:0}ha-card{box-sizing:border-box;max-height:300px;overflow:hidden;padding:4px 12px 12px}header{display:flex;align-items:center;gap:10px;min-height:44px}header button{background:var(--dash6-icon-lens-background)!important;border:var(--dash6-icon-lens-border)!important;box-shadow:var(--dash6-icon-lens-shadow)!important;color:var(--dash6-icon-lens-white)!important;width:40px;height:40px;border-radius:50%;border:var(--dash5-icon-border);background:var(--dash6-icon-background);color:var(--primary-text-color);box-shadow:var(--dash5-icon-shadow)}strong{font-size:16px;line-height:20px}.label{min-width:0;flex:1}strong{display:block;overflow:hidden;text-overflow:ellipsis}p{text-align:left;font-size:13px;line-height:18px;margin:2px 0 0;color:var(--secondary-text-color)}.control{display:flex;justify-content:center;height:190px}dash6-cover-slider{--control-slider-thickness:64px;--control-slider-color:var(--dash6-cover-fill);--control-slider-background:var(--dash6-cover-track);height:190px;border:var(--dash6-cover-border);border-radius:20px;box-shadow:var(--dash6-cover-track-shadow)}.error{color:var(--error-color)}`;
 static getConfigElement(){const e=document.createElement('dash6-basic-editor');e.schema=[{name:'entity',label:'Rollo',required:true,selector:{entity:{domain:'cover'}}},{name:'name',label:'Anzeigename',selector:{text:{}}}];return e;}
 disconnectedCallback(){unbindThemePreferences(this);super.disconnectedCallback();}
 async connectedCallback(){super.connectedCallback();bindThemePreferences(this);const helpers=await window.loadCardHelpers();await helpers.importMoreInfoControl('cover');await customElements.whenDefined('ha-control-slider');if(!customElements.get('dash6-cover-slider')){const Base=customElements.get('ha-control-slider');class Slider extends Base{static styles=[Base.styles,css`.slider{border-radius:19px;box-shadow:var(--dash6-cover-track-shadow)}.slider-track-background{background:var(--dash6-cover-track)}.slider-track-bar{background:var(--dash6-cover-fill)}.slider-track-bar::after{background:var(--dash6-cover-thumb);box-shadow:var(--dash6-cover-thumb-shadow)}.tooltip{background:var(--dash6-tooltip-background);border:var(--dash6-tooltip-border);box-shadow:var(--dash6-tooltip-shadow)}`];}customElements.define('dash6-cover-slider',Slider);}this.requestUpdate();}
 setConfig(c){if(!c.entity?.startsWith('cover.'))throw Error('Eine cover-Entity wird benötigt.');this._config=c;}
 async setPosition(value){try{await this.hass.callService('cover','set_cover_position',{entity_id:this._config.entity,position:Number(value)});this._error='';}catch(e){reportError(this,e);}}
 more(){this.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:this._config.entity},bubbles:true,composed:true}));}
 getCardSize(){return 4;}
 render(){const s=this.hass?.states[this._config?.entity];if(!s)return html``;const disabled=['unknown','unavailable'].includes(s.state)||!(s.attributes.supported_features&4);return html`<style>${surface}</style><ha-card><header><button aria-label="Details öffnen" @click=${this.more}><ha-icon icon="mdi:blinds-horizontal"></ha-icon></button><div class="label"><strong>${this._config.name||s.attributes.friendly_name||s.entity_id}</strong><p>${coverStatus(s,this.hass)}</p></div>${errorIndicator(this)}</header><div class="control"><dash6-cover-slider .locale=${this.hass.locale} .min=${0} .max=${100} .step=${1} .vertical=${true} .inverted=${false} .mode=${'end'} .showHandle=${true} .unit=${'%'} .label=${'Position'} .value=${s.attributes.current_position??0} .disabled=${disabled} @value-changed=${e=>{e.stopPropagation();this.setPosition(e.detail.value)}}></dash6-cover-slider></div></ha-card>`;}
}
customElements.define('dash6-cover-card',CoverCard);
window.customCards??=[];window.customCards.push({type:'dash6-cover-card',name:'DASH6 vertikales Rollo',description:'Vertikale Position, Status und Details; integrierte Geometrie ohne Card-Mod.',preview:true});
