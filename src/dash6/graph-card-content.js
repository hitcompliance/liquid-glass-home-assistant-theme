import {inDASH6ContentScope} from './scope.js';
// Shared content rules for the active DASH6 cards. Graphs and device bindings
// remain owned by their original renderers.
const active=inDASH6ContentScope;
const energy=/^(?:—|[-+\d.,\s]+)\s*[kMGT]?Wh$/i;
const power=/^(?:—|[-+\d.,\s]+)\s*[kMGT]?W$/i;
const sheets=new WeakMap();
const style=`
:host #card#card[data-dash6-graph-frame] [data-energy-counter],:host #card#card [data-header-status]{display:none!important}
:host #card#card[data-dash6-graph-frame] #values#values{position:absolute!important;display:flex!important;flex-direction:column!important;align-items:flex-end!important;gap:1px!important;right:12px!important;top:12px!important;padding:0!important;margin:0!important;line-height:16px!important;width:max-content!important;max-width:calc(100% - 124px)!important;overflow:visible!important;white-space:nowrap!important}
:host #card#card[data-dash6-graph-frame] #values#values>*,:host #card#card[data-dash6-graph-frame] #slot_2{font-size:13px!important;font-weight:400!important;line-height:16px!important;color:var(--secondary-text-color)!important;margin:0!important;height:auto!important;position:static!important;top:auto!important;text-align:right!important;white-space:nowrap!important}
:host #card#card[data-dash6-graph-frame] #values#values>[data-power-value],:host #card#card[data-dash6-graph-frame] #slot_1#slot_1{font-size:16px!important;font-weight:700!important;line-height:20px!important;color:var(--primary-text-color)!important;margin:0!important}
:host #card#card[data-dash6-graph-frame] #slot_1#slot_1,:host #card#card[data-dash6-graph-frame] #power#power{position:absolute!important;top:12px!important;right:12px!important;padding:0!important;font-size:16px!important;font-weight:700!important;line-height:20px!important;color:var(--primary-text-color)!important}
:host #card#card[data-dash6-graph-frame] #slot_2{position:absolute!important;top:33px!important;right:12px!important;padding:0!important}
:host #card#card[data-dash6-graph-frame] #status#status{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
:host .card:has(>.power-graph)>.metrics.metrics{display:flex!important;flex-direction:column!important;align-items:flex-end!important;position:absolute!important;top:12px!important;right:12px!important;min-height:0!important;height:auto!important;margin:0!important;padding:0!important;white-space:nowrap!important}
:host .card:has(>.power-graph)>.metrics .metric-power.metric-power{font-size:16px!important;font-weight:700!important;line-height:20px!important;margin:0!important;color:var(--primary-text-color)!important}
:host #card#card[data-dash6-graph-frame] #values#values>[data-fridge-target]{display:flex!important;align-items:center!important;justify-content:flex-end!important;gap:4px!important;line-height:16px!important;min-height:16px!important}
:host #card#card[data-dash6-graph-frame] #values#values>[data-fridge-target] ha-icon{display:block!important;width:14px!important;height:14px!important;margin:0!important;align-self:center!important;vertical-align:initial!important;--mdc-icon-size:14px}

:host #card#card[data-dash6-fan-flow] #container#container{grid-template-areas:"device title power" ". status status" ". . ."!important;grid-template-rows:20px auto minmax(0,1fr)!important;align-content:start!important}
:host #card#card[data-dash6-fan-flow] #status#status{position:relative!important;grid-area:status!important;left:auto!important;right:auto!important;top:auto!important;width:100%!important;white-space:normal!important;overflow:visible!important;text-overflow:clip!important}
`;
function addStyle(root){if(!sheets.has(root)){const s=document.createElement('style');s.textContent=style;root.append(s);sheets.set(root,s);}}
export function syncPresenceCorner(host){
 if(!active())return;
 const root=host.shadowRoot,card=root?.querySelector('ha-card#card,ha-card.card');if(!card)return;
 if(getComputedStyle(card).position==='static')card.style.position='relative';
 for(const feedback of root.querySelectorAll('dash6-presence-feedback')){
  if(feedback._config?.role==='indicator'){
   const anchor=feedback.closest('#presence')||feedback;
   if(anchor===feedback&&anchor.parentElement!==card)card.append(anchor);
   for(const [key,value]of Object.entries({position:'absolute',top:'auto',left:'auto',right:'7px',bottom:'7px',width:'26px',height:'26px',margin:'0',padding:'0','z-index':'30','pointer-events':'none','grid-area':'auto',transform:'none'}))anchor.style.setProperty(key,value,'important');
   feedback.style.setProperty('width','26px','important');feedback.style.setProperty('height','26px','important');
   const symbol=feedback.shadowRoot?.querySelector('.symbol');if(symbol){symbol.style.setProperty('width','26px','important');symbol.style.setProperty('height','26px','important');}
  }else if(feedback._config?.fan&&feedback.shadowRoot&&!feedback.shadowRoot.querySelector('#dash6-fan-inline-status')){
   const style=document.createElement('style');style.id='dash6-fan-inline-status';style.textContent='.text.fan-status{display:block!important;white-space:normal!important;overflow-wrap:normal!important}.fan-status>div{display:inline!important;white-space:normal!important}.fan-status>div+div::before{content:" · "}';feedback.shadowRoot.append(style);
  }
 }
}
export function syncGraphContent(host){
 if(!active())return;syncPresenceCorner(host);
 const root=host.shadowRoot,frame=root?.querySelector('[data-dash6-graph-frame],ha-card#card:has(#graph),ha-card.card:has(>.power-graph)');
 if(!frame)return;if(frame.querySelector('#graph'))frame.setAttribute('data-dash6-graph-frame','');addStyle(root);
 frame.toggleAttribute('data-dash6-fan-flow',Boolean(host._config?._dash6_fan_definition));
 const values=frame.querySelector('#values'),status=frame.querySelector('#status');
 const notes=[];
 const statusRow=row=>{
  const text=row.textContent.trim().replace(/\s+/g,' ');
  if(/^(Eingang\s*\d+\s*:|LED(?:\s|:))/i.test(text)){notes.push(text);row.dataset.headerStatus='';row.style.setProperty('display','none','important');return true;}return false;
 };
 if(values){
  for(const row of values.querySelectorAll('div,span')){
   if(row.children.length)continue;
   if(energy.test(row.textContent.trim())){row.dataset.energyCounter='';row.style.setProperty('display','none','important');}
  }
  for(const row of [...values.children]){
   if(energy.test(row.textContent.trim())){row.dataset.energyCounter='';row.style.setProperty('display','none','important');}
   else if(power.test(row.textContent.trim()))row.dataset.powerValue='';
   else statusRow(row);
  }
 }
 let extraLine=0;
 for(const slot of frame.querySelectorAll('[id^=slot_]:not(#slot_1),#energy,.metric-energy')){
  if(energy.test(slot.textContent.trim())||slot.classList.contains('metric-energy')){slot.dataset.energyCounter='';slot.style.setProperty('display','none','important');}
  else if(!statusRow(slot)){for(const [key,value]of Object.entries({position:'absolute',top:(33+17*extraLine++)+'px',right:'12px',padding:'0',margin:'0','font-size':'13px','font-weight':'400','line-height':'16px',color:'var(--secondary-text-color)','white-space':'nowrap'}))slot.style.setProperty(key,value,'important');}
 }
 if(status&&notes.length){
  let text=status.textContent.trim();for(const note of new Set(notes))if(!text.toLowerCase().includes(note.toLowerCase()))text+=', '+note;
  if(status.textContent!==text)status.textContent=text;
 }
 const metric=frame.querySelector('.metrics');
 if(metric&&frame.querySelector('.power-graph')){
  const config=host._renderConfig||host._config,state=host._hass?.states[config?.power_entity];
  const line=document.createElement('span');line.className='metric-power';
  const n=Number(state?.state);line.textContent=state&&!['unknown','unavailable'].includes(state.state)&&Number.isFinite(n)?`${Math.round(n).toLocaleString('de-DE')} ${state.attributes.unit_of_measurement||'W'}`:'— W';
  metric.replaceChildren(line);frame.append(metric);
  if(config?.entity==='light.badezimmer_deckenlicht')metric.style.setProperty('right','7px','important');
  const head=frame.querySelector('.head');if(head)head.style.paddingRight=(Math.ceil(metric.getBoundingClientRect().width)+8)+'px';
 }

}

