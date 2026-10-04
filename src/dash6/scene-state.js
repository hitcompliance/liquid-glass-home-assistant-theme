// Compare scene targets with reported device state; activation time alone is not proof.
const cache=new Map();
const equal=(a,b,tolerance=0)=>typeof a==='number'&&typeof b==='number'?Math.abs(a-b)<=tolerance:Array.isArray(a)&&Array.isArray(b)?a.length===b.length&&a.every((v,i)=>equal(v,b[i],tolerance)):a===b;
export function sceneMatches(entities,states){
 if(!entities||!Object.keys(entities).length)return false;
 return Object.entries(entities).every(([id,target])=>{
  const actual=states[id];if(!actual||['unknown','unavailable'].includes(actual.state))return false;
  if(typeof target==='string')return actual.state===target;
  if(String(target.state)!==actual.state)return false;
  const a=actual.attributes||{},keys=id.startsWith('light.')?['brightness','effect','color_mode',...(target.color_mode==='color_temp'?['color_temp_kelvin','color_temp']:target.color_mode==='hs'?['hs_color']:target.color_mode==='xy'?['xy_color']:['rgb_color','rgbw_color','rgbww_color','hs_color','xy_color','color_temp_kelvin','color_temp'])]:Object.keys(target).filter(k=>!['state','friendly_name','icon','supported_features'].includes(k));
  if(id.startsWith('light.')&&actual.state==='off')return true;
  return keys.every(k=>!(k in target)||equal(target[k],a[k],k==='brightness'?1:k==='color_temp_kelvin'?10:k==='hs_color'?1:k==='xy_color'?.002:0));
 });
}
export function sceneTarget(hass,entity,notify){
 const id=hass?.states[entity]?.attributes?.id;if(!id||!hass.callApi)return null;
 let entry=cache.get(id);if(!entry||Date.now()-entry.time>60000){entry={time:Date.now(),value:entry?.value,callbacks:new Set()};cache.set(id,entry);hass.callApi('GET',`config/scene/config/${encodeURIComponent(id)}`).then(c=>{entry.value=c.entities;for(const fn of entry.callbacks)fn();entry.callbacks.clear();}).catch(()=>{entry.value=null;entry.callbacks.clear();});}
 if(!entry.value)entry.callbacks.add(notify);return entry.value;
}
