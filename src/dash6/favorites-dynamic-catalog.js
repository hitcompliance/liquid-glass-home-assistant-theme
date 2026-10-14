/** Lazy, read-only evaluation of template-only auto-entities sources. */
import {decodeInline,watchInlineQuery} from './inline-query.js';
import {inlineDomainGridDefinition} from './inline-domain-definition.js';
import {domainCards,domainDefinitionConfig,extractEntityReferences,buildDomainRegistry,registryExclusions,relatedDomainViews} from './domain-registry.js';
import {watchDomainRoom,roomDomainEntities} from './domain-room-data.js';
const clone = value => structuredClone(value);
const result = (status, card = null, error = null, count = 0) => ({status, card, error, count});
const meaningful = value => value != null && value !== false && (Array.isArray(value) ? value.length > 0 : typeof value === 'object' ? Object.keys(value).length > 0 : true);
const isHidden = (id, hass) => !!(hass?.entities?.[id]?.hidden_by || hass?.entities?.[id]?.disabled_by || hass?.entities?.[id]?.hidden);
export const ROOM_SLOT_CONFIG_URL = '/local/dash6-satin/room-loader-configs.json?v=20261012-7';
const roomDefinitions = new Map();

function roomConfigs(url) {
  if (!roomDefinitions.has(url)) roomDefinitions.set(url, Promise.resolve().then(() => fetch(url)).then(response => {
    if (!response.ok) throw new Error(`Raumlader-Konfiguration: ${response.status}`);
    return response.json();
  }));
  return roomDefinitions.get(url);
}

/** Resolve known static cards without subscribing to any room template. */
export async function resolveRoomSlot(card, hass, options = {}) {
  if (card?.type !== 'custom:dash6-room-slot-card') return clone(card);
  const url = options.url || ROOM_SLOT_CONFIG_URL;
  try {
    const room = (await roomConfigs(url))[card.room], slot = room?.slots?.[card.slot];
    if (!slot || !Array.isArray(slot.initial)) return clone(card);
    return {type: 'custom:dash6-render-card', definition: {type: 'vertical-stack', cards: clone(slot.initial)}, _favorites_room_source: {room: card.room, slot: card.slot, url}};
  } catch {return clone(card);}
}

/** Keep catalog paths equivalent to legacy slot expansion, without a lookup. */
export function resolveInlineDomain(card){
 if(card?.type!=='custom:dash6-domain-card')return clone(card);
 return {type:'custom:dash6-render-card',definition:{type:'vertical-stack',cards:clone(domainCards(card))},...(card.query?.template||card.area&&card.domain?{_favorites_inline_source:clone(card)}:{})};
}

function decodeRoomValue(value) {
  if (typeof value === 'string' && /^[\[{"]/.test(value.trim())) {
    try {return decodeRoomValue(JSON.parse(value));} catch {return value;}
  }
  if (Array.isArray(value)) return value.map(decodeRoomValue);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, decodeRoomValue(child)]));
  return value;
}

function restoreRoomFixtures(value, fixtures) {
  if (Array.isArray(value)) return value.map(child => restoreRoomFixtures(child, fixtures));
  if (!value || typeof value !== 'object') return value;
  let restored = {...value};
  if (value.dash6_ref !== undefined) {
    if (!fixtures[value.dash6_ref]) throw new Error(`Unbekannte Raumkarten-Vorlage: ${value.dash6_ref}`);
    restored = {...clone(fixtures[value.dash6_ref]), ...restored}; delete restored.dash6_ref;
  }
  return Object.fromEntries(Object.entries(restored).map(([key, child]) => [key, restoreRoomFixtures(child, fixtures)]));
}

function primaryIds(value, ids = []) {
  if (!value || typeof value !== 'object') return ids;
  if (value.entity && value.type) ids.push(value.entity);
  for (const child of Object.values(value)) primaryIds(child, ids);
  return ids;
}

