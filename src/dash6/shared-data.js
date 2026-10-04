import {waitForViewReady} from './view-ready.js';
const connections=new WeakMap();
const allowed=new Set(['config/entity_registry/list','config/device_registry/list','config/area_registry/list','config/floor_registry/list','config/label_registry/list']);
function state(connection){
 let s=connections.get(connection);if(s)return s;
 s={cache:new Map(),listeners:new Set()};connections.set(connection,s);
 for(const registry of ['entity','device','area','floor','label'])connection.subscribeEvents?.(()=>{s.cache.delete('config/'+registry+'_registry/list');for(const listener of s.listeners)listener(registry);},registry+'_registry_updated').catch(()=>{});
 connection.addEventListener?.('ready',()=>s.cache.clear());
 s.proxy=new Proxy(connection,{get(target,key){if(key==='__dash6ActualConnection')return target;if(key==='sendMessagePromise')return message=>cached(s,target,message);const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 return s;
}
function cached(s,connection,message){
 if(/^(history\/|recorder\/.*statistics)/.test(message?.type||''))return waitForViewReady().then(()=>connection.sendMessagePromise(message));
 if(!allowed.has(message?.type)||Object.keys(message).some(k=>k!=='type'))return connection.sendMessagePromise(message);
 if(!s.cache.has(message.type)){const promise=connection.sendMessagePromise(message).catch(error=>{if(s.cache.get(message.type)===promise)s.cache.delete(message.type);throw error;});s.cache.set(message.type,promise);}
 return s.cache.get(message.type);
}
export function scopedHass(hass){
 if(hass?.__dash6Scoped||!hass?.connection?.sendMessagePromise)return hass;
 const s=state(hass.connection);
 return new Proxy(hass,{get(target,key){if(key==='__dash6Scoped')return true;if(key==='connection')return s.proxy;if(key==='callWS')return message=>cached(s,target.connection,message);if(key==='callApi'&&typeof target.callApi==='function')return (method,path,...args)=>method==='GET'&&/^history\//.test(path)?waitForViewReady().then(()=>target.callApi(method,path,...args)):target.callApi(method,path,...args);return Reflect.get(target,key,target);}});
}

export function watchRegistries(hass,listener){const connection=hass?.connection?.__dash6ActualConnection||hass?.connection;if(!connection?.sendMessagePromise)return ()=>{};const s=state(connection);s.listeners.add(listener);return ()=>s.listeners.delete(listener);}
