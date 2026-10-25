import {scopedCustomElements as customElements} from './scoped-elements.js';

// Consumption supplements the visible feedback; it never changes a switch state.
export function fanPowerWatts(config,states){
 let graph=config.custom_fields?.graph?.card;for(let i=0;i<4&&graph?.card;i++)graph=graph.card;
 const id=config.power_entity||config.variables?.dash6_power||graph?.series?.[0]?.entity||(typeof graph?.entities?.[0]==='string'?graph.entities[0]:graph?.entities?.[0]?.entity)||config.triggers_update?.find?.(id=>states[id]?.attributes?.device_class==='power');
 const sensor=states[id],raw=sensor?.state;if(raw==null||String(raw).trim()===''||!Number.isFinite(Number(raw)))return null;
 const unit=sensor.attributes?.unit_of_measurement||'W';return unit==='kW'?Number(raw)*1000:unit==='W'?Number(raw):null;
}
export function applyFanPowerFeedback(host,triple=false){
 if(!triple&&!host._config?.entity?.startsWith('fan.')){host.removeAttribute('data-fan-power-glow');return;}
 const states=(host.hass||host._hass)?.states||{};let watts=null;
 for(let node=host;node;node=node.parentNode||node.host){
  const c=node._config||node.config;if(c?.entity!==host._config?.entity)continue;
  watts=fanPowerWatts(c,states);if(watts!==null)break;
 }
 const physical=triple&&states[host._config.running_switch_entity]?.state==='on'&&states[host._config.running_force_switch_entity||host._config.force_switch_entity]?.state==='on';
 host.toggleAttribute('data-fan-power-glow',watts!==null&&watts>1&&!physical);
 if(!host.shadowRoot||host.shadowRoot.querySelector('#fan-power-feedback-css'))return;
 const css=document.createElement('style');css.id='fan-power-feedback-css';css.textContent=`
 :host([data-fan-power-glow]) .track{box-shadow:inset 0 1px 1px #ffffff30,0 0 10px #ffffff70,0 0 20px #ffffff38!important}
 :host([data-fan-power-glow]) .track::before{background:radial-gradient(ellipse at 38% 110%,#ffffffbb,transparent 78%)!important;opacity:.45!important}
 :host([data-fan-power-glow]) .rim{border-color:#fff!important;box-shadow:0 0 7px #ffffff88!important}
 :host([data-fan-power-glow]) .icon{color:#fff!important;filter:drop-shadow(0 0 4px #ffffff88)!important}
 :host([data-fan-power-glow]) .light{background:radial-gradient(ellipse,#fff,transparent 69%)!important;opacity:.55!important}
 `;host.shadowRoot.append(css);
}
customElements.whenDefined('dash6-glass-switch').then(()=>{const p=customElements.get('dash6-glass-switch').prototype;if(p._fanPowerFeedback)return;p._fanPowerFeedback=true;const old=p.updated;p.updated=function(...args){const result=old?.apply(this,args);applyFanPowerFeedback(this);return result;};});
customElements.whenDefined('dash6-fan-mode-switch').then(()=>{const p=customElements.get('dash6-fan-mode-switch').prototype;if(p._fanPowerFeedback)return;p._fanPowerFeedback=true;const old=p.sync;p.sync=function(...args){const result=old.apply(this,args);if(this._config)applyFanPowerFeedback(this,true);return result;};});
