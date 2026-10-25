// Scope to sidebar statistics; never change background sparklines or storage.
export function statisticsConfig(config){
 const c=structuredClone(config);
 if(!/^(Raumklima|Energie|Leistung|Raumverbrauch).*24\s*h/.test(c.header?.title||''))return c;
 c.apex_config??={};
 for(const row of c.series||[]){
  if(row.name==='Temperatur (Quelle inaktiv)'&&row.entity==='sensor.wohnzimmer_luftfeuchtigkeit_2'){
   row.entity='climate.wohnzimmer_smart_thermostat';row.attribute='current_temperature';row.name='Temperatur';delete row.data_generator;
  }
  if(row.yaxis_id==='temperature'||/^Temperatur/.test(row.name||''))row.show={...row.show,legend_value:true};
 }
 if(/^Raumklima/.test(c.header.title))c.apex_config.legend={...c.apex_config.legend,formatter:"EVAL:function(name,opts){const host=opts.w.globals.dom.baseEl.getRootNode().host;const row=host?._config?.series?.[opts.seriesIndex];if(row?.show?.legend_value===false)return name;const state=(host?._hass||host?.hass)?.states?.[row?.entity];const value=row?.attribute?state?.attributes?.[row.attribute]:state?.state;if(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))return name+': —';return name+': '+Number(value).toLocaleString('de-DE',{maximumFractionDigits:1})+' '+(row?.unit||state?.attributes?.unit_of_measurement||'');}"};
 return c;
}
export const statisticsCSS=`
:host([data-dash6-statistics]) ha-card{background:var(--dash6-statistics-background,var(--dash5-inner-background))!important;border:var(--dash5-inner-border)!important;border-radius:16px!important;box-shadow:var(--dash5-inner-shadow)!important;backdrop-filter:var(--dash5-inner-filter)!important;-webkit-backdrop-filter:var(--dash5-inner-filter)!important}
:host([data-dash6-statistics]) .apexcharts-area{fill-opacity:var(--dash6-statistics-fill-opacity,.18)}
:host([data-dash6-statistics]) .apexcharts-line{filter:drop-shadow(0 0 2px rgba(174,222,255,.16))}
`;
