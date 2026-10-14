import {scopedCustomElements as customElements} from './scoped-elements.js';
// Three explicit fan modes, with serial state changes and no startup commands.
(() => {
 const usable=s=>s&&['on','off'].includes(s.state);
 class TripleSwitch extends HTMLElement{
  constructor(){
   super();
   this.attachShadow({mode:'open'}).innerHTML=`<style>
:host{display:block;width:120px;max-width:100%;height:44px;font:10.5px/14px system-ui;color:var(--primary-text-color);--fan-ink:var(--dash6-satin-fallback-color,#ffd65a)}
.rail{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));position:relative;isolation:isolate;width:100%;height:44px;cursor:pointer}
.track{position:absolute;inset:var(--dash6-satin-switch-track-top,3.5px) 0 auto;height:37px;box-sizing:border-box;border-radius:19px;border:var(--dash6-satin-switch-track-border,1px solid rgba(234,241,247,.2));background:var(--dash6-satin-switch-track-background,linear-gradient(145deg,rgba(255,255,255,.085),rgba(255,255,255,.015)),rgba(32,39,45,.6));box-shadow:var(--dash6-satin-switch-track-shadow,inset 0 1px 1px rgba(255,255,255,.09),inset 0 -1px 2px rgba(0,0,0,.18),0 3px 7px rgba(0,0,0,.19));backdrop-filter:var(--dash6-satin-control-filter,blur(9px));-webkit-backdrop-filter:var(--dash6-satin-control-filter,blur(9px));pointer-events:none}
.track::before,.track::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none}
.track::before{background:radial-gradient(ellipse at 38% 110%,color-mix(in srgb,var(--fan-ink) 72%,transparent),color-mix(in srgb,var(--fan-ink) 24%,transparent) 60%,transparent);opacity:.38;transition:opacity 220ms ease}
.track::after{background:var(--dash6-satin-switch-track-gloss,linear-gradient(145deg,rgba(255,255,255,.12),transparent 49%,rgba(255,255,255,.02)))}
.lens{position:absolute;z-index:1;top:calc(var(--dash6-satin-switch-track-top,3.5px) + 2.75px);left:3.5px;width:31.5px;height:31.5px;box-sizing:border-box;border-radius:50%;translate:0 0;pointer-events:none;transition:translate var(--dash6-satin-switch-duration,500ms) cubic-bezier(.22,1.16,.35,1),scale var(--dash6-satin-elastic-duration,380ms) cubic-bezier(.22,1.5,.36,1),transform 90ms ease-out}
.bowl,.rim,.shine{position:absolute;inset:0;box-sizing:border-box;border-radius:inherit;pointer-events:none}
.bowl{background:var(--dash6-satin-switch-lens-background,var(--dash6-satin-lens-background,linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,.07))));border:var(--dash6-satin-switch-lens-border,var(--dash6-satin-lens-border,1px solid rgba(255,255,255,.47)));box-shadow:var(--dash6-satin-switch-lens-shadow,inset 0 1px 2px rgba(255,255,255,.24),inset 0 -1px 1px rgba(255,255,255,.08),0 2px 5px rgba(0,0,0,.25));backdrop-filter:var(--dash6-satin-lens-filter,blur(7px) saturate(1.15));-webkit-backdrop-filter:var(--dash6-satin-lens-filter,blur(7px) saturate(1.15))}
.rim{border:1px solid color-mix(in srgb,var(--fan-ink) 32%,rgba(255,255,255,.2))}
.shine{inset:1px;background:var(--dash6-satin-switch-lens-gloss,radial-gradient(ellipse at 32% 4%,rgba(255,255,255,.28),transparent 55%))}
.icon{position:absolute;inset:0;display:grid;place-items:center;color:color-mix(in srgb,var(--fan-ink) 26%,#fff);filter:drop-shadow(0 0 3px color-mix(in srgb,var(--fan-ink) 35%,transparent))}ha-icon{--mdc-icon-size:18px}
.readout{position:absolute;left:71px;top:var(--dash6-satin-switch-track-top,3.5px);height:37px;width:45px;display:grid;place-items:center;color:rgba(244,247,250,.8);pointer-events:none}
:host([data-mode=off]) .readout{left:3.5px;width:81.5px}
:host([data-mode=off]) .track::before,:host(:not([data-mode])) .track::before{opacity:0}
:host([data-mode=off]) .icon{color:var(--dash6-icon-lens-white,rgba(248,249,251,.94));filter:none;opacity:var(--dash6-satin-switch-off-icon-opacity,.45)}
:host([data-mode=off]) .rim{border-color:rgba(240,248,255,.12)}
button{position:relative;z-index:2;width:100%;height:44px;border:0;background:transparent;padding:0;color:inherit;cursor:inherit;outline:none;-webkit-tap-highlight-color:transparent}
.rail:has(button:focus-visible) .track{outline:2px solid var(--primary-color);outline-offset:2px}
.rail[aria-disabled=true]{cursor:default;opacity:.5}
@media(hover:hover){.rail:not([aria-disabled=true]):hover .lens{scale:var(--dash6-satin-switch-hover-scale,1.07)}}
.rail:not([aria-disabled=true]):has(button:active) .lens{scale:1;transform:scale(1.10,.86);transition-duration:90ms}
:host([data-switch-settling]) .lens{transition-property:scale,transform!important}
.error{color:var(--error-color);font:12px/16px system-ui}.error:empty{display:none}
@media(prefers-reduced-motion:reduce){*{transition:none!important}.lens{scale:1!important;transform:none!important}}
</style><div class="rail" role="radiogroup" aria-disabled="true" aria-label="Lüftermodus" aria-description="Tippen wechselt Auto, Ein, Aus. Mit Pfeiltasten direkt auswählen." data-dash6-own-group><span class="track" aria-hidden="true"></span><span class="lens" aria-hidden="true"><span class="bowl"></span><span class="rim"></span><span class="icon"><ha-icon></ha-icon></span><span class="shine"></span></span><span class="readout" aria-hidden="true"></span></div><div class="error" role="alert"></div>`;
   this._options=[['auto','Auto','mdi:autorenew'],['on','Ein','mdi:fan'],['off','Aus','mdi:power']];
   const rail=this.shadowRoot.querySelector('.rail');
   for(const [value,label]of this._options){
    const b=document.createElement('button');b.type='button';b.dataset.mode=value;b.setAttribute('role','radio');b.setAttribute('aria-label',label);b.setAttribute('aria-checked','false');b.disabled=true;b.tabIndex=-1;b.addEventListener('keydown',e=>this.key(e,value));rail.append(b);
   }
   rail.addEventListener('click',e=>{e.stopPropagation();this.select(this._options[(this._options.findIndex(x=>x[0]===this._mode)+1)%3][0]);});
  }
  connectedCallback(){this._motionState=null;this.sync();}
  setConfig(c){if(!/^(fan|switch)\./.test(c.entity||''))throw Error('Lüfter- oder Schalter-Entity auswählen.');if(c.force_switch_entity&&!/^(switch|input_boolean)\./.test(c.force_switch_entity))throw Error('Force-Schalter muss switch oder input_boolean sein.');this._config={...c};this.sync();}
  set hass(h){this._hass=h;this.sync();}get hass(){return this._hass;}
  sync(){
   if(!this._config)return;
   const a=this._hass?.states[this._config.entity],f=this._hass?.states[this._config.force_switch_entity];
   const valid=usable(a)&&usable(f),mode=usable(a)?a.state==='off'?'off':usable(f)?(f.state==='on'?'on':'auto'):null:null;
   const identity=this._config.entity+'|'+(this._config.force_switch_entity||'');
   // Rebind/initial state settles immediately. Attribute-only updates preserve an
   // in-flight CSS transition, including its continuous reversal on counterchange.
   const settle=!mode||!this._motionState||this._motionState!==identity;
   if(settle)this.setAttribute('data-switch-settling','');
   this._motionState=mode?identity:null;this._mode=mode;
   const lens=this.shadowRoot.querySelector('.lens');
   if(this.dataset.mode!==mode){
    if(mode)this.dataset.mode=mode;else delete this.dataset.mode;
    lens.style.translate=({auto:0,on:33.5,off:81.5}[mode]||0)+'px 0';lens.style.opacity=mode?'1':'0';
    const option=this._options.find(x=>x[0]===mode);
    this.shadowRoot.querySelector('.readout').textContent=option?.[1]||'—';
    this.shadowRoot.querySelector('.icon ha-icon').setAttribute('icon',option?.[2]||'mdi:fan');
   }
   this.shadowRoot.querySelector('.rail').setAttribute('aria-disabled',String(!valid||!!this._busy));
   for(const b of this.shadowRoot.querySelectorAll('button')){b.disabled=!valid||!!this._busy;b.setAttribute('aria-checked',String(b.dataset.mode===mode));b.tabIndex=b.dataset.mode===mode||!mode&&b.dataset.mode==='auto'?0:-1;}
   if(settle&&this.isConnected){getComputedStyle(lens).translate;this.removeAttribute('data-switch-settling');}
   this.title=!this._config.force_switch_entity?'Force-Schalter konfigurieren':!valid?'Lüfter oder Force-Schalter nicht verfügbar':'Lüftermodus';
  }
  async select(mode){if(this._busy||mode===this._mode||!this._options.some(x=>x[0]===mode))return;const c=this._config,h=this._hass;if(!c)return;if(!usable(h?.states[c.entity])||!usable(h?.states[c.force_switch_entity]))return;this._busy=true;this.sync();const error=this.shadowRoot.querySelector('.error');error.textContent='';try{const main=c.entity,force=c.force_switch_entity;const steps=mode==='off'?[[force,false],[main,false]]:mode==='auto'?[[force,false],[main,true]]:[[main,true],[force,true]];for(const [id,on]of steps){if(h.states[id]?.state===(on?'on':'off'))continue;await h.callService(id.split('.')[0],on?'turn_on':'turn_off',{entity_id:id});}}catch(e){error.textContent=e.message||String(e);}finally{this._busy=false;this.sync();}}
  key(e,mode){
   const opts=this._options.map(x=>x[0]);
   if([' ','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
    e.preventDefault();e.stopPropagation();
    const i=e.key==='Home'?0:e.key==='End'?2:[' ','Enter'].includes(e.key)?opts.indexOf(mode):(opts.indexOf(mode)+(['ArrowRight','ArrowDown'].includes(e.key)?1:2))%3;
    this.shadowRoot.querySelector('[data-mode="'+opts[i]+'"]').focus();this.select(opts[i]);
   }
  }
  getCardSize(){return 1;}
 }
 customElements.define('dash6-fan-mode-switch',TripleSwitch);
 class FanCard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;min-width:min(360px,calc(100vw - 32px))!important}.content{width:100%;min-width:0}.content>*{display:block;width:100%;min-width:0}.error{color:var(--error-color)}</style><div class="content"></div><div class="error" role="alert"></div>';}
  static getConfigElement(){const e=document.createElement('dash6-basic-editor');e.schema=[{name:'entity',label:'Haupt-Entity des Lüfters',selector:{entity:{domain:['fan','switch']}}},{name:'force_switch_entity',label:'Force-Schalter für Dauerbetrieb',selector:{entity:{domain:['switch','input_boolean']}}},{name:'name',label:'Name',selector:{text:{}}},{name:'power_entity',label:'Leistungssensor',selector:{entity:{domain:'sensor'}}},{name:'energy_entity',label:'Energiesensor',selector:{entity:{domain:'sensor'}}}];return e;}
  async setConfig(c){this._config=structuredClone(c);const token=this._token=(this._token||0)+1;let d=structuredClone(c.definition||{type:'custom:button-card',entity:c.entity,name:c.name||'Lüfter',show_icon:false,show_state:true,custom_fields:{},styles:{grid:[{'grid-template-areas':'"device n" "device s"'},{'grid-template-columns':'132px minmax(0,1fr)'}],card:[{padding:'12px'}]}});d.entity=c.entity;d.custom_fields??={};if(c.name){d.variables={...d.variables,dash6_fan_name:c.name};d.custom_fields.title='[[[ return variables.dash6_fan_name; ]]]';}d.variables={...d.variables,dash6_force:c.force_switch_entity,dash6_power:c.power_entity,dash6_energy:c.energy_entity};d.custom_fields.status="[[[ const f=states[variables.dash6_force]; if(entity.state==='off')return 'Aus'; if(!f||entity.state!=='on'||!['on','off'].includes(f.state))return 'Nicht verfügbar'; return f.state==='on'?'Ein · Dauerbetrieb':'Auto'; ]]]";if(c.power_entity||c.energy_entity)d.custom_fields.values="[[[ return [variables.dash6_power,variables.dash6_energy].filter(Boolean).map(id=>{const s=states[id];return s?s.state+' '+(s.attributes.unit_of_measurement||''):'—';}).join('<br>'); ]]]";if(c.power_entity){d.custom_fields.graph={card:{type:'custom:mini-graph-card',entities:[{entity:c.power_entity}],hours_to_show:24,show:{name:false,icon:false,state:false,legend:false,labels:false},points_per_hour:2,group_by:'interval',aggregate_func:'avg',upper_bound:'~100',update_interval:900}};}if(!c.definition){d.show_name=false;d.show_state=false;d.styles.grid=[{'grid-template-areas':'"device title values" "device status values" "graph graph graph"'},{'grid-template-columns':'132px minmax(0,1fr) minmax(70px,auto)'}];d.custom_fields.title??='Lüfter';}d.custom_fields.device={card:{type:'custom:dash6-fan-mode-switch',entity:c.entity,force_switch_entity:c.force_switch_entity}};d.triggers_update=[...new Set([...(d.triggers_update||[]),c.entity,c.force_switch_entity].filter(Boolean))];for(const row of d.styles?.grid||[])if(row['grid-template-columns'])row['grid-template-columns']='132px minmax(0,1fr) minmax(70px,auto)';d.styles??={};d.styles.custom_fields??={};d.styles.custom_fields.device=[{'align-self':'start'},{'padding-left':'8px'},{'padding-top':'8px'},{'z-index':'3'}];try{const child=await window.__dash6Cards.create(d);if(token!==this._token)return;child.hass=this._hass;this._card=child;this.shadowRoot.querySelector('.content').replaceChildren(child);}catch(e){this.shadowRoot.querySelector('.error').textContent=e.message||String(e);}}
  set hass(h){this._hass=h;if(this._card)this._card.hass=h;}get hass(){return this._hass;}
  getCardSize(){return this._card?.getCardSize?.()||3;}
 }
 customElements.whenDefined('button-card').then(()=>{const p=customElements.get('button-card').prototype;if(p._fanTripleGeometry)return;p._fanTripleGeometry=true;const old=p.updated;p.updated=function(...args){const result=old?.apply(this,args);if(this._config?.custom_fields?.device?.card?.type==='custom:dash6-fan-mode-switch'){const r=this.shadowRoot;r?.querySelector('#device')?.setAttribute('data-dash6-triple-device','');if(r&&!r.querySelector('#fan-triple-geometry')){const style=document.createElement('style');style.id='fan-triple-geometry';style.textContent=':host #container#container{grid-template-columns:132px minmax(0,1fr) minmax(70px,auto)!important}:host #device#device[data-dash6-triple-device]{padding:8px 0 0 8px!important}';r.append(style);}}return result;};});
 customElements.define('dash6-fan-card',FanCard);window.customCards??=[];window.customCards.push({type:'dash6-fan-card',name:'Liquid Glass Lüfter · Auto / Ein / Aus',description:'Dreistufiger Lüfter mit konfigurierbarem Force-Schalter',preview:true});
})();
