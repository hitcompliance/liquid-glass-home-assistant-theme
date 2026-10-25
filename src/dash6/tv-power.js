// Pick exactly one power route; never guess a TV state from remote connectivity.
export function tvPowerAction(states,config,desired){
 const usable=id=>Boolean(id&&states[id]&&!['unknown','unavailable'].includes(states[id].state));
 if(config.tv_remote){
  if(usable(config.tv_remote))return {domain:'remote',service:desired?'turn_on':'turn_off',entity_id:config.tv_remote};
  const id=desired?config.tv_power_on_button:config.tv_power_off_button;
  if(id&&states[id]&&states[id].state!=='unavailable')return {domain:'button',service:'press',entity_id:id};
  return null;
 }
 return usable(config.tv_entity)?{domain:'media_player',service:desired?'turn_on':'turn_off',entity_id:config.tv_entity}:null;
}
