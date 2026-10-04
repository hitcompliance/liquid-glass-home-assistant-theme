import {inDashboardScope} from './scope.js';
import {LitElement,html,css,unsafeCSS} from 'lit';
import BASE_CSS from './base.css';
const tabView=()=>inDashboardScope();
const heading=c=>c?.type==='heading'||c?.definition?.type==='heading';
class GlassStack extends LitElement {
 static properties={hass:{attribute:false},_cards:{state:true}};
 static styles=[unsafeCSS(BASE_CSS),css`
:host{display:block;min-width:0;position:relative}ha-card{overflow:visible}
.section-heading{width:fit-content;max-width:calc(100% - 12px);margin:0;position:relative;z-index:1}.section-heading>*{display:block;max-width:100%}
:host ha-card.tab-body{position:relative;border-top-left-radius:0px!important;border-color:transparent!important;box-shadow:none!important;background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
.tab-surface,.tab-frame{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.tab-surface{background:var(--dash5-thin-background);backdrop-filter:var(--dash5-thin-filter);-webkit-backdrop-filter:var(--dash5-thin-filter);box-shadow:var(--dash5-thin-shadow);clip-path:var(--dash6-tab-outline);opacity:0}
:host([data-tab-ready]) .tab-surface{opacity:1}
.tab-frame{overflow:visible}.tab-frame path{fill:none;stroke:var(--dash6-tab-edge,var(--divider-color));stroke-width:var(--dash6-tab-edge-width,1px);vector-effect:non-scaling-stroke}
:host(.dash5-thin-flush) ha-card.area-body,:host(dash6-stack-card) ha-card.area-body{padding-top:0px!important}.area-body>.stack{margin-top:calc(-1 * var(--dash6-stack-border,1px))}.tab-body>.stack{margin-top:calc(-1 * var(--dash6-stack-border,1px))}.tab-body>.stack,.area-body>.stack{margin-bottom:calc(-1 * var(--dash6-stack-border,1px));margin-inline:calc(-1 * var(--dash6-stack-border,1px))}
.stack{display:flex;flex-direction:column;gap:max(8px,var(--dash6-entity-gap,8px));min-width:0}.stack>*{min-width:0;margin:0!important}.stack>[hidden],.stack>[data-dash6-empty]{display:none!important}.stack.horizontal{flex-direction:row}.stack.horizontal>*{flex:1}`];
 static getConfigElement(){return document.createElement('dash6-config-editor');}
 async setConfig(config){this._config=config;const sceneHeading=config.cards?.[0]?.heading||config.cards?.[0]?.definition?.heading;this._sceneStack=sceneHeading==='Szenen'||sceneHeading==='Home-Szenen';if(this._sceneStack)this.style.setProperty('--masonry-view-card-margin','0px');this._tabHeading=tabView()&&heading(config.cards?.[0]);this._areaHeader=tabView()&&config.cards?.[0]?.type==='custom:dash6-area-header';const generation=(this._generation||0)+1;this._generation=generation;const cards=await Promise.all((config.cards||[]).map(c=>window.__dash6Cards.create(c)));if(generation!==this._generation)return;for(const card of cards)card.hass=this.hass;this._cards=cards;this._syncSceneVisibility();}
 updated(){this._syncSceneVisibility();const body=this.shadowRoot?.querySelector('ha-card');if(body)this.style.setProperty('--dash6-stack-border',getComputedStyle(body).borderLeftWidth);for(const card of this._cards||[])card.hass=this.hass;const tab=this.shadowRoot?.querySelector('.section-heading');if(tab!==this._observedTab){this._tabObserver?.disconnect();this._observedTab=tab;if(tab){this._tabObserver=new ResizeObserver(()=>this._sizeTab());this._tabObserver.observe(tab);this._tabObserver.observe(this);}}this._sizeTab();}
 _sizeTab(){const tab=this._observedTab,frame=this.shadowRoot?.querySelector('.tab-frame path');if(!tab||!frame)return;const a=tab.getBoundingClientRect(),b=this.getBoundingClientRect();if(!a.width||!b.height)return;const style=getComputedStyle(this),r=Math.min(16,b.width/2,b.height/2),join=Math.min(12,b.width-a.width),x=a.width,y=a.height,w=b.width,h=b.height;
 const path=`M .5 ${r} Q .5 .5 ${r} .5 H ${x-r} Q ${x-.5} .5 ${x-.5} ${r} V ${y-join} Q ${x-.5} ${y+.5} ${x+join} ${y+.5} H ${w-r} Q ${w-.5} ${y+.5} ${w-.5} ${y+r} V ${h-r} Q ${w-.5} ${h-.5} ${w-r} ${h-.5} H ${r} Q .5 ${h-.5} .5 ${h-r} Z`;
 if(path!==this._outline){this._outline=path;this.style.setProperty('--dash6-tab-outline',`path("${path}")`);frame.setAttribute('d',path);}
 const border=style.getPropertyValue('--dash5-thin-border').trim();this.style.setProperty('--dash6-tab-edge',border.replace(/^\S+\s+\S+\s+/,''));this.style.setProperty('--dash6-tab-edge-width',`${parseFloat(border)||1}px`);this.setAttribute('data-tab-ready','');}
 connectedCallback(){super.connectedCallback();this._sceneVisibilityListener??=e=>{if(e.target!==this)this._syncSceneVisibility();};this.addEventListener('card-visibility-changed',this._sceneVisibilityListener);if(this._observedTab){this._tabObserver?.observe(this._observedTab);this._tabObserver?.observe(this);}}
 disconnectedCallback(){this.removeEventListener('card-visibility-changed',this._sceneVisibilityListener);this._tabObserver?.disconnect();super.disconnectedCallback();}
 _syncSceneVisibility(){if(!this._sceneStack)return;const contents=(this._cards||[]).slice(1);const empty=!contents.length||contents.every(c=>c.localName==='dash6-auto-entities'&&(!c._dash6Signature||c.empty));const change=this.hasAttribute('data-dash6-empty')!==empty;this.toggleAttribute('data-dash6-empty',empty);if(empty)this.style.setProperty('display','none','important');else this.style.removeProperty('display');const owner=this.getRootNode().host;if(owner&&['dash6-render-card','dash6-profile-card'].includes(owner.localName)){owner.toggleAttribute('data-dash6-empty',empty);if(empty)owner.style.setProperty('display','none','important');else owner.style.removeProperty('display');}if(change)this.dispatchEvent(new Event('card-visibility-changed',{bubbles:true,composed:true}));}
 getCardSize(){return (this._cards||[]).reduce((sum,c)=>sum+(c.getCardSize?.()??3),0);}
 render(){const cards=this._cards||[],tab=this._tabHeading;return html`${tab?html`<div class="tab-surface" aria-hidden="true"></div><svg class="tab-frame" aria-hidden="true"><path></path></svg><div class="section-heading">${cards[0]}</div>`:''}<ha-card class=${tab?'tab-body':this._areaHeader?'area-body':''}><div class=${'stack'+(this._config?.mode==='horizontal'?' horizontal':'')+((this._config?.cards||[]).length&&(this._config.cards.every(c=>c.skin?.classes?.includes('dash5-navigation-link')))?' navigation':'')}>${tab?cards.slice(1):cards}</div></ha-card>`;}

}
customElements.define('dash6-stack-card',GlassStack);
