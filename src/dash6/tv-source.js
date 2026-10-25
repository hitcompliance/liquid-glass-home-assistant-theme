// Explicit input automations take precedence over player app/source lists.
export function tvSourceAutomations(config){
 return Object.fromEntries([['AppleTV',config.tv_source_appletv_automation],['HDMI 1',config.tv_source_hdmi_1_automation],['HDMI 3',config.tv_source_hdmi_3_automation]].filter(([,id])=>typeof id==='string'&&id.startsWith('automation.')));
}
export function tvSourceNames(state,config){
 const mapped=Object.keys(tvSourceAutomations(config));if(mapped.length)return mapped;
 const live=state?.attributes?.source_list,values=Array.isArray(live)?live.filter(v=>typeof v==='string'&&v.trim()):[];
 return [...new Set(values.length?values:(config.tv_sources||'').split(/[,\n]/).map(v=>v.trim()).filter(Boolean))];
}
export function tvSourceAction(states,config,source){
 const map=tvSourceAutomations(config),id=map[source],usable=entity=>Boolean(entity&&states[entity]&&!['unknown','unavailable'].includes(states[entity].state));
 if(Object.keys(map).length)return id&&usable(id)?{domain:'automation',service:'trigger',data:{entity_id:id,skip_condition:true}}:null;
 return usable(config.tv_entity)&&tvSourceNames(states[config.tv_entity],config).includes(source)?{domain:'media_player',service:'select_source',data:{entity_id:config.tv_entity,source}}:null;
}
