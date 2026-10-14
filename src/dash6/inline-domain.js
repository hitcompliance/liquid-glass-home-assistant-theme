import {scopedCustomElements as customElements} from './scoped-elements.js';
import {create} from './card-runtime.js';
import {decodeInline,inlineEntities,pruneInline,watchInlineQuery} from './inline-query.js';
import {inlineDomainGridDefinition} from './inline-domain-definition.js';
const clone=value=>structuredClone(value);

// Keep layout-card's original grid implementation and remove only its margins.
const flushGridReady=customElements.whenDefined('grid-layout').then(()=>{
 if(customElements.get('dash6-inline-flush-grid-layout'))return;
 const Base=customElements.get('grid-layout'),sheet=new CSSStyleSheet();
 sheet.replaceSync(':host{display:block;min-width:0;height:auto!important}#root{margin:0!important;padding:0!important;gap:8px!important;align-items:stretch;overflow:visible!important}#root>*{min-width:0;margin:0!important}');
 class FlushGrid extends Base{static styles=[Base.styles,sheet];}
 customElements.define('dash6-inline-flush-grid-layout',FlushGrid);
});

class DomainGrid extends HTMLElement{
 constructor(){
  super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML=`<style>
:host{display:block;min-width:0}.heading{display:grid;gap:8px;min-width:0}.heading:empty{display:none}.heading>*{min-width:0;margin:0!important}
.frame{position:relative;min-width:0;isolation:isolate;overflow:hidden;border-radius:var(--dash5-card-radius,16px);background:var(--dash5-thin-background,rgba(255,255,255,.04));box-shadow:var(--dash5-thin-shadow,none);backdrop-filter:var(--dash5-thin-filter,none);-webkit-backdrop-filter:var(--dash5-thin-filter,none);padding:8px;box-sizing:border-box}
.frame::after{content:'';position:absolute;inset:0;border:var(--dash5-thin-border,1px solid var(--divider-color));border-radius:inherit;box-sizing:border-box;pointer-events:none;z-index:2}.frame>*{display:block;min-width:0;margin:0!important}
</style><div class="heading"></div><div class="frame"></div>`;
 }
 async setConfig(config){
  this._config=clone(config);const generation=this._generation=(this._generation||0)+1;
  await flushGridReady;
  const style=this.shadowRoot.querySelector('style');style.textContent=style.textContent.replace(/\n@media[\s\S]*$/,'')+`\n@media(min-width:${config.breakpoint}px){.frame{padding:0}}`;
  const cards=await Promise.all([...(config.headings||[]).map(create),create(config.grid)]);
  if(generation!==this._generation)return;
  this._cards=cards;for(const card of cards)if(this._hass)card.hass=this._hass;
  this.shadowRoot.querySelector('.heading').replaceChildren(...cards.slice(0,-1));this.shadowRoot.querySelector('.frame').replaceChildren(cards.at(-1));
 }
 set hass(hass){this._hass=hass;for(const card of this._cards||[])card.hass=hass;}
 get hass(){return this._hass;}
 getCardSize(){return (this._cards||[]).reduce((sum,card)=>sum+(Number(card.getCardSize?.())||3),0);}
}
customElements.define('dash6-domain-grid',DomainGrid);

