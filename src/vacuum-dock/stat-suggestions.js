// Conservative, device-scoped discovery. No state-changing HA requests.
const specs={
 default:[
  ['Filter','Filter',/(?:^|_)(?:filter_time_left|filter_remaining|filter_verbleibend)$/],
  ['Seitenbürste','Side brush',/(?:^|_)(?:side_brush_time_left|side_brush_remaining|seitenburste_verbleibend)$/],
  ['Hauptbürste','Main brush',/(?:^|_)(?:main_brush_time_left|main_brush_remaining|hauptburste_verbleibend)$/],
  ['Sensoren','Sensors',/(?:^|_)(?:sensor_time_left|sensor_time_remaining|sensoren_verbleibend|sensor_verbleibend)$/],
  ['Schmutzfänger','Strainer',/(?:^|_)(?:strainer_time_left|strainer_remaining|schmutzfanger_verbleibend)$/,'dock']
 ],
 cleaning:[
  ['Reinigungsfortschritt','Cleaning progress',/(?:^|_)(?:cleaning_progress|reinigungsfortschritt)$/],
  ['Reinigungsfläche','Cleaning area',/(?:^|_)(?:cleaning_area|reinigungsflache)$/],
  ['Reinigungszeit','Cleaning time',/(?:^|_)(?:cleaning_time|reinigungszeit)$/]
 ]
};
const normalized=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
export function suggestStats({group,registry,states,robot,dock,existing=[],german=false}){
 const rows=[...existing],used=new Set(existing.map(s=>s.entity));let ambiguous=0;
 for(const [de,en,pattern,scope] of specs[group]||[]){
  const device=scope==='dock'?(dock||robot):robot;
  const matches=registry.filter(e=>!/(?:^|_)(?:total|last|gesamt|letzte|letzter|letztes)(?:_|$)/.test(normalized(e.translation_key||e.entity_id.slice(7)))&&e.device_id===device&&!e.disabled_by&&e.entity_id.startsWith('sensor.')&&[e.translation_key,e.entity_id.slice(7),e.original_name,e.name,states[e.entity_id]?.attributes?.friendly_name].some(v=>pattern.test(normalized(v))));
  if(matches.some(e=>used.has(e.entity_id)))continue;
  if(matches.length>1){ambiguous++;continue;}
  if(matches.length!==1)continue;
  const entity=matches[0].entity_id,row={entity,title:german?de:en,scale:1};
  const unit=states[entity]?.attributes?.unit_of_measurement;
  const duration=group==='default'||de==='Reinigungszeit';
  if(duration){
   const target=group==='default'?'h':'min',seconds={s:1,sec:1,min:60,h:3600}[unit];
   // Only convert explicitly known duration units, never guess from a name.
   if(seconds){row.unit=target;const divisor=(target==='h'?3600:60)/seconds;if(divisor!==1)row.divide_by=divisor;}
  }
  rows.push(row);used.add(entity);
 }
 return {rows,added:rows.length-existing.length,ambiguous};
}
