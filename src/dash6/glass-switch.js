import {LitElement,html,css,svg} from 'lit';
import {bindThemePreferences,unbindThemePreferences} from './material.js';

export const SWITCH_TYPES=[{value:'liquid_glass',label:'Liquid Glass · bewegliche Glaslinse'},{value:'classic',label:'Klassisches Geräteicon'}];
export const SWITCH_SCHEMA=[{name:'switch_style',label:'Schalterart',selector:{select:{options:SWITCH_TYPES,mode:'dropdown'}}},{name:'child_lock',label:'Bedienung dieser Karte sperren',selector:{boolean:{}}},{name:'child_lock_entity',label:'Kindersicherung-Entity (optional)',selector:{entity:{domain:['switch','input_boolean','binary_sensor']}}}];
export function childLocked(config,states={}){return config?.child_lock===true||Boolean(config?.child_lock_entity&&states[config.child_lock_entity]?.state!=='off');}
export const vendorLockAllowsSwitch=config=>config?.type!=='custom:button-card'||config.lock===undefined||config.lock?.enabled===false;
const usable=s=>s&&!['unknown','unavailable'].includes(s.state);
const numeric=x=>x!==null&&x!==undefined&&Number.isFinite(Number(x));
let colorResolver=()=> 'var(--state-light-active-color,var(--primary-color))';
export function setSwitchColorResolver(resolve){colorResolver=resolve;}
export function switchVisual(config,states={},colorForState=colorResolver){
 const state=states[config.entity],on=state?.state==='on',ids=[...new Set(config.member_entities?.length?config.member_entities:state?.attributes?.entity_id||[])].filter(id=>id!==config.entity),members=ids.map(id=>states[id]).filter(Boolean),active=members.filter(s=>s.state==='on');
 const colors=active.map(colorForState),mixed=active.length>0&&(active.length!==ids.length||new Set(colors).size>1||new Set(active.map(s=>s.attributes?.brightness).filter(numeric)).size>1);
 const dimmable=(state?.attributes?.supported_color_modes||[]).some(m=>!['onoff','unknown'].includes(m))||members.some(s=>(s.attributes?.supported_color_modes||[]).some(m=>!['onoff','unknown'].includes(m)));
 const brightness=numeric(state?.attributes?.brightness)?Number(state.attributes.brightness)/2.55:active.length?active.reduce((sum,s)=>sum+(numeric(s.attributes?.brightness)?Number(s.attributes.brightness)/2.55:100),0)/active.length:100;
 const supportsColor=(state?.attributes?.supported_color_modes||[]).some(m=>['hs','rgb','rgbw','rgbww','xy','color_temp'].includes(m));
 return {on,available:usable(state),locked:childLocked(config,states),group:config.group===true||ids.length>0,mixed,dimmable,brightness:Math.max(0,Math.min(100,brightness)),color:state?.entity_id?.startsWith('switch.')||config.entity?.startsWith('switch.')?'var(--state-switch-active-color,var(--primary-color))':colorForState(state),supportsColor,satinColor:supportsColor?colorForState(state):'var(--dash6-satin-fallback-color,#ffd65a)',count:active.length,total:ids.length,colors:members.map(s=>s.state==='on'?colorForState(s):'var(--secondary-text-color)'),name:config.name||state?.attributes?.friendly_name||config.entity};
}

