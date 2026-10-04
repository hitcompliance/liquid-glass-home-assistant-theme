import {html} from 'lit';
import {ConfigEditor} from './config-editor.js';
class BasicEditor extends ConfigEditor {
 render(){if(!this._config)return html``;return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${this.schema} .computeLabel=${x=>x.label||x.name} @value-changed=${e=>{e.stopPropagation();this.emit({...this._config,...e.detail.value});}}></ha-form><details><summary>Weitere Einstellungen und vollständige Konfiguration</summary>${this.object(this._config,[],'Alle Einstellungen',true)}</details>`;}
}
customElements.define('dash6-basic-editor',BasicEditor);