class DomainCard extends HTMLElement{
 constructor(){
  super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>:host{display:block;min-width:0}.content{display:grid;min-width:0;gap:8px}.error{color:var(--error-color)}.error:empty{display:none}</style><div class="content"><div class="known"></div><div class="extra"></div></div><div class="error" role="alert"></div>';
  this._known=this.shadowRoot.querySelector('.known');this._extra=this.shadowRoot.querySelector('.extra');this.empty=true;this.builds=0;
 }
 static getConfigElement(){return document.createElement('dash6-config-editor');}
 setConfig(config){
  const signature=JSON.stringify(config);if(signature===this._configSignature)return;
  this._configSignature=signature;this._stopQuery();this._config=clone(config);this._allowed=null;this._extraDefs=[];this._fixedKey='';this._extraKey='';
  this._generation=(this._generation||0)+1;this._fixedGeneration=(this._fixedGeneration||0)+1;
  this._start();this._draw();
 }
 set hass(hass){
  const changed=this._connection&&this._connection!==(hass?.connection?.__dash6ActualConnection||hass?.connection);
  this._hass=hass;if(changed)this._stopQuery();
  if(this._fixed)this._fixed.hass=hass;if(this._dynamic)this._dynamic.hass=hass;
  this._start();this._draw();
 }
 get hass(){return this._hass;}
 connectedCallback(){this._start();this._draw();}
 disconnectedCallback(){this._stopQuery();this._generation=(this._generation||0)+1;this._fixedGeneration=(this._fixedGeneration||0)+1;this._fixedKey='';this._extraKey='';}
 _stopQuery(){this._stop?.();this._stop=null;this._connection=null;this._queryToken=(this._queryToken||0)+1;}
 _start(){
  if(!this._config||!this._hass||!this.isConnected||this._stop||!this._config.query?.template)return;
  this._connection=this._hass.connection?.__dash6ActualConnection||this._hass.connection;
  const token=this._queryToken;
  this._stop=watchInlineQuery(this._hass,this._config.query,(result,error)=>{if(token===this._queryToken)this._result(result,error);});
 }
 _error(error){this.shadowRoot.querySelector('.error').textContent=error?String(error.message||error):'';}
 _result(result,error){
  if(error){this._error(error);return;}
  const query=this._config.query,value=query.index===undefined?result:result?.[query.index];
  let cards=query.canonical?value:decodeInline(value);
  if(!Array.isArray(cards)){this._error('Ungültige Kartenliste');return;}
  cards=cards.map(card=>card.type==='external_card'&&card.card_config?card.card_config:card);
  this._allowed=new Set(inlineEntities(cards));
  const known=new Set(this._config.known_entity_ids||inlineEntities(this._config.cards));
  this._extraDefs=pruneInline(cards,this._hass,null,known)||[];this._error('');this._draw();
 }
 async _draw(){
  if(!this._config||!this._hass||!this.isConnected)return;
  try{
   if(Number(this._config.columns)>1||this._config.combine===true){await this._grid();return;}
   const fixed=pruneInline(this._config.cards||[],this._hass,this._allowed)||[];
   const extra=pruneInline(this._extraDefs,this._hass)||[];
   await Promise.all([
    this._replace('fixed',fixed.length?{type:'vertical-stack',cards:fixed}:null),
    this._replace('extra',extra.length?{...clone(this._config.container||{type:'vertical-stack'}),[this._config.card_param||'cards']:extra}:null)
   ]);
  }catch(error){this._error(error);}
 }
 async _grid(){
  const originals=this._config.cards||[],initial=pruneInline(originals,this._hass,this._allowed)||[];
  const extra=pruneInline(this._extraDefs,this._hass)||[];
  const definition=inlineDomainGridDefinition(this._config,initial,extra);
  this._dynamic=null;this._extra.replaceChildren();this._extraKey='';
  await this._replace('fixed',definition);
 }
 async _replace(which,definition){
  const fixed=which==='fixed',keyName=fixed?'_fixedKey':'_extraKey',generationName=fixed?'_fixedGeneration':'_generation';
  const key=JSON.stringify(definition);if(key===this[keyName])return;
  this[keyName]=key;const generation=this[generationName]=(this[generationName]||0)+1;
  const target=fixed?this._known:this._extra;
  if(!definition){this[fixed?'_fixed':'_dynamic']=null;target.replaceChildren();this._visibility();return;}
  const child=await create(definition);
  if(generation!==this[generationName]||!this.isConnected)return;
  child.hass=this._hass;this[fixed?'_fixed':'_dynamic']=child;target.replaceChildren(child);this.builds++;this._visibility();
 }
 _visibility(){
  const previous=this.empty;this.empty=!this._fixed&&!this._dynamic;this._known.hidden=!this._fixed;this._extra.hidden=!this._dynamic;
  this.toggleAttribute('data-dash6-empty',this.empty);if(previous!==this.empty)this.dispatchEvent(new Event('card-visibility-changed',{bubbles:true,composed:true}));
 }
 getCardSize(){return this.empty?0:4;}
 getGridOptions(){return this._config?.grid_options??{columns:12};}
}
customElements.define('dash6-domain-card',DomainCard);