// Replace only dedicated on/off icons; all surrounding controls and actions stay intact.
export function mapDeviceSwitches(config){
 if(!config||typeof config!=='object')return config;
 if(Array.isArray(config))return config.map(mapDeviceSwitches);
 const c=structuredClone(config);
 if(!vendorLockAllowsSwitch(c))return c; // Keep a protected parent's whole subtree native.
 const auxiliaryActions=['hold_action','double_tap_action','icon_tap_action','icon_hold_action','icon_double_tap_action','press_action','release_action','icon_press_action','icon_release_action'];
 // A vendor lock owns its complete interaction. Preserve that card whenever
 // the lock is active, templated, or unclear, including keyboard handling.
 const plainToggle=c.tap_action&&Object.keys(c.tap_action).every(key=>key==='action')&&!['confirmation','protect','pin','PIN'].some(key=>Object.hasOwn(c,key));
 const simple=c.type==='custom:button-card'&&plainToggle&&/^(light|switch|fan|input_boolean)\./.test(c.entity||'')&&c.tap_action?.action==='toggle'&&c.show_name===false&&c.show_state===false&&!Object.keys(c.custom_fields||{}).length&&auxiliaryActions.every(key=>!c[key]||c[key].action==='none');
 if(simple)return {type:'custom:dash6-glass-switch',entity:c.entity,icon:c.icon,name:c.name,switch_style:c.switch_style||'liquid_glass',child_lock:c.child_lock||false,child_lock_entity:c.child_lock_entity||''};
 const device=c.custom_fields?.device?.card;
 if(c.type==='custom:button-card'&&c.entity?.startsWith('fan.')&&device?.tap_action?.action==='toggle'){
  c.switch_style??='liquid_glass';c.child_lock??=false;c.child_lock_entity??='';
  Object.assign(device,{switch_style:c.switch_style,child_lock:c.child_lock,child_lock_entity:c.child_lock_entity});
  if(c.switch_style!=='classic'){
   c.styles.grid=c.styles.grid.map(x=>Object.hasOwn(x,'grid-template-columns')?{'grid-template-columns':'112px minmax(0,1fr) auto'}:Object.hasOwn(x,'grid-template-rows')?{'grid-template-rows':'32px 32px minmax(0,1fr)'}:x);
  }
 }
 for(const key of ['cards','card','definition','custom_fields'])if(c[key]&&typeof c[key]==='object')c[key]=mapDeviceSwitches(c[key]);
 if(!c.type)for(const [key,value]of Object.entries(c))if(value&&typeof value==='object')c[key]=mapDeviceSwitches(value);
 return c;
}

