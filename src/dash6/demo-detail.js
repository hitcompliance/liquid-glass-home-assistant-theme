import {LitElement,html,css,nothing} from 'lit';
import {scopedCustomElements as customElements} from './scoped-elements.js';

// More-info events from demo cards must never reach HA's real entity dialog.
// This local dialog also works on HTTP installations without WebCrypto.
class DemoEntityDetail extends LitElement{
 static properties={hass:{attribute:false},entity:{},summary:{type:Boolean}};
 static styles=css`:host{display:block;color:var(--primary-text-color);font:14px/1.5 var(--primary-font-family,system-ui)}h2{font-size:20px;margin:0 0 8px}.controls{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}label{display:grid;gap:6px;width:100%;margin:8px 0}button,select,input{font:inherit;color:inherit}button,select{background:var(--card-background-color,#26313c);border:1px solid var(--divider-color,#8887);border-radius:10px;padding:10px}button{cursor:pointer}input[type=range]{width:100%;accent-color:var(--primary-color)}small{color:var(--secondary-text-color)}svg{width:100%;height:100px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:12px/1.5 monospace}details{margin-top:16px}`;
 act(service,data={}){return this.hass.callService(this.entity.split('.')[0],service,{entity_id:this.entity,...data});}
 slider(label,value,min,max,step,service,key){return html`<label>${label} · ${value}<input type="range" aria-label=${label} .value=${String(value)} min=${min} max=${max} step=${step} @change=${e=>this.act(service,{[key]:Number(e.target.value)})}></label>`;}
 render(){
  const s=this.hass?.states[this.entity];if(!s)return nothing;
  const d=this.entity.split('.')[0],a=s.attributes;
  const actions=d==='lock'?['lock','unlock','open']:d==='cover'?['open_cover','stop_cover','close_cover']:d==='vacuum'?['start','pause','return_to_base']:d==='media_player'?['media_play_pause','media_stop']:d==='button'?['press']:d==='scene'?['turn_on']:d==='update'?['install']:['light','switch','fan','remote'].includes(d)?['toggle']:[];
  const labels={lock:'Verriegeln',unlock:'Entriegeln',open:'Öffnen',open_cover:'Öffnen',stop_cover:'Stopp',close_cover:'Schließen',start:'Start',pause:'Pause',return_to_base:'Zur Basis',media_play_pause:'Wiedergabe / Pause',media_stop:'Stopp',press:'Drücken',turn_on:'Aktivieren',install:'Update simulieren',toggle:'Ein / Aus'};
  return html`${this.summary?nothing:html`<h2>${a.friendly_name||this.entity}</h2><div>${s.state} ${a.unit_of_measurement||''}</div><small>${this.entity} · lokale Simulation</small>`}<div class="controls">${actions.map(service=>html`<button @click=${()=>this.act(service)}>${labels[service]}</button>`)}</div>
   ${d==='light'?this.slider('Helligkeit',a.brightness||0,0,255,1,'turn_on','brightness'):nothing}
   ${d==='media_player'?this.slider('Lautstärke',a.volume_level||0,0,1,.01,'volume_set','volume_level'):nothing}
   ${d==='climate'?this.slider('Solltemperatur',a.temperature,a.min_temp,a.max_temp,a.target_temp_step||.5,'set_temperature','temperature'):nothing}
   ${d==='fan'?this.slider('Drehzahl',a.percentage||0,0,100,1,'set_percentage','percentage'):nothing}
   ${d==='cover'?this.slider('Position',a.current_position||0,0,100,1,'set_cover_position','position'):nothing}
   ${d==='number'?this.slider(a.friendly_name,s.state,a.min,a.max,a.step||1,'set_value','value'):nothing}
   ${d==='select'?html`<label>Auswahl<select .value=${s.state} @change=${e=>this.act('select_option',{option:e.target.value})}>${a.options.map(o=>html`<option .value=${o}>${o}</option>`)}</select></label>`:nothing}
   <svg viewBox="0 0 600 100" role="img" aria-label="Simulierter Beispielverlauf"><path d="M0 80 Q75 10 150 50 T300 35 T450 65 T600 20" fill="none" stroke="var(--primary-color,#b8ddbd)" stroke-width="3"></path></svg><small>Simulierter Beispielverlauf · keine Messung oder Recorder-Aufzeichnung.</small><details><summary>Beispielattribute</summary><pre>${JSON.stringify(a,null,2)}</pre></details>`;
 }
}
customElements.define('dash6-demo-entity-detail',DemoEntityDetail);

export function showDemoInfo(context,entity){
 const runtime=context.__liquidGlassDemoRuntime;if(!runtime?.states[entity])return;
 const dialog=document.createElement('dialog');dialog.setAttribute('aria-label','Demo-Entity & Verlauf');
 dialog.style.cssText='color:var(--primary-text-color);background:var(--primary-background-color,#1b2026);border:1px solid var(--divider-color,#8887);border-radius:20px;width:min(600px,calc(100vw - 32px));max-height:calc(100dvh - 32px);box-sizing:border-box;padding:24px';
 const card=document.createElement('dash6-demo-entity-detail');card.entity=entity;
 const update=()=>{card.hass=runtime.hass(context);};update();
 const unsubscribe=runtime.subscribe(update),close=document.createElement('button');close.textContent='Schließen';close.style.cssText='margin-top:16px;padding:10px 18px;border-radius:10px';close.onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>{unsubscribe();dialog.remove();},{once:true});
 dialog.append(card,close);document.body.append(dialog);dialog.showModal();
}

if(typeof document!=='undefined')document.addEventListener('hass-more-info',event=>{
 const context=event.composedPath().map(e=>e.hass||e._hass).find(h=>h?.__liquidGlassDemoRuntime);
 if(!context?.__liquidGlassDemoRuntime.states[event.detail?.entityId])return;
 event.stopImmediatePropagation();event.preventDefault();showDemoInfo(context,event.detail.entityId);
},true);