function pruneRoomCards(value, hass, allow, drop) {
  if (Array.isArray(value)) return value.map(child => pruneRoomCards(child, hass, allow, drop)).filter(Boolean);
  if (!value || typeof value !== 'object') return value;
  if (value.entity && value.type && (!hass?.states?.[value.entity] || isHidden(value.entity, hass) || (allow && !allow.has(value.entity)) || drop?.has(value.entity))) return null;
  const pruned = Object.fromEntries(Object.entries(value).map(([key, child]) => [key, pruneRoomCards(child, hass, allow, drop)]));
  if (Array.isArray(pruned.cards) && !pruned.cards.some(card => card?.type !== 'heading')) return null;
  if (value.definition && !pruned.definition || value.card && !pruned.card) return null;
  return pruned;
}

async function materializeRoomSlot(card, hass, options) {
  const source = card._favorites_room_source;
  try {
    const room = (await roomConfigs(source.url || ROOM_SLOT_CONFIG_URL))[source.room], slot = room?.slots?.[source.slot];
    if (!room || !slot || !Array.isArray(slot.initial)) return result('error', null, 'Die gespeicherte Raum-Slot-Quelle ist nicht mehr verfügbar.');
    const query = globalThis.window?.__dash6RoomLoader?.queries?.get(source.room);
    let raw;
    if (query?.result !== undefined && query.result !== null) raw = clone(query.result);
    else {
      if (!hass?.connection?.subscribeMessage) return result('error', null, 'Die Home-Assistant-Templateverbindung ist noch nicht verfügbar.');
      if (typeof room.template !== 'string') return result('error', null, 'Der Raum besitzt kein gültiges Template.');
      const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, options.timeoutMs) : 10000;
      raw = await firstTemplateResult(hass, room.template, {...options, timeoutMs});
    }
    const values = decodeRoomValue(raw), defs = restoreRoomFixtures(decodeRoomValue(values?.[slot.index]), room.fixtures || []);
    if (!Array.isArray(defs)) return result('error', null, 'Das Raum-Template hat für diesen Slot keine gültige Kartenliste geliefert.');
    const configured = defs.map(item => item?.type === 'external_card' && item.card_config ? item.card_config : item);
    const allowed = new Set(primaryIds(configured));
    const fixed = pruneRoomCards(clone(slot.initial), hass, allowed, null) || [];
    const extra = pruneRoomCards(configured, hass, null, new Set(slot.known || [])) || [];
    const children = [...fixed];
    if (extra.length) {
      const param = slot.param || 'cards';
      if (typeof param !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(param)) return result('error', null, 'Der Raum-Slot besitzt einen ungültigen Kartenparameter.');
      children.push({...clone(slot.container || {type: 'vertical-stack'}), [param]: extra});
    }
    return result('ready', {type: 'custom:dash6-render-card', definition: {type: 'vertical-stack', cards: children}}, null, fixed.length + extra.length);
  } catch (error) {return result('error', null, error?.message || String(error));}
}

function visibleItem(value, hass) {
  if (typeof value === 'string') return isHidden(value, hass) ? null : value;
  if (Array.isArray(value)) return value.map(item => visibleItem(item, hass)).filter(item => item !== null);
  if (!value || typeof value !== 'object') return value;
  if (typeof value.entity === 'string' && isHidden(value.entity, hass)) return null;
  const next = {...value};
  // Only actual child cards/rows are filtered; helper entity attributes are preserved.
  for (const key of ['cards', 'card', 'definition', 'card_config', 'entities']) if (next[key] && typeof next[key] === 'object') next[key] = visibleItem(next[key], hass);
  if (value.card && !next.card) return null;
  if (value.definition && !next.definition) return null;
  if (Array.isArray(value.cards) && value.cards.length && !next.cards.length) return null;
  return next;
}

