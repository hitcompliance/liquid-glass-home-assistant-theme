// Room-scoped, opt-in loader. Original profiles remain available for backups.
(()=>{
 const clone=x=>structuredClone(x),queries=new Map();
 let definitions;
 const configs=()=>definitions??=fetch('/local/dash6-satin/room-loader-configs.json?v=20261014-domains').then(r=>{if(!r.ok)throw Error('Raumlader-Konfiguration: '+r.status);return r.json()});
 const scan=(r,fn)=>{for(const e of r.children||[]){fn(e);scan(e,fn);if(e.shadowRoot)scan(e.shadowRoot,fn)}};
 function watch(room,hass,fn){let q=queries.get(room);if(!q){q={listeners:new Set(),connection:hass.connection,active:true,subscriptions:0};queries.set(room,q);q.ready=configs().then(async all=>{q.definition=all[room];if(!q.definition)throw Error('Unbekannter Raum '+room);if(!q.active)return;q.subscriptions++;const unsub=await q.connection.subscribeMessage(e=>{if(!q.active)return;if(e.error){q.error=e.error;for(const f of q.listeners)f(null,q.error);return;}try{q.result=typeof e.result==='string'?JSON.parse(e.result):e.result;for(const f of q.listeners)f(q.result);}catch(error){q.error=error;for(const f of q.listeners)f(null,error);}},{type:'render_template',template:q.definition.template});if(q.active)q.unsubscribe=unsub;else unsub();}).catch(e=>{q.error=e;for(const f of q.listeners)f(null,e)});}
 q.listeners.add(fn);if(q.result)fn(q.result);else if(q.error)fn(null,q.error);return ()=>{q.listeners.delete(fn);if(!q.listeners.size){q.active=false;q.unsubscribe?.();queries.delete(room)}};
 }
 function decode(o){if(typeof o==='string'&&/^[\[{"]/.test(o.trim())){try{return decode(JSON.parse(o))}catch{return o}}if(Array.isArray(o))return o.map(decode);if(o&&typeof o==='object')return Object.fromEntries(Object.entries(o).map(([k,v])=>[k,decode(v)]));return o;}
 function restore(o,fixtures){if(Array.isArray(o))return o.map(x=>restore(x,fixtures));if(!o||typeof o!=='object')return o;const n=o.dash6_ref!==undefined?{...clone(fixtures[o.dash6_ref]),...o}:o;delete n.dash6_ref;return Object.fromEntries(Object.entries(n).map(([k,v])=>[k,restore(v,fixtures)]));}
 function ids(o,a=[]){if(!o||typeof o!=='object')return a;if(o.entity&&o.type)a.push(o.entity);for(const v of Object.values(o))ids(v,a);return a;}
 function prune(o,h,allow,drop){if(Array.isArray(o))return o.map(x=>prune(x,h,allow,drop)).filter(Boolean);if(!o||typeof o!=='object')return o;if(o.entity&&o.type&&(!h.states[o.entity]||h.entities?.[o.entity]?.hidden_by||(allow&&!allow.has(o.entity))||drop?.has(o.entity)))return null;const n=Object.fromEntries(Object.entries(o).map(([k,v])=>[k,prune(v,h,allow,drop)]));if(Array.isArray(n.cards)&&!n.cards.some(c=>c.type!=='heading'))return null;return n;}
 // A separate native layout adapter keeps upstream layout-card installed and
 // untouched. Its default child margins otherwise turn an 8px grid gap into 16px.
 const flushLayoutReady=customElements.whenDefined('grid-layout').then(()=>{
  if(customElements.get('dash6-room-flush-grid-layout'))return;
  const Base=customElements.get('grid-layout'),sheet=new CSSStyleSheet();
  sheet.replaceSync(`:host{display:block;min-width:0;height:auto!important}#root{margin:0!important;padding:0!important;gap:8px!important;align-items:stretch;overflow:visible!important}#root>*{min-width:0;margin:0!important}`);
  class FlushGrid extends Base{static styles=[Base.styles,sheet];}
  customElements.define('dash6-room-flush-grid-layout',FlushGrid);
 });
 class SlotGrid extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML=`<style>
:host{display:block;min-width:0}.heading{display:grid;gap:8px;min-width:0}.heading:empty{display:none}.heading>*{min-width:0;margin:0!important}
.frame{position:relative;min-width:0;isolation:isolate;overflow:hidden;border-radius:var(--dash5-card-radius,16px);background:var(--dash5-thin-background,rgba(255,255,255,.04));box-shadow:var(--dash5-thin-shadow,none);backdrop-filter:var(--dash5-thin-filter,none);-webkit-backdrop-filter:var(--dash5-thin-filter,none);padding:8px;box-sizing:border-box}
.frame::after{content:'';position:absolute;inset:0;border:var(--dash5-thin-border,1px solid var(--divider-color));border-radius:inherit;box-sizing:border-box;pointer-events:none;z-index:2}.frame>*{display:block;min-width:0;margin:0!important}
</style><div class="heading"></div><div class="frame"></div>`;this._heading=this.shadowRoot.querySelector('.heading');this._frame=this.shadowRoot.querySelector('.frame');}
  async setConfig(config){this._config=clone(config);const generation=this._generation=(this._generation||0)+1;await flushLayoutReady;
   const style=this.shadowRoot.querySelector('style');style.textContent=style.textContent.replace(/\n@media[\s\S]*$/,'')+`\n@media(min-width:${config.breakpoint}px){.frame{padding:0}}`;
   const cards=await Promise.all([...(config.headings||[]).map(c=>window.__dash6Cards.create(c)),window.__dash6Cards.create(config.grid)]);
   if(generation!==this._generation)return;this._cards=cards;for(const card of cards)if(this._hass)card.hass=this._hass;this._heading.replaceChildren(...cards.slice(0,-1));this._frame.replaceChildren(cards.at(-1));
  }
  set hass(h){this._hass=h;for(const card of this._cards||[])card.hass=h;}
  get hass(){return this._hass;}
  getCardSize(){return (this._cards||[]).reduce((sum,c)=>sum+(Number(c.getCardSize?.())||3),0);}
 }
 customElements.define('dash6-room-slot-grid',SlotGrid);
 class Slot extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>:host{display:block;min-width:0}.content{display:grid;min-width:0;gap:8px}.error{color:var(--error-color)}</style><div class="content"><div class="known"></div><div class="extra"></div></div>';this._known=this.shadowRoot.querySelector('.known');this._extra=this.shadowRoot.querySelector('.extra');this.empty=true;this.builds=0;}
  setConfig(c){const signature=JSON.stringify(c);if(signature===this._configSignature)return;this._configSignature=signature;this._stop?.();this._stop=null;this._slot=null;this._allowed=null;this._extraDefs=[];this._fixedKey='';this._extraKey='';this._config=clone(c);this._init();}
  set hass(h){this._hass=h;if(this._fixed)this._fixed.hass=h;if(this._dynamic)this._dynamic.hass=h;this._init();this._initial();}
  get hass(){return this._hass;}
  connectedCallback(){this._init()}
  disconnectedCallback(){this._stop?.();this._stop=null;this._generation=(this._generation||0)+1;}
  async _init(){if(!this._config||!this._hass||!this.isConnected||this._loading||this._stop)return;this._loading=true;try{const all=await configs();this._definition=all[this._config.room];this._slot=this._definition.slots[this._config.slot];this._initial();if(this.isConnected)this._stop=watch(this._config.room,this._hass,(r,e)=>this._result(r,e));}catch(e){this._extra.textContent=e.message;}finally{this._loading=false;}}
  async _initial(){if(!this._slot||!this._hass)return;if(Number(this._config.columns)>1||this._config.combine===true)return this._columns();const cards=prune(this._slot.initial,this._hass,this._allowed),key=JSON.stringify(cards);if(key===this._fixedKey)return;this._fixedKey=key;const generation=this._fixedGeneration=(this._fixedGeneration||0)+1;if(!cards?.length){this._fixed=null;this._known.replaceChildren();this._visibility();return;}await customElements.whenDefined('dash6-profile-card');const child=await window.__dash6Cards.create({type:'vertical-stack',cards});if(generation!==this._fixedGeneration)return;child.hass=this._hass;this._fixed=child;this._known.replaceChildren(child);this.builds++;this._visibility();}
  async _columns(){
   const initial=prune(this._slot.initial,this._hass,this._allowed)||[],extra=prune(this._extraDefs||[],this._hass)||[];
   const columns=Math.min(4,Math.max(1,Number(this._config.columns)||(this._config.combine?1:2)));
   const mobile=Math.min(columns,Math.max(1,Number(this._config.mobile_columns)||1));
   const breakpoint=Math.max(320,Number(this._config.mobile_breakpoint)||700);
   const original=this._slot.initial||[];
   const base=original.find(c=>['custom:vertical-stack-in-card','custom:dash6-stack-card'].includes(c.type));
   const contents=initial.flatMap(c=>['custom:vertical-stack-in-card','custom:dash6-stack-card'].includes(c.type)?c.cards||[]:[c]);
   const headings=original.flatMap(c=>['custom:vertical-stack-in-card','custom:dash6-stack-card'].includes(c.type)?c.cards||[]:[c]).filter(c=>c.type==='heading');
   // Only unwrap a matching outer domain frame. Nested device frames stay intact.
   const headingNames=new Set(headings.map(c=>c.heading));
   const additions=extra.flatMap(c=>['custom:vertical-stack-in-card','custom:dash6-stack-card'].includes(c.type)&&c.cards?.some(x=>x.type==='heading'&&headingNames.has(x.heading))?c.cards:[c]);
   const items=[...contents.filter(c=>c.type!=='heading'),...additions.filter(c=>c.type!=='heading')];
   const flush=this._config.edge_alignment==='flush';
   const grid={type:'custom:layout-card',layout_type:flush||this._config.combine?'custom:dash6-room-flush-grid-layout':'custom:grid-layout',layout:{'grid-template-columns':`repeat(${columns},minmax(0,1fr))`,'grid-auto-rows':'min-content','gap':'8px',card_margin:'0',margin:'0',padding:'0',mediaquery:{[`(max-width: ${breakpoint-1}px)`]:{'grid-template-columns':`repeat(${mobile},minmax(0,1fr))`}}},cards:items};
   const definition=flush?{type:'custom:dash6-room-slot-grid',headings,grid,breakpoint}:{...(base||{type:'custom:vertical-stack-in-card'}),cards:[...headings,grid]};
   const key=JSON.stringify(definition);if(key===this._fixedKey)return;this._fixedKey=key;
   const generation=this._fixedGeneration=(this._fixedGeneration||0)+1;
   this._dynamic=null;this._extra.replaceChildren();
   if(!items.length){this._fixed=null;this._known.replaceChildren();this._visibility();return;}
   await customElements.whenDefined('dash6-profile-card');const child=await window.__dash6Cards.create(definition);
   if(generation!==this._fixedGeneration||!this.isConnected)return;child.hass=this._hass;this._fixed=child;this._known.replaceChildren(child);this.builds++;this._visibility();
  }
  async _result(result,error){if(error){this._extra.textContent='Raumlader: '+(error.message||error);return;}let defs=restore(decode(result[this._slot.index]),this._definition.fixtures||[]);if(typeof defs==='string')try{defs=JSON.parse(defs)}catch{}if(!Array.isArray(defs)){this._extra.textContent='Raumlader: Ungültige Kartenliste';return;}defs=defs.map(x=>x.type==='external_card'&&x.card_config?x.card_config:x);this._allowed=new Set(ids(defs));if(Number(this._config.columns)>1||this._config.combine===true){this._extraDefs=prune(defs,this._hass,null,new Set(this._slot.known))||[];this._initial();return;}this._initial();const extra=prune(defs,this._hass,null,new Set(this._slot.known))||[],key=JSON.stringify(extra);if(key===this._extraKey)return;this._extraKey=key;const generation=this._generation=(this._generation||0)+1;if(!extra.length){this._dynamic=null;this._extra.replaceChildren();this._visibility();return;}await customElements.whenDefined('dash6-profile-card');const container={...clone(this._slot.container),[this._slot.param]:extra};const child=await window.__dash6Cards.create(container);if(generation!==this._generation||!this.isConnected)return;child.hass=this._hass;this._dynamic=child;this._extra.replaceChildren(child);this.builds++;this._visibility();}
  _visibility(){this.empty=!this._fixed&&!this._dynamic;this._known.hidden=!this._fixed;this._extra.hidden=!this._dynamic;this.dispatchEvent(new Event('card-visibility-changed',{bubbles:true,composed:true}));}
  getCardSize(){return this.empty?0:4;}
 }
 class Layout extends HTMLElement{
  constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>:host{display:block;min-width:0}</style><div class="content"></div>';}
  setConfig(c){this._config=clone(c);this._start();}
  set hass(h){this._hass=h;if(this._child)this._child.hass=h;this._start();}
  get hass(){return this._hass;}
  connectedCallback(){this._start()}
  disconnectedCallback(){this._stop?.();this._stop=null;this._observer?.disconnect();}
  async _start(){if(!this._config||!this._hass||!this.isConnected||this._loading||this._stop)return;this._loading=true;try{const all=await configs();this._visibility=all[this._config.room].visibility;if(!this._child){await customElements.whenDefined('dash6-profile-card');this._child=await window.__dash6Cards.create(this._config.definition);this._child.hass=this._hass;this.shadowRoot.querySelector('.content').replaceChildren(this._child);}
   this._observer??=new MutationObserver(()=>this._apply());this._observer.observe(this._child.shadowRoot,{childList:true,subtree:true});this._stop=watch(this._config.room,this._hass,(r,e)=>{if(e){this.dataset.error=e.message||String(e);return;}this._result=r;this._apply()});}finally{this._loading=false;}}
  _apply(){if(!this._result||!this._child?.shadowRoot)return;for(const rule of this._visibility){if(!rule.id)continue;const values=rule.indices.map(i=>this._result[i]===true);const visible=rule.mode==='any'?values.some(Boolean):values.every(Boolean);scan(this._child.shadowRoot,el=>{if(['responsive-row-','responsive-col-','responsive-mod-'].some(p=>el.classList?.contains(p+rule.id))){if(visible)el.style.removeProperty('display');else el.style.setProperty('display','none','important');}});}}
  getCardSize(){return 10;}
 }
 customElements.define('dash6-room-slot-card',Slot);customElements.define('dash6-room-layout-card',Layout);
 window.__dash6RoomLoader={queries};
})();
