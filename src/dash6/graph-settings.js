import {preserveMeasurementStates} from './graph-continuity.js';
import {normalizeEnergyUnits} from './graph-energy-units.js';
// Presentation only. Energy is always read from native counters/statistics.
export const RESOLUTIONS=['1min','5min','10min','15min','30min','1h'];
export const GRAPH_SCOPES=['background','sidebar'];
export const HOVER_DEFAULTS={shadow:0,elasticity:1,growth:0,opacity:1,css:''};
export const SERIES_HOVER_DEFAULTS={shadow:4,elasticity:1,growth:20,opacity:1,dim:false,crosshair:true,css:''};
const number=(name,label,min,max,step=1)=>({name,label,selector:{number:{min,max,step,mode:'box'}}});
const select=(name,label,options)=>({name,label,selector:{select:{options,mode:'dropdown'}}});
export const resolutionOptions=RESOLUTIONS.map(value=>({value,label:value==='1h'?'1 Stunde':value.replace('min',' Minuten')}));
export const hoverControls=(prefix,series=false)=>[
 number(prefix+'shadow','Schatten (px)',0,30),number(prefix+'elasticity','Elastizität (0 = aus)',0,3,.1),number(prefix+'growth',series?'Vergrößerung aller Werte am Zeitpunkt (%)':'Vergrößerung des Diagramms (%)',0,series?100:12),number(prefix+'opacity','Deckkraft bei Hover (0–1)',0,1,.05),
 ...(series?[{name:prefix+'dim',label:'Andere Zeitpunkte abdunkeln',selector:{boolean:{}}},{name:prefix+'crosshair',label:'Gemeinsamen Zeitpunkt markieren',selector:{boolean:{}}}]:[]),
 {name:prefix+'css',label:'Zusätzliche CSS-Deklarationen bei Hover',selector:{text:{multiline:true}}}
];
export const graphThemeGroups=GRAPH_SCOPES.map(scope=>({scope,title:scope==='background'?'Karten-Hintergrunddiagramme':'Seitenleisten- und Overlay-Diagramme',controls:[
 {name:`graph_${scope}_span`,label:'Gemeinsame Zeitspanne (z. B. 24h)',selector:{text:{}}},
 ...(scope==='sidebar'?[{name:`graph_${scope}_legend_value`,label:'Aktuellen Entity-Wert in der Legende anzeigen',selector:{boolean:{}}}]:[]),
 ...['energy','power','other'].map(kind=>select(`graph_${scope}_${kind}_resolution`,{energy:'Auflösung Energie',power:'Auflösung Leistung',other:'Auflösung sonstige Werte'}[kind],resolutionOptions)),
 {name:`graph_${scope}_diagram`,type:'expandable',title:'Hover: gesamtes Diagramm',schema:hoverControls(`graph_${scope}_diagram_`)},
 {name:`graph_${scope}_series`,type:'expandable',title:'Hover: Werte am gemeinsamen Zeitpunkt',schema:hoverControls(`graph_${scope}_series_`,true)}
]}));
export const graphThemeControls=graphThemeGroups.flatMap(g=>g.controls);
const flatten=fields=>fields.flatMap(f=>f.schema?flatten(f.schema):[f]);
export const graphThemeFields=flatten(graphThemeControls);
export const graphToken=name=>'dash6-'+name.replaceAll('_','-');
export const graphThemeTokens=graphThemeFields.map(f=>graphToken(f.name));
export function graphSettingsVariables(values,prior={}){return Object.fromEntries(graphThemeFields.filter(f=>values[f.name]!==undefined&&values[f.name]!==prior[f.name]).map(f=>[graphToken(f.name),f.name.endsWith('_css')?JSON.stringify(String(values[f.name])):String(values[f.name])]));}
export function graphThemePreferences(style){const out={};for(const scope of GRAPH_SCOPES){const p=`graph_${scope}_`,defaults={span:'24h',legend_value:scope==='sidebar',energy_resolution:scope==='sidebar'?'15min':'1h',power_resolution:'15min',other_resolution:'15min'};for(const [k,v]of Object.entries(defaults))out[p+k]=v;for(const [kind,values]of [['diagram',HOVER_DEFAULTS],['series',SERIES_HOVER_DEFAULTS]])for(const [k,v]of Object.entries(values))out[p+kind+'_'+k]=kind==='diagram'&&k==='opacity'&&scope==='background'?.8:v;}
 for(const field of graphThemeFields){const raw=style.getPropertyValue('--'+graphToken(field.name)).trim();if(raw!==''){let value=raw;if(field.name.endsWith('_css')){try{value=JSON.parse(raw);}catch{}}out[field.name]=field.selector?.boolean?raw==='true':field.selector?.number?Number(raw):value;}}
 return out;
}
export const validSpan=value=>typeof value==='string'&&/^\d+(?:\.\d+)?(?:min|m|h|d|w)$/.test(value)&&parseFloat(value)>0&&spanMillis(value)<=31*86400000;
export function spanMillis(value){const match=String(value).match(/^(\d+(?:\.\d+)?)(min|m|h|d|w)$/);return match?Number(match[1])*({min:60000,m:60000,h:3600000,d:86400000,w:604800000}[match[2]]):NaN;}
export function measurementKind(row,hass){const state=hass?.states?.[row.entity],kind=state?.attributes?.device_class,unit=row.unit??state?.attributes?.unit_of_measurement;if(kind==='energy'||/^(?:k|M)?Wh$/.test(unit||''))return 'energy';if(kind==='power'||/^(?:k|M)?W$/.test(unit||''))return 'power';return 'other';}
export function resolveGraphSettings(config,scope,style,overrides={}){const all=graphThemePreferences(style),p=`graph_${scope}_`,own=overrides.inherit?overrides:{...config.dash6_graph,...overrides};const hover=(kind,defaults)=>Object.fromEntries(Object.keys(defaults).map(k=>[k,own[kind+'_hover']?.[k]??all[p+kind+'_'+k]??defaults[k]]));return {span:own.span??all[p+'span'],legend_value:own.legend_value??all[p+'legend_value'],resolutions:Object.fromEntries(['energy','power','other'].map(k=>[k,all[p+k+'_resolution']])),diagram_hover:hover('diagram',HOVER_DEFAULTS),series_hover:hover('series',SERIES_HOVER_DEFAULTS),series:own.series||[]};}
export function configuredGraph(config,settings,hass){
 const c=structuredClone(config);delete c.dash6_graph;delete c.dash6_graph_context;delete c.dash6_graph_id;
 c.graph_span=validSpan(settings.span)?settings.span:'24h';c.update_interval='5min';c.apex_config??={};
 if(c.series?.length&&c.series.every(row=>measurementKind(row,hass)==='energy'))settings.legend_value=false;
 if(c.header?.title)c.header.title=c.header.title.replace(/\b24\s*h\b/g,c.graph_span);
 c.series=(c.series||[]).map((source,index)=>{
  const row={...source},override=settings.series[index]||{};
  if(override.entity&&override.entity!==source.entity){row.entity=override.entity;for(const k of ['data_generator','transform','attribute','statistics','group_by','unit'])delete row[k];}
  const kind=measurementKind(row,hass),energy=kind==='energy';
  if(energy&&!row.statistics&&!row.data_generator&&['total','total_increasing'].includes(hass?.states?.[row.entity]?.attributes?.state_class))row.statistics={type:'change',period:'5minute',align:'end'};
  if(override.name!==undefined)row.name=override.name;if(override.color)row.color=override.color;
  if(override.type){row.type=override.type==='stacked'?'column':override.type==='step'?'line':override.type;if(override.type==='stacked')row.stack_group='dash6-stack';else delete row.stack_group;if(override.type==='step')row.curve='stepline';}
  let duration=override.resolution??settings.resolutions[kind]??row.group_by?.duration??'15min';
  // HA change statistics have 5-minute source points; never imply 1-minute energy precision.
  if(energy&&row.statistics&&duration==='1min')duration='5min';
  if(!RESOLUTIONS.includes(duration))duration='15min';
  row.group_by={...row.group_by,duration,func:energy?'sum':(row.group_by?.func||'avg'),fill:row.group_by?.fill||'null'};
  row.show={...row.show,legend_value:settings.legend_value};return row;
 });
 if(c.series.some(r=>r.stack_group))c.apex_config.chart={...c.apex_config.chart,stacked:true,stackOnlyBar:true};
 c.apex_config.legend={...c.apex_config.legend,formatter:settings.legend_value?"EVAL:function(name,opts){const host=opts.w.globals.dom.baseEl.getRootNode().host;const row=host?._config?.series?.[opts.seriesIndex],state=(host?._hass||host?._dash6Hass||host?.hass)?.states?.[row?.entity];const value=row?.attribute?state?.attributes?.[row.attribute]:state?.state;return name+': '+(value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value))?Number(value).toLocaleString('de-DE',{maximumFractionDigits:3})+' '+(row?.unit??state?.attributes?.unit_of_measurement??''):'—');}":'EVAL:function(name){return name;}'};
 return normalizeEnergyUnits(preserveMeasurementStates(c,hass),hass);
}
