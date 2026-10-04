import {LitElement,html,css} from 'lit';
import {ikeaBackgroundGraph,isLegacyIkea} from './ikea-card.js';
import {bindSatinMode,unbindSatinMode} from './satin-surface.js';
const unwrap=c=>c?.type==='custom:dash6-render-card'?unwrap(c.definition):c;
const marker='_dash6_satin_graph_passthrough';
const fieldCSS=`
/* This stylesheet belongs only to the Satin definition. A theme change rebuilds
   the original definition; the vendor host need not bind an icon adapter. */
:host #graph{position:absolute!important;left:0!important;right:0!important;bottom:0!important;width:100%!important;height:80px!important;margin:0!important;padding:0!important;z-index:1!important;overflow:hidden!important;pointer-events:auto!important;opacity:1!important;background:transparent!important}
:host #device,:host #icon{padding-left:12px!important;padding-top:12px!important;align-self:start!important;--dash6-satin-switch-track-top:0px;position:relative!important;z-index:2!important}
:host #values{padding-top:12px!important;position:relative!important;z-index:2!important}
:host #title,:host #status{position:relative!important;z-index:2!important}
`;
export function isSatinDerivedGraphCard(config){
 if(!config||config[marker]||isLegacyIkea(config)||config.type!=='custom:button-card'||!/^(light|switch|fan|input_boolean)\./.test(config.entity||''))return false;
 const graph=unwrap(config.custom_fields?.graph?.card);
 return !!(config.custom_fields?.values&&graph&&['custom:mini-graph-card','custom:apexcharts-card','custom:dash6-apexcharts-card'].includes(graph.type)&&powerEntity(config));
}
function powerEntity(config){
 const graph=unwrap(config.custom_fields?.graph?.card),entry=graph?.series?.[0]||graph?.entities?.[0];
 const entity=typeof entry==='string'?entry:entry?.entity;
 return entity?.startsWith('sensor.')?entity:'';
}
// Mini Graph entities are a different schema. In particular, their axis,
// aggregation and visibility keys must never be spread into an Apex series.
function miniGraphSeries(entry,index,original,base){
 const row=typeof entry==='string'?{entity:entry}:entry;
 const result={...structuredClone(base),entity:row.entity,color:row.color||base.color,type:'line'};
 if(row.attribute!==undefined)result.attribute=row.attribute;
 if(row.unit!==undefined||original.unit!==undefined)result.unit=row.unit??original.unit;
 else if(index>0)delete result.unit; // A secondary counter does not measure watts.
 const func=row.aggregate_func||original.aggregate_func;
 if(['raw','avg','min','max','last','first','sum','median','delta','diff'].includes(func))result.group_by.func=func;
 if(row.show_line===false){result.stroke_width=0;result.extend_to=false;}
 if(row.show_fill===false)result.opacity=1;
 const show={};
 if(row.show_state!==undefined)show.in_header=row.show_state;
 if(row.show_legend!==undefined)show.in_legend=row.show_legend;
 if(row.show_graph!==undefined)show.in_chart=row.show_graph;
 if(Object.keys(show).length)result.show=show;
 return result;
}
export function satinGraphDefinition(config){
 const d=structuredClone(config);d[marker]=true;
 const original=unwrap(config.custom_fields?.graph?.card);if(!original||!powerEntity(config))return d;
 const source=original.series?.[0]||original.entities?.[0],existingHeight=d.styles?.card?.find(x=>x.height)?.height||'118px';
 const pixelHeight=typeof existingHeight==='string'&&existingHeight.match(/^(\d+(?:\.\d+)?)px$/);
 const height=pixelHeight&&Number(pixelHeight[1])<118?'118px':existingHeight;
 const graph=ikeaBackgroundGraph({power_entity:powerEntity(config),name:source?.name||config.name||'',graph:{span:'24h',interval:'15min',update_interval:'15min',minimum:100,color:source?.color||(Array.isArray(original.line_color)?original.line_color[0]:original.line_color)||'#6ec7ff'}});
 if(!graph)return d;
 // Let Apex resolve the sensor's real friendly name when the source supplied none.
 if(!source?.name&&!config.name)delete graph.series[0].name;
 const series=original.series||original.entities||[];
 if(series.length>1){
  const mini=original.type==='custom:mini-graph-card',base=structuredClone(graph.series[0]);
  graph.series=series.map((entry,index)=>{const row=typeof entry==='string'?{entity:entry}:entry,result=mini?miniGraphSeries(entry,index,original,base):{...structuredClone(base),...structuredClone(row)};if(row.name||config.name)result.name=row.name||config.name;else delete result.name;return result;});
  if(mini){
   const rows=series.map(entry=>typeof entry==='string'?{entity:entry}:entry);
   if(rows.some(row=>typeof row.show_points==='boolean'))graph.apex_config.markers.size=rows.map(row=>row.show_points===true?4:0);
   if(rows.some(row=>row.y_axis==='secondary')){
    graph.series.forEach((row,index)=>row.yaxis_id=rows[index].y_axis==='secondary'?'dash6-secondary':'dash6-primary');
    graph.yaxis=[{id:'dash6-primary',show:false,min:original.lower_bound??0,max:original.upper_bound??'~100'},{id:'dash6-secondary',show:false,opposite:true,min:original.lower_bound_secondary??0,max:original.upper_bound_secondary??'auto'}];
    delete graph.apex_config.yaxis;
   }
  }else if(original.yaxis){graph.yaxis=structuredClone(original.yaxis);delete graph.apex_config.yaxis;}
  // Keep the IKEA portal unchanged; only resolve each mixed measurement's unit.
  // Explicit overrides (including an empty unit) win over the real entity unit.
  graph.apex_config.tooltip.custom=graph.apex_config.tooltip.custom.replace("(root.getRootNode().host?._config?.series?.[i]?.unit||'')","(()=>{const chart=root.getRootNode().host;const measurement=chart?._config?.series?.[i];const state=chart?._hass?.states?.[measurement?.entity]||chart?.hass?.states?.[measurement?.entity]||frame?.hass?.states?.[measurement?.entity];return measurement?.unit??state?.attributes?.unit_of_measurement??'';})()");
 }
 else graph.series[0].unit=source?.unit||original.unit||graph.series[0].unit;
 graph.dash6_css.class=((graph.dash6_css.class||'')+' dash6-background-graph').trim();
 d.custom_fields.graph={...d.custom_fields.graph,card:graph};
 d.styles??={};d.styles.card??=[];d.styles.custom_fields??={};
 // Keep the reference's 118px card (or an explicit existing larger card height).
 const upsert=(list,key,value)=>{const row=list.find(x=>Object.hasOwn(x,key));if(row)row[key]=value;else list.push({[key]:value});};
 for(const key of ['height','min-height','max-height'])upsert(d.styles.card,key,height);
 upsert(d.styles.card,'position','relative');upsert(d.styles.card,'padding','0');upsert(d.styles.card,'overflow','hidden');
 d.styles.custom_fields.graph=[{position:'absolute'},{left:'0'},{right:'0'},{bottom:'0'},{width:'100%'},{height:'80px'},{'z-index':'1'},{background:'transparent'},{overflow:'hidden'},{'pointer-events':'auto'},{opacity:'1'}];
 const grid=d.styles.grid||[];
 for(const rule of grid){if(Object.hasOwn(rule,'grid-template-rows'))rule['grid-template-rows']='32px 32px minmax(0,1fr)';if(Object.hasOwn(rule,'grid-template-columns'))rule['grid-template-columns']='112px minmax(0,1fr) minmax(86px,auto)';}
 const skin=d.dash6_css||d.card_mod||{};
 if(typeof skin.style==='string'||skin.style===undefined)skin.style=(skin.style||'')+'\n'+fieldCSS;
 else skin.style={...skin.style,'.':(skin.style['.']||'')+'\n'+fieldCSS};
 if(d.dash6_css)d.dash6_css=skin;else if(d.card_mod)d.card_mod=skin;else d.dash6_css=skin;
 return d;
}
export function mapSatinGraphConfig(config){
 return isSatinDerivedGraphCard(config)?{type:'custom:dash6-satin-graph-card',definition:structuredClone(config)}:config;
}
export class SatinGraphCard extends LitElement{
 static properties={hass:{attribute:false},_child:{state:true},_error:{state:true}};
 static styles=css`:host{display:block;min-width:0}.error{padding:12px;color:var(--error-color)}`;
 static async getConfigElement(){await import('./satin-native.js');return document.createElement('dash6-satin-native-editor');}
 setConfig(config){this._config=structuredClone(config);this._signature='';return this.rebuild();}
 async rebuild(){
  if(!this._config)return;const satin=getComputedStyle(this).getPropertyValue('--dash6-satin-enabled').trim()==='1';
  const signature=JSON.stringify(this._config.definition)+'|'+satin;if(signature===this._signature)return;this._signature=signature;
  const generation=(this._generation||0)+1;this._generation=generation;
  const definition=satin?satinGraphDefinition(this._config.definition):{...structuredClone(this._config.definition),[marker]:true};
  try{const child=await window.__dash6Cards.create(definition);if(generation!==this._generation)return;child.hass=this.hass;this._child=child;this._error='';}
  catch(error){if(generation===this._generation)this._error=error.message;}
 }
 connectedCallback(){super.connectedCallback();bindSatinMode(this,()=>this.rebuild());this.rebuild();}
 disconnectedCallback(){unbindSatinMode(this);super.disconnectedCallback();const tip=document.getElementById('embedded-card-tooltip');if(tip)tip.style.display='none';}
 updated(){if(this._child)this._child.hass=this.hass;this.rebuild();}
 getCardSize(){return this._child?.getCardSize?.()??2;}
 getGridOptions(){return this._config?.definition?.grid_options??this._child?.getGridOptions?.();}
 render(){return this._error?html`<div class="error" role="alert">${this._error}</div>`:html`${this._child}`;}
}
if(!customElements.get('dash6-satin-graph-card'))customElements.define('dash6-satin-graph-card',SatinGraphCard);