function firstTemplateResult(hass, template, options) {
  return new Promise((resolve, reject) => {
    let finished = false, unsubscribe, unsubscribeCalled = false, subscribed = false, hasResult = false, firstValue;
    const cleanup = () => {
      clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
      if (unsubscribe && !unsubscribeCalled) {unsubscribeCalled = true; try {Promise.resolve(unsubscribe()).catch(() => {});} catch {}}
    };
    const finish = (error, value) => {if (finished) return; finished = true; cleanup(); error ? reject(error) : resolve(value);};
    const abort = () => finish(new Error('Die dynamische Auswahl wurde abgebrochen.'));
    const timer = setTimeout(() => finish(new Error('Zeitüberschreitung beim Lesen der dynamischen Karten.')), options.timeoutMs);
    if (options.signal?.aborted) {abort(); return;}
    options.signal?.addEventListener('abort', abort, {once: true});
    Promise.resolve().then(() => hass.connection.subscribeMessage(event => {
      if (event?.error) {finish(new Error(typeof event.error === 'string' ? event.error : event.error.message || 'Das Template konnte nicht ausgewertet werden.')); return;}
      if (!event || !Object.prototype.hasOwnProperty.call(event, 'result')) return;
      if (finished || hasResult) return;
      hasResult = true; firstValue = event.result;
      if (subscribed) finish(null, firstValue);
    }, {type: 'render_template', template})).then(stop => {
      unsubscribe = typeof stop === 'function' ? stop : undefined;
      subscribed = true;
      if (finished) cleanup(); else if (hasResult) finish(null, firstValue);
    }, error => finish(error));
  });
}

function firstInlineResult(hass,query,options){
 return new Promise((resolve,reject)=>{
  let finished=false,stop,cleanupPending=false;
  const cleanup=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);if(stop){stop();stop=null;}else cleanupPending=true;};
  const finish=(error,value)=>{if(finished)return;finished=true;cleanup();error?reject(error):resolve(value);};
  const abort=()=>finish(new Error('Die dynamische Auswahl wurde abgebrochen.'));
  const timer=setTimeout(()=>finish(new Error('Zeitüberschreitung beim Lesen der dynamischen Karten.')),options.timeoutMs);
  if(options.signal?.aborted){abort();return;}options.signal?.addEventListener('abort',abort,{once:true});
  stop=watchInlineQuery(hass,query,(value,error)=>finish(error?new Error(error.message||String(error)):null,value));
  if(cleanupPending){stop?.();stop=null;}
 });
}

async function materializeInlineDomain(card,hass,options){
 const source=card._favorites_inline_source||card;
 if(source.area&&source.domain)return materializeRegistryDomain(source,hass,options);
 if(typeof source.query?.template!=='string'||!hass?.connection?.subscribeMessage)return result('error',null,'Die Home-Assistant-Templateverbindung ist noch nicht verfügbar.');
 try{
  const timeoutMs=Number.isFinite(options.timeoutMs)?Math.max(1,options.timeoutMs):10000;
  const raw=await firstInlineResult(hass,source.query,{...options,timeoutMs});
  const value=source.query.index===undefined?raw:raw?.[source.query.index];
  const definitions=source.query.canonical?value:decodeInline(value);
  if(!Array.isArray(definitions))return result('error',null,'Das Inline-Template hat keine gültige Kartenliste geliefert.');
  const configured=definitions.map(item=>item?.type==='external_card'&&item.card_config?item.card_config:item);
  const allowed=new Set(primaryIds(configured));
  const fixed=pruneRoomCards(clone(source.cards||[]),hass,allowed,null)||[];
  const extra=pruneRoomCards(configured,hass,null,new Set(source.known_entity_ids||primaryIds(source.cards)))||[];
  let definition;
  if(Number(source.columns)>1||source.combine===true)definition=inlineDomainGridDefinition(source,fixed,extra);
  else{
   const param=source.card_param||'cards';if(typeof param!=='string'||['__proto__','constructor','prototype'].includes(param))return result('error',null,'Der Inline-Block besitzt einen ungültigen Kartenparameter.');
   definition={type:'vertical-stack',cards:[...fixed,...(extra.length?[{...clone(source.container||{type:'vertical-stack'}),[param]:extra}]:[])]};
  }
  return result('ready',{type:'custom:dash6-render-card',definition:definition||{type:'vertical-stack',cards:[]}},null,fixed.length+extra.length);
 }catch(error){return result('error',null,error?.message||String(error));}
}

