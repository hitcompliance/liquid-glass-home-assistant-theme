import {scopedCustomElements as customElements} from './scoped-elements.js';
import {LitElement,html,css} from 'lit';
import './config-editor.js';

// The card definition is edited in place; no instance profile is loaded.
class InlineEditor extends LitElement{
 static properties={hass:{attribute:false},_config:{state:true},_source:{state:true},_nativeEditor:{state:true},_error:{state:true}};
 static styles=css`:host{display:block;min-width:0}.error{color:var(--error-color)}`;
 async setConfig(config){
  this._config=structuredClone(config);this._source=structuredClone(config.card||config.definition||{});
  const token=this._token=(this._token||0)+1;this._nativeEditor=null;
  try{
   const helpers=await window.loadCardHelpers(),mapped=window.__dash6Cards.mapCards(this._source);
   const definition=mapped.type==='custom:dash6-render-card'?mapped.definition:mapped;
   const editor=await helpers.createCardElement(definition).constructor.getConfigElement?.();
   if(token!==this._token)return;
   if(editor&&!['dash6-inline-editor','dash6-profile-editor'].includes(editor.localName)){
    editor.hass=this.hass;await editor.setConfig(definition);
    if(token!==this._token)return;
    editor.addEventListener('config-changed',event=>{event.stopPropagation();this.save(event.detail.config);});this._nativeEditor=editor;
   }
   this._error='';
  }catch(error){if(token===this._token)this._error=String(error.message||error);}
 }
 updated(){if(this._nativeEditor)this._nativeEditor.hass=this.hass;}
 emit(config){this._config=structuredClone(config);this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:structuredClone(config)},bubbles:true,composed:true}));}
 save(card){this._source=structuredClone(card);this.emit({...this._config,[this._config.card?'card':'definition']:structuredClone(card)});}
 render(){return !this._config?html``:html`${this._error?html`<p class="error">${this._error}</p>`:''}${this._nativeEditor||''}<details ?open=${!this._nativeEditor}><summary>Alle Einstellungen der eingebetteten Karte</summary><dash6-config-editor .hass=${this.hass} ._config=${this._source} @config-changed=${e=>{e.stopPropagation();this.save(e.detail.config);}}></dash6-config-editor></details><details><summary>Container-Einstellungen</summary><dash6-config-editor .hass=${this.hass} ._config=${this._config} @config-changed=${e=>{e.stopPropagation();this.emit(e.detail.config);}}></dash6-config-editor></details>`;}
}
customElements.define('dash6-inline-editor',InlineEditor);
