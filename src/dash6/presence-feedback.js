import {scopedCustomElements as customElements} from './scoped-elements.js';

// Use the sensor's state transition, never last_updated (attribute updates).
export function presenceFeedback(states,entity,now=Date.now(),activeLabel='Anwesenheit seit'){
 const s=states?.[entity];if(!entity||!s||!['on','off'].includes(s.state))return {active:false,text:''};
 const active=s.state==='on',changed=Date.parse(s.last_changed),seconds=Math.max(0,Math.floor((now-changed)/1000));
 if(!Number.isFinite(changed)||changed>now)return {active,text:active?'Anwesend':''};
 const elapsed=seconds<60?seconds+' Sek.':seconds<3600?Math.floor(seconds/60)+' Min.':seconds<86400?Math.floor(seconds/3600)+' Std. '+Math.floor(seconds%3600/60)+' Min.':Math.floor(seconds/86400)+' T. '+Math.floor(seconds%86400/3600)+' Std.';
 return {active,text:(active?activeLabel:'Anwesenheit vor')+' '+elapsed};
}
export function remainingMinutes(timer,now=Date.now()){
 if(timer?.state==='idle')return 0;
 if(timer?.state==='active'){const end=Date.parse(timer.attributes?.finishes_at);return Number.isFinite(end)?Math.ceil(Math.max(0,end-now)/60000):null;}
 const match=timer?.state==='paused'&&timer.attributes?.remaining?.match(/^(\d+):(\d+):(\d+(?:\.\d+)?)$/);
 return match?Math.ceil((+match[1]*3600 + +match[2]*60 + +match[3])/60):null;
}
class PresenceFeedback extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'}).innerHTML=`<style>:host{display:block;min-width:0;pointer-events:none;color:inherit;font:inherit}:host([hidden]){display:none!important}.text{display:block;white-space:pre-line;line-height:17px}.text.fan-status{display:block;white-space:normal}.fan-status>div{display:inline;white-space:normal}.fan-status>div+div::before{content:" · "}.symbol{display:grid;place-items:center;width:36px;height:37px;color:#fff;filter:drop-shadow(0 0 4px #fff) drop-shadow(0 0 12px #ffffffa0)}ha-icon{--mdc-icon-size:26px}.rotor{color:rgba(255,255,255,.14);--mdc-icon-size:90px;width:90px;height:90px;animation:presence-fan-spin 12s linear infinite}@keyframes presence-fan-spin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.rotor{animation:none}}</style><div class="text"></div><span class="symbol"><ha-icon icon="mdi:account"></ha-icon></span><ha-icon class="rotor" icon="mdi:fan"></ha-icon>`;}
 setConfig(c){this._config={...c};this.sync();}
 set hass(h){this._hass=h;this.sync();}get hass(){return this._hass;}
 connectedCallback(){this.sync();}
 disconnectedCallback(){clearInterval(this._tick);this._tick=null;}
 sync(){
  const c=this._config;if(!c)return;const states=this._hass?.states||{},role=c.role||'status',main=states[c.entity],force=states[c.force_switch_entity];
  const countdown=main?.state==='on'&&force?.state==='on',p=presenceFeedback(states,c.presence_entity,Date.now(),'Anwesenheit seit');
  const symbol=this.shadowRoot.querySelector('.symbol'),text=this.shadowRoot.querySelector('.text'),rotor=this.shadowRoot.querySelector('.rotor');symbol.hidden=role!=='indicator';rotor.hidden=role!=='rotor';text.hidden=role!=='status';
  // [hidden] also applies to explicitly displayed icon spans.
  symbol.style.display=symbol.hidden?'none':'grid';rotor.style.display=rotor.hidden?'none':'inline-flex';
  if(role==='indicator'){this.hidden=!p.active;this.title=p.text;this.setAttribute('aria-label','Person anwesend');}
  else if(role==='rotor'){this.hidden=!(states[c.running_switch_entity]?.state==='on'&&force?.state==='on');this.setAttribute('aria-hidden','true');}
  else{
   let label=c.prefix||'';
   if(c.fan){if(main?.state==='off')label='Aus';else if(main?.state!=='on'||!['on','off'].includes(force?.state))label='Nicht verfügbar';else{const raw=states[c.remaining_time_entity]?.state;const minutes=c.remaining_time_entity?(raw!==undefined&&raw!==''&&Number.isFinite(Number(raw))?Math.ceil(Math.max(0,Number(raw))):null):remainingMinutes(states[c.timer_entity]);const mode=countdown?'Ein':'Auto';const running=states[c.running_switch_entity]?.state==='on'&&states[c.running_force_switch_entity||c.force_switch_entity]?.state==='on';label=!running?mode:minutes===null?`${mode}\nAktiv (Restzeit unbekannt)`:`${mode}\nAktiv (noch ${minutes} ${minutes===1?'Minute':'Minuten'})`;}}
   const showPresence=!c.fan||main?.state==='on'&&['on','off'].includes(force?.state);
   const minutes=Math.max(0,Math.floor((Date.now()-Date.parse(states[c.presence_entity]?.last_changed))/60000));
   const presenceText=c.presence_minutes&&Number.isFinite(minutes)?`Präsenz seit ${minutes} ${minutes===1?'Minute':'Minuten'}`:p.text;
   const parts=c.fan?[...label.split('\n'),showPresence&&p.active?presenceText:''].filter(Boolean):[];
   const value=c.fan?parts.join(' · '):[label,showPresence&&p.active?presenceText:''].filter(Boolean).join(' · ');
   text.classList.toggle('fan-status',Boolean(c.fan));
   if(c.fan){if(text.dataset.parts!==JSON.stringify(parts)){text.replaceChildren(...parts.map((value,index)=>{const div=document.createElement('div');div.className=index===0?'status-mode':value.startsWith('Aktiv')?'status-active':'status-presence';div.textContent=value;return div;}));text.dataset.parts=JSON.stringify(parts);}}
   else{delete text.dataset.parts;if(text.textContent!==value)text.textContent=value;}this.title=value;
  }
  const timed=role==='status'&&(Boolean(p.active&&p.text)||countdown);if(timed&&this.isConnected&&!this._tick)this._tick=setInterval(()=>this.sync(),1000);else if(!timed&&this._tick){clearInterval(this._tick);this._tick=null;}
 }
}
customElements.define('dash6-presence-feedback',PresenceFeedback);
