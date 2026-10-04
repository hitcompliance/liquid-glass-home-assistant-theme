export const TYPE='custom:vacuum-dock-card';
export const FIELDS=[
 ['battery','sensor','Batterie','Battery'],['progress','sensor','Reinigungsfortschritt','Cleaning progress'],
 ['cleaning_mode','select','Reinigungsmodus','Cleaning mode'],['mop_intensity','select','Wisch-Intensität','Mop intensity'],['mop_route','select','Wisch-Modus','Mop route'],
 ['mop_drying','switch','Mopp-Trocknung','Mop drying'],['mop_washing','switch','Mopp-Wäsche','Mop washing'],['dust_emptying','switch','Staubentleerung','Dust emptying'],
 ['drying_remaining','sensor','Trocknungsrestzeit','Drying time remaining'],['clean_water','binary_sensor','Frischwassertank','Clean water tank'],['dirty_water','binary_sensor','Schmutzwassertank','Dirty water tank'],['emptying_mode','select','Entleerungsmodus','Emptying mode']
];
export const ID_MAP={battery:'battery',progress:'progress',mode:'cleaning_mode',intensity:'mop_intensity',route:'mop_route',drying:'mop_drying',washing:'mop_washing',emptying:'dust_emptying',dryTime:'drying_remaining',cleanWater:'clean_water',dirtyWater:'dirty_water',emptyMode:'emptying_mode'};
const object=x=>x&&typeof x==='object'&&!Array.isArray(x);
const entity=(id,domain)=>typeof id==='string'&&new RegExp('^'+domain+'\\.[a-z0-9_]+$').test(id);
export function normalizeConfig(input){
 if(!object(input)||!entity(input.entity,'vacuum'))throw Error('entity: vacuum.* is required');
 for(const k of ['entities','defaults','stats'])if(input[k]!==undefined&&!object(input[k]))throw Error(k+': expected an object');
 const c=structuredClone(input);c.type=TYPE;c.entities??={};c.defaults??={};c.stats={default:[],cleaning:[],...c.stats};c.areas??=[];c.language??='auto';c.drying_time_unit??='auto';
 if(!['auto','de','en'].includes(c.language))throw Error('language: auto, de or en');
 if(!['auto','s','min','h'].includes(c.drying_time_unit))throw Error('drying_time_unit: auto, s, min or h');
 for(const [k,d]of FIELDS){if(c.entities[k]==='')delete c.entities[k];if(c.entities[k]!==undefined&&!entity(c.entities[k],d))throw Error('entities.'+k+': expected '+d+'.*');}
 for(const k of Object.keys(c.entities))if(!FIELDS.some(f=>f[0]===k))throw Error('Unknown entity mapping: '+k);
 for(const k of Object.keys(c.defaults))if(!['mode','intensity','route','fan','repeat'].includes(k))throw Error('Unknown default: '+k);
 if(c.defaults.repeat!==undefined&&(!Number.isInteger(c.defaults.repeat)||c.defaults.repeat<1||c.defaults.repeat>3))throw Error('defaults.repeat: integer 1–3');
 for(const k of ['mode','intensity','route','fan'])if(c.defaults[k]!==undefined&&(typeof c.defaults[k]!=='string'||!c.defaults[k]))throw Error('defaults.'+k+': expected a nonempty option string');
 if(!Array.isArray(c.areas))throw Error('areas: expected array');const seen=new Set();for(const a of c.areas){if(!object(a)||!Number.isInteger(a.roborock_area_id)||a.roborock_area_id<1||seen.has(a.roborock_area_id))throw Error('areas: unique positive integer roborock_area_id required');if(!a.area_id&&!a.name)throw Error('areas: area_id or name required');seen.add(a.roborock_area_id);}
 for(const group of ['default','cleaning']){if(!Array.isArray(c.stats[group]))throw Error('stats.'+group+': expected array');for(const s of c.stats[group]){if(!object(s)||!entity(s.entity,'sensor'))throw Error('stats: expected sensor.*');if(s.divide_by!==undefined&&(!Number.isFinite(s.divide_by)||s.divide_by<=0))throw Error('stats.divide_by: positive number');if(s.scale!==undefined&&(!Number.isInteger(s.scale)||s.scale<0||s.scale>5))throw Error('stats.scale: integer 0–5');}}
 return c;
}
export function idsFor(c){return {vacuum:c.entity,...Object.fromEntries(Object.entries(ID_MAP).map(([k,v])=>[k,c.entities[v]]))};}
export function defaultsFor(c,states){const ids=idsFor(c),out={repeat:c.defaults.repeat??1,rooms:[]};for(const [k,preferred]of Object.entries({mode:'vac_and_mop',intensity:'moderate',route:'standard',fan:'balanced'})){const s=states[k==='fan'?c.entity:ids[k]],opts=k==='fan'?s?.attributes.fan_speed_list:s?.attributes.options;out[k]=c.defaults[k]??(opts?.includes(preferred)?preferred:opts?.includes(k==='fan'?s.attributes.fan_speed:s.state)?(k==='fan'?s.attributes.fan_speed:s.state):opts?.find(v=>!['unknown','custom','smart_mode','off'].includes(v)));}return out;}
export function planCleaning(c,states,draft){
 const ids=idsFor(c),commands=[];if(!states[c.entity]||['unavailable','unknown'].includes(states[c.entity].state))throw Error('Vacuum unavailable');
 for(const [k,id]of Object.entries({mode:ids.mode,intensity:ids.intensity,route:ids.route})){if(!id)continue;if(!states[id]||['unavailable','unknown'].includes(states[id].state)||!states[id].attributes.options?.includes(draft[k]))throw Error('Unsupported or unavailable option: '+k);commands.push(['select','select_option',{entity_id:id,option:draft[k]}]);}
 if(!Number.isInteger(draft.repeat)||draft.repeat<1||draft.repeat>3)throw Error('Cycles must be 1–3');
 const rooms=draft.rooms??[];if(!Array.isArray(rooms)||new Set(rooms).size!==rooms.length||rooms.some(n=>!c.areas.some(a=>a.roborock_area_id===n)))throw Error('Invalid room selection');
 if(draft.fan!==undefined&&draft.mode!=='mop'){if(!states[c.entity].attributes.fan_speed_list?.includes(draft.fan))throw Error('Unsupported fan speed');commands.push(['vacuum','set_fan_speed',{entity_id:c.entity,fan_speed:draft.fan}]);}
 if(rooms.length)commands.push(['vacuum','send_command',{entity_id:c.entity,command:'app_segment_clean',params:[{segments:rooms,repeat:draft.repeat}]}]);
 else {commands.push(['vacuum','start',{entity_id:c.entity}]);}
 return commands;
}
export function dryingMinutes(state,unit='auto'){if(!state||['unknown','unavailable'].includes(state.state)||!Number.isFinite(Number(state.state)))return null;const u=unit==='auto'?state.attributes.unit_of_measurement:unit;const factor={s:1/60,sec:1/60,min:1,h:60}[u];return factor===undefined?null:Math.max(0,Math.ceil(Number(state.state)*factor));}