async function materializeRegistryDomain(source,hass,options){
 try{
  const timeoutMs=Number.isFinite(options.timeoutMs)?Math.max(1,options.timeoutMs):10000;
  const data=await new Promise((resolve,reject)=>{
   let stop,done=false,pending=false;const cleanup=()=>{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);if(stop)stop();else pending=true;};
   const finish=(value,error)=>{if(done)return;done=true;cleanup();error?reject(error):resolve(value);};const abort=()=>finish(null,Error('Die dynamische Auswahl wurde abgebrochen.'));
   const timer=setTimeout(()=>finish(null,Error('Zeitüberschreitung beim Lesen der Raum-Entities.')),timeoutMs);if(options.signal?.aborted){abort();return;}options.signal?.addEventListener('abort',abort,{once:true});
   stop=watchDomainRoom(hass,(value,error)=>finish(value,error));if(pending)stop();
  });
  const exclusionIds=new Set(extractEntityReferences(domainCards(source)));
  // A caller may supply the current dashboard to include sibling helper cards.
  if(options.dashboardConfig)for(const id of registryExclusions(buildDomainRegistry(options.dashboardConfig,source.dashboard||'default'),source.dashboard||'default',relatedDomainViews(options.dashboardConfig,[source.view])))exclusionIds.add(id);
  const config=domainDefinitionConfig(source),fixed=pruneRoomCards(config.cards,hass,null,null)||[];
  const extra=source.auto_entities===false?[]:roomDomainEntities(data,hass,source.area,source.domain,exclusionIds).map(entity=>({...clone(source.dynamic_card||{type:'tile'}),entity}));
  const definition=inlineDomainGridDefinition(config,fixed,extra)||{type:'vertical-stack',cards:[]};
  return result('ready',{type:'custom:dash6-render-card',definition},null,fixed.length+extra.length);
 }catch(error){return result('error',null,error?.message||String(error));}
}

/**
 * Invoke only after the user expands a dynamic source.
 * Resolves {status:'ready'|'unsupported'|'error', card, error, count}.
 * Successful .card is the auto-entities underlying card populated at card_param
 * (native default: 'entities'; layouts normally configure card_param:'cards').
 */
export async function materializeDynamicCard(card, hass, options = {}) {
  if(card?._favorites_inline_source||card?.type==='custom:dash6-domain-card')return materializeInlineDomain(card,hass,options);
  if (card?._favorites_room_source) return materializeRoomSlot(card, hass, options);
  if (!['custom:auto-entities', 'custom:dash6-auto-entities'].includes(card?.type) || typeof card.filter?.template !== 'string') return result('unsupported', null, 'Diese Quelle besitzt kein unterstütztes Auto-Entities-Template.');
  const extraFilters = Object.entries(card.filter).filter(([key, value]) => key !== 'template' && meaningful(value));
  if (extraFilters.length || meaningful(card.sort) || meaningful(card.unique) || meaningful(card.entities)) return result('unsupported', null, 'Zusätzliche Include-/Exclude-/Sortierregeln werden nicht als statische Auswahl nachgebildet.');
  if (!hass?.connection?.subscribeMessage) return result('error', null, 'Die Home-Assistant-Templateverbindung ist noch nicht verfügbar.');
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Math.max(1, options.timeoutMs) : 10000;
  try {
    const raw = await firstTemplateResult(hass, card.filter.template, {...options, timeoutMs});
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return result('error', null, 'Das Karten-Template hat keine JSON-Liste geliefert.');
    const param = card.card_param || 'entities';
    if (typeof param !== 'string' || !param || ['__proto__', 'constructor', 'prototype'].includes(param)) return result('unsupported', null, 'Der konfigurierte Kartenparameter ist ungültig.');
    const items = visibleItem(clone(parsed), hass);
    if (param === 'cards' && items.some(item => !item || typeof item !== 'object' || typeof item.type !== 'string')) return result('unsupported', null, 'Die dynamische Kartenliste enthält keine vollständigen Kartenkonfigurationen.');
    if (param === 'entities' && items.some(item => typeof item !== 'string' && (!item || typeof item !== 'object'))) return result('unsupported', null, 'Die dynamische Entitätenliste enthält ungültige Einträge.');
    const snapshot = {...clone(card.card || {type: 'entities'}), [param]: items};
    return result('ready', snapshot, null, items.length);
  } catch (error) {return result('error', null, error?.message || String(error));}
}
