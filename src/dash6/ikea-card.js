import {LitElement,html,css} from 'lit';
import TEMPLATE from './ikea-template.json';
import './light-cards.js';
export const IKEA_DEFAULTS={name:'',icon:'',room:'',power_entity:'',energy_entity:'',switch_style:'liquid_glass',child_lock:false,child_lock_entity:'',led_entity:'',height:118,graph:{show:true,span:'24h',interval:'15min',update_interval:'15min',minimum:100,color:'#6ec7ff'},hold_action:{action:'more-info'}};
const unwrap=c=>c?.type==='custom:dash6-render-card'?unwrap(c.definition):c;
export function isLegacyIkea(c){return !c?._dash6_ikea_definition&&c?.type==='custom:button-card'&&!!c.entity&&!!c.custom_fields?.slot_1&&!!unwrap(c.custom_fields?.graph?.card)?.series?.[0]?.entity;}
export function ikeaConfig(c){const ids=c.triggers_update||[];return {type:'custom:dash6-ikea-card',entity:c.entity,power_entity:ids.find(id=>id.startsWith('sensor.')&&/(power|leistung)$/.test(id))||unwrap(c.custom_fields.graph.card).series[0].entity,energy_entity:ids.find(id=>id.startsWith('sensor.')&&/(energy|energie)$/.test(id))||'',child_lock_entity:ids.find(id=>id.endsWith('_child_lock'))||'',led_entity:ids.find(id=>id.endsWith('_led_enable'))||'',icon:unwrap(c.custom_fields.icon?.card)?.icon||'mdi:power-socket-eu',room:c.entity.includes('buro_')?'Büro':'',hold_action:c.hold_action||{action:'more-info'}};}
// Shared chart definition from the existing IKEA card, including its external
// portal tooltip. Derived Satin cards use this exact chart instead of a second
// graph/tooltip implementation.
export function ikeaBackgroundGraph(raw={}){
 const c={...IKEA_DEFAULTS,...raw,graph:{...IKEA_DEFAULTS.graph,...raw.graph}};
 if(!c.power_entity||!c.graph.show)return null;
 const g=structuredClone(TEMPLATE.custom_fields.graph.card);
 g.series[0].entity=c.power_entity;g.graph_span=c.graph.span;g.update_interval=c.graph.update_interval;g.series[0].group_by.duration=c.graph.interval;g.series[0].color=c.graph.color;g.series[0].name=c.name||'Leistung';
 g.apex_config.yaxis.max=`EVAL:function(max){return Math.max(${Math.max(0,Number(c.graph.minimum)||0)},max);}`;
 g.apex_config.tooltip.custom=g.apex_config.tooltip.custom.replace("row.textContent=(name||'Wert')", "const dot=document.createElement('span');dot.style.cssText='display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:'+w.globals.colors[i];row.append(dot);row.append(document.createTextNode((name||'Wert')").replace("+' '+(root.getRootNode().host?._config?.series?.[i]?.unit||'');tip.append(row)","+' '+(root.getRootNode().host?._config?.series?.[i]?.unit||'')));tip.append(row)");
 g.dash6_css.class=((g.dash6_css.class||'')+' dash6-background-graph').trim();
 return g;
}
export function ikeaDefinition(raw){const c={...IKEA_DEFAULTS,...raw,graph:{...IKEA_DEFAULTS.graph,...raw.graph}};const replacements={__ENTITY__:c.entity,__POWER__:c.power_entity,__ENERGY__:c.energy_entity,__LOCK__:c.child_lock_entity,__LED__:c.led_entity};const swap=x=>typeof x==='string'?x.replace(/__(ENTITY|POWER|ENERGY|LOCK|LED)__/g,m=>replacements[m]||''):Array.isArray(x)?x.map(swap):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,swap(v)])):x;const d=swap(TEMPLATE);d._dash6_ikea_definition=true;d.triggers_update=Object.values(replacements).filter(Boolean);d.variables={dash6_name:c.name,dash6_room:c.room};d.custom_fields.title="[[[ const n=variables.dash6_name || entity.attributes.friendly_name || entity.entity_id; return n.replace(variables.dash6_room,'').replace(/\\bIKEA\\b/ig,'').trim(); ]]]";d.custom_fields.icon.card.icon=c.icon||(c.entity?.startsWith('light.')?'mdi:lightbulb':'mdi:power-socket-eu');d.hold_action=c.hold_action;
 for(const style of d.styles.card)for(const key of ['height','min-height','max-height'])if(key in style)style[key]=`${c.height}px`;
 d.custom_fields.icon.card={type:'custom:dash6-glass-switch',entity:c.entity,name:c.name,icon:c.icon||(c.entity?.startsWith('light.')?'mdi:lightbulb':'mdi:power-socket-eu'),switch_style:c.switch_style,child_lock:c.child_lock,child_lock_entity:c.child_lock_entity};
 if(c.switch_style!=='classic'){d.styles.grid=[{'grid-template-areas':'"icon title slot_1" "icon status slot_2" "graph graph slot_3"'},{'grid-template-columns':'112px minmax(0,1fr) minmax(86px,auto)'},{'grid-template-rows':'32px 32px minmax(0,1fr)'}];}
 if(!c.led_entity)delete d.custom_fields.slot_3;
 const graph=ikeaBackgroundGraph(c);if(graph)d.custom_fields.graph={card:graph};else delete d.custom_fields.graph;
 if(c.definition)d.type=c.definition.type||d.type;return d;
}
class IkeaCard extends LitElement{
 static properties={hass:{attribute:false},_child:{state:true}};static styles=css`:host{display:block;min-width:0}`;
 static async getConfigElement(){await import('./ikea-editor.js');return document.createElement('dash6-ikea-editor');}
 static getStubConfig(){return {type:'custom:dash6-ikea-card',entity:'',...structuredClone(IKEA_DEFAULTS)};}
 async setConfig(c){if(!/^(light|switch)\./.test(c.entity))throw Error('Licht oder Schalter auswählen.');this._config=structuredClone(c);const token=this._token=(this._token||0)+1;const child=await window.__dash6Cards.create(ikeaDefinition(c));if(token!==this._token)return;child.hass=this.hass;this._child=child;}
 updated(){if(this._child)this._child.hass=this.hass;}
 getCardSize(){return 2;}
 disconnectedCallback(){super.disconnectedCallback();const t=document.getElementById('embedded-card-tooltip');if(t)t.style.display='none';}
 render(){return html`${this._child}`;}
}
customElements.define('dash6-ikea-card',IkeaCard);
window.customCards??=[];window.customCards.push({type:'dash6-ikea-card',name:'DASH6 IKEA / Messsteckdose',description:'Gemeinsame aktuelle Steckdosen- und Shelly-Lichtkarte mit externem Tooltip und GUI.',preview:true});
