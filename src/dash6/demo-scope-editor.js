import {scopedCustomElements as customElements} from './scoped-elements.js';
import {loadDemoRuntime} from './demo-runtime.js';
import {demoHass} from './demo-scope.js';
import './demo-context.js';
import './config-editor.js';

class DemoScopeEditor extends HTMLElement{
 setConfig(config){this._config=structuredClone(config);this._build();}
 set hass(hass){this._hass=hass;this._sync();}
 get hass(){return this._context;}
 connectedCallback(){this._build();}
 disconnectedCallback(){this._unsubscribe?.();this._unsubscribe=null;}
 _sync(){if(!this._hass)return;this._context=this._runtime?this._runtime.hass(this._hass):demoHass(this._hass);if(this._editor)this._editor.hass=this._context;}
 async _build(){
  if(!this._config||!this.isConnected||this._building)return;
  this._building=true;
  try{
   if(this._config.mode!=='entities'){
    this._runtime=await loadDemoRuntime();this._unsubscribe||=this._runtime.subscribe(()=>this._sync());
   }
   const helpers=await window.loadCardHelpers(),card=helpers.createCardElement(this._config.card);
   const editor=await card.constructor.getConfigElement?.()||document.createElement('dash6-config-editor');
   this._editor=editor;this._sync();
   if(editor.setConfig)await editor.setConfig(this._config.card);else editor._config=structuredClone(this._config.card);
   editor.addEventListener('config-changed',event=>{
    event.stopPropagation();this._config={...this._config,card:structuredClone(event.detail.config)};
    this.dispatchEvent(new CustomEvent('config-changed',{bubbles:true,composed:true,detail:{config:structuredClone(this._config)}}));
   });
   this.replaceChildren(editor);
  }catch(error){this.textContent='Demo-Editor: '+error.message;}
  finally{this._building=false;}
 }
}
customElements.define('dash6-demo-scope-editor',DemoScopeEditor);