const bulb=svg`<path d="M9 18v-2.5a6.5 6.5 0 1 1 6 0V18M9 18h6M9.5 21h5"/>`;
export class GlassSwitch extends LitElement{
 static properties={hass:{attribute:false},visual:{attribute:false},managed:{attribute:false},_config:{state:true},_rejecting:{state:true},_squeezing:{state:true}};
 static styles=css`
 :host{display:inline-block;flex:none;width:104px;height:64px;vertical-align:middle;--sw-ink:var(--primary-color);--sw-y:32%;--sw-alpha:.68;--sw-travel:54px;--sw-lens:50px;color:var(--primary-text-color);contain:layout style}
 *{box-sizing:border-box}button{position:relative;display:block;width:104px;height:64px;padding:0;border:0;background:transparent;color:inherit;cursor:pointer;touch-action:manipulation;isolation:isolate;-webkit-tap-highlight-color:transparent}
 button:focus-visible{outline:3px solid var(--primary-color);outline-offset:3px;border-radius:16px}button:disabled{opacity:.45;cursor:default}
 .track{position:absolute;inset:13px 0;border-radius:999px;overflow:hidden;border:var(--dash6-switch-track-border,1px solid rgba(206,220,243,.17));background:var(--dash6-switch-track-background,radial-gradient(ellipse at 50% -45%,rgba(244,249,255,.18),transparent 75%),linear-gradient(180deg,rgba(72,82,96,.75),rgba(25,31,42,.97)));box-shadow:var(--dash6-switch-track-shadow,inset 0 2px 3px rgba(247,251,255,.12),inset 0 -3px 10px rgba(0,0,0,.28),0 6px 9px rgba(0,0,0,.19))}
 .level,.beam{position:absolute;left:0;right:var(--sw-lens);top:clamp(2px,var(--sw-y),calc(100% - 4px));pointer-events:none;transition:top 140ms ease-out,opacity 200ms ease}
 .level{height:2px;background:color-mix(in srgb,var(--sw-ink) var(--dash6-switch-line-opacity,50%),transparent);box-shadow:0 1px 5px color-mix(in srgb,var(--sw-ink) 18%,transparent)}
 .beam{bottom:0;background:linear-gradient(to bottom,color-mix(in srgb,var(--sw-ink) var(--dash6-switch-beam-opacity,34%),transparent),color-mix(in srgb,var(--sw-ink) 17%,transparent) 35%,color-mix(in srgb,var(--sw-ink) 5%,transparent) 72%,transparent)}
 .readout{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;width:54px;font-size:12px;font-weight:500;line-height:16px;font-variant-numeric:tabular-nums;text-shadow:0 1px 6px rgba(0,0,0,.35);transition:translate 500ms cubic-bezier(.22,1.18,.35,1)}
 button.off .readout{translate:50px 0}.lens{position:absolute;top:3px;left:0;width:50px;height:58px;translate:var(--sw-travel) 0;transform:rotate(4deg);border-radius:46% 52% 48% 44% / 43% 48% 53% 55%;transition:translate var(--dash6-switch-duration,620ms) cubic-bezier(.2,1.12,.25,1);filter:drop-shadow(0 6px 8px rgba(0,0,0,.2));pointer-events:none}
 button.off .lens{translate:0 0;transform:rotate(-4deg);border-radius:53% 43% 48% 47% / 48% 45% 56% 52%}
 .light,.bowl,.rim,.shine,.icon,.reject-tint{position:absolute;inset:0;border-radius:inherit;pointer-events:none}
 .light{inset:8%;background:radial-gradient(ellipse,var(--sw-ink),transparent 69%);opacity:calc(.09 + .44 * var(--sw-alpha));filter:blur(7px)}
 .bowl{border:var(--dash6-switch-lens-border,1px solid rgba(241,247,255,.29));background:var(--dash6-switch-lens-background,radial-gradient(ellipse at 38% 8%,rgba(251,253,255,.24),transparent 26%),radial-gradient(ellipse at 93% 53%,rgba(236,244,255,.1),transparent 54%),linear-gradient(143deg,rgba(218,230,245,.12),rgba(44,54,69,.04) 45%,rgba(209,225,247,.09)));backdrop-filter:var(--dash6-switch-lens-filter,blur(3px) saturate(1.35) contrast(1.12));-webkit-backdrop-filter:var(--dash6-switch-lens-filter,blur(3px) saturate(1.35) contrast(1.12));box-shadow:var(--dash6-switch-lens-shadow,inset 1px 1px 2px rgba(240,248,255,.15),inset -2px -1px 3px rgba(232,245,255,.16),inset 0 10px 14px rgba(255,255,255,.04),inset 0 -10px 15px rgba(255,255,255,.04))}
 .rim{inset:1px;border:1px solid color-mix(in srgb,var(--sw-ink) 45%,rgba(240,248,255,.12));box-shadow:inset 1px 0 3px rgba(255,255,255,.1),inset -1px -2px 7px rgba(255,255,255,.12)}
 .shine{inset:4px;background:radial-gradient(ellipse at 38% 5%,rgba(252,254,255,.23),transparent 27%);opacity:var(--dash6-switch-gloss,.8)}
 .icon{display:flex;align-items:center;justify-content:center;transform:rotate(-4deg);color:color-mix(in srgb,var(--sw-ink) 40%,var(--dash6-icon-lens-white,#fff));filter:drop-shadow(0 0 5px color-mix(in srgb,var(--sw-ink) 50%,transparent))}
 .icon svg{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:var(--dash6-switch-icon-stroke,2.8);stroke-linecap:round;stroke-linejoin:round}.icon svg.group{width:38px;height:28px}.icon ha-icon{--mdc-icon-size:24px}
 .lock{position:absolute;top:-2px;right:-3px;display:grid;place-items:center;width:19px;height:19px;border-radius:50%;background:var(--dash6-switch-lock-background,rgba(24,30,40,.82));border:1px solid rgba(240,248,255,.32);color:var(--primary-text-color);box-shadow:0 2px 5px rgba(0,0,0,.22)}.lock ha-icon{--mdc-icon-size:12px}
 .reject-tint{background:color-mix(in srgb,var(--error-color,#ff4b55) var(--dash6-switch-reject-opacity,36%),transparent);opacity:0}
 .rejecting .lens{animation:dash6-denied 480ms ease-in-out}.rejecting .reject-tint{opacity:1;animation:dash6-denied-tint 480ms linear}
 @keyframes dash6-denied{0%,100%{transform:translateX(0) rotate(4deg)}18%{transform:translateX(-7px) rotate(-2deg)}36%{transform:translateX(6px) rotate(8deg)}54%{transform:translateX(-5px) rotate(0deg)}72%{transform:translateX(3px) rotate(6deg)}88%{transform:translateX(-1px) rotate(3deg)}}
 @keyframes dash6-denied-tint{0%,85%{opacity:1}100%{opacity:0}}
 button.off .light{opacity:0}button.off .icon{color:var(--dash6-icon-lens-white,rgba(248,249,251,.94));filter:drop-shadow(0 1px 1px rgba(0,0,0,.28))}button.off .rim{border-color:rgba(240,248,255,.12)}
 .members{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;gap:3px}.members i{display:block;width:4px;height:4px;border-radius:50%}
 :host([data-style=classic]){width:48px;height:48px}:host([data-style=classic]) button{width:48px;height:48px}:host([data-style=classic]) .track,:host([data-style=classic]) .members{display:none}:host([data-style=classic]) .lens{top:2px;left:2px;width:44px;height:44px;border-radius:var(--dash6-icon-lens-radius,14px);translate:0 0;transform:none}:host([data-style=classic]) .bowl{background:var(--dash6-icon-lens-background);border:var(--dash6-icon-lens-border);box-shadow:var(--dash6-icon-lens-shadow)}
 .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
 /* Satin is opt-in. The original controls retain their dimensions and materials. */
 :host([data-satin]:not([data-style=classic])){width:88px;height:44px;--sw-travel:49.5px;--sw-lens:31.5px}
 :host([data-satin]:not([data-style=classic])) button{width:88px;height:44px}
 :host([data-satin]) .track{inset:var(--dash6-satin-switch-track-top,3.5px) 0 auto;height:37px;border-radius:19px;border:var(--dash6-satin-switch-track-border,1px solid rgba(234,241,247,.2));background:var(--dash6-satin-switch-track-background,linear-gradient(145deg,rgba(255,255,255,.085),rgba(255,255,255,.015)),rgba(32,39,45,.6));box-shadow:var(--dash6-satin-switch-track-shadow,inset 0 1px 1px rgba(255,255,255,.09),inset 0 -1px 2px rgba(0,0,0,.18),0 3px 7px rgba(0,0,0,.19));backdrop-filter:var(--dash6-satin-control-filter,blur(9px));-webkit-backdrop-filter:var(--dash6-satin-control-filter,blur(9px))}
 :host([data-satin]) .track::before,:host([data-satin]) .track::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none}
 :host([data-satin]) .track::before{background:radial-gradient(ellipse at 38% 110%,color-mix(in srgb,var(--sw-ink) 72%,transparent),color-mix(in srgb,var(--sw-ink) 24%,transparent) 60%,transparent);opacity:calc(.08 + .63 * var(--sw-alpha));transition:opacity 220ms ease}
 :host([data-satin]) button.off .track::before{opacity:0}
 :host([data-satin]) .track::after{background:var(--dash6-satin-switch-track-gloss,linear-gradient(145deg,rgba(255,255,255,.12),transparent 49%,rgba(255,255,255,.02)))}
 :host([data-satin]) .beam,:host([data-satin]) .level{display:none}
 :host([data-satin]) .readout{left:34px;width:50px;font-size:10.5px;translate:0 0;color:rgba(244,247,250,.8)}
 :host([data-satin]) button.off .readout{left:0;translate:0 0}
 :host([data-satin]:not([data-style=classic])) .lens{top:calc(var(--dash6-satin-switch-track-top,3.5px) + 2.75px);left:3.5px;width:31.5px;height:31.5px;translate:0 0;transform:none;border-radius:50%;filter:none;transition:translate var(--dash6-satin-switch-duration,500ms) cubic-bezier(.22,1.16,.35,1),scale var(--dash6-satin-elastic-duration,380ms) cubic-bezier(.22,1.5,.36,1),transform 90ms ease-out}
 :host([data-satin]:not([data-style=classic])) button.off .lens{translate:var(--sw-travel) 0;transform:none;border-radius:50%}
 :host([data-satin]) .bowl{background:var(--dash6-satin-switch-lens-background,var(--dash6-satin-lens-background,linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,.07))));border:var(--dash6-satin-switch-lens-border,var(--dash6-satin-lens-border,1px solid rgba(255,255,255,.47)));box-shadow:var(--dash6-satin-switch-lens-shadow,inset 0 1px 2px rgba(255,255,255,.24),inset 0 -1px 1px rgba(255,255,255,.08),0 2px 5px rgba(0,0,0,.25));backdrop-filter:var(--dash6-satin-lens-filter,blur(7px) saturate(1.15));-webkit-backdrop-filter:var(--dash6-satin-lens-filter,blur(7px) saturate(1.15))}
 :host([data-satin]) .light{inset:0;filter:blur(3px);opacity:calc(.08 + .48 * var(--sw-alpha))}
 :host([data-satin]) .rim{inset:0;border-color:color-mix(in srgb,var(--sw-ink) 32%,rgba(255,255,255,.2));box-shadow:none}
 :host([data-satin]) .shine{inset:1px;background:var(--dash6-satin-switch-lens-gloss,radial-gradient(ellipse at 32% 4%,rgba(255,255,255,.28),transparent 55%));opacity:1}
 :host([data-satin]) .icon{transform:none;color:color-mix(in srgb,var(--sw-ink) 26%,#fff);filter:drop-shadow(0 0 3px color-mix(in srgb,var(--sw-ink) 35%,transparent))}
 :host([data-satin]) .icon svg{width:18px;height:18px;stroke-width:2}:host([data-satin]) .icon svg.group{width:27px;height:19px}:host([data-satin]) .icon ha-icon{--mdc-icon-size:18px}
 :host([data-satin]) button.off .icon{color:var(--dash6-icon-lens-white,rgba(248,249,251,.94));filter:none}
 :host([data-satin]) .members{bottom:0;gap:2px}:host([data-satin]) .members i{width:3px;height:3px}
 :host([data-satin]) .lock{top:-4px;right:-4px;width:15px;height:15px}:host([data-satin]) .lock ha-icon{--mdc-icon-size:10px}
 @media(hover:hover){:host([data-satin]) button:hover:not(:disabled):not(.rejecting) .lens{scale:var(--dash6-satin-switch-hover-scale,1.07)}}
 :host([data-satin]) button:active:not(:disabled):not(.rejecting) .lens,:host([data-satin]) button.squeezing .lens{scale:1;transform:scale(1.10,.86);transition-duration:90ms}
 :host([data-satin]) .rejecting .lens{animation:dash6-satin-denied 480ms ease-in-out}
 @keyframes dash6-satin-denied{0%,100%{transform:translateX(0)}20%{transform:translateX(-3px)}40%{transform:translateX(3px)}60%{transform:translateX(-2px)}80%{transform:translateX(1px)}}
 @media(prefers-reduced-motion:reduce){*{transition:none!important}.rejecting .lens{animation:none}.rejecting .reject-tint{animation:none;opacity:1}}
 @media(prefers-reduced-motion:reduce){:host([data-satin]) .lens{scale:1!important;transform:none!important;animation:none!important}}
 `;
 static getConfigElement(){const e=document.createElement('dash6-basic-editor');e.schema=[{name:'entity',label:'Licht / Schalter',selector:{entity:{domain:['light','switch','fan','input_boolean']}}},{name:'name',label:'Anzeigename',selector:{text:{}}},{name:'icon',label:'Icon',selector:{icon:{}}},...SWITCH_SCHEMA];return e;}
 static getStubConfig(){return {type:'custom:dash6-glass-switch',entity:'',switch_style:'liquid_glass'};}
 setConfig(c){if(!/^(light|switch|fan|input_boolean)\./.test(c.entity||''))throw Error('Licht, Schalter, Lüfter oder booleschen Helfer auswählen.');this._config=structuredClone(c);this.dataset.style=c.switch_style==='classic'?'classic':'liquid_glass';}
 getCardSize(){return 1;}
 get model(){return this.visual||switchVisual(this._config||{},this.hass?.states||{},this.colorForState);}
 reject(){clearTimeout(this._denyTimer);this._rejecting=true;this.requestUpdate();this._denyTimer=setTimeout(()=>{this._rejecting=false;this.requestUpdate();},480);}
 connectedCallback(){super.connectedCallback();bindThemePreferences(this);this._groupCountRefresh=()=>this.requestUpdate();window.addEventListener('dash6-theme-settings-changed',this._groupCountRefresh);}
 cancelPress(){clearTimeout(this._pressTimer);this._pressTimer=null;this._squeezing=false;}
 disconnectedCallback(){super.disconnectedCallback();window.removeEventListener('dash6-theme-settings-changed',this._groupCountRefresh);unbindThemePreferences(this);clearTimeout(this._denyTimer);this.cancelPress();this._rejecting=false;}
 async activate(e){e?.stopPropagation();const v=this.model;if(!v.available||this._pressTimer)return;if(v.locked){this.reject();return;}const on=!v.on;
  const commit=async()=>{this.cancelPress();const current=this.model;if(!this.isConnected||!current.available)return;if(current.locked){this.reject();return;}if(current.on===on)return;if(this.managed){this.dispatchEvent(new CustomEvent('toggle-request',{detail:{on},bubbles:true,composed:true}));return;}try{await this.hass.callService(this._config.entity.split('.')[0],'toggle',{entity_id:this._config.entity});}catch(error){this.dispatchEvent(new CustomEvent('switch-error',{detail:{error},bubbles:true,composed:true}));}};
  if(this.hasAttribute('data-satin')&&this.dataset.style!=='classic'&&this._config?.animation!==false&&!matchMedia('(prefers-reduced-motion: reduce)').matches){this._squeezing=true;this._pressTimer=setTimeout(commit,100);return;}await commit();
 }
 render(){const v=this.model;const showCount=getComputedStyle(this).getPropertyValue('--dash6-show-light-group-count').trim()==='1';if(!v.available&&this._pressTimer)this.cancelPress();const ink=this.hasAttribute('data-satin')?(v.satinColor??(v.supportsColor===false?'var(--dash6-satin-fallback-color,#ffd65a)':v.color)):v.color;this.style.setProperty('--sw-ink',v.on?ink:'var(--secondary-text-color)');this.style.setProperty('--sw-y',(100-v.brightness)+'%');this.style.setProperty('--sw-alpha',String(v.brightness/100));return html`<button type="button" role="switch" aria-checked=${String(v.on)} aria-label=${v.name+' '+(v.locked?'· Kindersicherung aktiv':v.on?'ausschalten':'einschalten')} ?disabled=${!v.available} class=${(v.on?'on':'off')+(this._rejecting?' rejecting':'')+(this._squeezing?' squeezing':'')} @pointercancel=${()=>this.cancelPress()} @click=${e=>this.activate(e)}><span class="track">${v.on&&v.dimmable?html`<span class="beam"></span><span class="level"></span>`:''}<span class="readout">${!v.on?'Aus':v.group&&showCount&&v.total?v.count+'/'+v.total:v.dimmable?Math.round(v.brightness)+'%':'Ein'}</span></span><span class="lens" @animationend=${e=>{if(['dash6-denied','dash6-satin-denied'].includes(e.animationName)){clearTimeout(this._denyTimer);this._rejecting=false;}}}><span class="light"></span><span class="bowl"></span><span class="rim"></span><span class="reject-tint"></span><span class="icon">${this._config?.icon&&!['mdi:lightbulb','mdi:lightbulb-outline',...(v.group?['mdi:lightbulb-group','mdi:lightbulb-group-outline','mdi:lightbulb-multiple','mdi:lightbulb-multiple-outline']:[])].includes(this._config.icon)?html`<ha-icon .icon=${this._config.icon}></ha-icon>`:svg`<svg viewBox="0 0 24 24" aria-hidden="true">${bulb}</svg>`}</span><span class="shine"></span>${v.locked?html`<span class="lock"><ha-icon icon="mdi:lock"></ha-icon></span>`:''}</span><span class="sr" aria-live="polite">${this._rejecting?'Kindersicherung aktiv · Bedienung gesperrt':v.mixed?'Gemischte Lichtgruppe':''}</span></button>`;}
}
customElements.define('dash6-glass-switch',GlassSwitch);
window.customCards??=[];window.customCards.push({type:'dash6-glass-switch',name:'DASH6 Liquid-Glass-Schalter',description:'Ein-/Aus-Linse mit Helligkeit, Lichtfarbe, Lichtgruppen und Kindersicherung.',preview:true});
