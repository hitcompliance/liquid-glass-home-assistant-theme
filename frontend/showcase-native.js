// Public-browser adapters for HA-owned controls only. Package-owned and vendor
// cards are imported unchanged. No authentication or real HA connection exists.
const define=(tag,cls)=>{if(!customElements.get(tag))customElements.define(tag,cls);};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icons={lightbulb:'M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0c-1.2 1-1 2-1 2H9s.2-1-1-2Z',power:'M12 2v10M7 4a9 9 0 1 0 10 0',fan:'M12 12c-9 1-11-7-6-9 5-2 7 3 6 9Zm0 0c3-8 11-6 10-1-1 5-7 5-10 1Zm0 0c6 6 1 12-3 9-4-3-2-8 3-9Z',play:'m8 4 12 8-12 8Z',pause:'M8 4v16M16 4v16',lock:'M6 11h12v10H6ZM8 11V7a4 4 0 0 1 8 0v4',home:'m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',thermometer:'M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0ZM12 8v9',sprout:'M12 21V11M12 16C3 17 3 9 3 9s9-1 9 7Zm0-5C12 3 21 3 21 3s1 9-9 8Z',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-2-5h4l1 3 3 1 3 3v4l-3 1-1 3-3 3h-4l-1-3-3-1-3-3v-4l3-1 1-3Z',robot:'M5 8h14v12H5ZM9 3h6M12 3v5M8 12h1m6 0h1M8 16h8',chart:'M3 3v18h18M6 16l4-6 4 3 6-8',chevron:'m8 4 8 8-8 8',close:'m5 5 14 14M19 5 5 19',volume:'M3 9h4l5-5v16l-5-5H3Zm13-2a7 7 0 0 1 0 10',battery:'M4 6h14v12H4ZM20 10v4M7 9h7v6H7Z',sun:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2',default:'M5 5h14v14H5ZM8 8h8v8H8Z'};
class Icon extends HTMLElement{static get observedAttributes(){return ['icon'];}constructor(){super();this.attachShadow({mode:'open'});}set icon(v){this.setAttribute('icon',v||'');}get icon(){return this.getAttribute('icon');}connectedCallback(){this.draw();}attributeChangedCallback(){this.draw();}draw(){const name=this.icon||'';const key=Object.keys(icons).find(k=>name.includes(k))||'default';this.shadowRoot.innerHTML=`<style>:host{display:inline-flex;width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);align-items:center;justify-content:center;flex-shrink:0}svg{width:100%;height:100%;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}</style><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[key]}"></path></svg>`;}}
define('ha-icon',Icon);define('ha-state-icon',class extends Icon{});define('ha-attribute-icon',class extends Icon{});
define('ha-card',class extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;background:var(--ha-card-background,var(--card-background-color,#202c34));border:1px solid var(--divider-color,#ffffff33);border-radius:var(--ha-card-border-radius,16px);color:var(--primary-text-color,#fff);box-sizing:border-box}</style><slot></slot>';}});
for(const tag of ['ha-button','ha-icon-button','ha-control-button'])define(tag,class extends HTMLElement{connectedCallback(){this.setAttribute('role','button');this.tabIndex=0;this.style.cursor='pointer';this.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.click();}});}});

