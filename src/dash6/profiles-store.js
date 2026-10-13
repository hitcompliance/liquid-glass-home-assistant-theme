import INDEX from './profile-index.json';
export const PROFILES={};
const pending=new Map();
let localIndex;
async function profileFile(key){
 if(INDEX[key])return INDEX[key];
 // Instance profiles are kept on the HA host, separate from distributable demos.
 localIndex ??= fetch(new URL((import.meta.url.includes('/chunks/')?'../':'./')+'profiles/index.json',import.meta.url)).then(r=>r.ok?r.json():{}).catch(()=>({}));
 const file=(await localIndex)[key];
 return typeof file==='string'&&/^[a-zA-Z0-9_.-]+\.json$/.test(file)?file:null;
}
export async function loadProfile(key){
 if(PROFILES[key])return PROFILES[key];
 const file=await profileFile(key);if(!file)throw Error('Unbekanntes DASH6-Kartenprofil: '+key);
 if(!pending.has(file))pending.set(file,fetch(new URL((import.meta.url.includes('/chunks/')?'../':'./')+'profiles/'+file,import.meta.url)).then(r=>{if(!r.ok)throw Error('Kartenprofil konnte nicht geladen werden ('+r.status+')');return r.json();}).then(data=>Object.assign(PROFILES,data)).catch(error=>{pending.delete(file);throw error;}));
 await pending.get(file);return PROFILES[key];
}
