import {FanClickState} from './fan-click-state.js';

const entity='fan.wohnzimmer_ventilator_outlet';
const power='sensor.smart_switch_24040808393839510803c4e7ae0293d1_power';
const refresh='button.smart_switch_24040808393839510803c4e7ae0293d1_refresh';
const active=()=>location.pathname==='/dash-6'||location.pathname.startsWith('/dash-6/')||document.documentElement.hasAttribute('data-dash6-satin-preview');
export const fanClickState=new FanClickState();
const eligible=control=>active()&&control._config?.entity===entity;
const watchers=new WeakMap();
function watch(control){
 if(watchers.has(control))return;
 const reference=new WeakRef(control);
 const unsubscribe=fanClickState.subscribe(()=>{
  const host=reference.deref();
  if(!host||!host.isConnected){unsubscribe();if(host)watchers.delete(host);return;}
  if(eligible(host))host.requestUpdate();
 });
 watchers.set(control,unsubscribe);
}

customElements.whenDefined('dash6-glass-switch').then(()=>{
 const proto=customElements.get('dash6-glass-switch').prototype;
 if(proto._dash6FanClickFeedbackV1)return;proto._dash6FanClickFeedbackV1=true;
 const model=Object.getOwnPropertyDescriptor(proto,'model'),activate=proto.activate;
 // Lifecycle callbacks are captured at customElements.define time. Register
 // from the getter instead, so this also works as a late additive installation.
 Object.defineProperty(proto,'model',{configurable:true,get(){const raw=model.get.call(this);if(!eligible(this))return raw;watch(this);return fanClickState.visual(entity,raw,this.hass);}});
 proto.activate=async function(event){
  if(!eligible(this))return activate.call(this,event);
  event?.stopPropagation();const visual=this.model;
  if(!visual.available||this._pressTimer)return;
  if(visual.locked){this.reject();return;}
  const on=!visual.on,clickedAt=Date.now();
  const commit=async()=>{
   this.cancelPress();const current=this.model;
   if(!this.isConnected||!current.available)return;
   if(current.locked){this.reject();return;}
   const hass=this.hass,powerEntity=this._config.power_entity||power;
   // meross_lan sensors have should_poll=False and no async_update override.
   // Its Refresh button explicitly runs async_poll_full, including electricity.
   const refreshEntity=powerEntity===power?refresh:undefined;
   const seq=fanClickState.begin({entity,on,powerEntity,refreshEntity,hass,clickedAt,onRefreshError:error=>this.dispatchEvent(new CustomEvent('sensor-update-error',{detail:{error},bubbles:true,composed:true}))});
   try{
    // Explicit targets keep quick opposite clicks correct even while HA still
    // reports the previous state. The original dedicated action was fan.toggle.
    await hass.callService('fan',on?'turn_on':'turn_off',{entity_id:entity});
   }catch(error){fanClickState.finish(entity,seq);this.dispatchEvent(new CustomEvent('switch-error',{detail:{error},bubbles:true,composed:true}));}
  };
  if(this.hasAttribute('data-satin')&&this.dataset.style!=='classic'&&this._config.animation!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches){this._squeezing=true;this._pressTimer=setTimeout(commit,100);return;}
  await commit();
 };
});
