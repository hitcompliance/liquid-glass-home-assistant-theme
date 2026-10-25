// Recorder history reports state changes, not regularly repeated samples.
// This changes presentation only; explicit unavailable/null points stay null.
export function preserveMeasurementStates(config,hass){
 for(const row of config.series||[]){
  const state=hass?.states?.[row.entity],unit=row.unit??state?.attributes?.unit_of_measurement;
  const energy=state?.attributes?.device_class==='energy'||/^(?:k|M)?Wh$/.test(unit||'');
  if(energy||row.statistics||!['line','area'].includes(row.type||config.chart_type||'line'))continue;
  row.fill_raw='null';
  row.group_by={...row.group_by,fill:'last',start_with_last:true};
  // Upstream trims trailing null buckets: don't extend a valid point over an
  // outage at the chart's right edge. Valid states already fill empty buckets.
  row.extend_to=false;
 }
 return config;
}
