import {scopedCustomElements as customElements} from './scoped-elements.js';
import {ikeaBackgroundGraph} from './ikea-card.js';
const unwrapFanDefinition=c=>c?.type==='custom:dash6-render-card'?unwrapFanDefinition(c.definition):c;
const fieldStyle=values=>Object.entries(values).map(([key,value])=>({[key]:value}));
const measurementTemplate=(variable,fallback)=>`[[[ const s=states[variables.${variable}]; const unit=s?.attributes?.unit_of_measurement||'${fallback}'; const value=s&&s.state!==''&&!['unknown','unavailable'].includes(s.state)&&Number.isFinite(Number(s.state))?Math.round(Number(s.state)).toLocaleString('de-DE'):'—'; return value+(unit?' '+unit:''); ]]]`;
// Keep the vendor card's actions and material, but own the two header rows and
// chart geometry. The Satin graph mapper must not replace this managed layout.
export function fanDefinition(c){
 const legacy=structuredClone(unwrapFanDefinition(c.definition)||{}),oldGraph=unwrapFanDefinition(legacy.custom_fields?.graph?.card);
 const power=c.power_entity||oldGraph?.series?.[0]?.entity||(typeof oldGraph?.entities?.[0]==='string'?oldGraph.entities[0]:oldGraph?.entities?.[0]?.entity);
 const energy=c.energy_entity||'';
 const d={...legacy,type:'custom:button-card',entity:c.entity||legacy.entity,_dash6_fan_definition:true,_dash6_satin_graph_passthrough:true,show_icon:false,show_name:false,show_state:false};
 for(const action of ['tap_action','hold_action','double_tap_action','press_action','release_action'])if(c[action])d[action]=structuredClone(c[action]);

 d.variables={...legacy.variables,dash6_fan_name:c.name||legacy.name||'',dash6_force:c.force_switch_entity,dash6_power:power,dash6_energy:energy};
 d.custom_fields={...legacy.custom_fields};
 for(const key of ['icon','device','title','status','values','power','energy','slot_1','slot_2','slot_3','graph'])delete d.custom_fields[key];
 d.custom_fields.device={card:{type:'custom:dash6-fan-mode-switch',entity:d.entity,force_switch_entity:c.force_switch_entity,timer_entity:c.timer_entity}};
 d.custom_fields.title="[[[ return variables.dash6_fan_name || entity?.attributes?.friendly_name || 'Lüfter'; ]]]";
 d.custom_fields.status="[[[ const f=states[variables.dash6_force]; if(entity?.state==='off')return 'Aus'; if(!f||entity?.state!=='on'||!['on','off'].includes(f.state))return 'Nicht verfügbar'; return f.state==='on'?'Ein · Dauerbetrieb':'Auto'; ]]]";
 if(power)d.custom_fields.power=measurementTemplate('dash6_power','W');
 if(energy)d.custom_fields.energy=measurementTemplate('dash6_energy','kWh');
 const originalSeries=oldGraph?.series?.[0],legacyMinimum=typeof oldGraph?.upper_bound==='string'?Number(oldGraph.upper_bound.replace('~','')):oldGraph?.upper_bound;
 const options={...(oldGraph?.graph_span?{span:oldGraph.graph_span}:oldGraph?.hours_to_show?{span:oldGraph.hours_to_show+'h'}:{}),...(oldGraph?.update_interval?{update_interval:typeof oldGraph.update_interval==='number'?oldGraph.update_interval+'s':oldGraph.update_interval}:{}),...(originalSeries?.group_by?.duration?{interval:originalSeries.group_by.duration}:oldGraph?.points_per_hour?{interval:60/oldGraph.points_per_hour+'min'}:{}),...(Number.isFinite(legacyMinimum)?{minimum:legacyMinimum}:{}),...(originalSeries?.color?{color:originalSeries.color}:{}),...c.graph};
 const graph=ikeaBackgroundGraph({power_entity:power,name:c.name||legacy.name||'',graph:options});
 if(graph){
  if(originalSeries){graph.series[0]={...graph.series[0],...originalSeries,entity:power,group_by:{...originalSeries.group_by,...graph.series[0].group_by}};if(originalSeries.group_by?.func)graph.series[0].group_by.func=originalSeries.group_by.func;}
  else if(oldGraph?.aggregate_func)graph.series[0].group_by.func=oldGraph.aggregate_func;
  if(c.graph?.func)graph.series[0].group_by.func=c.graph.func;
  if(oldGraph?.apex_config?.yaxis&&c.graph?.minimum===undefined)graph.apex_config.yaxis=structuredClone(oldGraph.apex_config.yaxis);
  d.custom_fields.graph={card:graph};
 }
 const managedCard=new Set(['height','min-height','max-height','padding','padding-top','padding-left','padding-right','padding-bottom','position','overflow']);
 const card=(legacy.styles?.card||[]).map(row=>Object.fromEntries(Object.entries(row).filter(([key])=>!managedCard.has(key)))).filter(row=>Object.keys(row).length);
 d.styles={...legacy.styles,card:[...fieldStyle({background:'var(--dash5-inner-background)',border:'var(--dash5-inner-border)','box-shadow':'var(--dash5-inner-shadow)','backdrop-filter':'var(--dash5-inner-filter)','-webkit-backdrop-filter':'var(--dash5-inner-filter)'}),...card,...fieldStyle({height:'118px','min-height':'118px','max-height':'118px',padding:'0',position:'relative',overflow:'hidden','border-radius':'16px'})],grid:fieldStyle({'grid-template-areas':'"device title power" "device status energy" ". . ."','grid-template-columns':'120px minmax(0,1fr) minmax(70px,auto)','grid-template-rows':'20px 17px minmax(0,1fr)','column-gap':'8px','row-gap':'0',padding:'12px','box-sizing':'border-box',width:'100%',height:'100%',position:'static','align-items':'start'}),custom_fields:{...legacy.styles?.custom_fields}};
 for(const key of ['icon','values','slot_1','slot_2','slot_3'])delete d.styles.custom_fields[key];
 const header={position:'relative','z-index':'2',background:'transparent',padding:'0','min-width':'0',width:'100%','white-space':'nowrap',overflow:'hidden','text-overflow':'ellipsis','pointer-events':'none','align-self':'start'};
 d.styles.custom_fields.device=fieldStyle({position:'relative','z-index':'3',padding:'0','grid-row':'1 / span 2','align-self':'start','justify-self':'start','--dash6-satin-switch-track-top':'0px','pointer-events':'auto'});
 d.styles.custom_fields.title=fieldStyle({...header,'text-align':'left','font-size':'16px','font-weight':'700','line-height':'20px'});
 d.styles.custom_fields.status=fieldStyle({...header,'text-align':'left','font-size':'13px','font-weight':'400','line-height':'17px',color:'var(--secondary-text-color)'});
 d.styles.custom_fields.power=fieldStyle({...header,'text-align':'right','font-size':'16px','font-weight':'700','line-height':'20px'});
 d.styles.custom_fields.energy=fieldStyle({...header,'text-align':'right','font-size':'13px','font-weight':'400','line-height':'17px',color:'var(--secondary-text-color)'});
 d.styles.custom_fields.graph=fieldStyle({position:'absolute',left:'0',right:'0',bottom:'0',width:'100%',height:'80px','z-index':'1',background:'transparent',overflow:'hidden','pointer-events':'auto',opacity:'1',padding:'0',margin:'0','grid-area':'auto'});
 const classes=[legacy.dash6_css?.class,c.dash6_css?.class,c.theme_classes,'dash6-fan-layout'].filter(Boolean).join(' ');
 d.dash6_css={...legacy.dash6_css,...c.dash6_css,class:[...new Set(classes.split(/\s+/))].join(' ')};
 d.triggers_update=legacy.triggers_update==='all'?'all':[...new Set([...(legacy.triggers_update||[]),d.entity,c.force_switch_entity,c.timer_entity,power,energy].filter(Boolean))];
 return d;
}
// Three explicit fan modes, with serial state changes and no startup commands.
(() => {
 const usable=s=>s&&['on','off'].includes(s.state);
 const durationSeconds=value=>{
  if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null;
  const match=typeof value==='string'&&value.match(/^(\d+):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/);
  return match?Number(match[1])*3600+Number(match[2])*60+Number(match[3]):null;
 };
 const countdownText=seconds=>seconds===null?'—':seconds===0?'0':seconds>=60?String(Math.ceil(seconds/60)):String(Math.ceil(Math.max(0,seconds)))+'s';
 class TripleSwitch extends HTMLElement{
  constructor(){
   super();
   this.attachShadow({mode:'open'}).innerHTML=`<style>
:host{display:block;width:120px;max-width:100%;height:44px;font:10.5px/14px system-ui;color:var(--primary-text-color);--fan-ink:var(--dash6-satin-fallback-color,#ffd65a)}
.rail{display:grid;grid-template-columns:36px 40px minmax(0,1fr);position:relative;isolation:isolate;width:100%;height:44px;cursor:pointer}
.track{position:absolute;inset:var(--dash6-satin-switch-track-top,3.5px) 0 auto;height:37px;box-sizing:border-box;border-radius:19px;border:var(--dash6-satin-switch-track-border,1px solid rgba(234,241,247,.2));background:var(--dash6-satin-switch-track-background,linear-gradient(145deg,rgba(255,255,255,.085),rgba(255,255,255,.015)),rgba(32,39,45,.6));box-shadow:var(--dash6-satin-switch-track-shadow,inset 0 1px 1px rgba(255,255,255,.09),inset 0 -1px 2px rgba(0,0,0,.18),0 3px 7px rgba(0,0,0,.19));backdrop-filter:var(--dash6-satin-control-filter,blur(9px));-webkit-backdrop-filter:var(--dash6-satin-control-filter,blur(9px));pointer-events:none}
.track::before,.track::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none}
.track::before{background:radial-gradient(ellipse at 38% 110%,color-mix(in srgb,var(--fan-ink) 72%,transparent),color-mix(in srgb,var(--fan-ink) 24%,transparent) 60%,transparent);opacity:.38;transition:opacity 220ms ease}
.track::after{background:var(--dash6-satin-switch-track-gloss,linear-gradient(145deg,rgba(255,255,255,.12),transparent 49%,rgba(255,255,255,.02)))}
.lens{position:absolute;z-index:3;top:calc(var(--dash6-satin-switch-track-top,3.5px) + 2.75px);left:3.5px;width:31.5px;height:31.5px;box-sizing:border-box;border-radius:50%;translate:0 0;pointer-events:auto;transition:translate var(--dash6-satin-switch-duration,500ms) cubic-bezier(.22,1.16,.35,1),scale var(--dash6-satin-elastic-duration,380ms) cubic-bezier(.22,1.5,.36,1),transform 90ms ease-out}
.rolling{position:absolute;inset:0;border-radius:inherit;rotate:var(--fan-roll,0deg);transition:rotate var(--dash6-satin-switch-duration,500ms) cubic-bezier(.22,1.16,.35,1)}
.bowl,.rim,.shine{position:absolute;inset:0;box-sizing:border-box;border-radius:inherit;pointer-events:none}
.bowl{background:var(--dash6-satin-switch-lens-background,var(--dash6-satin-lens-background,linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,.07))));border:var(--dash6-satin-switch-lens-border,var(--dash6-satin-lens-border,1px solid rgba(255,255,255,.47)));box-shadow:var(--dash6-satin-switch-lens-shadow,inset 0 1px 2px rgba(255,255,255,.24),inset 0 -1px 1px rgba(255,255,255,.08),0 2px 5px rgba(0,0,0,.25));backdrop-filter:var(--dash6-satin-lens-filter,blur(7px) saturate(1.15));-webkit-backdrop-filter:var(--dash6-satin-lens-filter,blur(7px) saturate(1.15))}
.rim{border:1px solid color-mix(in srgb,var(--fan-ink) 32%,rgba(255,255,255,.2))}
.shine{inset:1px;background:var(--dash6-satin-switch-lens-gloss,radial-gradient(ellipse at 32% 4%,rgba(255,255,255,.28),transparent 55%))}
.icon{position:absolute;inset:0;display:grid;place-items:center;color:color-mix(in srgb,var(--fan-ink) 26%,#fff);filter:drop-shadow(0 0 3px color-mix(in srgb,var(--fan-ink) 35%,transparent))}ha-icon{--mdc-icon-size:18px}
.countdown{position:absolute;inset:0;display:none;place-items:center;font:600 10.5px/1 system-ui;color:rgba(248,249,251,.94)}
:host([data-mode=on]) .countdown{display:grid}:host([data-mode=on]) .icon{display:none}
.readout{position:absolute;left:71px;top:var(--dash6-satin-switch-track-top,3.5px);height:37px;width:45px;display:grid;place-items:center;color:rgba(244,247,250,.8);pointer-events:none}
:host([data-mode=off]) .readout{left:3.5px;width:81.5px}
:host([data-mode=off]) .track::before,:host(:not([data-mode])) .track::before{opacity:0}
:host([data-mode=off]) .icon{color:var(--dash6-icon-lens-white,rgba(248,249,251,.94));filter:none;opacity:var(--dash6-satin-switch-off-icon-opacity,.45)}
:host([data-mode=off]) .rim{border-color:rgba(240,248,255,.12)}
button{position:relative;z-index:2;width:100%;height:44px;border:0;background:transparent;padding:0;color:inherit;cursor:inherit;outline:none;-webkit-tap-highlight-color:transparent}
.ghost{position:absolute;top:calc(var(--dash6-satin-switch-track-top,3.5px) + 2.75px);left:3.5px;width:31.5px;height:31.5px;box-sizing:border-box;border-radius:50%;display:grid;place-items:center;font:600 10px/1 system-ui;color:rgba(248,249,251,.8);border:1px solid rgba(234,241,247,.28);background:var(--dash6-satin-switch-lens-background,var(--dash6-satin-lens-background,linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,.07))));box-shadow:inset 0 1px 2px rgba(255,255,255,.12),0 1px 3px rgba(0,0,0,.2);opacity:0;scale:.92;transition:opacity 150ms ease,scale var(--dash6-satin-elastic-duration,380ms) cubic-bezier(.22,1.5,.36,1);pointer-events:auto}
button[data-mode=on] .ghost{left:1px}button[data-mode=off] .ghost{left:9px}
button[aria-checked=true] .ghost{visibility:hidden}
.rail:not([aria-disabled=true]):is(:hover,:focus-within) .ghost{opacity:.72;scale:1}
.rail:not([aria-disabled=true]):is(:hover,:focus-within) .readout{opacity:0}
button:not(:disabled):is(:hover,:focus-visible) .ghost{opacity:1;border-color:rgba(248,249,251,.65)}
.rail:has(button:focus-visible) .track{outline:2px solid var(--primary-color);outline-offset:2px}
.rail[aria-disabled=true]{cursor:default;opacity:.5}
@media(hover:hover){.rail:not([aria-disabled=true]) .lens:hover{scale:var(--dash6-satin-switch-hover-scale,1.07)}}
:host([data-pressed=auto]) button[data-mode=auto] .ghost,:host([data-pressed=on]) button[data-mode=on] .ghost,:host([data-pressed=off]) button[data-mode=off] .ghost{opacity:1;background:rgba(10,14,19,.48);box-shadow:var(--dash6-satin-switch-pressed-shadow,inset 0 4px 7px rgba(0,0,0,.7),inset 0 -1px 1px rgba(255,255,255,.14));scale:1}
:host([data-pressed=auto][data-mode=auto]) .bowl,:host([data-pressed=on][data-mode=on]) .bowl,:host([data-pressed=off][data-mode=off]) .bowl{box-shadow:var(--dash6-satin-switch-pressed-shadow,inset 0 4px 7px rgba(0,0,0,.7),inset 0 -1px 1px rgba(255,255,255,.14))}
:host([data-switch-settling]) .lens{transition-property:scale,transform!important}:host([data-switch-settling]) .rolling{transition:none!important}
.error{color:var(--error-color);font:12px/16px system-ui}.error:empty{display:none}
@media(prefers-reduced-motion:reduce){*{transition:none!important}.lens{scale:1!important;transform:none!important}}

:host([data-pressed=auto]) button[data-mode=auto]:not([aria-checked=true]) .ghost,:host([data-pressed=on]) button[data-mode=on]:not([aria-checked=true]) .ghost,:host([data-pressed=off]) button[data-mode=off]:not([aria-checked=true]) .ghost{opacity:1!important;background:rgba(10,14,19,.48)!important;box-shadow:inset 0 4px 7px rgba(0,0,0,.7),inset 0 -1px 1px rgba(255,255,255,.14)!important}
/* Equal targets; the confirmed active mode owns the first slot. */
.rail{grid-template-columns:repeat(3,40px)}
button{position:absolute;left:calc(var(--slot,0)*40px);width:40px;transition:none}
.ghost,button[data-mode=on] .ghost,button[data-mode=off] .ghost{left:4.25px;opacity:.4;scale:1;background:transparent;box-shadow:none;border:1px solid rgba(234,241,247,.45);visibility:visible}
button[aria-checked=true] .ghost{opacity:1;background:var(--dash6-satin-switch-lens-background,linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,.07)));box-shadow:var(--dash6-satin-switch-lens-shadow,inset 0 1px 2px rgba(255,255,255,.24),0 2px 5px rgba(0,0,0,.25))}
.rail:not([aria-disabled=true]):is(:hover,:focus-within) .ghost{opacity:.4;scale:1}
.rail:not([aria-disabled=true]) button:not(:disabled):is(:hover,:focus-visible) .ghost{opacity:.8;background:rgba(255,255,255,.08);box-shadow:inset 0 1px 1px rgba(255,255,255,.13),0 1px 2px rgba(0,0,0,.2)}
button[aria-checked=true] .ghost,.rail:not([aria-disabled=true]):is(:hover,:focus-within) button[aria-checked=true] .ghost{opacity:1}
.lens{left:4.25px;pointer-events:none;opacity:0!important;transition:translate var(--dash6-satin-switch-duration,500ms) ease-in-out}
.lens .icon,.lens .countdown,.readout{display:none!important}
:host([data-phase=collect]) .lens,:host([data-phase=carry]) .lens{opacity:1!important}
:host([data-phase=raise]) .ghost{transition:none!important}
:host([data-phase=raise]) button:not([aria-checked=true]) .ghost,:host([data-phase=collect]) button:not([aria-checked=true]) .ghost,:host([data-phase=carry]) button:not([aria-checked=true]) .ghost{opacity:0!important;background:transparent;box-shadow:none}
:host([data-phase=carry]) button[aria-checked=true]{transition:left var(--dash6-satin-switch-duration,500ms) ease-in-out}
:host([data-pressed]) button[aria-checked=true] .ghost{box-shadow:var(--dash6-satin-switch-lens-shadow,inset 0 1px 2px rgba(255,255,255,.24),0 2px 5px rgba(0,0,0,.25))}
</style><div class="rail" role="radiogroup" aria-disabled="true" aria-label="Lüftermodus" aria-description="Auto, zeitbegrenztes Ein oder Aus direkt auswählen. Pfeiltasten wechseln den Modus." data-dash6-own-group><span class="track" aria-hidden="true"></span><span class="lens" aria-hidden="true"><span class="rolling"><span class="bowl"></span><span class="rim"></span><span class="shine"></span></span><span class="icon"><ha-icon></ha-icon></span><span class="countdown"></span></span><span class="readout" aria-hidden="true"></span></div><div class="error" role="alert"></div>`;
   this._options=[['auto','Auto','mdi:autorenew'],['on','Ein','mdi:fan'],['off','Aus','mdi:power']];
   const rail=this.shadowRoot.querySelector('.rail');
   for(const [value,label]of this._options){
    const b=document.createElement('button');b.type='button';b.dataset.mode=value;b.setAttribute('role','radio');b.setAttribute('aria-label',label);b.setAttribute('aria-checked','false');b.title=label;const ghost=document.createElement('span');ghost.className='ghost';ghost.dataset.mode=value;ghost.setAttribute('aria-hidden','true');ghost.textContent=value==='auto'?'Auto':value==='on'?'60':'0';b.append(ghost);b.disabled=true;b.tabIndex=-1;b.addEventListener('keydown',e=>this.key(e,value));b.addEventListener('keyup',e=>this.releaseKey(e));b.addEventListener('blur',()=>{if(this._pressedKey)this.cancelPress();});rail.append(b);
   }
   rail.addEventListener('pointerdown',e=>this.pressPointer(e));
   for(const type of ['pointerup','pointercancel','mousedown','mouseup','touchstart','touchend','touchcancel','keydown','keyup'])rail.addEventListener(type,e=>e.stopPropagation());
   rail.addEventListener('click',e=>{e.stopPropagation();if(this._cancelledPointer&&e.detail>0){this._cancelledPointer=false;return;}this._cancelledPointer=false;const mode=this.eventMode(e);this.cancelPress();if(mode)this.select(mode);});
   this._releasePointer=e=>{if(e.pointerId!==this._pressedPointer)return;if(e.type==='pointercancel')this._cancelledPointer=true;this.cancelPress();};
  }
  connectedCallback(){this._motionState=null;this._reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');this._motionChange=()=>{if(this._reduceMotion.matches)this.settleSlots(this._mode);};this._reduceMotion.addEventListener('change',this._motionChange);this.sync();}
  disconnectedCallback(){this._reduceMotion?.removeEventListener('change',this._motionChange);this.cancelJourney();this.stopTimer();this.cancelPress();this.clearPending();}
  setConfig(c){if(!/^(fan|switch)\./.test(c.entity||''))throw Error('Lüfter- oder Schalter-Entity auswählen.');if(c.force_switch_entity&&!/^(switch|input_boolean)\./.test(c.force_switch_entity))throw Error('Force-Schalter muss switch oder input_boolean sein.');if(c.timer_entity&&!/^timer\./.test(c.timer_entity))throw Error('Timer-Entity auswählen.');if(this._config&&(this._config.entity!==c.entity||this._config.force_switch_entity!==c.force_switch_entity))this.clearPending();this._config={...c};this.sync();}
  set hass(h){this._hass=h;this.sync();}get hass(){return this._hass;}
  sync(){
   if(!this._config)return;
   const a=this._hass?.states[this._config.entity],f=this._hass?.states[this._config.force_switch_entity];
   const valid=usable(a)&&usable(f),actualMode=usable(a)?a.state==='off'?'off':usable(f)?(f.state==='on'?'on':'auto'):null:null;
   let mode=actualMode;
   if(this._pendingMode){
    const target=this._pendingMode.target,reached=valid&&a.state===(target==='off'?'off':'on')&&f.state===(target==='on'?'on':'off');
    if(!valid||reached&&!this._busy)this.clearPending();else mode=this._pendingMode.from;
   }
   const identity=this._config.entity+'|'+(this._config.force_switch_entity||'');
   // Rebind/initial state settles immediately. Attribute-only updates preserve an
   // in-flight CSS transition, including its continuous reversal on counterchange.
   const settle=!mode||!this._motionState||this._motionState!==identity;
   if(settle)this.setAttribute('data-switch-settling','');
   this._motionState=mode?identity:null;this._mode=mode;
   const lens=this.shadowRoot.querySelector('.lens');
   if(settle)this.settleSlots(mode);
   if(this.dataset.mode!==mode){
    if(mode)this.dataset.mode=mode;else delete this.dataset.mode;
    if(settle||!mode)this.settleSlots(mode);else this.journey(mode);
    const option=this._options.find(x=>x[0]===mode);
    this.shadowRoot.querySelector('.readout').textContent=option?.[1]||'—';
    this.shadowRoot.querySelector('.icon ha-icon').setAttribute('icon',option?.[2]||'mdi:fan');
   }
   const waiting=!!this._busy||!!this._pendingMode;
   this.shadowRoot.querySelector('.rail').setAttribute('aria-disabled',String(!valid||waiting));
   this.shadowRoot.querySelector('.rail').setAttribute('aria-busy',String(waiting));
   if(!valid||waiting)this.cancelPress();
   for(const b of this.shadowRoot.querySelectorAll('button')){b.disabled=!valid||waiting;b.setAttribute('aria-checked',String(b.dataset.mode===mode));b.tabIndex=b.dataset.mode===mode||!mode&&b.dataset.mode==='auto'?0:-1;}
   if(settle&&this.isConnected){getComputedStyle(lens).translate;this.removeAttribute('data-switch-settling');}
   this.updateCountdown();this.syncTimer();
   this.title=!this._config.force_switch_entity?'Force-Schalter konfigurieren':!valid?'Lüfter oder Force-Schalter nicht verfügbar':'Lüftermodus';
  }
  cancelJourney(){this._journeyToken=(this._journeyToken||0)+1;for(const id of this._phaseTimers||[])clearTimeout(id);this._phaseTimers=[];delete this.dataset.phase;}
  slotOrder(mode){return [mode,...this._options.map(x=>x[0]).filter(x=>x!==mode)].filter(Boolean);}
  settleSlots(mode){this.cancelJourney();this._order=this.slotOrder(mode);for(const b of this.shadowRoot.querySelectorAll('button'))b.style.setProperty('--slot',Math.max(0,this._order.indexOf(b.dataset.mode)));this.shadowRoot.querySelector('.lens').style.translate='0px 0';}
  journey(mode){
   if(matchMedia('(prefers-reduced-motion: reduce)').matches){this.settleSlots(mode);return;}
   this.cancelJourney();const token=this._journeyToken,lens=this.shadowRoot.querySelector('.lens'),buttons=[...this.shadowRoot.querySelectorAll('button')],target=buttons.find(b=>b.dataset.mode===mode),slot=Number(target.style.getPropertyValue('--slot'))||0;
   const duration=parseFloat(getComputedStyle(this).getPropertyValue('--dash6-satin-switch-duration'))||500;
   const later=(ms,fn)=>this._phaseTimers.push(setTimeout(()=>{if(this._journeyToken===token)fn();},ms));
   this.dataset.phase='raise';lens.style.translate='0px 0';
   later(160,()=>{this.dataset.phase='collect';lens.style.translate=(slot*40)+'px 0';});
   later(160+duration,()=>{this.dataset.phase='carry';this._order=this.slotOrder(mode);for(const b of buttons)b.style.setProperty('--slot',this._order.indexOf(b.dataset.mode));lens.style.translate='0px 0';});
   later(160+duration*2,()=>{this.dataset.phase='reveal';later(160,()=>{delete this.dataset.phase;});});
  }
  timerSeconds(){
   if(!this._config?.timer_entity)return 3600;
   const timer=this._hass?.states[this._config.timer_entity];
   if(timer?.state==='idle')return 0;
   if(timer?.state==='paused')return durationSeconds(timer.attributes?.remaining);
   if(timer?.state==='active'){
    const end=Date.parse(timer.attributes?.finishes_at);
    return Number.isFinite(end)?Math.max(0,(end-Date.now())/1000):null;
   }
   return null;
  }
  updateCountdown(){
   const seconds=this.timerSeconds(),text=countdownText(seconds),countdown=this.shadowRoot.querySelector('.countdown');
   if(countdown.textContent!==text)countdown.textContent=text;
   const duration=durationSeconds(this._hass?.states[this._config?.timer_entity]?.attributes?.duration)??3600;
   const preview=countdownText(duration),ghost=this.shadowRoot.querySelector('.ghost[data-mode=on]');
   const shown=this._mode==='on'?text:preview;if(ghost.textContent!==shown)ghost.textContent=shown;
   const on=this.shadowRoot.querySelector('button[data-mode=on]');
   const remaining=seconds===null?'Restzeit nicht verfügbar':seconds>=60?Math.ceil(seconds/60)+' Minuten Restzeit':Math.ceil(Math.max(0,seconds))+' Sekunden Restzeit';
   const title=this._mode==='on'?'Ein · '+remaining:'Ein · '+Math.ceil(duration/60)+' Minuten',label=this._mode==='on'?'Ein · '+remaining:'Ein';
   if(on.title!==title)on.title=title;
   if(on.getAttribute('aria-label')!==label)on.setAttribute('aria-label',label);
  }
  syncTimer(){
   const timer=this._hass?.states[this._config?.timer_entity];
   const active=this.isConnected&&timer?.state==='active'&&Number.isFinite(Date.parse(timer.attributes?.finishes_at));
   if(active&&!this._timerInterval)this._timerInterval=setInterval(()=>this.updateCountdown(),1000);
   else if(!active)this.stopTimer();
  }
  stopTimer(){if(this._timerInterval){clearInterval(this._timerInterval);this._timerInterval=null;}}
  clearPending(){clearTimeout(this._feedbackTimer);this._feedbackTimer=null;this._pendingMode=null;}
  async select(mode){
   if(this._busy||this._pendingMode||!this._options.some(x=>x[0]===mode))return;
   const c=this._config,h=this._hass;if(!c||!usable(h?.states[c.entity])||!usable(h?.states[c.force_switch_entity]))return;
   if(h.states[c.entity].state===(mode==='off'?'off':'on')&&h.states[c.force_switch_entity].state===(mode==='on'?'on':'off'))return;
   this.clearPending();this._pendingMode={target:mode,from:this._mode};this._busy=true;this.sync();
   const error=this.shadowRoot.querySelector('.error');error.textContent='';
   try{
    const main=c.entity,force=c.force_switch_entity;
    const steps=mode==='off'?[[force,false],[main,false]]:mode==='auto'?[[force,false],[main,true]]:[[main,true],[force,true]];
    for(const [id,on]of steps){if(h.states[id]?.state===(on?'on':'off'))continue;await h.callService(id.split('.')[0],on?'turn_on':'turn_off',{entity_id:id});}
   }catch(e){this.clearPending();this._motionState=null;error.textContent=e.message||String(e);}
   finally{
    this._busy=false;this.sync();
    // Service acknowledgements may precede the final state publish. Hold the
    // previous real position until the complete pair arrives; never invent On.
    if(this._pendingMode&&this.isConnected)this._feedbackTimer=setTimeout(()=>{this.clearPending();this._motionState=null;this.sync();},1500);
   }
  }
  eventMode(e){return e.target.closest('button')?.dataset.mode||(e.target.closest('.lens')?this._mode:null);}
  pressPointer(e){
   e.stopPropagation();
   if(e.button!==0||this._busy||this.shadowRoot.querySelector('.rail').getAttribute('aria-disabled')==='true')return;
   const mode=this.eventMode(e);if(!mode)return;
   this.cancelPress();this._cancelledPointer=false;this._pressedPointer=e.pointerId;this.dataset.pressed=mode;
   window.addEventListener('pointerup',this._releasePointer,true);window.addEventListener('pointercancel',this._releasePointer,true);
  }
  cancelPress(){
   delete this.dataset.pressed;this._pressedKey=null;this._pressedPointer=null;
   window.removeEventListener('pointerup',this._releasePointer,true);window.removeEventListener('pointercancel',this._releasePointer,true);
  }
  key(e,mode){
   const opts=this._order||this._options.map(x=>x[0]);
   if([' ','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){
    e.preventDefault();e.stopPropagation();if(e.repeat||this._busy||this._pendingMode||e.currentTarget.disabled)return;
    const i=e.key==='Home'?0:e.key==='End'?2:[' ','Enter'].includes(e.key)?opts.indexOf(mode):(opts.indexOf(mode)+(['ArrowRight','ArrowDown'].includes(e.key)?1:2))%3;
    this._cancelledPointer=false;const target=opts[i];this.shadowRoot.querySelector('button[data-mode="'+target+'"]').focus();
    this._pressedKey={key:e.key,mode:target};this.dataset.pressed=target;
   }
  }
  releaseKey(e){
   const press=this._pressedKey;if(!press||press.key!==e.key)return;
   e.preventDefault();e.stopPropagation();this.cancelPress();this.select(press.mode);
  }
  getCardSize(){return 1;}
 }
 customElements.define('dash6-fan-mode-switch',TripleSwitch);
 class FanCard extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;min-width:0}.content{width:100%;min-width:0}.content>*{display:block;width:100%;min-width:0}.error{color:var(--error-color)}</style><div class="content"></div><div class="error" role="alert"></div>';}
  static getConfigElement(){const e=document.createElement('dash6-basic-editor');e.schema=[{name:'entity',label:'Haupt-Entity des Lüfters',selector:{entity:{domain:['fan','switch']}}},{name:'force_switch_entity',label:'Force-Schalter für Dauerbetrieb',selector:{entity:{domain:['switch','input_boolean']}}},{name:'timer_entity',label:'Optionaler Dauerbetrieb-Timer',selector:{entity:{domain:'timer'}}},{name:'name',label:'Name',selector:{text:{}}},{name:'power_entity',label:'Leistungssensor',selector:{entity:{domain:'sensor'}}},{name:'energy_entity',label:'Energiesensor',selector:{entity:{domain:'sensor'}}}];return e;}
  async setConfig(c){
   this._config=structuredClone(c);const token=this._token=(this._token||0)+1;
   try{const child=await window.__dash6Cards.create(fanDefinition(c));if(token!==this._token)return;child.hass=this._hass;this._card=child;this.shadowRoot.querySelector('.content').replaceChildren(child);this.shadowRoot.querySelector('.error').textContent='';}
   catch(e){if(token===this._token)this.shadowRoot.querySelector('.error').textContent=e.message||String(e);}
  }
  disconnectedCallback(){const tip=document.getElementById('embedded-card-tooltip');if(tip)tip.style.display='none';}
  set hass(h){this._hass=h;if(this._card)this._card.hass=h;}get hass(){return this._hass;}
  getCardSize(){return 2;}
 }
 customElements.define('dash6-fan-card',FanCard);window.customCards??=[];window.customCards.push({type:'dash6-fan-card',name:'Liquid Glass Lüfter · Auto / Ein / Aus',description:'Dreistufiger Lüfter mit konfigurierbarem Force-Schalter',preview:true});
})();