let registry=new Map(),registryHass;
const pillHosts=new Set();
async function refreshRegistry(hass){const rows=await hass.callWS({type:'config/entity_registry/list'});registry=new Map(rows.map(e=>[e.entity_id,e]));for(const ref of pillHosts){const host=ref.deref();if(host?.isConnected)host.requestUpdate?.();else pillHosts.delete(ref);}document.dispatchEvent(new Event('dash6-pill-visibility'));}
export function visiblePillMembers(ids,hass){return (ids||[]).filter(id=>{
 const row=registry.get(id)||hass?.entities?.[id];return !!hass?.states?.[id]&&!row?.hidden_by&&!row?.disabled_by;
});}
window.__dash6VisiblePillMembers=visiblePillMembers;
export async function freshVisiblePillMembers(ids,hass){try{await refreshRegistry(hass);return visiblePillMembers(ids,hass);}catch{return [];}}
window.__dash6VisiblePillMembersFresh=freshVisiblePillMembers;
async function bindRegistry(hass){
 if(!hass?.callWS||registryHass===hass.connection)return;registryHass=hass.connection;
 const refresh=async()=>{try{await refreshRegistry(hass);}catch{registryHass=null;}};
 await refresh();
 try{await hass.connection.subscribeEvents(refresh,'entity_registry_updated');}catch{}
}