const baseStyle=`:host{display:block;min-width:0;color:var(--primary-text-color,#fff);font:14px/1.5 system-ui}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer;color:inherit;background:var(--secondary-background-color,#24333d);border:1px solid var(--divider-color,#ffffff30);border-radius:10px;min-height:38px;padding:8px 12px}input,select,textarea{color:inherit;background:var(--secondary-background-color,#1a2933);border:1px solid var(--divider-color,#ffffff30);padding:9px 10px;border-radius:8px;min-width:0}input[type=range]{width:100%;accent-color:var(--primary-color,#8dc8e7)}.body{padding:18px}.title{font-size:17px;font-weight:600;margin-bottom:12px}.row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 0}.secondary{color:var(--secondary-text-color,#aabac2);font-size:12px}h2,h3{margin:8px 0}.controls{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.empty{padding:18px;color:var(--secondary-text-color)}a{color:inherit}svg{max-width:100%}`;
const info=(host,id)=>host.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:id},bubbles:true,composed:true}));
class Form extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this._data={};this._schema=[];}
 set data(v){this._data=v||{};this.draw();}get data(){return this._data;}
 set schema(v){this._schema=v||[];this.draw();}get schema(){return this._schema;}
 set hass(v){this._hass=v;this.draw();}get hass(){return this._hass;}
 set computeLabel(v){this._computeLabel=v;this.draw();}
 connectedCallback(){this.draw();}
 field(s){
  if(s.schema)return `<details open><summary>${esc(s.title||s.name||'Einstellungen')}</summary>${s.schema.map(x=>this.field(x)).join('')}</details>`;
  if(!s.name)return '';
  let label=s.label||s.name;try{label=this._computeLabel?.(s)||label;}catch{}
  const value=this.data[s.name]??'',selector=s.selector||{},entity=selector.entity,number=selector.number,select=selector.select;
  let options=select?.options||[];
  if(entity){let domains=entity.domain||[];if(!Array.isArray(domains))domains=[domains];options=Object.keys(this._hass?.states||{}).filter(id=>!domains.length||domains.includes(id.split('.')[0]));}
  if(selector.area)options=Object.entries(this._hass?.areas||{}).map(([id,v])=>({value:id,label:v.name}));
  if(options.length){return `<label>${esc(label)}<select data-key="${s.name}" ${select?.multiple||entity?.multiple?'multiple':''}><option value="">—</option>${options.map(o=>{const v=typeof o==='object'?o.value:o,text=typeof o==='object'?(o.label||o.value):o;return `<option value="${esc(v)}" ${Array.isArray(value)?value.includes(v)?'selected':'':String(value)===String(v)?'selected':''}>${esc(text)}</option>`;}).join('')}</select></label>`;}
  if(selector.boolean)return `<label class="check"><input data-key="${s.name}" type="checkbox" ${value?'checked':''}>${esc(label)}</label>`;
  if(number)return `<label>${esc(label)}<input data-key="${s.name}" type="number" value="${esc(value)}" min="${number.min??''}" max="${number.max??''}" step="${number.step??'any'}"></label>`;
  return `<label>${esc(label)}<input data-key="${s.name}" value="${esc(typeof value==='object'?JSON.stringify(value):value)}"></label>`;
 }
 draw(){if(!this.shadowRoot)return;this.shadowRoot.innerHTML=`<style>${baseStyle}label{display:grid;gap:6px;margin:12px 0}.check{display:flex;align-items:center}.check input{width:20px;height:20px}details{padding:8px 0}summary{font-weight:600;cursor:pointer}select[multiple]{min-height:115px}</style>${this.schema.map(s=>this.field(s)).join('')}`;this.shadowRoot.querySelectorAll('[data-key]').forEach(input=>input.onchange=()=>{const value=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.multiple?[...input.selectedOptions].map(o=>o.value):input.value;this._data={...this.data,[input.dataset.key]:value};this.dispatchEvent(new CustomEvent('value-changed',{detail:{value:this._data},bubbles:true,composed:true}));});}
}
define('ha-form',Form);
class TextField extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'});this._value='';}set value(v){this._value=v;this.draw();}get value(){return this._value;}set label(v){this._label=v;this.draw();}set config(v){this._value=v;this.draw();}setConfig(v){this._value=v;this.draw();}getValue(){return this._value;}connectedCallback(){this.draw();}draw(){this.shadowRoot.innerHTML=`<style>${baseStyle}label{display:grid;gap:6px;margin:12px 0}textarea{width:100%;min-height:150px;font:12px/1.5 monospace}</style><label>${esc(this._label||this.getAttribute('label')||'')}<${this.localName.includes('editor')?'textarea':'input'}></${this.localName.includes('editor')?'textarea':'input'}></label>`;const input=this.shadowRoot.querySelector('input,textarea');input.value=typeof this._value==='object'?JSON.stringify(this._value,null,2):this._value??'';input.onchange=()=>{let value=input.value;if(typeof this._value==='object')try{value=JSON.parse(value);}catch{}this._value=value;this.dispatchEvent(new Event('input',{bubbles:true,composed:true}));this.dispatchEvent(new Event('change',{bubbles:true,composed:true}));this.dispatchEvent(new CustomEvent('value-changed',{detail:{value},bubbles:true,composed:true}));};}}
for(const tag of ['ha-textfield','ha-textarea','ha-code-editor','ha-yaml-editor','ha-icon-picker','ha-entity-picker','ha-selector','ha-select'])define(tag,class extends TextField{});
define('hui-card-element-editor',class extends TextField{});
define('hui-sections-view',class extends HTMLElement{
 static styles=[];
 constructor(){super();this.attachShadow({mode:'open'});this._cards=[];}
 setConfig(c){this._config=c;this.sections=(c.sections||[]).map(config=>({config,hidden:false}));this.draw();}
 set hass(h){this._hass=h;for(const c of this._cards)c.hass=h;this.updated();}get hass(){return this._hass;}
 connectedCallback(){this.updated();}updated(){}
 draw(){this.shadowRoot.innerHTML='<style>:host{display:block;min-width:0}#sections{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}.section{min-width:0}</style><div id="sections"></div>';this._cards=[];for(const config of this._config?.sections||[]){const section=document.createElement('section');section.className='section';for(const c of config.cards||[]){const child=createCardElement(c);child.hass=this._hass;section.append(child);this._cards.push(child);}this.shadowRoot.querySelector('#sections').append(section);}}
});
define('hui-view',class extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});}
 set lovelace(v){this._lovelace=v;this.draw();}get lovelace(){return this._lovelace;}
 set index(v){this._index=v;this.draw();}get index(){return this._index;}
 set viewConfig(v){this._view=v;this.draw();}get viewConfig(){return this._view;}
 set hass(v){this._hass=v;if(this._child)this._child.hass=v;this.draw();}get hass(){return this._hass;}
 setConfig(v){this._view=v;this.draw();}
 draw(){const view=this._view||this._lovelace?.config?.views?.[this._index];if(!view||this._child)return;const child=document.createElement('hui-sections-view');child.lovelace=this._lovelace;child.setConfig(view);child.hass=this._hass;this._child=child;this.shadowRoot.replaceChildren(child);}
});
define('ha-control-circular-slider',class extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this._value=22;this._min=5;this._max=30;}
 set value(v){this._value=v;this.draw();}get value(){return this._value;}
 set min(v){this._min=v;this.draw();}get min(){return this._min;}set max(v){this._max=v;this.draw();}get max(){return this._max;}
 connectedCallback(){this.draw();}
 draw(){this.shadowRoot.innerHTML=`<style>:host{display:block;width:180px;height:180px;position:relative;margin:auto}svg{width:180px;height:180px;transform:rotate(135deg)}circle{fill:none;stroke-width:8;stroke-linecap:round}.track{stroke:#ffffff18}.value{stroke:var(--primary-color,#9acbdc);stroke-dasharray:300 405}label{position:absolute;inset:0;display:grid;place-content:center;text-align:center;color:inherit;font:500 32px system-ui}small{display:block;font:12px system-ui;color:var(--secondary-text-color)}input{position:absolute;inset:auto 12% 6%;width:76%;accent-color:var(--primary-color)}</style><svg id="slider" viewBox="0 0 180 180"><circle class="track" cx="90" cy="90" r="65"></circle><circle class="value" cx="90" cy="90" r="65"></circle></svg><label>${esc(this._value)}°<small>Solltemperatur</small></label><input aria-label="Solltemperatur" type="range" min="${this._min}" max="${this._max}" step="0.5" value="${this._value}">`;this.shadowRoot.querySelector('input').onchange=e=>{this._value=Number(e.target.value);this.dispatchEvent(new CustomEvent('value-changed',{detail:{value:this._value},bubbles:true,composed:true}));};}
});

