// Dashboard-wide name rules. Empty lists intentionally override the defaults.
export const exclusionDefaults={
 update:[],
 button:['demo','identify','identifizieren','tado','zurücksetzen','reset'],
 sensor:['demo','thread capabilities','thread status','spannung','voltage','stromstärke','current','temperatur','temperature','energie','energy','gesamtleistung','gesamtenergie','volt'],
 switch:['adaptive lighting'],
 binary_sensor:['demo','anwesenheit','präsenz','presence','belegung']
};
export const exclusionLabels={update:'Updates',button:'Taster',sensor:'Sensoren',switch:'Schalter',binary_sensor:'Kontakte und Zustände',light:'Beleuchtung',climate:'Klima',cover:'Verdunklungen',fan:'Ventilatoren',media_player:'Medien',vacuum:'Staubsauger',remote:'Fernbedienungen',water_heater:'Warmwasser',scene:'Szenen',camera:'Kameras',lock:'Schlösser',siren:'Sirenen',automation:'Automationen',script:'Skripte',person:'Personen',device_tracker:'Geräte-Tracker',weather:'Wetter',calendar:'Kalender',number:'Zahlen',select:'Auswahllisten',text:'Texte',event:'Ereignisse',humidifier:'Luftbefeuchter',lawn_mower:'Rasenmäher',valve:'Ventile',alarm_control_panel:'Alarmanlagen',plant:'Pflanzen',todo:'To-do-Listen'};
export function normalizeNames(values){return [...new Set((Array.isArray(values)?values:String(values||'').split('\n')).map(v=>String(v).trim().toLowerCase()).filter(Boolean))];}
export function globalRules(config){
 const configured=config?.dash6_global_exclusions||{};
 const domains=new Set([...Object.keys(exclusionDefaults),...Object.keys(configured)]);
 return Object.fromEntries([...domains].filter(domain=>/^[a-z_]+$/.test(domain)).map(domain=>[domain,normalizeNames(configured[domain]??exclusionDefaults[domain]??[])]));
}
export function nameExcluded(id,hass,rules){
 const name=String(hass?.states?.[id]?.attributes?.friendly_name||id).toLowerCase();
 return (rules?.[id?.split('.')[0]]||[]).some(part=>part&&name.includes(part));
}
// Only card/row entities are considered; graph series, action targets and helper
// references must remain untouched. Group contents retain their own domains.
export function filterGlobalCards(value,hass,rules){
 if(typeof value==='string')return /^[a-z_]+\.[a-z0-9_]+$/.test(value)&&nameExcluded(value,hass,rules)?null:value;
 if(Array.isArray(value))return value.map(item=>filterGlobalCards(item,hass,rules)).filter(item=>item!==null);
 if(!value||typeof value!=='object')return value;
 if(value.entity&&nameExcluded(value.entity,hass,rules))return null;
 const result={...value};
 for(const key of ['cards','entities'])if(Array.isArray(value[key]))result[key]=filterGlobalCards(value[key],hass,rules);
 if(result.cards&&!result.cards.some(card=>card?.type!=='heading'))return null;
 return result;
}