const scan=(root,callback)=>{for(const element of root.children||[]){callback(element);scan(element,callback);if(element.shadowRoot)scan(element.shadowRoot,callback);}};
class InlineLayout extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>:host{display:block;min-width:0}.error{color:var(--error-color)}.error:empty{display:none}</style><div class="content"></div><div class="error" role="alert"></div>';}
 static getConfigElement(){return document.createElement('dash6-config-editor');}
 setConfig(config){
  const signature=JSON.stringify(config);if(signature===this._signature)return;
  this._signature=signature;this._stopQuery();this._config=clone(config);this._result=null;this._cardKey='';this._start();
 }
 set hass(hass){
  if(this._connection&&this._connection!==(hass?.connection?.__dash6ActualConnection||hass?.connection))this._stopQuery();
  this._hass=hass;if(this._child)this._child.hass=hass;this._start();
 }
 get hass(){return this._hass;}
 connectedCallback(){this._start();}
 disconnectedCallback(){this._stopQuery();this._generation=(this._generation||0)+1;this._cardKey='';this._observer?.disconnect();}
 _stopQuery(){this._stop?.();this._stop=null;this._connection=null;this._queryToken=(this._queryToken||0)+1;}
 async _start(){
  if(!this._config||!this._hass||!this.isConnected)return;
  const key=JSON.stringify(this._config.card);
  if(key!==this._cardKey){
   this._cardKey=key;const generation=this._generation=(this._generation||0)+1;
   try{
    const child=await create(this._config.card);if(generation!==this._generation||!this.isConnected)return;
    child.hass=this._hass;this._child=child;this.shadowRoot.querySelector('.content').replaceChildren(child);
    this._observer??=new MutationObserver(()=>this._apply());this._observer.disconnect();this._observer.observe(this.shadowRoot.querySelector('.content'),{childList:true,subtree:true});this._apply();
   }catch(error){this._error(error);}
  }
  if(this._stop||!this._config.query?.template)return;
  this._connection=this._hass.connection?.__dash6ActualConnection||this._hass.connection;const token=this._queryToken;
  this._stop=watchInlineQuery(this._hass,this._config.query,(result,error)=>{if(token!==this._queryToken)return;if(error){this._error(error);return;}this._error('');this._result=result;this._apply();});
 }
 _error(error){this.shadowRoot.querySelector('.error').textContent=error?String(error.message||error):'';}
 _apply(){
  if(!this._result||!this._child)return;
  this._observer?.disconnect();
  const roots=new Set([this.shadowRoot.querySelector('.content')]);
  scan(this._child,element=>{if(element.shadowRoot)roots.add(element.shadowRoot);});if(this._child.shadowRoot)roots.add(this._child.shadowRoot);
  for(const rule of this._config.visibility||[]){
   if(!rule.id)continue;const values=(rule.indices||[]).map(index=>this._result[index]===true),visible=rule.mode==='any'?values.some(Boolean):values.every(Boolean);
   scan(this.shadowRoot.querySelector('.content'),element=>{if(['responsive-row-','responsive-col-','responsive-mod-'].some(prefix=>element.classList?.contains(prefix+rule.id))){if(visible)element.style.removeProperty('display');else element.style.setProperty('display','none','important');}});
  }
  for(const root of roots)this._observer?.observe(root,{childList:true,subtree:true});
 }
 getCardSize(){return this._child?.getCardSize?.()??10;}
 getGridOptions(){return this._config?.grid_options??this._child?.getGridOptions?.()??{columns:12};}
}
customElements.define('dash6-inline-layout',InlineLayout);
