import {inDashboardScope} from './scope.js';
import {wrapSatinNativeConfig,bindSatinNativeCard,nativeSwitchPlan} from './satin-native.js';
import {mapDeviceSwitches,vendorLockAllowsSwitch} from './glass-switch.js';
import {isLegacyIkea,ikeaConfig} from './ikea-card.js';
import {mapSatinGraphConfig} from './satin-graph-card.js';
import {waitForViewReady} from './view-ready.js';
import {pruneVisibleEntities} from './visible-entities.js';
import {bindThemePreferences,unbindThemePreferences} from './material.js';
import {LitElement,html,css} from 'lit';
import {PROFILES,loadProfile} from './profiles-store.js';
import {scopedHass} from './shared-data.js';
import BASE_CSS from './base.css';
import {materialCSS,materialValue} from './material.js';
import {sceneMatches,sceneTarget} from './scene-state.js';
import {overlay,remote,remoteMain,remoteSubview} from './hooks.js';
const clone=x=>structuredClone(x);
const sheetCache=new Map();
const originalType=type=>type?.startsWith('custom:')?type.slice(7):'hui-'+type+'-card';
function rootCSS(mod){return typeof mod?.style==='string'?mod.style:mod?.style?.['.']||'';}
function mapCards(config){
 if(!config||typeof config!=='object')return config;
 if(Array.isArray(config))return config.map(mapCards);
 const c=mapDeviceSwitches(config);
 const protectedVendor=!vendorLockAllowsSwitch(c);
 if(!protectedVendor&&isLegacyIkea(c))return ikeaConfig(c);
 const metered=protectedVendor?c:mapSatinGraphConfig(c);if(metered!==c)return metered;
 if(c.type?.startsWith('custom:dash6-'))return c;
 if(c.type==='custom:embedded-view-card'){c.type='custom:dash6-embedded-view-card';delete c.card_mod;delete c.dash6_css;return c;}
 if(c.type==='custom:layout-card'&&c.layout?.display==='flex')c.layout_type='custom:dash6-pill-layout';
 if(c.type==='thermostat')return {type:'custom:dash6-thermostat-card',entity:c.entity,modes:c.features?.find(f=>f.type==='climate-hvac-modes')?.hvac_modes};
 if(c.type==='custom:more-info-card'&&c.entity?.startsWith('cover.'))return {type:'custom:dash6-cover-card',entity:c.entity};
 if(c.styles){const transform=x=>Array.isArray(x)?x.map(transform):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([key,v])=>{const k=key==='box_shadow'?'box-shadow':key;return [k,typeof v==='string'?materialValue(k,v):transform(v)]})):x;c.styles=transform(c.styles);}
 // Framed nested button-card icons receive their material before the first render.
 if(c.type==='custom:button-card'&&c.entity&&c.styles?.img_cell?.some(v=>v.border||v['border-radius'])&&inDashboardScope()){
  const lens={background:'var(--dash6-icon-lens-background)',border:'var(--dash6-icon-lens-border)','box-shadow':'var(--dash6-icon-lens-shadow)','backdrop-filter':'var(--dash5-control-backdrop)','-webkit-backdrop-filter':'var(--dash5-control-backdrop)'};
  c.styles.img_cell=c.styles.img_cell.filter(v=>!Object.keys(v).some(k=>k in lens));c.styles.img_cell.push(...Object.entries(lens).map(([k,v])=>({[k]:v})));
 }
 if(c.type?.includes('dash5-govee-light-card-v2')||c.type?.includes('dash5-multi-light-card-v2')||c.type?.includes('dash5-lightgroup-card-v2'))c.type=c.type.replace('dash5-','dash6-');
 if(!protectedVendor)for(const [key,value]of Object.entries(c)){
  if(key==='filter'||key==='styles'||key==='card_mod'||key==='dash6_css'||(c.type==='custom:auto-entities'&&key==='card'))continue;
  if(value&&typeof value==='object')c[key]=mapCards(value);
 }
 if(c.type==='custom:auto-entities')c.type='custom:dash6-auto-entities';
 if(c.type==='custom:apexcharts-card')c.type='custom:dash6-apexcharts-card';
 if(c.type==='media-control'&&!c.dash6_css&&!c.card_mod)c.dash6_css={style:''};
 if(c.type==='heading'&&!c.dash6_css&&!c.card_mod)c.dash6_css={style:''};
 if(c.dash6_css||c.card_mod||['custom:vertical-stack-in-card','vertical-stack','horizontal-stack','grid'].includes(c.type)){
  if(c.type==='custom:vertical-stack-in-card')c.type='custom:dash6-stack-card';
  let style=rootCSS(c.dash6_css||c.card_mod);let active=false;if(style.includes('{%')){active=!!c.dash6_active;style=BASE_CSS+'\nha-card{min-height:64px;box-sizing:border-box}:host{margin:0!important}:host([data-active=true]) ha-card{border-color:var(--dash6-active-border)!important;box-shadow:var(--dash6-active-shadow)!important}';delete c.dash6_active;}const classes=(c.dash6_css||c.card_mod)?.class||'';delete c.card_mod;delete c.dash6_css;
  // Nested shadow geometry is provided by the dedicated thermostat/cover cards.
  return {type:'custom:dash6-render-card',definition:c,skin:{css:style,classes,active}};
 }
 return wrapSatinNativeConfig(c);
}
export async function create(config){
 const helpers=await window.loadCardHelpers();return helpers.createCardElement(mapCards(config));
}
window.__dash6Cards={create,mapCards,overlay,remote,remoteMain,remoteSubview,profile:key=>clone(PROFILES[key]),loadProfile:async key=>clone(await loadProfile(key))};
class RenderCard extends LitElement {
 static properties={hass:{attribute:false},_child:{state:true},_error:{state:true}};
 static styles=css`:host{display:block;min-width:0} .error{padding:12px;border:1px solid var(--error-color);border-radius:16px;color:var(--error-color)}`;
 static async getConfigElement(){await import('./profile-editor.js');return document.createElement('dash6-profile-editor');}
 async setConfig(c){const signature=JSON.stringify(c);if(signature===this._signature)return;this._satinNative?.dispose();this._satinNative=null;this._signature=signature;this._config=clone(c);const generation=(this._generation||0)+1;this._generation=generation;
  try{
   const helpers=await window.loadCardHelpers();const config=mapDeviceSwitches(c.definition);
   const protectedVendor=!vendorLockAllowsSwitch(config),metered=protectedVendor?config:mapSatinGraphConfig(config);
   if(metered!==config&&c.skin?.css){metered.definition.dash6_css={style:c.skin.css,class:c.skin.classes||''};}
   delete config.card_mod;
   const child=await helpers.createCardElement(!protectedVendor&&isLegacyIkea(config)?ikeaConfig(config):metered);
   if(generation!==this._generation)return;
   let cssText=BASE_CSS+'\n'+(c.skin?.css||'');
   if(cssText.includes('{%'))cssText=BASE_CSS+'\nha-card{min-height:64px}';
   cssText=materialCSS(cssText)+'\n'+BASE_CSS.slice(BASE_CSS.indexOf('/* Scoped material geometry:')); 
   let sheet=sheetCache.get(cssText);if(!sheet){sheet=new CSSStyleSheet();sheet.replaceSync(cssText);sheetCache.set(cssText,sheet);}
   if(config.type==='picture-entity'&&inDashboardScope())child.style.setProperty('--ha-card-border-radius','var(--dash5-card-radius,16px)');
   child.dataset.active=c.skin?.active?'true':'false';
   if(config.type==='heading'&&inDashboardScope())child.classList.add('dash6-section-tab');
   if(config.type==='weather-forecast'&&inDashboardScope()){child.classList.add('dash6-weather-split');if(this._publicConfig?.profile?.endsWith('-0-1-1'))child.classList.add('dash6-sidebar-weather');}
   child.classList.add(...(c.skin?.classes||'').split(/\s+/).filter(Boolean));
   if(config.entity&&config.type==='custom:button-card'&&config.styles?.img_cell?.some(v=>v.border||v['border-radius'])&&inDashboardScope())child.classList.add('dash6-card-icon-lens');
   if((child.classList.contains('dash5-navigation-link')||config.type==='custom:button-card'&&config.tap_action?.action==='navigate'&&config.tap_action?.navigation_path?.startsWith('/dash-6/'))&&inDashboardScope()){child.classList.add('dash6-nav-lens');child.dataset.navActive=String(config.tap_action?.navigation_path===location.pathname);}
   const root=child.shadowRoot;
   if(root)root.adoptedStyleSheets=[...root.adoptedStyleSheets,sheet];
   else if(child.createRenderRoot){const original=child.createRenderRoot.bind(child);child.createRenderRoot=()=>{const r=original();if(r instanceof ShadowRoot)r.adoptedStyleSheets=[...r.adoptedStyleSheets,sheet];return r;};}
   if(config.entity?.startsWith('scene.')){const sceneSheet=new CSSStyleSheet();sceneSheet.replaceSync('ha-tile-info{height:36.8px!important;overflow:visible!important}[slot=secondary]{display:none!important}[slot=primary]{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:22.4px!important}');if(child.shadowRoot)child.shadowRoot.adoptedStyleSheets=[...child.shadowRoot.adoptedStyleSheets,sceneSheet];else{const original=child.createRenderRoot.bind(child);child.createRenderRoot=()=>{const r=original();r.adoptedStyleSheets=[...r.adoptedStyleSheets,sceneSheet];return r;};}}
   this.syncSwitchIcon(child,config);child.hass=scopedHass(this.hass);this._child=child;this._error='';
  }catch(error){this._error=String(error.message||error);}
 }
 syncSwitchIcon(child,config=this._config?.definition){if(config?.entity?.startsWith('switch.')&&child.classList.contains('dash6-card-icon-lens')){child.dataset.mainDomain='switch';child.dataset.mainState=this.hass?.states?.[config.entity]?.state||'unknown';}}
 updated(){if(this._child){const child=this._child;Promise.resolve(child.updateComplete).then(()=>{if(child!==this._child||!child.isConnected||!nativeSwitchPlan(this._config.definition))return;this._satinNative??=bindSatinNativeCard(child,this._config.definition);this._satinNative.sync(this._config.definition);});this.syncSwitchIcon(this._child);if(this._child.classList.contains('dash6-nav-lens'))this._child.dataset.navActive=String(this._config?.definition?.tap_action?.navigation_path===location.pathname);this._child.hass=scopedHass(this.hass);if(this._child.classList.contains('dash6-weather-split')){const child=this._child;Promise.resolve(child.updateComplete).then(()=>{if(!child.isConnected)return;const card=child.shadowRoot?.querySelector('ha-card');if(card)child.style.setProperty('--dash6-weather-border',getComputedStyle(card).borderLeftWidth);});}const entity=this._config?.definition?.entity;if(entity?.startsWith('scene.')){this._sceneNotify??=()=>this.requestUpdate();const target=sceneTarget(this.hass,entity,this._sceneNotify);this._child.dataset.active=String(!!this._config.skin?.active&&sceneMatches(target,this.hass?.states||{}));}}}
 getCardSize(){return this._child?.getCardSize?.()??3;}
 getGridOptions(){return this._config?.definition?.grid_options??this._child?.getGridOptions?.()??{columns:12};}
 render(){return this._error?html`<div role="alert" class="error">${this._error}</div>`:html`${this._child}`;}
 connectedCallback(){super.connectedCallback();bindThemePreferences(this);if(this._reconnect&&this._config){this._reconnect=false;this._signature=undefined;this.setConfig(this._publicConfig||this._config);}}
 disconnectedCallback(){this._satinNative?.dispose();this._satinNative=null;unbindThemePreferences(this);super.disconnectedCallback();this._reconnect=true;this._child?.__tvController?.close?.();}
}
customElements.define('dash6-render-card',RenderCard);
class ProfileCard extends RenderCard{
 static async getConfigElement(){await import('./profile-editor.js');return document.createElement('dash6-profile-editor');}
 async setConfig(c){const token=(this._profileToken||0)+1;this._profileToken=token;let source;try{source=await loadProfile(c.profile);}catch(error){if(token===this._profileToken)this._error=String(error.message||error);return;}if(token!==this._profileToken)return;let definition={...clone(source),...clone(c.overrides||{})};if(c.area){const swap=x=>typeof x==='string'?x.replace(/area_entities\((['"])[^'"]+\1\)/g,'area_entities('+JSON.stringify(c.area)+')'):Array.isArray(x)?x.map(swap):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='area'&&typeof v==='string'?c.area:swap(v)])):x;definition=swap(definition);}this._publicConfig=clone(c);const mapped=mapCards(definition);if(mapped.type==='custom:dash6-render-card')return super.setConfig(mapped);return super.setConfig({type:'custom:dash6-render-card',definition:mapped,skin:{css:'',classes:''}});}
}
customElements.define('dash6-profile-card',ProfileCard);

window.customCards??=[];window.customCards.push({type:'dash6-profile-card',name:'DASH6 integrierte Karte',description:'Vorbereitete Kartenprofile mit integriertem CSS vor dem ersten sichtbaren Rendern.',preview:true});
customElements.whenDefined('apexcharts-card').then(()=>{
 const Base=customElements.get('apexcharts-card');
 class Chart extends Base {
  static styles=[Base.styles,css`:host{position:relative}.dash6-refresh{position:absolute;right:6px;top:6px;width:32px;height:32px;display:grid;place-items:center;padding:0;border:1px solid transparent;border-radius:9px;background:transparent;color:var(--secondary-text-color);opacity:0;cursor:pointer;z-index:5;box-shadow:none;transition:opacity 140ms ease,border-color 140ms ease}.dash6-refresh:hover,.dash6-refresh:focus-visible{opacity:1;border-color:var(--divider-color);outline:none}.dash6-refresh ha-icon{--mdc-icon-size:19px}.dash6-refresh:disabled{cursor:wait}#spinner-wrapper{display:none!important}@media(hover:none){.dash6-refresh:focus,.dash6-refresh:active{opacity:1;border-color:var(--divider-color)}}`];
  setConfig(config){config=clone(config);const height=Number(config.apex_config?.chart?.height);if(Number.isFinite(height)&&height>0)this.style.minHeight=(height+(config.header?.show?55:0))+'px';else this.style.removeProperty('min-height');for(const axis of config.yaxis||[])if(axis.apex_config?.labels)delete axis.apex_config.labels.align;for(const axis of [config.apex_config?.yaxis].flat().filter(Boolean))if(axis.labels)delete axis.labels.align;const scoped=inDashboardScope();this._dash6Timed=scoped;super.setConfig({...config,type:'custom:apexcharts-card',...(scoped?{update_interval:'5min',show:{...config.show,loading:false}}:{})});}
  render(){return html`${super.render()}${this._dash6Timed?html`<button class="dash6-refresh" title="Graph aktualisieren" aria-label="Graph aktualisieren" ?disabled=${this._updating||this._manualBusy} @click=${this.refreshData}><ha-icon icon="mdi:refresh"></ha-icon></button>`:''}`;}
  async refreshData(){if(this._updating||this._manualBusy||!this.isConnected)return;this._manualBusy=true;this._manualRefresh=true;const caching=this._config.cache;this._config.cache=false;this.requestUpdate();try{await this._updateData()}finally{this._config.cache=caching;this._manualRefresh=false;this._manualBusy=false;this.requestUpdate();}}
  _guardChart(chart){if(!chart||chart._dash6Guard)return;chart._dash6Guard=true;for(const name of ['render','updateOptions','updateSeries'])if(typeof chart[name]==='function'){const original=chart[name].bind(chart);chart[name]=(...args)=>this.isConnected?original(...args):Promise.resolve();}}
  _disposeChart(chart){this._guardChart(chart);if(chart&&!chart._dash6Destroyed){chart._dash6Destroyed=true;try{chart.destroy?.()}catch(error){if(!(error instanceof TypeError))throw error;}}}
  _firstDataLoad(){this._dash6ChartReady=true;return super._firstDataLoad();}
  _updateOnInterval(){if(!this.isConnected||!this._dash6ChartReady||this._dash6Loading)return;return super._updateOnInterval();}
  _updateData(...args){if(!this.isConnected||!this._dash6ChartReady||!this._apexChart||!this._graphs){this._updating=false;return Promise.resolve();}if(this._dash6Timed&&!this._manualRefresh&&Date.now()-(this._lastDataFetch||0)<300000){this._updating=false;return Promise.resolve();}this._lastDataFetch=Date.now();this._guardChart(this._apexChart);this._guardChart(this._apexBrush);return super._updateData(...args);}
  _initialLoad(...args){
   if(!this.isConnected||this._dash6Visible===false){this._dash6Pending=args;return;}
   if(this._dash6Loading)return this._dash6Loading;
   const signal=this._dash6LoadAbort?.signal;this._dash6Loading=waitForViewReady(signal).then(ready=>{if(!ready||!this.isConnected)return;this._dash6ViewReadyAt=performance.now();return super._initialLoad(...args);}).catch(error=>{if(this.isConnected)throw error;}).finally(()=>{this._dash6Loading=null;this._guardChart(this._apexChart);this._guardChart(this._apexBrush);if(!this.isConnected)this._releaseCharts();});
   return this._dash6Loading;
  }
  connectedCallback(){this._dash6LoadAbort=new AbortController();this._dash6Visible=typeof IntersectionObserver!=='function';if(typeof IntersectionObserver==='function'){this._dash6Observer=new IntersectionObserver(entries=>{if(!entries.some(e=>e.isIntersecting))return;this._dash6Visible=true;this._dash6Observer.disconnect();if(this._dash6Pending){const args=this._dash6Pending;this._dash6Pending=null;this._initialLoad(...args);}},{rootMargin:'400px'});this._dash6Observer.observe(this);}super.connectedCallback();bindThemePreferences(this);if(this._dash6Pending){const args=this._dash6Pending;this._dash6Pending=null;queueMicrotask(()=>this._initialLoad(...args));}}
  _releaseCharts(){this._dash6ChartReady=false;this._lastDataFetch=0;this._disposeChart(this._apexChart);this._disposeChart(this._apexBrush);this._apexChart=undefined;this._apexBrush=undefined;this._loaded=false;this._dataLoaded=false;this._updating=false;}
  disconnectedCallback(){this._dash6LoadAbort?.abort();this._dash6Observer?.disconnect();super.disconnectedCallback?.();if(!this._dash6Loading)this._releaseCharts();}
 }
 customElements.define('dash6-apexcharts-card',Chart);
});
customElements.whenDefined('auto-entities').then(()=>{
 const Base=customElements.get('auto-entities');
 class AutoEntities extends Base{
  setConfig(config){this._dash6InitialBuilt=false;return super.setConfig(config);}
  async update_card(entities){
   try{
   const available=pruneVisibleEntities(entities,this.hass?.states).filter(x=>typeof x==='string'?!!this.hass?.states[x]:!x.entity||!!this.hass?.states[x.entity]);
   const scenes=available.filter(x=>x?.entity?.startsWith('scene.'));const latest=scenes.reduce((best,x)=>{const t=Date.parse(this.hass.states[x.entity]?.state)||0;return t>best.t?{id:x.entity,t}:best},{id:'',t:0});for(const x of scenes)x.dash6_active=x.entity===latest.id&&latest.t>Date.now()-43200000;
   if(scenes.length&&inDashboardScope())this.style.setProperty('--masonry-view-card-margin','0px');
   const raw={type:'entities',...clone(this._config.card||{}),[this._config.card_param||'entities']:available};
   const signature=JSON.stringify(raw);if(signature===this._dash6Signature&&this.card)return;
   this._dash6Signature=signature;this._entities=available;this._cardConfig=clone(this._config.card||{});
   const mapped=mapCards(raw);if(this.card&&this.card.localName===originalType(mapped.type))this.card.setConfig(mapped);else this.card=await create(raw);
   this.card.hass=this.hass;this.empty=available.length===0;const hide=available.length===0&&this._config.show_empty===false;if(hide)HTMLElement.prototype.setAttribute.call(this,'data-dash6-empty','');else HTMLElement.prototype.removeAttribute.call(this,'data-dash6-empty');if(hide)this.style.setProperty('display','none','important');else this.style.removeProperty('display');
   this._cardBuiltResolve?.();this.dispatchEvent(new Event('card-visibility-changed',{bubbles:true,cancelable:true,composed:true}));this.requestUpdate();
   }finally{this._dash6InitialBuilt=true;}
  }
 }
 if(!customElements.get('dash6-auto-entities'))customElements.define('dash6-auto-entities',AutoEntities);
});
