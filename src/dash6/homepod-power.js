// Apple TV media power cannot connect a disconnected HomePod. Its companion
// remote owns the connection; resolve it by registry device, never by name.
(() => {
 customElements.whenDefined('hui-media-control-card').then(()=>{
  const proto=customElements.get('hui-media-control-card').prototype;if(proto._homePodPowerV2)return;proto._homePodPowerV2=true;
  const original=proto._handleClick,updated=proto.updated,disconnect=proto.disconnectedCallback;
  proto.updated=function(...args){const result=updated?.apply(this,args);if(!this._podPowerCapture){this._podPowerCapture=event=>{if(!this.hasAttribute('data-dash6-homepod'))return;const button=event.composedPath().find(n=>['turn_on','turn_off'].includes(n?.getAttribute?.('action')));if(!button)return;event.preventDefault();event.stopImmediatePropagation();void proto._handleClick.call(this,{currentTarget:button});};this.addEventListener('click',this._podPowerCapture,true);}return result;};
  proto.disconnectedCallback=function(...args){if(this._podPowerCapture)this.removeEventListener('click',this._podPowerCapture,true);this._podPowerCapture=null;return disconnect?.apply(this,args);};
  proto._handleClick=async function(event){
   const action=event.currentTarget?.getAttribute('action');
   if(!this.hasAttribute('data-dash6-homepod')||!['turn_on','turn_off'].includes(action))return original?.call(this,event);
   const hass=this.hass||this._hass,id=this._config.entity,entry=hass.entities?.[id],explicit=this._config.homepod_remote_entity;
   const remote=explicit?.startsWith('remote.')&&hass.states[explicit]?explicit:entry?.device_id&&entry.platform==='apple_tv'?Object.values(hass.entities||{}).find(e=>e.entity_id?.startsWith('remote.')&&e.device_id===entry.device_id&&e.platform==='apple_tv'&&hass.states[e.entity_id])?.entity_id:null;
   if(!remote)return original?.call(this,event);
   const error=this.shadowRoot.querySelector('.dash6-pod-error');if(error)error.textContent='';
   try{await hass.callService('remote',action,{entity_id:remote});}
   catch(e){if(error)error.textContent=e.message||String(e);else throw e;}
  };
 });
})();