const element=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
const valid=s=>s&&!['unknown','unavailable'].includes(s.state)&&Number.isFinite(Number(s.state));
export function numberDraft(state){const a=state?.attributes||{};return {original:valid(state)?Number(state.state):null,value:valid(state)?Number(state.state):null,min:Number(a.min),max:Number(a.max),step:Number(a.step)||1};}
export function validDraft(d){return d.value!==null&&Number.isFinite(d.value)&&Number.isFinite(d.min)&&Number.isFinite(d.max)&&d.value>=d.min&&d.value<=d.max&&Math.abs((d.value-d.min)/d.step-Math.round((d.value-d.min)/d.step))<1e-6;}
export function shiftDraft(d,direction){if(d.value===null)return;d.value=Number(Math.min(d.max,Math.max(d.min,d.value+d.step*direction)).toFixed(6));}
export class FridgeDetail extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this.drafts=new Map();}
 configure(config,hass){this.config=config;this.hass=hass;for(const id of [config.freezer_entity,config.fridge_entity])this.drafts.set(id,numberDraft(hass.states[id]));}
 set hass(value){this._hass=value;if(this.isConnected)this.syncExpress();}
 get hass(){return this._hass;}
 connectedCallback(){this.render();}
 syncExpress(){
  const button=this.shadowRoot.querySelector('.express');if(!button)return;
  const state=this.hass?.states[this.config.express_entity],known=state&&['on','off'].includes(state.state);
  button.disabled=this._expressPending||!known;button.setAttribute('aria-pressed',String(state?.state==='on'));
  button.textContent=this._expressPending?'Express-Modus wird übernommen…':known?'❄ Express-Modus '+(state.state==='on'?'ausschalten':'einschalten'):'Express-Modus nicht verfügbar';
 }
 async toggleExpress(){
  const id=this.config.express_entity,state=this.hass.states[id];if(this._expressPending||!state||!['on','off'].includes(state.state))return;
  this._expressPending=true;this.syncExpress();
  try{await this.hass.callService('switch',state.state==='on'?'turn_off':'turn_on',{entity_id:id});}
  catch(e){this.shadowRoot.querySelector('.error').textContent='Express-Modus konnte nicht geändert werden: '+(e.message||e);}
  finally{this._expressPending=false;this.syncExpress();}
 }

 render(){
  this.shadowRoot.innerHTML=`<style>
  :host{display:block;color:var(--primary-text-color,#edf2f8);font:16px/1.4 var(--paper-font-body1_-_font-family,system-ui)}*{box-sizing:border-box}h2{margin:0;font-size:22px}p{margin:4px 0 18px;color:var(--secondary-text-color,#b6c0cc);font-size:13px}.top{display:flex;align-items:center;gap:12px}.top h2{flex:1}button,input{font:inherit;color:inherit}button{cursor:pointer;min-height:44px;border:1px solid var(--divider-color,#627080);border-radius:12px;background:var(--dash6-satin-control-background,rgba(255,255,255,.08))}button:focus-visible,input:focus-visible{outline:2px solid var(--primary-color,#8bc9ff);outline-offset:3px}button:disabled{opacity:.4;cursor:default}.close{width:44px;font-size:24px}.appliance{width:min(100%,500px);margin:auto}.targets{position:absolute;z-index:2;top:20px;left:6px;right:6px;display:grid;grid-template-columns:44% 56%;gap:0;margin:0;color:#263642}.targets .unit{color:#344a5b}.targets button,.targets input{color:#243442;background:rgba(255,255,255,.78);border-color:#7b8b98}.express{display:block;width:100%;margin-top:20px;padding:10px 16px;font-weight:600}.express[aria-pressed=true]{background:rgba(108,191,255,.2);border-color:#8dceff}.zone{min-width:0;padding:0 7px;text-align:center}.zone label{display:block;font-size:13px;font-weight:650;margin-bottom:7px}.edit{display:grid;grid-template-columns:40px minmax(0,1fr) 40px;gap:4px;align-items:center}.edit button{font-size:22px;min-width:0}.edit input{width:100%;min-width:0;height:44px;padding:2px;text-align:center;border-radius:10px;border:1px solid var(--divider-color,#647080);background:rgba(0,0,0,.16);font-size:18px}.edit input::-webkit-inner-spin-button,.edit input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.edit input{appearance:textfield;-moz-appearance:textfield}.unit{display:block;font-size:12px;color:var(--secondary-text-color,#bbc5d0);margin-top:4px}.fridge{height:360px;display:grid;grid-template-columns:44% 56%;padding:6px;border:1px solid #b8c0c9;border-radius:13px 13px 9px 9px;background:linear-gradient(90deg,#3d454c,#d9e0e5 3%,#727c84 7%,#b9c2c9 48%,#66727b 99%);box-shadow:0 18px 25px #0005,inset 0 1px 1px #fff8;position:relative}.door{position:relative;border:1px solid #6f7b86;border-radius:7px;background:linear-gradient(100deg,#a3adb6,#d4dce3 30%,#949fa9 90%,#76838d);overflow:hidden;box-shadow:inset 1px 0 1px #fff9}.door.freezer{border-right:3px solid #35414b}.door.cooling{border-left:3px solid #35414b}.handle{position:absolute;top:145px;bottom:65px;width:9px;border-radius:5px;background:linear-gradient(90deg,#3e4953,#dbe1e7 50%,#727f8b);box-shadow:2px 2px 4px #0005}.freezer .handle{right:12px}.cooling .handle{left:12px}.brand{position:absolute;bottom:56px;right:20px;font-size:19px;font-weight:700;color:#394651;text-shadow:0 1px #fff8}.dispenser{position:absolute;top:135px;left:18%;width:55%;height:110px;border:5px solid #717d87;border-radius:8px;background:linear-gradient(#192530,#36454f);box-shadow:inset 0 4px 14px #0008}.display{position:absolute;left:20%;top:12px;color:#bce9ff;font:12px monospace}.tray{position:absolute;bottom:5px;left:8%;right:8%;height:9px;background:repeating-linear-gradient(90deg,#7d8993 0 2px,#202c35 2px 5px);border-radius:4px}.compartment{position:absolute;bottom:20px;left:0;right:0;text-align:center;font-size:13px;font-weight:650;color:#34434f;text-shadow:0 1px #ffffff90}.base{height:8px;margin:0 12px;background:#3c464f;border-radius:0 0 6px 6px}.details{margin-top:22px;display:grid;gap:6px}.detail{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:9px 12px;text-align:left}.detail span{min-width:0;overflow-wrap:anywhere}.detail strong{font-size:13px;text-align:right}.error{color:var(--error-color,#ff9a9a);white-space:pre-wrap}.saving{opacity:.65;pointer-events:none}@media(max-width:380px){.zone{padding:0 3px}.edit{grid-template-columns:34px minmax(0,1fr) 34px;gap:2px}.fridge{height:310px}}
  </style><div class="top"><h2>LG Side-by-Side</h2><button type="button" class="close" aria-label="Speichern und schließen">×</button></div><p>Zieltemperaturen werden beim Schließen gespeichert.</p><div class="appliance"><div class="fridge" role="group" aria-label="LG Side-by-Side Kühlschrank: links Tiefkühlbereich, rechts Kühlbereich"><div class="targets"></div><div class="door freezer"><div class="dispenser"><span class="display">ICE · WATER</span><div class="tray"></div></div><div class="handle"></div><span class="compartment">❄ Tiefkühlen</span></div><div class="door cooling"><span class="brand">LG</span><div class="handle"></div><span class="compartment">Kühlen</span></div></div><div class="base"></div></div><button type="button" class="express" aria-pressed="false"></button><div class="error" role="alert"></div>`;
  this.shadowRoot.querySelector('.close').onclick=()=>this.saveAndClose();
  const box=this.shadowRoot.querySelector('.targets');
  for(const [id,label]of [[this.config.freezer_entity,'❄ Tiefkühlen'],[this.config.fridge_entity,'Kühlen']]){
   const d=this.drafts.get(id),zone=element('div','zone'),caption=element('label','',label),edit=element('div','edit');
   const input=element('input');input.type='number';input.id=id;caption.htmlFor=id;input.setAttribute('aria-label',label+' Zieltemperatur');input.min=d.min;input.max=d.max;input.step=d.step;input.value=d.value??'';input.disabled=d.original===null;
   const minus=element('button','','−'),plus=element('button','','+');minus.type=plus.type='button';minus.setAttribute('aria-label',label+' kälter');plus.setAttribute('aria-label',label+' wärmer');
   const sync=()=>{minus.disabled=d.original===null||d.value<=d.min;plus.disabled=d.original===null||d.value>=d.max;};
   input.oninput=()=>{d.value=input.value.trim()===''?null:Number(input.value);sync();};
   for(const [button,direction]of [[minus,-1],[plus,1]])button.onclick=()=>{shiftDraft(d,direction);input.value=d.value??'';sync();};sync();
   edit.append(minus,input,plus);zone.append(caption,edit,element('span','unit','°C'));box.append(zone);
  }
  this.shadowRoot.querySelector('.express').onclick=()=>this.toggleExpress();this.syncExpress();
 }
 async saveAndClose(){
  if(this.saving)return;const errors=[];
  const changes=[...this.drafts].filter(([,d])=>d.value!==d.original);
  for(const [id,d]of changes){if(!validDraft(d))errors.push(`${this.hass.states[id]?.attributes.friendly_name||id}: Bitte einen gültigen Wert zwischen ${d.min} und ${d.max} °C eingeben (Schritt ${d.step}).`);}
  if(errors.length){this.shadowRoot.querySelector('.error').textContent=errors.join('\n');return;}
  this.saving=true;this.shadowRoot.querySelector('.top').classList.add('saving');
  try{
   for(const [id,d]of changes){
    const state=this.hass.states[id];if(!valid(state))throw Error('Gerät nicht erreichbar. Die Ansicht bleibt zum erneuten Speichern geöffnet.');
    const current=numberDraft(state);if(!validDraft({...current,value:d.value}))throw Error('Temperaturgrenzen haben sich geändert. Bitte Ansicht erneut öffnen.');
    if(Number(state.state)!==d.value)await this.hass.callService('number','set_value',{entity_id:id,value:d.value});
    d.original=d.value;
   }
   this.close?.();
  }catch(e){this.shadowRoot.querySelector('.error').textContent='Speichern fehlgeschlagen: '+(e.message||e);}
  finally{this.saving=false;this.shadowRoot.querySelector('.top').classList.remove('saving');}
 }
}
if(!customElements.get('dash6-fridge-detail'))customElements.define('dash6-fridge-detail',FridgeDetail);
export function openFridge(host,config){
 if(document.querySelector('#dash6-fridge-modal'))return;
 const hass=host._hass||host.hass;if(!hass)return;
 const dialog=element('dialog');dialog.id='dash6-fridge-modal';dialog.setAttribute('aria-label','Kühlschrank einstellen');
 dialog.style.cssText='box-sizing:border-box;width:min(720px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 24px);padding:20px;border:1px solid rgba(208,225,242,.3);border-radius:22px;background:rgba(24,31,40,.96);backdrop-filter:blur(24px) saturate(1.2);color:#edf2f8;--primary-text-color:#edf2f8;--secondary-text-color:#b6c0cc;--divider-color:rgba(208,225,242,.22);overflow:auto;';
 const backdrop=element('style');backdrop.textContent='#dash6-fridge-modal::backdrop{background:rgba(0,0,0,.48)}';dialog.append(backdrop);
 const detail=document.createElement('dash6-fridge-detail');detail.configure(config,hass);detail.close=()=>{dialog.close();dialog.remove();host.focus?.();};
 dialog.append(detail);document.body.append(dialog);dialog.showModal();
 dialog.addEventListener('cancel',e=>{e.preventDefault();detail.saveAndClose();});
 dialog.addEventListener('click',e=>{const r=dialog.getBoundingClientRect();if(e.target===dialog&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))detail.saveAndClose();});
 host.__fridgeDetail=detail;
}

