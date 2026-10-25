// Calendar-hour counts from confirmed off -> on transitions. Request a full
// extra hour so the first visible partial hour has its complete evidence.
// The initial history state is a seed, never an opening event.
export async function fridgeDoorHistory(entity,start,end,hass){
 const hour=3600000,until=Math.min(end.getTime(),Date.now());
 const since=Math.floor(start.getTime()/hour)*hour-hour;
 const rows=await hass.callApi('GET','history/period/'+new Date(since).toISOString()+'?filter_entity_id='+encodeURIComponent(entity.entity_id)+'&end_time='+new Date(until).toISOString()+'&minimal_response&no_attributes');
 const history=rows[0]||[];if(!history.length)return [];
 const bins=new Map();let previous=null;
 for(const row of history){
  const time=Date.parse(row.last_changed||row.last_updated),key=Math.floor(time/hour)*hour;
  if(previous==='off'&&row.state==='on')bins.set(key,(bins.get(key)||0)+1);
  previous=row.state;
 }
 const points=[];
 for(let time=Math.floor(start.getTime()/hour)*hour;time<until;time+=hour){
  const right=Math.min(time+hour-1,until);
  // A gap in reported sensor availability makes that hour unknown.
  const evidence=history.filter(row=>Date.parse(row.last_changed||row.last_updated)<right);
  const seed=history.filter(row=>Date.parse(row.last_changed||row.last_updated)<=time).at(-1);
  const last=evidence.at(-1),valid=last&&seed&&['on','off'].includes(last.state)&&['on','off'].includes(seed.state);
  const gap=history.some(row=>{const t=Date.parse(row.last_changed||row.last_updated);return t>=time&&t<=right&&!['on','off'].includes(row.state);});
  const value=valid&&!gap?(bins.get(time)||0):null;
  // One centered column for each calendar hour; current hour is partial.
  points.push([time+hour/2,value]);
 }
 return points;
}
