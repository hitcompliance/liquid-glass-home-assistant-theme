import {Dash5LightgroupCard,el,button} from './light-cards.js';
import {reportError} from './error-indicator.js';
import {sceneMatches,sceneTarget} from './scene-state.js';
class ShoeCabinetCard extends Dash5LightgroupCard {
 render(){if(this._dragging)return;super.render();const card=this.shadowRoot?.querySelector('ha-card.card');if(!card||!this._hass)return;const c=this._config;
 const row=el('div',{class:'shoe-scenes',style:'display:flex;gap:8px;padding:0;margin:0px!important;flex-wrap:wrap'});
 for(const scene of c.scenes||[]){const b=button(scene.name||scene.entity,async()=>{b.disabled=true;try{await this._hass.callService('scene','turn_on',{entity_id:scene.entity})}catch(error){reportError(this,error)}finally{b.disabled=false}},{'aria-label':scene.name||scene.entity,'aria-pressed':sceneMatches(sceneTarget(this._hass,scene.entity,()=>this.render()),this._hass.states),disabled:!this._hass.states[scene.entity]||this._hass.states[scene.entity].state==='unavailable',style:'flex:1;min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px'});if(scene.icon){const i=el('ha-icon');i.setAttribute('icon',scene.icon);b.prepend(i)}if(typeof scene.fill==='string')b.style.setProperty('--scene-fill',scene.fill);row.append(b)}if(row.childElementCount)card.append(row);
 }
}
customElements.define('dash6-shoe-cabinet-card',ShoeCabinetCard);
window.customCards??=[];window.customCards.push({type:'dash6-shoe-cabinet-card',name:'DASH6 Schuhschrank',description:'Liquid-Glass-Lichtgruppe mit Segmentdetails, Bunt/Weiß und Leistungsgraph.',preview:true});
