// Targeted update for the installed DASH6 bundle; no frozen dashboard hooks.
import {bindGraphSurface} from './graph-surface.js';
import {sceneMatches,sceneTarget} from './scene-state.js';
import {inDashboardScope} from './scope.js';
const activeCSS=`:host([data-active="true"]) ha-card,:host([data-satin][data-satin][data-satin][data-satin][data-satin]) ha-card .scenes.scenes button[aria-pressed="true"],:host([data-satin][data-satin][data-satin][data-satin][data-satin]) ha-card .shoe-scenes.shoe-scenes button[aria-pressed="true"],:host([data-satin][data-satin][data-satin][data-satin][data-satin]) ha-card .scene-recess.scene-recess button[aria-pressed="true"]{outline:1px solid var(--dash6-active-border,#9fe8ff)!important;outline-offset:-1px;box-shadow:0 0 12px 2px rgba(109,216,255,.55),inset 0 0 8px rgba(109,216,255,.22)!important}`;
const activeSheet=new CSSStyleSheet();activeSheet.replaceSync(activeCSS);
function sheet(host){const root=host?.shadowRoot;if(root&&!root.adoptedStyleSheets.includes(activeSheet))root.adoptedStyleSheets=[...root.adoptedStyleSheets,activeSheet];}
function surface(host,config,frame){host._graphSurface?.dispose();host._graphSurface=bindGraphSurface(host,config,frame);}
customElements.whenDefined('dash6-render-card').then(()=>{
 const p=customElements.get('dash6-render-card').prototype;if(p._areaDisplay20261019)return;p._areaDisplay20261019=true;
 const set=p.setConfig,updated=p.updated;
 p.setConfig=function(config){if(config.definition?.entity?.startsWith('scene.')){config=structuredClone(config);const id=config.definition.entity;config.definition.tap_action={action:'perform-action',perform_action:'scene.turn_on',target:{entity_id:id}};}return set.call(this,config);};
 p.updated=function(...args){
  const result=updated.apply(this,args),child=this._child;if(!child||!inDashboardScope())return result;
  Promise.resolve(child.updateComplete).then(()=>{
   if(child!==this._child||!child.isConnected)return;
   const definition=this._config?.definition||{},id=definition.entity;
   if(id?.startsWith('scene.')){this._areaSceneNotify??=()=>this.requestUpdate();const target=sceneTarget(this.hass,id,this._areaSceneNotify);child.dataset.active=String(sceneMatches(target,this.hass?.states||{}));sheet(child);}
   if(definition.custom_fields?.graph&&child.shadowRoot&&this._areaGraphChild!==child){this._areaGraphChild=child;this._graphSurface?.dispose();this._graphSurface=bindGraphSurface(child,definition._dash6_graph||definition.graph);}
  });return result;
 };
});
for(const name of ['dash6-lightgroup-card-v2','dash6-govee-light-card-v2','dash6-multi-light-card-v2','dash6-shoe-cabinet-card'])customElements.whenDefined(name).then(()=>{
 const p=customElements.get(name).prototype;if(Object.hasOwn(p,'_areaLight20261019'))return;p._areaLight20261019=true;const render=p.render;
 p.render=function(...args){const result=render.apply(this,args);if(!inDashboardScope())return result;sheet(this);const frame=this.shadowRoot?.querySelector('ha-card.card');if(frame?.querySelector('.power-graph'))surface(this,this._config?.graph,frame);return result;};
});
