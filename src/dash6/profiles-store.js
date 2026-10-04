import INDEX from './profile-index.json';
export const PROFILES={};
const pending=new Map();
export async function loadProfile(key){
 if(PROFILES[key])return PROFILES[key];
 const file=INDEX[key];if(!file)throw Error('Unbekanntes DASH6-Kartenprofil: '+key);
 if(!pending.has(file))pending.set(file,fetch(new URL((import.meta.url.includes('/chunks/')?'../':'./')+'profiles/'+file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Kartenprofil konnte nicht geladen werden ('+r.status+')');return r.json();}).then(data=>Object.assign(PROFILES,data)).catch(error=>{pending.delete(file);throw error;}));
 await pending.get(file);return PROFILES[key];
}
