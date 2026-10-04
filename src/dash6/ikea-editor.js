import {html} from 'lit';
import {ConfigEditor} from './config-editor.js';
import {IKEA_DEFAULTS} from './ikea-card.js';
import {SWITCH_SCHEMA} from './glass-switch.js';
class IkeaEditor extends ConfigEditor{
 setConfig(c){super.setConfig({...structuredClone(IKEA_DEFAULTS),...c,graph:{...IKEA_DEFAULTS.graph,...c.graph}});}
 render(){if(!this._config)return html``;const schema=[...['entity','power_entity','energy_entity','led_entity'].map(name=>({name,label:{entity:'Licht / Steckdose',power_entity:'Leistungssensor',energy_entity:'Energiesensor',led_entity:'LED-Schalter (optional)'}[name],selector:{entity:{domain:name==='entity'?['switch','light']:name.includes('power')||name.includes('energy')?'sensor':'switch'}}})),...SWITCH_SCHEMA];return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${schema} .computeLabel=${x=>x.label} @value-changed=${e=>{e.stopPropagation();this.emit({...this._config,...e.detail.value})}}></ha-form>${super.render()}`;}
}
customElements.define('dash6-ikea-editor',IkeaEditor);