customElements.whenDefined('button-card').then(()=>{
 const p=customElements.get('button-card').prototype;if(p._dash6Content20261024)return;p._dash6Content20261024=true;const updated=p.updated;
 p.updated=function(...args){const out=updated?.apply(this,args);if(!active())return out;
  if(this._config?.variables?.members&&!this._dash6PillRef){this._dash6PillRef=new WeakRef(this);pillHosts.add(this._dash6PillRef);}
  bindRegistry(this._hass);syncGraphContent(this);
  // The graph adapter adds its frame marker after the vendor's first update.
  requestAnimationFrame(()=>{if(this.isConnected)syncGraphContent(this);});
  if(this.__fridgeDetail?.isConnected)this.__fridgeDetail.hass=this._hass;
  const c=this._config,fc=c?.dash6_fridge_detail;if(fc){
   this.shadowRoot?.querySelector('#card')?.setAttribute('data-dash6-fridge-content','');
   if(!this.__fridgeTap){this.__fridgeTap=true;this.addEventListener('click',e=>{const path=e.composedPath();if(path.some(n=>['DASH6-GLASS-SWITCH','BUTTON','INPUT','A','SELECT'].includes(n.tagName)))return;e.stopImmediatePropagation();e.preventDefault();openFridge(this,fc);},true);}
  }
  return out;
 };
});
for(const name of ['dash6-govee-light-card-v2','dash6-lightgroup-card-v2','dash6-shoe-cabinet-card'])customElements.whenDefined(name).then(()=>{
 const p=customElements.get(name).prototype;if(Object.hasOwn(p,'_graphContent20261024'))return;p._graphContent20261024=true;const render=p.render;
 p.render=function(...args){const out=render.apply(this,args);if(!this._dragging){syncGraphContent(this);requestAnimationFrame(()=>{if(this.isConnected&&!this._dragging)syncGraphContent(this);});}return out;};
});