// Only HA-owned More Info content is adapted. The vendor More Info Card
// itself stays unchanged and receives the same isolated hass as every card.
class DemoInfoContent extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});}
 set hass(v){this._hass=v;this.draw();}get hass(){return this._hass;}
 set stateObj(v){this._state=v;this.draw();}
 draw(){if(!this._hass||!this._state)return;const detail=document.createElement('dash6-demo-entity-detail');detail.hass=this._hass;detail.entity=this._state.entity_id;this.shadowRoot.replaceChildren(detail);}
}
define('more-info-content',DemoInfoContent);
define('state-card-content',class extends HTMLElement{
 set hass(v){this._hass=v;this.draw();}get hass(){return this._hass;}
 set stateObj(v){this._state=v;this.draw();}
 draw(){if(this._state)this.textContent=this._state.attributes.friendly_name+' · '+this._state.state;}
});

export class NativeCard extends HTMLElement{
 static styles=[];
 constructor(){super();this.attachShadow({mode:'open'});this._cards=[];}
 static getConfigElement(){const e=document.createElement('ha-form');e.setConfig=c=>{e.data=c;e.schema=[{name:'name',label:'Name',selector:{text:{}}},{name:'entity',label:'Entity',selector:{entity:{}}}];};return e;}
 setConfig(c){this._config=structuredClone(c);this.draw();}
 set hass(h){this._hass=h;for(const c of this._cards)c.hass=h;this.draw();this.updated?.(new Map([['hass',null]]));}get hass(){return this._hass;}
 get updateComplete(){return Promise.resolve(true);}requestUpdate(){this.draw();this.updated?.(new Map());}updated(){}
 connectedCallback(){this.draw();this.updated?.(new Map());requestAnimationFrame(()=>{if(this.isConnected)this.updated?.(new Map());});}
 getCardSize(){return 4;}
 draw(){
  if(!this._config)return;
  const c=this._config,h=this.hass,s=h?.states?.[c.entity],name=c.name||s?.attributes.friendly_name||c.title||'',type=c.type;
  if(['vertical-stack','horizontal-stack','grid'].includes(type)){
   if(!this._cards.length){this._cards=(c.cards||[]).map(createCardElement);this.shadowRoot.innerHTML=`<style>:host{display:block;min-width:0}#root{display:${type==='vertical-stack'?'flex':'grid'};flex-direction:column;gap:8px;grid-template-columns:repeat(${c.columns||2},minmax(0,1fr))}</style><div id="root"></div>`;this.shadowRoot.querySelector('#root').append(...this._cards);}
   for(const child of this._cards)child.hass=h;return;
  }
  let body='';
  if(type==='markdown')body=`<div class="body markdown">${String(c.content||'').split('\n').map(line=>line.startsWith('# ')?'<h2>'+esc(line.slice(2))+'</h2>':line.startsWith('## ')?'<h3>'+esc(line.slice(3))+'</h3>':'<p>'+esc(line.replaceAll('**',''))+'</p>').join('')}</div>`;
  else if(type==='heading')body=`<div class="container"><div class="content"><h2 class="title">${esc(c.heading||name)}</h2></div></div>`;
  else if(type==='thermostat')body=`<div class="body container"><div class="secondary">${esc(name)} · Ist ${s?.attributes.current_temperature??'—'} °C</div><ha-control-circular-slider></ha-control-circular-slider></div>`;
  else if(type==='media-control')body=`<div class="background"></div><div class="body player"><div class="media-info"><div class="title">${esc(name)}</div><div class="secondary">${esc(s?.attributes.media_title||'Virtuelle Wiedergabe')} · ${esc(s?.state||'idle')}</div></div><div class="title-controls"></div><div class="controls"><div class="start"><button data-service="media_previous_track" aria-label="Vorheriger Titel">⏮</button><button data-service="media_play_pause" aria-label="Wiedergabe / Pause">${s?.state==='playing'?'Ⅱ':'▶'}</button><button data-service="media_next_track" aria-label="Nächster Titel">⏭</button></div><div class="end"></div></div><label class="secondary" data-dash6-native-volume>Lautstärke <input aria-label="Lautstärke" data-volume type="range" min="0" max="1" step=".01" value="${s?.attributes.volume_level??.35}"></label></div>`;
  else if(type==='picture-entity')body=`<div class="body"><div class="title">${esc(name||'Virtuelle Kamera')}</div><img style="width:100%;border-radius:12px" src="package/assets/liquid-glass-living-room.jpg" alt="Mitgeliefertes Demo-Kamerabild"></div>`;
  else if(type==='weather-forecast')body='<div class="body"><div class="title">☀ Demo-Wetter · 21,5 °C</div><div class="secondary">Fünf Tage Vorschau · ausschließlich simuliert</div></div>';
  else if(type==='statistics-graph'||type==='history-graph')body=`<div class="body"><div class="title">${esc(name||c.title||'Simulierter Verlauf')}</div><svg viewBox="0 0 600 120"><path d="M0 100 Q60 20 100 70 T200 40 T300 80 T400 20 T500 60 T600 30" fill="none" stroke="#afd8ba" stroke-width="3"></path></svg></div>`;
  else if(type==='entities')body=`<div class="body"><div class="title">${esc(c.title||'Demo-Entities')}</div>${(c.entities||[]).map(row=>{const id=typeof row==='string'?row:row.entity,state=h?.states[id];return `<div class="row"><span>${esc(typeof row==='object'&&row.name||state?.attributes.friendly_name||id)}</span><button data-entity="${esc(id)}">${esc(state?.state??'—')} ${esc(state?.attributes.unit_of_measurement||'')}</button></div>`;}).join('')}</div>`;
  else body=`<div class="body"><div class="title">${esc(name||type)}</div><div class="row"><span>${esc(s?.state??'Virtuelle Demo')}</span><button data-entity="${esc(c.entity||'')}">Details</button></div></div>`;
  this.shadowRoot.innerHTML=`<style>${baseStyle}.player{position:relative;z-index:1}.controls .start{display:flex;gap:8px}.background{position:absolute;inset:0;background-size:cover;opacity:.3;pointer-events:none}.markdown p{margin:8px 0;color:var(--secondary-text-color)}.markdown h2{font-weight:500;font-size:22px}</style><ha-card class="${type==='heading'?'type-heading':''}">${body}</ha-card>`;
  this.shadowRoot.querySelectorAll('[data-service]').forEach(b=>b.onclick=e=>{e.stopPropagation();h?.callService('media_player',b.dataset.service,{entity_id:c.entity});});
  this.shadowRoot.querySelectorAll('[data-entity]').forEach(b=>b.onclick=e=>{e.stopPropagation();const id=b.dataset.entity;if(!id)return;const domain=id.split('.')[0];if(['light','switch','fan'].includes(domain))h?.callService(domain,'toggle',{entity_id:id});else if(domain==='button')h?.callService('button','press',{entity_id:id});else info(this,id);});
  const volume=this.shadowRoot.querySelector('[data-volume]');if(volume)volume.onchange=()=>h?.callService('media_player','volume_set',{entity_id:c.entity,volume_level:Number(volume.value)});
  const circle=this.shadowRoot.querySelector('ha-control-circular-slider');if(circle){circle.value=s?.attributes.temperature??22;circle.addEventListener('value-changed',e=>h?.callService('climate','set_temperature',{entity_id:c.entity,temperature:e.detail.value}));}
 }
}
for(const type of ['markdown','heading','thermostat','media-control','picture-entity','weather-forecast','statistics-graph','history-graph','entities','entity','sensor','tile','light','button','vertical-stack','horizontal-stack','grid','picture','camera','more-info'])define('hui-'+type+'-card',class extends NativeCard{});
define('state-card-content',class extends HTMLElement{set stateObj(s){this.textContent=s?.attributes.friendly_name||s?.entity_id||'';}});
define('more-info-content',class extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});}
 set stateObj(s){this._state=s;this.draw();}set hass(h){this._hass=h;this.draw();}
 draw(){const s=this._state,h=this._hass;if(!s||!h)return;const cover=s.entity_id.startsWith('cover.');this.shadowRoot.innerHTML=`<style>${baseStyle}</style><div class="body"><div class="title">${esc(s.attributes.friendly_name)}</div><div class="secondary">${esc(s.entity_id)} · ${esc(s.state)}</div>${cover?'<div class="controls"><button data-act="open_cover">Öffnen</button><button data-act="stop_cover">Stopp</button><button data-act="close_cover">Schließen</button></div><input aria-label="Position" type="range" min="0" max="100" value="'+s.attributes.current_position+'">':''}</div>`;this.shadowRoot.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>h.callService('cover',b.dataset.act,{entity_id:s.entity_id}));const input=this.shadowRoot.querySelector('input');if(input)input.onchange=()=>h.callService('cover','set_cover_position',{entity_id:s.entity_id,position:Number(input.value)});}
});
for(const tag of ['home-assistant','home-assistant-main','ha-panel-lovelace','hui-root','hui-view-container','hui-card','hui-section','ha-chart-base'])define(tag,class extends HTMLElement{});
export function createCardElement(config){const type=config.type||'entities',tag=type.startsWith('custom:')?type.slice(7):'hui-'+type+'-card';if(!customElements.get(tag)){if(!type.startsWith('custom:'))define(tag,class extends NativeCard{});else throw Error('Kartenmodul fehlt: '+tag);}const child=document.createElement(tag);child.setConfig?.(config);return child;}
window.loadCardHelpers=async()=>({createCardElement,importMoreInfoControl:async()=>{}});
