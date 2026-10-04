import {inDashboardScope} from './scope.js';
import {LitElement,html,css} from 'lit';
import {switchVisual,childLocked,vendorLockAllowsSwitch} from './glass-switch.js';
import {bindSatinMode,unbindSatinMode} from './satin-surface.js';

// Preserve vendor actions by dispatching their existing `action` event at the
// original icon. This module never calls a Home Assistant service.
const domains=new Set(['light','switch','fan','input_boolean']);
const types=new Set(['custom:button-card','custom:mushroom-light-card','custom:mushroom-fan-card','custom:mushroom-entity-card','custom:mushroom-template-card','custom:mushroom-legacy-template-card']);
const pointerEvents=['pointerdown','pointerup','pointermove','mousedown','mouseup','touchstart','touchend','touchcancel','click','dblclick','contextmenu'];
const hasAction=a=>!!a&&a.action!=='none';
const momentaryActions=['press_action','release_action','icon_press_action','icon_release_action'];
function lockGatedToggleEntity(action,entity){
 // Recognize only the existing entity-specific lock/toggle expression. Never
 // evaluate JavaScript templates, infer unrelated helpers, or change the action.
 const match=typeof action?.action==='string'&&action.action.match(/^\[\[\[\s*return\s+states\[\s*(['"])([a-z0-9_]+\.[a-z0-9_]+)\1\s*\]\s*\?\.\s*state\s*===\s*(['"])on\3\s*\?\s*(['"])none\4\s*:\s*(['"])toggle\5\s*;?\s*\]\]\]$/);
 return match&&match[2]===entity+'_child_lock'?match[2]:null;
}
function actionIsOnOff(action,entity){
 if(action?.action==='toggle')return true;
 if(!['call-service','perform-action'].includes(action?.action))return false;
 const service=action.service||action.perform_action,domain=entity.split('.')[0];
 if(![domain+'.toggle',domain+'.turn_on',domain+'.turn_off'].includes(service))return false;
 const targets=action.target?.entity_id??action.service_data?.entity_id??action.data?.entity_id;
 return targets===undefined||targets===entity||Array.isArray(targets)&&targets.length===1&&targets[0]===entity;
}
export function nativeSwitchPlan(config,lockTogglePlan=null){
 if(!types.has(config?.type)||!domains.has(config.entity?.split('.')[0])||config.show_icon===false||config.icon_type==='none'||config.entity_picture||config.picture||config.show_entity_picture||config.show_live_stream)return null;
 // Vendor lock overlays do not guard their action handler again. An added
 // keyboard-focusable switch must never bypass an active or unresolved lock.
 if(!vendorLockAllowsSwitch(config))return null;
 if(config.type==='custom:button-card'&&momentaryActions.some(key=>hasAction(config[key])))return null;
 const tileTemplate=config.type==='custom:mushroom-template-card';
 const iconActions=tileTemplate||['icon_tap_action','icon_hold_action','icon_double_tap_action'].some(k=>config[k]&&config[k].action!=='none');
 const tap=iconActions?config.icon_tap_action:config.tap_action;
 const implicitTileIcon=tileTemplate&&!Object.hasOwn(config,'icon_tap_action');
 // Only Button, Mushroom Light and Mushroom Fan supply a native toggle default.
 const implicit=!tap&&['custom:button-card','custom:mushroom-light-card','custom:mushroom-fan-card'].includes(config.type);
 const knownLock=lockTogglePlan?.version===1&&lockTogglePlan.entity===config.entity&&lockTogglePlan.child_lock_entity===config.entity+'_child_lock'?lockTogglePlan.child_lock_entity:null;
 const child_lock_entity=config.type==='custom:button-card'&&!iconActions?(lockGatedToggleEntity(tap,config.entity)||(['none','toggle'].includes(tap?.action)?knownLock:null)):null;
 if(!implicit&&!implicitTileIcon&&!child_lock_entity&&!actionIsOnOff(tap,config.entity))return null;
 return {entity:config.entity,iconActions,implicitTileIcon,hold:iconActions?config.icon_hold_action:config.hold_action,doubleTap:iconActions?config.icon_double_tap_action:config.double_tap_action,...(child_lock_entity?{child_lock_entity}:{})};
}
export function wrapSatinNativeConfig(config){
 const plan=nativeSwitchPlan(config);
 // An outer Button Card evaluates all nested templates before creating their
 // cards. Preserve only the already recognized relationship outside the vendor
 // definition; the native tap action itself remains exactly as supplied.
 return plan?{type:'custom:dash6-satin-native-card',definition:structuredClone(config),...(plan.child_lock_entity?{lock_toggle:{version:1,entity:plan.entity,child_lock_entity:plan.child_lock_entity}}:{})}:config;
}
function iconFor(config,icon,hass){
 const state=hass?.states?.[config.entity];
 const candidates=[config.icon,icon.icon,icon.querySelector?.('ha-state-icon,ha-icon')?.icon,icon.shadowRoot?.querySelector('ha-icon')?.icon,state?.attributes?.icon];
 const explicit=candidates.find(x=>typeof x==='string'&&x&&!['[[[','{{','{%'].some(marker=>x.includes(marker)));
 return explicit||({light:'mdi:lightbulb',fan:'mdi:fan',switch:'mdi:toggle-switch',input_boolean:'mdi:toggle-switch'}[config.entity.split('.')[0]]);
}
function findIcon(host,config){
 const root=host.shadowRoot;if(!root)return null;
 return config.type==='custom:button-card'?root.querySelector('#icon'):root.querySelector('mushroom-shape-icon[slot="icon"],ha-state-icon[slot="icon"],ha-icon[slot="icon"],ha-tile-icon');
}
function dispatchAction(host,icon,action){
 // The native listener must run before the event is stopped at its card host.
 // This avoids an outer card action, without bypassing vendor PIN/confirmation,
 // templates, haptics, service configuration, or the native hold/double-tap path.
 const stop=e=>e.stopPropagation();host.addEventListener('action',stop);
 try{return icon.dispatchEvent(new CustomEvent('action',{detail:{action},bubbles:true,composed:true,cancelable:true}));}
 finally{host.removeEventListener('action',stop);}
}
const iconCSS=`
#card[data-dash6-satin-native-compact]{width:88px!important;min-width:88px!important;height:44px!important;min-height:44px!important;padding:0!important;overflow:visible!important}
#img-cell[data-dash6-satin-native]{width:88px!important;min-width:88px!important;height:44px!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;overflow:visible!important}
#img-cell[data-dash6-satin-native]>dash6-glass-switch{position:relative!important;display:inline-block!important}
`;
function protectedVendorAncestor(host){
 for(let node=host;node;node=node.assignedSlot||node.parentNode||node.host){
  const config=node._config?.definition||node._definition||node._config;
  if(config&&(config.type==='custom:button-card'||node.localName==='button-card')&&!vendorLockAllowsSwitch({...config,type:'custom:button-card'}))return true;
 }
 return false;
}
export function bindSatinNativeCard(host,definition,{iconElement,dispatchNativeAction,resolveColor,lockTogglePlan=null}={}){
 let config=definition,plan=null,original=null,control=null,display='',style=null,compactFrame=null,holdTimer=0,tapTimer=0,holding=false,down=false,disposed=false;
 const active=()=>inDashboardScope()&&getComputedStyle(host).getPropertyValue('--dash6-satin-enabled').trim()==='1';
 const stop=e=>e.stopPropagation();
 function clearTimers(){clearTimeout(holdTimer);clearTimeout(tapTimer);holdTimer=tapTimer=0;holding=down=false;}
 function restore(){clearTimers();if(original){original.style.display=display;original.removeAttribute('data-dash6-satin-native-original');original.parentElement?.removeAttribute('data-dash6-satin-native');}compactFrame?.removeAttribute('data-dash6-satin-native-compact');compactFrame=null;control?.remove();control=null;original=null;style?.remove();style=null;}
 function send(action){
  if(!active()||!control?.model.available||control.model.locked)return;
  // Recheck a newly enabled vendor lock/momentary action even if its render and
  // adapter synchronization have not run yet during a pending gesture.
  const currentConfig={...definition,...host._config,type:definition.type},currentPlan=nativeSwitchPlan(currentConfig,lockTogglePlan);
  if(!currentPlan||protectedVendorAncestor(host))return;
  const states=(host.hass||host._hass)?.states||{},lockEntity=currentConfig.child_lock_entity||currentPlan.child_lock_entity||nativeSwitchPlan(definition,lockTogglePlan)?.child_lock_entity;
  if(childLocked({...currentConfig,child_lock_entity:lockEntity},states))return;
  try{const result=dispatchNativeAction?dispatchNativeAction(action,{host,icon:original,config}):dispatchAction(host,original,action);Promise.resolve(result).catch(error=>host.dispatchEvent(new CustomEvent('switch-error',{detail:{error},bubbles:true,composed:true})));}
  catch(error){host.dispatchEvent(new CustomEvent('switch-error',{detail:{error},bubbles:true,composed:true}));}
 }
 function mount(icon){
  restore();original=icon;display=icon.style.display;icon.style.display='none';icon.setAttribute('data-dash6-satin-native-original','');
  control=document.createElement('dash6-glass-switch');control.managed=true;control.dataset.nativeAdapter='';control.style.pointerEvents='auto';
  if(icon.slot)control.slot=icon.slot;
  icon.after(control);
  if(config.type==='custom:button-card'){
   icon.parentElement.setAttribute('data-dash6-satin-native','');style=document.createElement('style');style.textContent=iconCSS;host.shadowRoot.append(style);
   // Only dedicated 42px icon subcards need a wider frame. Full native cards
   // retain their original size, layout, and surrounding controls.
   const dimensions=Object.assign({},...(config.styles?.card||[]));
   if(config.show_name===false&&config.show_state===false&&dimensions.width==='42px'&&dimensions.height==='42px'){
    compactFrame=icon.closest('#card');compactFrame?.setAttribute('data-dash6-satin-native-compact','');
   }
  }
  for(const name of pointerEvents)control.addEventListener(name,stop);
  control.addEventListener('keydown',e=>{if([' ','Enter','ArrowLeft','ArrowRight'].includes(e.key))e.stopPropagation();});
  control.addEventListener('toggle-request',e=>{
   e.stopPropagation();
   if(holding){holding=false;return;}
   // Existing native double taps retain their delay and take precedence over tap.
   if(hasAction(plan.doubleTap)){
    if(tapTimer){clearTimeout(tapTimer);tapTimer=0;send('double_tap');}
    else tapTimer=setTimeout(()=>{tapTimer=0;send('tap');},250);
   }else send('tap');
  });
  if(hasAction(plan.hold)){
   control.addEventListener('pointerdown',()=>{down=true;holding=false;holdTimer=setTimeout(()=>{if(!down)return;holding=true;send('hold');},500);});
   control.addEventListener('pointerup',()=>{down=false;clearTimeout(holdTimer);});
   for(const name of ['pointercancel','pointerleave'])control.addEventListener(name,()=>{down=false;clearTimeout(holdTimer);});
  }
 }
 function sync(next=definition){
  if(disposed)return;
  config=host._config||next;config={...next,...config,type:next.type};
  const hass=host.hass||host._hass,rawPlan=nativeSwitchPlan(next,lockTogglePlan);plan=nativeSwitchPlan(config,lockTogglePlan);
  if(!plan&&rawPlan?.child_lock_entity&&config.tap_action?.action==='none'&&hass?.states?.[rawPlan.child_lock_entity]?.state==='on'){
   // Button Card may have already resolved this one lock template to `none`.
   // Recheck every eligibility guard with the known raw action for planning only.
   plan=nativeSwitchPlan({...config,tap_action:next.tap_action},lockTogglePlan);
  }
  if(plan&&rawPlan?.child_lock_entity&&plan.entity===rawPlan.entity)plan.child_lock_entity=rawPlan.child_lock_entity;
  if(!active()||!rawPlan||!plan||protectedVendorAncestor(host)){restore();return null;}
  const icon=iconElement||findIcon(host,config);if(!icon||!icon.isConnected||plan.implicitTileIcon&&icon.localName!=='ha-tile-icon'){restore();return null;}
  if(original!==icon||!control?.isConnected)mount(icon);
  original.style.display='none';
  const switchConfig={...config,child_lock_entity:config.child_lock_entity||plan.child_lock_entity},visual=switchVisual(switchConfig,hass?.states||{},resolveColor);
  // The main entity supplies color/brightness; the native icon stays unchanged
  // even for groups. Native card backgrounds continue to open their own details.
  control.setConfig({entity:config.entity,name:config.name,icon:iconFor(config,original,hass),switch_style:'liquid_glass',child_lock:config.child_lock,child_lock_entity:switchConfig.child_lock_entity});
  const state=hass?.states?.[config.entity],brightness=Number(state?.attributes?.brightness);
  const mainBrightness=Number.isFinite(brightness)&&state?.attributes?.brightness!=null?Math.max(0,Math.min(100,brightness/2.55)):100;
  const dimmable=(state?.attributes?.supported_color_modes||[]).some(mode=>!['onoff','unknown'].includes(mode));
  control.hass=hass;control.visual={...visual,group:false,mixed:false,brightness:mainBrightness,dimmable};
  return control;
 }
 bindSatinMode(host,()=>sync());sync();
 return {sync,get control(){return control;},dispose(){disposed=true;restore();unbindSatinMode(host);}};
}
export class SatinNativeCard extends LitElement{
 static getConfigElement(){return document.createElement('dash6-satin-native-editor');}
 static properties={hass:{attribute:false},_child:{state:true},_error:{state:true}};
 static styles=css`:host{display:block;min-width:0}.error{padding:12px;color:var(--error-color)}`;
 async setConfig(config){
  this._definition=structuredClone(config.definition);this._lockTogglePlan=structuredClone(config.lock_toggle||null);this._adapter?.dispose();this._adapter=null;
  const generation=(this._generation||0)+1;this._generation=generation;
  try{const helpers=await window.loadCardHelpers();const child=await helpers.createCardElement(this._definition);if(generation!==this._generation)return;child.hass=this.hass;this._child=child;this._error='';}
  catch(error){if(generation===this._generation)this._error=error.message;}
 }
 async updated(){const child=this._child;if(!child)return;child.hass=this.hass;await child.updateComplete;if(child!==this._child||!this.isConnected)return;this._adapter??=bindSatinNativeCard(child,this._definition,{lockTogglePlan:this._lockTogglePlan});this._adapter.sync(this._definition);}
 connectedCallback(){super.connectedCallback();this.requestUpdate();}
 disconnectedCallback(){this._adapter?.dispose();this._adapter=null;super.disconnectedCallback();}
 getCardSize(){return this._child?.getCardSize?.()??3;}
 getGridOptions(){return this._definition?.grid_options??this._child?.getGridOptions?.();}
 render(){return this._error?html`<div role="alert" class="error">${this._error}</div>`:html`${this._child}`;}
}
if(!customElements.get('dash6-satin-native-card'))customElements.define('dash6-satin-native-card',SatinNativeCard);

// Forward the vendor's own editor and its complete configuration instead of
// offering a simplified replacement editor for wrapped native cards.
export class SatinNativeEditor extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});}
 set hass(value){this._hass=value;if(this._editor)this._editor.hass=value;}
 get hass(){return this._hass;}
 async setConfig(config){
  this._config=structuredClone(config);const generation=(this._generation||0)+1;this._generation=generation;
  try{
   const helpers=await window.loadCardHelpers();const card=await helpers.createCardElement(config.definition);
   const editor=await card.constructor.getConfigElement?.();if(generation!==this._generation)return;
   if(!editor)throw Error('Diese native Karte stellt keinen grafischen Editor bereit.');
   editor.hass=this._hass;editor.setConfig(config.definition);
   editor.addEventListener('config-changed',event=>{event.stopPropagation();this._config={...this._config,definition:structuredClone(event.detail.config)};this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:this._config},bubbles:true,composed:true}));});
   this._editor=editor;this.shadowRoot.replaceChildren(editor);
  }catch(error){if(generation===this._generation){const notice=document.createElement('p');notice.setAttribute('role','alert');notice.textContent=error.message;this.shadowRoot.replaceChildren(notice);}}
 }
}
if(!customElements.get('dash6-satin-native-editor'))customElements.define('dash6-satin-native-editor',SatinNativeEditor);
