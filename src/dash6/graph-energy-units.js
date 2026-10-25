// ApexCharts' series.unit is only a label, not a numeric unit conversion.
// Preserve source statistics and convert their values before aggregation.
export function normalizeEnergyUnits(config,hass){
 const scale={Wh:1,kWh:1000,MWh:1000000};
 for(const row of config.series||[]){
  const source=hass?.states?.[row.entity]?.attributes?.unit_of_measurement;
  const target=row.unit;
  if(!Object.hasOwn(scale,source)||!Object.hasOwn(scale,target)||source===target||row.transform||row.data_generator)continue;
  const factor=scale[source]/scale[target];
  row.transform=`if(x===null||x===undefined||x==='')return null;const v=Number(x);return Number.isFinite(v)?v*${factor}:null;`;
  // Upstream caches transformed points by entity: cached points from the old
  // label-only configuration must not mix with correctly converted values.
  config.cache=false;
 }
 return config;
}
