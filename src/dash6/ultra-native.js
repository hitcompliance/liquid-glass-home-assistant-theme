/** Ultra external modules resolve custom tags. Route native cards through HA. */
export function normalizeUltraNativeCards(config){
 for(const row of config.layout?.rows||[])for(const column of row.columns||[])for(const module of column.modules||[]){
  const card=module.card_config;
  if(module.type!=='external_card'||!card?.type||card.type.startsWith('custom:'))continue;
  module.card_type='dash6-direct-card';module.card_config={type:'custom:dash6-direct-card',card};
 }
 return config;
}
