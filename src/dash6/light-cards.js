import {scopedHass,watchRegistries} from './shared-data.js';
import {errorIndicator,reportError} from './error-indicator.js';
import {bindThemePreferences,unbindThemePreferences} from './material.js';
import BASE_CSS from './base.css';
import {bindSatinSlider} from './satin-slider-drag.js';
import {satinSurfaceCSS} from './satin-surface.js';
import {childLocked,switchVisual,setSwitchColorResolver} from './glass-switch.js';
/* DASH5 Light Cards v2. Standalone module; no legacy element is redefined. */
export const VERSION = '2.3.0-satin';
export const TYPES = { light: 'dash6-govee-light-card-v2', group: 'dash6-lightgroup-card-v2' };
const colorModes = new Set(['hs', 'xy', 'rgb', 'rgbw', 'rgbww']);
const neutralEffects = new Set(['none', 'off', 'no effect', 'kein effekt']);
export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n)));
const finite = n => n !== null && n !== undefined && Number.isFinite(Number(n));
const copy = value => JSON.parse(JSON.stringify(value));
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const PATCH_MARKER = '__dash6_card_config_patch_v1__';
export function cardSettingsStorageKey(config, pathname = globalThis.location?.pathname || '/', cardType = '') {
  const type = String(cardType || config?.type || TYPES.light).replace(/^custom:/, '');
  const identity = config?.config_id || [config?.entity || 'unknown', config?.detail_path || '', config?.name || ''].join('|');
  return `dash5-card-config-v2:${encodeURIComponent(pathname || '/')}:${encodeURIComponent(type)}:${encodeURIComponent(identity)}`;
}
export function createConfigPatch(before, after) {
  if (isRecord(before) && isRecord(after)) {
    const set = {}, unset = [];
    for (const key of Object.keys(after)) {
      const patch = Object.hasOwn(before, key) ? createConfigPatch(before[key], after[key]) : after[key];
      if (patch !== undefined) set[key] = patch;
    }
    for (const key of Object.keys(before)) if (!Object.hasOwn(after, key)) unset.push(key);
    if (!Object.keys(set).length && !unset.length) return undefined;
    return { [PATCH_MARKER]: true, set, unset };
  }
  return JSON.stringify(before) === JSON.stringify(after) ? undefined : copy(after);
}
export function applyConfigPatch(base, patch) {
  if (!patch || !patch[PATCH_MARKER]) return copy(patch === undefined ? base : patch);
  const result = isRecord(base) ? copy(base) : {};
  for (const key of patch.unset || []) delete result[key];
  for (const [key, value] of Object.entries(patch.set || {})) {
    result[key] = value?.[PATCH_MARKER] ? applyConfigPatch(result[key], value) : copy(value);
  }
  return result;
}
async function loadCardConfigPatch(hass, key) {
  const result = await hass.connection.sendMessagePromise({ type: 'frontend/get_user_data', key });
  return result?.value?.version === 1 ? result.value.patch : undefined;
}
async function saveCardConfigPatch(hass, key, patch) {
  await hass.connection.sendMessagePromise({ type: 'frontend/set_user_data', key, value: patch === undefined ? null : { version: 1, patch } });
}
const lightID = id => typeof id === 'string' && /^light\.[a-z0-9_]+$/.test(id);
const switchID = id => typeof id === 'string' && /^switch\.[a-z0-9_]+$/.test(id);
const controllableID = id => lightID(id) || switchID(id);
export function normalizeConfig(input) {
  if (!lightID(input?.entity)) throw new Error('Bitte eine light-Entity auswählen.');
  const config = copy(input);
  config.switch_style=config.switch_style==='classic'?'classic':'liquid_glass';
  const seen = new Set([config.entity]);
  config.segments = (config.segments || []).map(s => typeof s === 'string' ? { entity: s } : s)
    .filter(s => lightID(s?.entity) && !seen.has(s.entity) && seen.add(s.entity));
  config.segment_excludes = [...new Set((config.segment_excludes || []).filter(lightID))];
  config.scenes = (config.scenes || []).map(s => typeof s === 'string' ? { entity: s } : s)
    .filter(s => /^scene\.[a-z0-9_]+$/.test(s?.entity));
  config.segment_display = { placement: 'detail', style: 'list', columns: 'auto', ...config.segment_display };
  if (!['detail', 'inline'].includes(config.segment_display.placement)) config.segment_display.placement = 'detail';
  if (!['list', 'strip', 'ceiling-square', 'ceiling-round'].includes(config.segment_display.style)) config.segment_display.style = 'list';
  config.controls = { mode: 'combo', label: 'icon', buttons: 'group', density: 'compact', position: 'right', ...config.controls };
  if (!['combo', 'separate'].includes(config.controls.mode)) config.controls.mode = 'combo';
  if (!['icon', 'text'].includes(config.controls.label)) config.controls.label = 'icon';
  if (!['group', 'individual'].includes(config.controls.buttons)) config.controls.buttons = 'group';
  if (!['normal', 'compact'].includes(config.controls.density)) config.controls.density = 'compact';
  if (!['top', 'bottom', 'left', 'right'].includes(config.controls.position)) config.controls.position = 'right';
  config.main_back = { enabled: false, show_main: true, show_back: true, placement: 'detail', auto_detect: true, ...config.main_back };
  if (!['detail', 'header'].includes(config.main_back.placement)) config.main_back.placement = 'detail';
  if(!controllableID(config.main_back.main_entity))delete config.main_back.main_entity;
  if(!controllableID(config.main_back.back_entity))delete config.main_back.back_entity;
  config.discovery = { enabled: true, include_hidden: false, ...config.discovery };
  config.graph = { show: true, source: 'auto', span: '24h', interval: '15min', update_interval: '5min', height: 80, ...config.graph };
  if (!['auto', 'power', 'energy'].includes(config.graph.source)) config.graph.source = 'auto';
  if (!['5min', '15min', '30min', '1h'].includes(config.graph.interval)) config.graph.interval = '15min';
  config.graph.height = clamp(config.graph.height, 64, 120);
  return config;
}
export function available(state) { return Boolean(state && !['unknown', 'unavailable'].includes(state.state)); }
export function activeMode(state) {
  const a = state?.attributes || {};
  if (a.color_mode === 'color_temp') return 'color_temp';
  if (colorModes.has(a.color_mode)) return 'color';
  if (a.color_mode === 'white') return 'white';
  if (a.effect && !neutralEffects.has(String(a.effect).toLocaleLowerCase())) return 'effect';
  return 'brightness';
}
export function capabilities(state, config = {}) {
  const a = state?.attributes || {}, modes = a.supported_color_modes || [];
  const controls = config.controls || {};
  return {
    brightness: modes.some(m => m !== 'onoff' && m !== 'unknown') && controls.brightness !== false,
    color_temp: modes.includes('color_temp') && config.show_color_temp !== false && controls.color_temp !== false,
    color: modes.some(m => colorModes.has(m)) && controls.color !== false,
    white: modes.includes('white') && controls.white_channels !== false,
    effect: Array.isArray(a.effect_list) && a.effect_list.length > 0 && config.show_effects !== false && controls.effects !== false,
  };
}
export function kelvinBounds(state) {
  const a = state?.attributes || {};
  const min = Number(a.min_color_temp_kelvin), max = Number(a.max_color_temp_kelvin);
  return min > 0 && max >= min ? [min, max] : null;
}
export function kelvinRGB(kelvin) {
  const t = clamp(kelvin, 1000, 40000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * (t - 60) ** -0.1332047592;
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * (t - 60) ** -0.0755148492;
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [r, g, b].map(v => Math.round(clamp(v, 0, 255)));
}
export function hsRGB(h, s) {
  const c = clamp(s, 0, 100) / 100, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = 1 - c;
  const parts = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
  return parts.map(v => Math.round((v + m) * 255));
}
export function xyRGB(xy, brightness = 255) {
  if (!Array.isArray(xy) || xy.length < 2 || !Number.isFinite(Number(xy[0])) || !Number.isFinite(Number(xy[1])) || Number(xy[1]) <= 0) return null;
  const x = Number(xy[0]), y = Number(xy[1]), Y = clamp(brightness, 0, 255) / 255;
  const X = (Y / y) * x, Z = (Y / y) * (1 - x - y);
  const linear = [3.2406 * X - 1.5372 * Y - 0.4986 * Z, -0.9689 * X + 1.8758 * Y + 0.0415 * Z, 0.0557 * X - 0.2040 * Y + 1.0570 * Z];
  const encoded = linear.map(value => { const c = Math.max(0, value); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; });
  const peak = Math.max(...encoded);
  if (peak <= 0) return null;
  return encoded.map(value => Math.round(clamp(value / peak * 255, 0, 255)));
}
export function lightColor(state) {
  if (state?.state !== 'on') return 'var(--secondary-background-color,#383838)';
  const a = state.attributes || {};
  // color_mode is authoritative: integrations can retain stale RGB in white mode.
  if (a.color_mode === 'color_temp' && Number(a.color_temp_kelvin) > 0) return `rgb(${kelvinRGB(a.color_temp_kelvin).join(',')})`;
  if (a.color_mode === 'white') return 'rgb(255,250,240)';
  if (a.color_mode === 'xy' && Array.isArray(a.xy_color)) {
    const rgb = xyRGB(a.xy_color, a.brightness ?? 255);
    if (rgb) return `rgb(${rgb.join(',')})`;
  }
  if (a.color_mode === 'hs' && Array.isArray(a.hs_color)) return `rgb(${hsRGB(...a.hs_color).join(',')})`;
  const rgb = a.color_mode === 'rgbw' ? a.rgbw_color?.slice(0,3)
    : a.color_mode === 'rgbww' ? a.rgbww_color?.slice(0,3)
      : a.color_mode === 'rgb' ? a.rgb_color : null;
  if (Array.isArray(rgb)) return `rgb(${rgb.slice(0,3).map(v => Math.round(clamp(v,0,255))).join(',')})`;
  return 'var(--state-light-active-color,#ffd485)';
}
setSwitchColorResolver(lightColor);
export function segmentNumber(item, states = {}) {
  const id = typeof item === 'string' ? item : item?.entity;
  const label = `${item?.name || states[id]?.attributes?.friendly_name || ''} ${id || ''}`;
  const match = label.match(/(?:^|[^0-9])(\d+)\s*$/);
  return match ? Number(match[1]) : null;
}
export function numberedSegments(items, states = {}) {
  return [...items].sort((a,b) => {
    const an = segmentNumber(a,states), bn = segmentNumber(b,states);
    if (an != null && bn != null) return an-bn;
    if (an != null) return -1;
    if (bn != null) return 1;
    return String(a.name || states[a.entity]?.attributes?.friendly_name || a.entity)
      .localeCompare(String(b.name || states[b.entity]?.attributes?.friendly_name || b.entity), undefined, {numeric:true,sensitivity:'base'});
  });
}
export function segmentRoles(config, states = {}) {
  const members = numberedSegments((config.segments || []).map(s => typeof s === 'string' ? {entity:s} : s), states);
  if (!members.length) return { main: config.entity ? [config.entity] : [], back: [] };
  if (members.length === 1) return { main: [members[0].entity], back: [] };
  return { main: [members.at(-1).entity], back: members.slice(0,-1).map(s=>s.entity) };
}
export function roundSegmentPositions(count, shape = 'ceiling-round') {
  if (!Number.isInteger(count) || count < 1) return [];
  return Array.from({length:count},(_,index)=>{
    if (shape === 'ceiling-round') {
      const angle = -Math.PI/2 + 2*Math.PI*index/count;
      return {x:50+40*Math.cos(angle),y:50+40*Math.sin(angle)};
    }
    const perimeter = 4, distance = index/count*perimeter;
    if (distance < 1) return {x:8+84*distance,y:8};
    if (distance < 2) return {x:92,y:8+84*(distance-1)};
    if (distance < 3) return {x:92-84*(distance-2),y:92};
    return {x:8,y:92-84*(distance-3)};
  });
}
export function stripRows(items, columns) {
  const width = Math.max(1,Math.floor(Number(columns)||1)), rows=[];
  for(let index=0;index<items.length;index+=width){
    const row=items.slice(index,index+width);
    if(rows.length%2)row.reverse();
    rows.push(row);
  }
  return rows;
}
export function allSelected(ids, selected) { return ids.length > 0 && ids.every(id=>selected.has(id)); }
export function nextSelection(ids, selected, action) {
  const result=new Set(selected);
  if(action==='all'||action==='none'){
    for(const id of ids)action==='all'?result.add(id):result.delete(id);
  }else if(action==='invert'){
    for(const id of ids)result.has(id)?result.delete(id):result.add(id);
  }
  return result;
}
export function automaticSegments(config, states = {}, registry = []) {
  const root=config.entity, byId=new Map(registry.map(item=>[item.entity_id,item])),rootEntry=byId.get(root),excluded=new Set(config.segment_excludes||[]);
  const assigned=new Map((config.segments||[]).map(raw=>{const item=typeof raw==='string'?{entity:raw}:raw;return [item.entity,item];}));
  const contained=new Set(), deviceIds=new Set(rootEntry?.device_id?[rootEntry.device_id]:[]), visit=(id,trail=new Set())=>{
    if(!lightID(id)||id===root||trail.has(id))return;
    const entry=byId.get(id);if(entry?.device_id)deviceIds.add(entry.device_id);
    const next=new Set([...trail,id]);
    const children=states[id]?.attributes?.entity_id||[];
    if(children.length)for(const child of children)visit(child,next);else contained.add(id);
  };
  for(const id of states[root]?.attributes?.entity_id||[])visit(id,new Set([root]));
  const automatic=[];
  for(const[id,state]of Object.entries(states)){
    if(!lightID(id)||id===root||excluded.has(id)||!available(state))continue;
    if(Array.isArray(state.attributes?.entity_id)&&state.attributes.entity_id.length)continue;
    const entry=byId.get(id), direct=contained.has(id), sameDevice=Boolean(entry?.device_id&&deviceIds.has(entry.device_id));
    if(entry?.disabled_by||(entry?.hidden_by&&!config.discovery?.include_hidden))continue;
    if(!direct&&!sameDevice)continue;
    const existing=assigned.get(id);
    automatic.push(existing||{entity:id,name:state.attributes?.friendly_name||id,auto:true,discovery_reason:direct?'Enthaltenes Gruppenlicht':'Gleiches Gerät'});
  }
  return [...assigned.values()].filter(item=>!excluded.has(item.entity)).concat(automatic.filter(item=>!assigned.has(item.entity)));
}
export function leafEntities(ids, states, root, trail = new Set()) {
  const leaves = new Set();
  for (const id of ids) {
    if (!lightID(id) || id === root || trail.has(id)) continue;
    const children = states[id]?.attributes?.entity_id;
    if (Array.isArray(children) && children.length) {
      for (const leaf of leafEntities(children, states, root, new Set([...trail,id]))) leaves.add(leaf);
    } else leaves.add(id);
  }
  return [...leaves];
}
export function bulkCapabilities(ids, states) {
  const members = ids.map(id => states[id]).filter(available);
  if (members.length !== ids.length || !members.length) return {};
  const all = key => members.every(s => capabilities(s)[key]);
  const bounds = members.map(kelvinBounds);
  const min = bounds.every(Boolean) ? Math.max(...bounds.map(b=>b[0])) : 0;
  const max = bounds.every(Boolean) ? Math.min(...bounds.map(b=>b[1])) : -1;
  return { brightness: all('brightness'), color: all('color'), color_temp: all('color_temp') && min <= max,
    bounds: min <= max ? [min,max] : null,
    effects: all('effect') ? members[0].attributes.effect_list.filter(e => members.every(s => s.attributes.effect_list.includes(e))) : [] };
}
export function controlTarget(config, role, states = {}) {
  const mapped=config.main_back?.[`${role}_entity`];
  if(controllableID(mapped))return [mapped];
  if(config.main_back?.auto_detect===false)return [];
  return segmentRoles(config,states)[role]||[];
}
export function toggleServiceFor(hass, ids) {
  const availableIds=ids.filter(id=>controllableID(id)&&available(hass.states[id]));
  if(!availableIds.length)return null;
  const allOn=availableIds.every(id=>hass.states[id].state==='on');
  return {service:allOn?'turn_off':'turn_on',ids:availableIds};
}
export function graphConfig(config, states = {}) {
  const source=config.graph?.source||'auto';
  const energy=source==='energy'||(source==='auto'&&!config.power_entity&&config.energy_entity);
  const entity=energy?config.energy_entity:config.power_entity;
  if(!config.graph?.show||!/^sensor\.[a-z0-9_]+$/.test(entity||''))return null;
  const height=clamp(config.graph.height||80,64,120);
  const unit=states[entity]?.attributes?.unit_of_measurement||(energy?'Wh':'W');
  return {
    type:'custom:apexcharts-card',graph_span:config.graph.span||'24h',update_interval:config.graph.update_interval||'5min',
    header:{show:false},series:[{entity,type:'line',stroke_width:2,group_by:{func:'last',duration:config.graph.interval||'15min'}}],
    card_mod:{style:`ha-card{container-type:inline-size!important;background:transparent!important;border:0!important;box-shadow:none!important;margin:0!important;padding:0!important;height:${height}px!important;min-height:${height}px!important;max-height:${height}px!important;overflow:hidden!important;border-radius:0!important}.apexcharts-canvas,.apexcharts-svg,svg{display:block!important;width:100%!important;min-width:0!important;height:${height}px!important;min-height:${height}px!important;max-height:${height}px!important;box-sizing:border-box!important;overflow:visible!important}.apexcharts-tooltip{border:1px solid var(--divider-color)!important;border-radius:999px!important;background:var(--ha-card-background,var(--card-background-color))!important;box-shadow:var(--ha-card-box-shadow,0 2px 6px rgba(0,0,0,.24))!important;color:var(--primary-text-color)!important;padding:2px 4px!important}`},
    apex_config:{chart:{height,sparkline:{enabled:true},background:'transparent'},stroke:{curve:'straight'},markers:{size:0,hover:{size:4}},grid:{show:false},tooltip:{enabled:true,shared:false,intersect:false,followCursor:true,x:{format:'HH:mm'},y:{formatter:value=>`${Math.round(value).toLocaleString('de-DE')} ${unit}`}},yaxis:energy?{min:0}:{min:0,max:max=>Math.max(100,max)}}
  };
}
export function stopEffectData(state) {
  const a=state?.attributes||{}, neutral=(a.effect_list||[]).find(effect=>neutralEffects.has(String(effect).toLocaleLowerCase()));
  if(neutral)return {effect:neutral};
  if(a.color_mode==='color_temp'&&Number(a.color_temp_kelvin)>0)return {color_temp_kelvin:Number(a.color_temp_kelvin)};
  if(a.color_mode==='xy'&&Array.isArray(a.xy_color))return {xy_color:[...a.xy_color]};
  if(a.color_mode==='hs'&&Array.isArray(a.hs_color))return {hs_color:[...a.hs_color]};
  if(a.color_mode==='rgb'&&Array.isArray(a.rgb_color))return {rgb_color:[...a.rgb_color]};
  if(a.color_mode==='rgbw'&&Array.isArray(a.rgbw_color))return {rgbw_color:[...a.rgbw_color]};
  if(a.color_mode==='rgbww'&&Array.isArray(a.rgbww_color))return {rgbww_color:[...a.rgbww_color]};
  return {effect:'None'};
}
export function commandPatch(state, data, service = 'turn_on') {
  if (service === 'turn_off') return { state: 'off' };
  const patch = { state: 'on' };
  if (finite(data.brightness_pct)) patch.brightness = Math.round(clamp(data.brightness_pct,0,100)*2.55);
  if (finite(data.brightness)) patch.brightness = clamp(data.brightness,0,255);
  if (finite(data.color_temp_kelvin)) Object.assign(patch, { color_mode:'color_temp', color_temp_kelvin:Number(data.color_temp_kelvin), effect:null });
  if (Array.isArray(data.hs_color)) Object.assign(patch, { color_mode:'hs', hs_color:data.hs_color, rgb_color:hsRGB(...data.hs_color), effect:null });
  for(const [key,mode] of [['rgb_color','rgb'],['rgbw_color','rgbw'],['rgbww_color','rgbww'],['xy_color','xy']])if(Array.isArray(data[key]))Object.assign(patch,{color_mode:mode,[key]:data[key],...(key.startsWith('rgb')?{rgb_color:data[key].slice(0,3)}:{}),effect:null});
  if (finite(data.white)) Object.assign(patch,{ color_mode:'white', brightness:Number(data.white), effect:null });
  if (data.effect !== undefined) patch.effect = data.effect;
  return patch;
}
function equivalent(key, a, b) {
  if (key === 'effect' && a === null) return b == null || ['none','off','None','Off'].includes(b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((n,i)=>Math.abs(n-b[i]) <= (key === 'rgb_color' ? 4 : 1));
  if (key === 'brightness') return finite(b) && Math.abs(a-b) <= 2;
  if (key === 'color_temp_kelvin') return finite(b) && Math.abs(a-b) <= 25;
  if (key === 'color_mode' && colorModes.has(a) && colorModes.has(b)) return true;
  return a === b;
}
export class OptimisticStore {
  constructor({ now = Date.now, timer = (fn,ms)=>setTimeout(fn,ms), clearTimer = handle=>clearTimeout(handle) } = {}) {
    this.now=now;this.timer=timer;this.clearTimer=clearTimer;this.entries=new Map();this.errors=new Map();this.errorEvents=new Map();this.listeners=new Set();this.sequence=0;this.timers=new Map();this.intents=new Map();
  }
  subscribe(fn) { this.listeners.add(fn); return ()=>this.listeners.delete(fn); }
  emit() { for(const fn of this.listeners) fn(); }
  put(id, patch, timeout=60000) {
    if (!controllableID(id)) throw new Error('Optimistische Lichtzustände akzeptieren nur light- oder switch-Entities.');
    const seq=++this.sequence, values=this.entries.get(id)||new Map();
    if(patch.color_mode==='color_temp')for(const key of ['hs_color','rgb_color','rgbw_color','rgbww_color','xy_color'])values.delete(key);
    if(['hs','rgb','rgbw','rgbww','xy'].includes(patch.color_mode))values.delete('color_temp_kelvin');
    for(const [key,value] of Object.entries(patch)) values.set(key,{value,seq});
    this.entries.set(id,values);this.errors.delete(id);this.errorEvents.delete(id);
    this.cancelTimer(id);this.emit();return seq;
  }
  cancelTimer(id){const handle=this.timers.get(id);if(handle!==undefined)this.clearTimer(handle);this.timers.delete(id);}
  accepted(id,seq,timeout=60000){
    if(![...(this.entries.get(id)?.values()||[])].some(item=>item.seq===seq))return;
    this.cancelTimer(id);const handle=this.timer(()=>{this.timers.delete(id);this.fail(id,seq,'Geräterückmeldung verzögert. Gewünschte Einstellung bleibt erhalten.');},clamp(timeout,30000,120000));handle?.unref?.();this.timers.set(id,handle);
  }
  fail(id,seq,message) {
    if(![...(this.entries.get(id)?.values()||[])].some(item=>item.seq===seq))return;
    this.errors.set(id,message);this.errorEvents.set(id,{message,seq});this.emit();
  }
  remember(id,patch,state){
    if(id!=='light.example_26'||!['color_temp','rgb','hs','xy','rgbw','rgbww'].includes(patch.color_mode))return;
    this.intents.set(id,{patch:Object.fromEntries(Object.entries(patch).filter(([key])=>key==='color_mode'||key.includes('color'))),baseline:state,confirmed:false});
  }
  matchesColor(intent,state){
    if(state?.state!=='on')return false;
    const expected=lightColor({state:'on',attributes:intent.patch}),actual=lightColor(state);
    const numbers=value=>value.match(/[\d.]+/g)?.map(Number),a=numbers(expected),b=numbers(actual);
    if(!a||!b||a.length!==3||b.length!==3)return false;
    const am=Math.max(...a),bm=Math.max(...b);if(!am||!bm)return false;
    return a.every((v,i)=>Math.abs(v/am-b[i]/bm)<.09);
  }
  reconcile(id,state) {
    if(!state)return;
    const intent=this.intents.get(id),values=this.entries.get(id);
    if(intent){
      const matched=this.matchesColor(intent,state);
      if(matched){intent.confirmed=true;intent.baseline=state;}
      else if(intent.confirmed&&state!==intent.baseline){
        // Brightness-only reports retain the chosen mode; a new color/effect or power-off releases it.
        const colorStamp=s=>JSON.stringify([s?.state,s?.attributes?.color_mode,s?.attributes?.hs_color,s?.attributes?.rgb_color,s?.attributes?.xy_color,s?.attributes?.color_temp_kelvin,s?.attributes?.effect]);
        if(colorStamp(state)!==colorStamp(intent.baseline)){this.intents.delete(id);if(values)for(const key of [...values.keys()])if(key==='color_mode'||key.includes('color'))values.delete(key);}
      }
      if(matched&&values)for(const key of [...values.keys()])if(key==='color_mode'||key.includes('color'))values.delete(key);
    }
    if(!values)return;
    for(const [key,item] of values)if(equivalent(key,item.value,key==='state'?state.state:state.attributes?.[key]))values.delete(key);
    if(!values.size){this.entries.delete(id);this.cancelTimer(id);this.errors.delete(id);this.errorEvents.delete(id);}
  }
  get(id,state) {
    const values=this.entries.get(id),intent=this.intents.get(id);if(!values&&!intent)return state;
    const result={...(state||{entity_id:id,state:'unknown'}),attributes:{...state?.attributes}};
    if(intent)Object.assign(result.attributes,intent.patch);
    for(const [key,item] of values||[]) if(key==='state')result.state=item.value;else result.attributes[key]=item.value;
    return result;
  }
  pending(id){return this.entries.has(id);}
}
export const optimistic = new OptimisticStore();
const lightCommands=new Map();
export function dispatchLight(id,run){
  const previous=lightCommands.get(id)||Promise.resolve();const current=previous.catch(()=>{}).then(run);lightCommands.set(id,current);
  current.finally(()=>{if(lightCommands.get(id)===current)lightCommands.delete(id);}).catch(()=>{});return current;
}
export async function sendLight(hass,id,data={},service='turn_on',config={}) {
  if(!lightID(id)||!['turn_on','turn_off'].includes(service))throw new Error('Ungültiger Lichtauftrag.');
  if(childLocked(config,hass.states))throw new Error('Kindersicherung aktiv.');
  if(!available(hass.states[id]))throw new Error('Licht ist nicht verfügbar.');
  const patch=commandPatch(hass.states[id],data,service);optimistic.remember(id,patch,hass.states[id]);
  const seq=config.feedback?.optimistic===false?null:optimistic.put(id,patch);
  try { await dispatchLight(id,()=>{if(childLocked(config,hass.states))throw new Error('Kindersicherung aktiv.');return hass.callService('light',service,{...data,entity_id:id});});if(seq!==null)optimistic.accepted(id,seq,config.feedback?.timeout_ms||60000); }
  catch(error){if(seq!==null)optimistic.fail(id,seq,error?.message||String(error));throw error;}
}
export async function setTarget(hass,id,service,config={}) {
  if(!controllableID(id)||!['turn_on','turn_off'].includes(service))throw new Error('Ungültige Licht-/Schalteraktion.');
  if(childLocked(config,hass.states))throw new Error('Kindersicherung aktiv.');
  const domain=id.split('.')[0],state=hass.states[id];
  if(!available(state))throw new Error('Licht oder Schalter ist nicht verfügbar.');
  const patch={state:service==='turn_on'?'on':'off'};
  const seq=config.feedback?.optimistic===false?null:optimistic.put(id,patch,config.feedback?.timeout_ms||60000);
  try{await dispatchLight(id,()=>{if(childLocked(config,hass.states))throw new Error('Kindersicherung aktiv.');return hass.callService(domain,service,{entity_id:id});});if(seq!==null)optimistic.accepted(id,seq,config.feedback?.timeout_ms||60000);}
  catch(error){if(seq!==null)optimistic.fail(id,seq,error?.message||String(error));throw error;}
}
export async function toggleTargets(hass,ids,config={}) {
  const target=toggleServiceFor(hass,ids);if(!target)throw new Error('Kein verfügbares Haupt-/Backlight gefunden.');
  const results=await Promise.allSettled(target.ids.map(id=>setTarget(hass,id,target.service,config)));
  const failed=results.filter(result=>result.status==='rejected');
  if(failed.length)throw new Error(`${target.ids.length-failed.length} von ${target.ids.length} Lichtern aktualisiert.`);
  return target.service;
}
export function suggestions(config,states,registry=[]) {
  const byId=new Map(registry.map(item=>[item.entity_id,item])),main=byId.get(config.entity),assigned=new Set([config.entity,...(config.segments||[]).map(s=>typeof s==='string'?s:s.entity)]);
  const group=new Set(),visit=(id,trail=new Set())=>{if(!lightID(id)||id===config.entity||trail.has(id))return;const next=new Set([...trail,id]),children=states[id]?.attributes?.entity_id||[];if(children.length)for(const child of children)visit(child,next);else group.add(id);};
  for(const id of states[config.entity]?.attributes?.entity_id||[])visit(id,new Set([config.entity]));
  const devices=new Set(main?.device_id?[main.device_id]:[]);
  for(const id of group){const device=byId.get(id)?.device_id;if(device)devices.add(device);}
  const members=[], power=[], energy=[], switches=[];
  for(const [id,state] of Object.entries(states)) {
    const item=byId.get(id);
    if(item?.disabled_by || (item?.hidden_by && !config.discovery?.include_hidden))continue;
    if(Array.isArray(state.attributes?.entity_id)&&state.attributes.entity_id.length)continue;
    const sameDevice=Boolean(item?.device_id&&devices.has(item.device_id));
    if(lightID(id)&&!assigned.has(id)&&(group.has(id)||sameDevice)) members.push({entity:id,name:state.attributes.friendly_name||id,reason:group.has(id)?'Gruppenmitglied':'Gleiches Gerät – Zuordnung prüfen',certain:group.has(id)});
    if(sameDevice && id.startsWith('sensor.')) {
      if(state.attributes.device_class==='power'&&['W','kW'].includes(state.attributes.unit_of_measurement))power.push(id);
      if(state.attributes.device_class==='energy'&&['Wh','kWh','MWh'].includes(state.attributes.unit_of_measurement))energy.push(id);
    }
    if(sameDevice&&switchID(id))switches.push({entity:id,name:state.attributes.friendly_name||id,role:/(back|hinter|ambient|segment|light strip)/i.test(`${id} ${state.attributes.friendly_name||''}`)?'back':/(main|haupt|decke|ceiling)/i.test(`${id} ${state.attributes.friendly_name||''}`)?'main':null});
  }
  return {members,power,energy,switches};
}
export function legacyControllerConfig(config){
  const result={type:'custom:govee-segment-light-card',entity:config.entity,segments:copy(config.segments||[])};
  for(const key of ['colors','show_effects','show_color_temp','columns'])if(config[key]!==undefined)result[key]=copy(config[key]);
  return result;
}

const Base = globalThis.HTMLElement || class {};
const el=(tag,attrs={},text)=>{const n=document.createElement(tag);for(const[k,v]of Object.entries(attrs))if(v!=null&&(v!==false||k.startsWith('aria-')))n.setAttribute(k,k.startsWith('aria-')?String(v):v===true?'':String(v));if(text!=null)n.textContent=text;return n;};
const button=(text,action,attrs={})=>{const b=el('button',{type:'button',...attrs},text);b.addEventListener('click',e=>{e.stopPropagation();action(e);});return b;};function ancestorAcrossShadow(node,tagName){for(let current=node;current;){if(current.tagName===tagName)return current;if(current.parentElement)current=current.parentElement;else current=current.getRootNode?.().host||null;}return null;}
const icon=(name)=>el('ha-icon',{icon:name});
const displayName=(config,state)=>config.name||state?.attributes?.friendly_name||config.entity;
const emit=(target,name,detail)=>target.dispatchEvent(new CustomEvent(name,{detail,bubbles:true,composed:true,cancelable:true}));
const stateFor=(hass,id)=>optimistic.get(id,hass?.states?.[id]);
const optimisticStates=hass=>{const states={...(hass?.states||{})};for(const id of new Set([...optimistic.entries.keys(),...optimistic.intents.keys()]))states[id]=stateFor(hass,id);return states;};
const MODES={brightness:'Helligkeit',color_temp:'Farbtemperatur',color:'RGB',white:'Weißkanal',effect:'Effekte'};
const MODE_ICONS={brightness:'mdi:brightness-6',color_temp:'mdi:thermometer',color:'mdi:palette',white:'mdi:lightbulb-on-50',effect:'mdi:creation'};
function loadEntityRegistry(hass){
 if(typeof hass?.callWS!=='function')return Promise.resolve([]);
 return scopedHass(hass).callWS({type:'config/entity_registry/list'});
}
function effectiveConfig(config,states,registry){
  if(config.discovery?.enabled===false)return config;
  return {...config,segments:automaticSegments(config,states,registry)};
}
export function warmHue(state){const a=state?.attributes||{},h=Number(a.hs_color?.[0]);return a.color_mode==='hs'&&Array.isArray(a.hs_color)&&h>=29&&h<=49;}
export function controlKelvin(state){const a=state?.attributes||{};if(a.color_mode==='color_temp'&&Number(a.color_temp_kelvin)>0)return Number(a.color_temp_kelvin);const bounds=kelvinBounds(state);if(!bounds)return null;const rgb=hsRGB(...(a.hs_color||[39,50])),peak=Math.max(...rgb),target=rgb.map(x=>x/peak);let best=bounds[0],distance=Infinity;for(let k=bounds[0];k<=bounds[1];k+=10){const c=kelvinRGB(k),m=Math.max(...c),d=c.reduce((sum,x,i)=>sum+(x/m-target[i])**2,0);if(d<distance){distance=d;best=k;}}return best;}
export function currentColorMode(state,caps,fallback){
  if(warmHue(state)&&caps.color_temp)return 'color_temp';
  const mode=state?.attributes?.color_mode;
  if(colorModes.has(mode)&&caps.color)return 'color';
  if(caps.color_temp)return 'color_temp';
  if(caps.color)return 'color';
  if(mode==='white'&&caps.white)return 'white';
  return null;
}
export function preferredControlMode(state,caps){
  if(warmHue(state)&&caps.color_temp)return "color_temp";
  if(colorModes.has(state?.attributes?.color_mode)&&caps.color)return 'color';
  if(caps.color_temp)return 'color_temp';
  if(caps.color)return 'color';
  if(caps.white)return 'white';
  if(caps.brightness)return 'brightness';
  return null;
}
export function selectedControlTargets(config,selected,states={}){
  const members=(config.segments||[]).map(item=>item.entity);
  const selectedMembers=members.filter(id=>selected.has(id));
  return selectedMembers.length>0&&selectedMembers.length<members.length
    ?leafEntities(selectedMembers,states,config.entity)
    :[config.entity];
}
function chooserLabel(mode,display){
  const name=MODES[mode]||mode;
  return display==='text'?name:icon(MODE_ICONS[mode]||'mdi:lightbulb');
}
function selectionToolbar(parent,segments,selected,onAction){
  const ids=segments.map(item=>item.entity),toolbar=el('div',{class:'selection-actions','aria-label':'Segmentauswahl'});
  const all=allSelected(ids,selected);
  toolbar.append(button(all?'Keins':'Alle',()=>onAction(all?'none':'all'),{title:all?'Auswahl aufheben':'Alle Segmente auswählen','aria-label':all?'Auswahl aufheben':'Alle Segmente auswählen'}),button('Invert',()=>onAction('invert'),{title:'Auswahl umkehren','aria-label':'Auswahl umkehren'}),el('span',{class:'muted'},`${ids.filter(id=>selected.has(id)).length}/${ids.length} ausgewählt`));
  parent.append(toolbar);
}
function showEffectsPicker(root,getState,onChoose){
  root.querySelector('.effect-dialog')?.remove();
  const dialog=el('dialog',{class:'effect-dialog','aria-label':'Lichteffekt auswählen'}),shell=el('div',{class:'effect-shell'}),head=el('div',{class:'row'});
  const close=()=>{dialog.close();dialog.remove();};
  head.append(el('h2',{class:'grow'},'Lichteffekt'),button('Schließen',close,{'aria-label':'Effekt-Auswahl schließen'}));
  const search=el('input',{type:'search',placeholder:'Effekt suchen','aria-label':'Effekte filtern'}),list=el('div',{class:'effect-list'}),state=getState(),effects=state?.attributes?.effect_list||[];
  const choose=async data=>{close();await onChoose(data);};
  const populate=()=>{list.replaceChildren();for(const effect of effects.filter(value=>!neutralEffects.has(String(value).toLocaleLowerCase())&&String(value).toLocaleLowerCase().includes(search.value.toLocaleLowerCase())))list.append(button(effect,()=>choose({effect}),{'aria-pressed':getState()?.attributes?.effect===effect}));};
  search.addEventListener('input',populate);populate();
  shell.append(head,search,list,button('Kein Effekt · stoppen',()=>choose(stopEffectData(getState())),{class:'full'}));dialog.append(shell);
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});root.append(dialog);dialog.showModal();search.focus({preventScroll:true});return dialog;
}
function segmentPicker(segments,states,selected,onToggle,style,columns='auto'){
  const items=numberedSegments(segments,states),picker=el('div',{class:`segment-picker ${style}`,'aria-label':'Segmente auswählen'});
  const makeTile=(item,kind='segment-tile')=>{
    const state=states[item.entity],isOn=state?.state==='on',brightness=finite(state?.attributes?.brightness)?`${Math.round(state.attributes.brightness/2.55)}%`:isOn?'Ein':'Aus';
    const number=segmentNumber(item,states)??items.indexOf(item)+1,b=button('',()=>onToggle(item.entity),{class:kind,'data-segment':item.entity,'aria-pressed':selected.has(item.entity),'aria-label':`${item.name||states[item.entity]?.attributes?.friendly_name||item.entity}, Segment ${number}, ${brightness}; Auswahl umschalten`,disabled:!available(state)});
    b.style.setProperty('--segment-color',lightColor(state));b.append(el('span',{class:'segment-number'},String(number)),el('span',{class:'segment-value'},brightness));
    if(selected.has(item.entity))b.append(el('span',{class:'segment-check','aria-hidden':'true'},'✓'));
    return b;
  };
  if(style==='strip'){
    const rows=el('div',{class:'segment-rows'});let previousColumns=0,wasConnected=false,resize;
    const drawRows=()=>{
      if(picker.isConnected)wasConnected=true;
      if(!picker.isConnected&&wasConnected){resize?.disconnect();return;}
      const totalWidth=picker.clientWidth||Math.min((globalThis.innerWidth||416)-56,460)||360,cols=columns==='auto'?clamp(Math.floor((totalWidth-24)/92),1,8):clamp(Number(columns)||4,1,8);
      if(cols===previousColumns)return;previousColumns=cols;rows.replaceChildren();
      for(const[rowIndex,rowItems]of stripRows(items,cols).entries()){const row=el('div',{class:`segment-row${rowIndex%2?' reverse':''}`});for(const item of rowItems)row.append(makeTile(item));rows.append(row);}
    };
    if(typeof ResizeObserver==='function'){resize=new ResizeObserver(drawRows);resize.observe(picker);}drawRows();picker.append(rows);
  }else if(style==='ceiling-square'||style==='ceiling-round'){
    const board=el('div',{class:`segment-board${style==='ceiling-round'?' round':''}`}),roles=segmentRoles({entity:'',segments:items},states),mainId=roles.main[0],main=items.find(item=>item.entity===mainId),back=items.filter(item=>item.entity!==mainId),positions=roundSegmentPositions(back.length,style);
    if(main){const center=makeTile(main,'segment-center');center.setAttribute('aria-label',`${main.name||states[main.entity]?.attributes?.friendly_name||main.entity}, Hauptlicht, Auswahl umschalten`);board.append(center);}
    back.forEach((item,index)=>{const tile=makeTile(item,'segment-orbit');tile.style.left=`${positions[index].x}%`;tile.style.top=`${positions[index].y}%`;board.append(tile);});picker.append(board);
  }
  return picker;
}
const CSS=`
:host{display:block;min-width:0;color:var(--primary-text-color,#f5f5f5);font-family:var(--paper-font-body1_-_font-family,system-ui,sans-serif);font-size:14px;--lc-accent:var(--primary-color,#78d8c5)}
*{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer;min-height:48px;min-width:48px;padding:8px 12px;border:1px solid var(--divider-color,#555);border-radius:14px;background:var(--secondary-background-color,#333);color:inherit;touch-action:manipulation}button:hover{filter:brightness(1.12)}button:disabled{cursor:default;opacity:.45}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid var(--lc-accent);outline-offset:2px}button[aria-pressed=true]{background:color-mix(in srgb,var(--lc-accent) 22%,var(--card-background-color,#202020));border-color:var(--lc-accent)}ha-icon{--mdc-icon-size:24px;display:inline-flex}h2{font-size:21px;margin:0}h3{font-size:17px;margin:8px 0}p{margin:8px 0;line-height:1.5}.muted{color:var(--secondary-text-color,#bbb)}.error{color:var(--error-color,#ff8787);white-space:normal}.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.grow{flex:1;min-width:0}.stack{display:grid;gap:8px;min-width:0}.primary{background:var(--lc-accent);color:var(--text-primary-color,#152623);font-weight:650}.full{width:100%}.card{display:block;background:var(--ha-card-background,var(--card-background-color,#202020));border:1px solid var(--divider-color,#555);border-radius:16px;padding:12px;overflow:hidden;container-type:inline-size}.head{display:flex;align-items:center;gap:12px;min-height:52px}.power{border:0;border-radius:50%;width:52px;height:52px;flex:none;padding:0;display:grid;place-items:center;background:var(--lamp);color:var(--lamp-ink);box-shadow:var(--lamp-glow)}.detail-link{background:transparent;border:0;padding:0;text-align:left;flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px}.name{display:block;font-size:18px;font-weight:650;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.status{display:block;font-size:14px;font-weight:400;color:var(--secondary-text-color,#aaa);margin-top:3px}.metrics{font-size:13px;text-align:right}.controls{display:grid;gap:8px;margin-top:8px}.modes{display:flex;gap:8px;flex-wrap:wrap}.modes button{flex:1;padding:8px;font-size:13px}.slider-wrap{min-width:0}.slider-label{display:flex;justify-content:space-between;gap:8px;margin-bottom:4px;font-size:13px}.slider{appearance:none;-webkit-appearance:none;display:block;width:100%;height:48px;margin:0;border:0;border-radius:16px;background:var(--track);cursor:ew-resize;touch-action:pan-y}.slider::-webkit-slider-runnable-track{height:48px;border-radius:16px;background:transparent}.slider::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:18px;height:48px;border:3px solid #fff;border-radius:12px;background:#ffffff38;box-shadow:0 0 3px #0009}.slider::-moz-range-track{height:48px;background:transparent}.slider::-moz-range-thumb{width:14px;height:42px;border:3px solid #fff;border-radius:12px;background:#ffffff38}.slider:disabled{opacity:.4}.scenes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,130px),1fr));gap:8px}.scene-active{border-color:var(--lc-accent)}.hint{font-size:13px}.visually-hidden{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}input:not([type=range]),select{min-height:48px;font-size:16px;min-width:0;padding:8px;border:1px solid var(--divider-color,#555);border-radius:10px;background:var(--card-background-color,#242424);color:inherit}label.field{display:grid;gap:4px}input[type=checkbox]{width:24px;height:24px;min-height:24px}.check{display:flex;align-items:center;gap:8px;min-height:48px}details{border:1px solid var(--divider-color,#555);border-radius:16px;padding:8px}summary{min-height:48px;cursor:pointer;display:flex;align-items:center;font-weight:650}.editor{display:grid;gap:12px}.member-edit{display:grid;gap:8px;padding:8px;border-bottom:1px solid var(--divider-color,#555)}@media(prefers-reduced-motion:no-preference){button{transition:background .15s ease}}`;
const EXTRA_CSS=`
:host{--lc-glass-speed:var(--lg-motion-duration)}
.card{background:var(--lg-surface,var(--ha-card-background));border-color:var(--lg-outline);box-shadow:var(--lg-shadow);-webkit-backdrop-filter:var(--lg-blur);backdrop-filter:var(--lg-blur)}
.power{width:var(--lg-icon-diameter);height:var(--lg-icon-diameter);min-width:var(--lg-icon-diameter);min-height:var(--lg-icon-diameter);background:var(--dash6-material-36273bf8);border:var(--dash6-material-8857df5);box-shadow:var(--lamp-glow),inset 0 1px rgba(255,255,255,.2)}
.head{min-height:var(--lg-icon-diameter)}
.mode-bar.grouped{background:var(--lg-surface-raised);border-color:var(--lg-outline);box-shadow:var(--dash6-material-21c990fc)}
.mode-bar.grouped button{background:transparent}.mode-bar.grouped button[aria-pressed=true]{background:var(--dash6-material-13d1556);box-shadow:var(--lg-glow,none);border-radius:12px}
.slider{box-shadow:var(--dash6-material-c87ad165)}
@media(prefers-reduced-motion:no-preference){.card,.power,.mode-bar.grouped button{transition:background-color var(--lc-glass-speed) ease,border-color var(--lc-glass-speed) ease,box-shadow var(--lc-glass-speed) ease,transform var(--lc-glass-speed) ease}.mode-bar.grouped button:active,.power:active{transform:scale(.96)}}
:host(.selected) .card{outline:var(--dash6-material-8b78f10a);outline-offset:2px}
.card{position:relative;isolation:isolate}.card>*:not(.power-graph){position:relative;z-index:2}
.power-graph{position:absolute!important;left:0;bottom:0;width:100%;height:80px;z-index:1;opacity:1;pointer-events:auto;overflow:hidden}.power-graph>apexcharts-card{display:block;width:100%;height:100%;min-width:0}.power-graph:hover{z-index:4}
.mode-bar{display:flex;gap:8px;flex-wrap:nowrap;white-space:nowrap;min-width:0}.mode-bar.grouped{gap:0;border:var(--dash6-material-9aa1c302);border-radius:14px;overflow:hidden}.mode-bar.grouped button{border:0;border-radius:0;flex:0 0 48px}.mode-bar.grouped button+button{border-left:1px solid var(--divider-color)}.mode-bar.compact button{padding:0;min-width:44px;min-height:44px;width:44px;height:44px;flex-basis:44px}.mode-bar.icon-only button{flex:0 0 48px}.mode-bar.icon-only.compact button{flex-basis:44px}.mode-bar.text-only button{flex:0 0 auto}
.controls.main-off .slider{opacity:var(--dash6-slider-off-opacity,.5)!important}
.controls.layout-left,.controls.layout-right{display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;min-width:0}.controls.layout-right{grid-template-columns:minmax(0,1fr) auto}.controls.layout-left .mode-bar{grid-column:1;grid-row:1}.controls.layout-left .slider-wrap,.controls.layout-left .effect-entry{grid-column:2;grid-row:1}.controls.layout-right .slider-wrap,.controls.layout-right .effect-entry{grid-column:1;grid-row:1}.controls.layout-right .mode-bar{grid-column:2;grid-row:1}.controls.layout-bottom .mode-bar{order:2}.controls.layout-bottom .slider-wrap,.controls.layout-bottom .effect-entry{order:1}
.toggle-actions,.selection-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.toggle-actions{flex:none}.toggle-actions button{min-width:48px;min-height:48px;padding:6px}.inline-segments{margin:8px 0 0 12px;padding-left:10px;border-left:2px solid var(--divider-color)}
.segment-picker{display:grid;gap:8px;min-width:0}.segment-picker h3{margin:0}.segment-rows{display:grid;gap:6px;min-width:0}.segment-row{display:flex;gap:6px;min-width:0}.segment-row.reverse{flex-direction:row-reverse}.segment-tile{position:relative;display:grid;place-items:center;align-content:center;gap:2px;flex:1 1 72px;min-width:48px;min-height:56px;padding:4px;border-color:var(--dash6-material-d470b842);background:var(--dash6-material-d402f45c);overflow:hidden}.segment-tile .segment-number{font-weight:700;font-size:15px}.segment-tile .segment-value{font-size:12px;color:var(--secondary-text-color)}.segment-tile[aria-pressed=true],.segment-orbit[aria-pressed=true],.segment-center[aria-pressed=true]{background:var(--dash6-material-20bfed3f);outline:var(--dash6-material-b9e9566b);outline-offset:1px}.segment-tile .segment-check{position:absolute;top:2px;right:4px;font-size:12px}.segment-board{position:relative;isolation:isolate;width:min(100%,460px);margin:0 auto;aspect-ratio:1;min-height:250px;border:var(--dash6-material-9aa1c302);border-radius:28px;background:var(--dash6-material-20a40ed6);overflow:visible}.segment-board.round{border-radius:50%;background:var(--dash6-material-b06e7758)}.segment-orbit{position:absolute;z-index:2;transform:translate(-50%,-50%);width:clamp(48px,17%,76px);min-height:52px;padding:4px 2px}.segment-board.round .segment-orbit{border-radius:50%;width:clamp(48px,16%,68px);height:clamp(48px,16%,68px)}.segment-center{position:absolute;z-index:1;left:50%;top:50%;transform:translate(-50%,-50%);width:44%;height:44%;min-width:120px;min-height:120px;border-radius:28px;display:flex;flex-direction:column;justify-content:center;align-items:center;background:var(--dash6-material-b1977b3f);border:var(--dash6-material-2e079e0e);text-align:center}.segment-board.round .segment-center{border-radius:50%}.segment-center .segment-number{font-size:22px;font-weight:750}.segment-center .segment-value{font-size:14px;color:var(--secondary-text-color)}.member-stack{display:grid;gap:8px}.member-card{position:relative;min-width:0}.member-card.selected{outline:var(--dash6-material-8b78f10a);outline-offset:2px;border-radius:18px}.segment-numbered-list{display:grid;gap:8px}
.effect-dialog{padding:0;border:var(--dash6-material-9aa1c302);border-radius:20px;background:var(--card-background-color);color:var(--primary-text-color);width:min(520px,calc(100vw - 24px));max-height:calc(100dvh - 32px);overflow:hidden}.effect-dialog::backdrop{background:var(--dash6-material-f51d559d);backdrop-filter:var(--dash6-material-47ddf09)}.effect-shell{display:flex;flex-direction:column;gap:8px;max-height:calc(100dvh - 40px);padding:12px;padding-bottom:max(12px,env(safe-area-inset-bottom,0px))}.effect-list{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(min(100%,132px),1fr));overflow:auto;overscroll-behavior:contain}.effect-list button{min-height:56px;overflow-wrap:anywhere}@media(max-width:599px){.effect-dialog{width:100vw;height:100dvh;max-width:none;max-height:100dvh;margin:0;border-radius:0}.effect-shell{height:100dvh;max-height:100dvh;padding-top:max(12px,env(safe-area-inset-top,0px))}}
.settings-trigger{flex:none;width:44px;height:44px;min-width:44px;min-height:44px;padding:0;display:grid;place-items:center}.settings-dialog{padding:0;border:var(--dash6-material-9aa1c302);border-radius:20px;background:var(--card-background-color);color:var(--primary-text-color);width:min(820px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 32px);overflow:hidden}.settings-dialog::backdrop{background:var(--dash6-material-3d1dc6f5);backdrop-filter:var(--dash6-material-25ac2434)}.settings-shell{display:flex;flex-direction:column;max-height:calc(100dvh - 32px);padding:12px;padding-top:max(12px,env(safe-area-inset-top,0px));padding-bottom:max(12px,env(safe-area-inset-bottom,0px));gap:10px}.settings-header,.settings-footer{display:flex;align-items:center;gap:8px;flex:none}.settings-header{border-bottom:1px solid var(--divider-color);padding-bottom:8px}.settings-header h2{font-size:20px}.settings-header .hint{display:block;margin-top:2px}.settings-header button{width:44px;min-width:44px;padding:0;font-size:23px}.settings-body{overflow:auto;overscroll-behavior:contain;min-height:0;padding:2px}.settings-footer{border-top:1px solid var(--divider-color);padding-top:8px}.settings-status{flex:1;min-width:0;color:var(--secondary-text-color);font-size:13px;line-height:1.35}.settings-footer button{min-height:44px;white-space:nowrap}@media(max-width:599px){.settings-dialog{position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:100dvh;margin:0;border:0;border-radius:0}.settings-shell{height:100dvh;max-height:100dvh}.settings-footer{flex-wrap:wrap}.settings-status{flex:1 0 100%;order:-1}.settings-footer button{flex:1}}

.card > .controls .slider-label{display:none}
.mode-bar.grouped{background:var(--dash6-material-3f83421d);border:var(--dash6-material-7861a733);border-radius:16px;box-shadow:var(--dash6-material-591c7c7a);backdrop-filter:var(--dash6-material-b27f1da2);-webkit-backdrop-filter:var(--dash6-material-b27f1da2)}
.mode-bar.grouped button+button{border-left:1px solid rgba(235,246,255,.16)}
.mode-bar.grouped button[aria-pressed=true]{background:var(--dash6-material-6914195e);box-shadow:var(--dash6-material-50ccbcbb);border-radius:12px}
`;
const ICON_GLASS_CSS=`
.power{position:relative;isolation:isolate;overflow:hidden;background-color:var(--dash6-material-ae60297c);background-image:var(--dash6-material-625828d3);border:var(--dash6-material-210adb92);box-shadow:var(--dash6-material-b9afd84a);backdrop-filter:var(--dash6-material-98501f67);-webkit-backdrop-filter:var(--dash6-material-98501f67)}
.power[aria-pressed=true]{background-color:var(--lamp);background-image:var(--dash6-material-881d1161);border-color:var(--dash6-material-7dbf357);color:var(--lamp-ink);box-shadow:0 0 12px color-mix(in srgb,var(--lamp) 32%,transparent),inset 0 1px 0 rgba(255,255,255,.66),inset 0 -1px 0 rgba(7,17,28,.2),0 3px 9px rgba(0,0,0,.2)}
.power ha-icon{position:relative;z-index:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18))}
@media(prefers-reduced-transparency:reduce){.power{backdrop-filter:none;-webkit-backdrop-filter:none}}
`;
const DASH5_POLISH_CSS=`
:host{--dash5-card-shadow:inset 0 1px 0 rgba(255,255,255,.46),inset 1px 0 0 rgba(255,255,255,.14),inset 0 -2px 0 rgba(3,10,18,.24),0 4px 7px rgba(0,0,0,.18),0 14px 30px rgba(0,0,0,.24);--dash5-recess:inset 0 3px 6px rgba(0,0,0,.40),inset 1px 0 2px rgba(0,0,0,.18),0 1px 0 rgba(255,255,255,.26)}
.card{padding:9px 12px 10px;background:var(--dash6-material-796730b) !important;border:var(--dash6-material-ba84f384) !important;box-shadow:var(--dash5-card-shadow)!important;backdrop-filter:var(--dash6-material-d3009ed9) !important;-webkit-backdrop-filter:var(--dash6-material-d3009ed9) !important}
.head{min-height:48px;gap:12px;align-items:center;overflow:visible}.power{width:48px;height:48px;min-width:48px;min-height:48px;flex:0 0 48px;box-sizing:border-box}.detail-link{min-height:48px;min-width:0;align-items:center;overflow:hidden}.detail-link .grow{min-width:0;display:flex;flex-direction:column;justify-content:center;overflow:hidden}.name{font-size:17px;line-height:21px}.status{font-size:13px;line-height:17px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.controls{margin-top:7px}
.mode-bar.grouped{display:grid;grid-template-columns:repeat(3,44px);gap:0;flex:none;border-radius:15px;background:var(--dash6-material-5dcd771b) !important;border:var(--dash6-material-4b3861b) !important;box-shadow:var(--dash6-material-afa31876) !important;backdrop-filter:var(--dash6-material-498e3455);-webkit-backdrop-filter:var(--dash6-material-498e3455)}
.mode-bar.grouped button,.mode-bar.icon-only.compact button,.mode-bar.icon-only button{min-width:44px;width:44px;height:46px;min-height:46px;flex:0 0 44px;padding:0;border:0!important;border-radius:0;box-shadow:none!important;filter:none!important}.mode-bar.grouped button+button{border-left:1px solid rgba(245,251,255,.16)!important}.mode-bar.grouped button[aria-pressed=true]{background:var(--dash6-material-786fda5b) !important;box-shadow:var(--dash6-material-babbeaee) !important}.mode-bar.grouped button:disabled{opacity:.35}
.slider{position:relative;border:var(--dash6-material-c959da4a);border-radius:16px;background-image:var(--dash6-slider-gloss),var(--track)!important;box-shadow:var(--dash5-recess)!important}.slider::-webkit-slider-runnable-track{height:46px;border-radius:15px}.slider::-webkit-slider-thumb{width:21px;height:44px;margin-top:1px;border:var(--dash6-material-cdb4b4eb);border-radius:11px;background:var(--dash6-material-bfdb9f54);box-shadow:var(--dash6-material-447f7418)}.slider::-moz-range-thumb{width:19px;height:42px;border:var(--dash6-material-cdb4b4eb);border-radius:11px;background:var(--dash6-material-bfdb9f54);box-shadow:var(--dash6-material-98eebd76)}
@media(prefers-reduced-transparency:reduce){.card,.mode-bar.grouped{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}}
.card.has-effect-trigger>.head{padding-right:56px}
.card>.effect-trigger{position:absolute!important;top:8px;right:8px;z-index:5;width:48px;height:48px;min-width:48px;min-height:48px;padding:0;display:grid;place-items:center;border-radius:15px;border:var(--dash6-material-d6c46aff);color:var(--dash6-material-b1121123);background:var(--dash6-material-bf435c99);box-shadow:var(--dash6-material-1cef21d5);backdrop-filter:var(--dash6-material-c995b99a);-webkit-backdrop-filter:var(--dash6-material-c995b99a)}
.card>.effect-trigger[aria-pressed=true]{border-color:var(--dash6-material-de1af55);color:var(--dash6-material-c5dec0b0);background:var(--dash6-material-ac552056);box-shadow:var(--dash6-material-108ae7cc)}
.card>.effect-trigger ha-icon{--mdc-icon-size:22px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.38))}

.power,.toggle-actions button,.card>.effect-trigger{background:var(--dash6-button-background)!important;border:var(--dash6-button-border)!important;box-shadow:var(--dash6-button-shadow),var(--lamp-glow,0 0 transparent)!important;backdrop-filter:var(--dash6-button-filter)!important;-webkit-backdrop-filter:var(--dash6-button-filter)!important}
.toggle-actions button[aria-pressed=true],.card>.effect-trigger[aria-pressed=true]{background:var(--dash6-button-active-background)!important}
`;
const DASH5_SELECTION_CSS=`
/* The main entity alone determines the light halo and its current color mode. */
.power.light-on{color:var(--light-glow-color)!important;border-color:color-mix(in srgb,var(--light-glow-color) 70%,#fff)!important;box-shadow:var(--dash6-button-shadow),inset 0 0 10px color-mix(in srgb,var(--light-glow-color) 30%,transparent),0 0 10px color-mix(in srgb,var(--light-glow-color) 48%,transparent),0 0 22px color-mix(in srgb,var(--light-glow-color) 24%,transparent)!important}
.power.light-on ha-icon{filter:drop-shadow(0 0 3px var(--light-glow-color)) drop-shadow(0 0 7px color-mix(in srgb,var(--light-glow-color) 55%,transparent))}
/* The name/status target opens details but is visually ordinary text. */
.detail-link,.detail-link:hover,.detail-link:active,.detail-link:focus-visible{background:transparent!important;border:0!important;border-radius:0!important;box-shadow:none!important;text-shadow:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;scale:1!important;translate:0!important;transform:none!important;transition:none!important;animation:none!important;outline:none!important}
.detail-link:focus-visible .name{text-decoration:underline}

.controls{position:relative}.slider-wrap{position:relative}.controls.main-off{--dash6-slider-opacity:.5}.slider::-webkit-slider-thumb{background:transparent!important;border:0!important;box-shadow:none!important}.slider::-moz-range-thumb{background:transparent!important;border:0!important;box-shadow:none!important}

.selection-summary{font-size:18px;font-weight:800;white-space:nowrap}
.member-select{align-self:center;flex:none;width:48px;min-width:48px;height:48px;min-height:48px;padding:0;border-radius:15px;background:var(--dash6-material-709ecdff);border:var(--dash6-material-a05758cf);box-shadow:var(--dash6-material-1bfd94a6);backdrop-filter:var(--dash6-material-838e18bb);-webkit-backdrop-filter:var(--dash6-material-838e18bb)}
.member-select[aria-pressed=true]{background:var(--dash6-material-224212b7);box-shadow:var(--dash6-material-3ebf5928)}
`;
const SATIN_LIGHT_CSS=`
/* One 12px inset starts both the visible switch and its two text lines. The
   37px material sits at the top of a separate 44px touch target, not below it. */
:host([data-satin]) .card{padding:12px}
:host([data-satin]) .card>.head{min-height:44px;align-items:flex-start}
:host([data-satin]) .card>.head>dash6-glass-switch{--dash6-satin-switch-track-top:0px}
:host([data-satin]) .card>.head>.detail-link{height:44px;min-height:44px;align-items:flex-start}
:host([data-satin]) .card>.head>.detail-link .grow{justify-content:flex-start}
:host([data-satin]) .card>.head .name{line-height:20px}
:host([data-satin]) .card>.head .status{line-height:16px;margin-top:1px}
:host([data-satin]) .card.has-effect-trigger>.head{padding-right:44px}
:host([data-satin]) .card>.effect-trigger{top:13.5px;right:12px;width:34px;height:34px;min-width:34px;min-height:34px;border-radius:var(--dash6-satin-button-radius,8px)!important;background:var(--dash6-satin-button-background)!important;border:var(--dash6-satin-button-border)!important;box-shadow:var(--dash6-satin-button-shadow)!important;filter:none;color:var(--secondary-text-color);overflow:hidden;isolation:isolate}
:host([data-satin]) .card>.effect-trigger::before{content:'';position:absolute;inset:1px;z-index:-1;border-radius:inherit;background:var(--dash6-satin-effect-glow);opacity:0;transition:opacity 220ms ease}
:host([data-satin]) .card>.effect-trigger[aria-pressed=true]{color:var(--dash6-icon-lens-white);border:var(--dash6-satin-effect-active-border)!important}
:host([data-satin]) .card>.effect-trigger[aria-pressed=true]::before{opacity:var(--dash6-satin-effect-white-opacity,.65)}
:host([data-satin]) .card>.effect-trigger:active{scale:.94;translate:0 1px;box-shadow:var(--dash6-satin-button-pressed-shadow)!important;transition-duration:80ms}
:host([data-satin]) .slider{height:42px;border-radius:11px!important}
/* The pressed 22x38 lens grows to 28.6x49.4 inside the card's 12px inset.
   Let it cross the recessed track; the 8px control gap stays clear at each end. */
:host([data-satin]) .controls,:host([data-satin]) .slider-wrap{overflow:visible}
:host([data-satin]) .slider::-webkit-slider-runnable-track{height:42px;border-radius:11px}
:host([data-satin]) .slider::-webkit-slider-thumb{width:22px;height:42px}
:host([data-satin]) .slider::-moz-range-track{height:42px}
:host([data-satin]) .slider::-moz-range-thumb{width:22px;height:38px}
:host([data-satin]) .slider-wrap::before,:host([data-satin]) .slider-wrap::after{border:0!important;box-shadow:none!important}
@media(pointer:coarse){:host([data-satin]) .slider,:host([data-satin]) .slider::-webkit-slider-runnable-track{height:44px}:host([data-satin]) .slider::-webkit-slider-thumb{height:44px}:host([data-satin]) .card>.effect-trigger{top:12px;width:44px;height:44px;min-width:44px;min-height:44px}:host([data-satin]) .card.has-effect-trigger>.head{padding-right:52px}}
@media(prefers-reduced-motion:reduce){:host([data-satin]) .card>.effect-trigger{scale:1!important;translate:0!important;transition:none!important}}
`;
function addStyle(root,extra=''){root.append(el('style',{},CSS+'.power[aria-pressed=true]{background:var(--lamp);border:0;color:var(--lamp-ink)}'+EXTRA_CSS+ICON_GLASS_CSS+DASH5_POLISH_CSS+DASH5_SELECTION_CSS+extra+BASE_CSS.slice(BASE_CSS.indexOf('/* Elastic feedback'))+satinSurfaceCSS+SATIN_LIGHT_CSS));}
function slider(label,min,max,value,unit,track,commit,disabled=false,preview,owner){
  const wrap=el('div',{class:'slider-wrap'}), line=el('div',{class:'slider-label'}), output=el('output',{},`${Math.round(value)}${unit}`);
  line.append(el('span',{},label),output);
  const input=el('input',{class:'slider',type:'range',min,max,step:1,value,disabled,'aria-label':label,'aria-valuetext':`${Math.round(value)}${unit}`});
  input.style.setProperty('--track',track);
  input.addEventListener('click',e=>e.stopPropagation());
  input._satinDrag=bindSatinSlider(input,output,unit,commit,preview,owner);
  wrap.append(line,input,el('dash6-slider-lens'));return wrap;
}
const kelvinTrack='var(--dash6-slider-kelvin)';
const hueTrack='var(--dash6-slider-hue)';

export class Dash5LightCard extends Base {
  constructor(){super();this.attachShadow({mode:'open'});this._mode=null;this._dragging=false;this._registry=[];this._selection=new Set();this._graphCard=null;this._graphKey=null;this._selectionHandler=null;this._settingsLoaded=false;this._userPatch=undefined;this._settingsPortal=null;this._settingsPortalOverlay=null;this._settingsPortalGear=null;this._settingsPortalResize=null;}
  static async getConfigElement(){await import('./light-editor.js');return document.createElement('dash6-light-card-editor-v2');}
  static getStubConfig(hass){return {entity:Object.keys(hass?.states||{}).find(lightID)||'light.example'};}
  getCardSize(){return 4;}
  getGridOptions(){return {columns:12,min_columns:6};}
  setConfig(config){
    this._baseConfig=normalizeConfig(config);this._config=copy(this._baseConfig);this._storageKey=cardSettingsStorageKey(config,globalThis.location?.pathname||'/',this.localName);this._settingsLoaded=false;this._settingsPromise=null;this._userPatch=undefined;this._mode=null;this._graphKey=null;this.ensureStoredConfig();this.render();
  }
  set hass(hass){
    const previousUser=this._userId;this._hass=hass;this._userId=hass?.user?.id;if(this._registryConnection!==hass?.connection){this._registryConnection=hass?.connection;this._registryLoaded=false;this._registryWatch?.();this._registryWatch=watchRegistries(hass,()=>{this._registryLoaded=false;if(this.isConnected)this.hass=this._hass;});}
    if(previousUser!==undefined&&previousUser!==this._userId){this._settingsLoaded=false;this._settingsPromise=null;this._userPatch=undefined;if(this._baseConfig)this._config=copy(this._baseConfig);}
    for(const id of new Set([...optimistic.entries.keys(),...optimistic.intents.keys()]))optimistic.reconcile(id,hass.states[id]);
    if(this._config){this.ensureStoredConfig();if(!this._registryPending&&!this._registryLoaded){this._registryPending=true;loadEntityRegistry(hass).then(registry=>{this._registry=registry;this._registryLoaded=true;this._registryPending=false;this.render();}).catch(()=>{this._registryPending=false;});}}
    const c=this._config,ids=c?[c.entity,c.child_lock_entity,c.power_entity,c.energy_entity,c.main_back?.main_entity,c.main_back?.back_entity,...(c.segments||[]).map(x=>x.entity)]:[];
    const signature=JSON.stringify(ids.map(id=>{const state=stateFor(hass,id);return [id,state?.state,state?.attributes];}));
    if(signature!==this._hassRenderSignature||!this.shadowRoot.querySelector('ha-card.card')){this._hassRenderSignature=signature;this.render();}
    if(this._dialog)this._dialog.hass=hass;if(this._settingsEditor)this._settingsEditor.hass=hass;if(this._graphCard)this._graphCard.hass=hass;
  }
  get hass(){return this._hass;}
  ensureStoredConfig(){
    if(this._settingsLoaded||!this._baseConfig||!this._storageKey)return this._settingsPromise;
    if(!this._hass)return Promise.resolve();
    if(!this._hass.connection?.sendMessagePromise){this._settingsLoaded=true;this._settingsStorageAvailable=false;return Promise.resolve();}
    if(this._settingsPromise)return this._settingsPromise;
    const key=this._storageKey;
    this._settingsPromise=loadCardConfigPatch(this._hass,key).then(patch=>{
      if(this._storageKey!==key)return;
      this._userPatch=patch;this._settingsStorageAvailable=true;
      if(patch)this._config=normalizeConfig(applyConfigPatch(this._baseConfig,patch));
      this._settingsLoaded=true;this.render();
    }).catch(error=>{this._settingsStorageAvailable=false;this._settingsError=error?.message||'Speicher nicht verfügbar';this._settingsLoaded=true;}).finally(()=>{this._settingsPromise=null;});
    return this._settingsPromise;
  }
  connectedCallback(){bindThemePreferences(this);this._unsubscribe=optimistic.subscribe(()=>{const id=this._config?.entity;const signature=JSON.stringify([stateFor(this._hass,id),optimistic.errorEvents.get(id),optimistic.pending(id)]);if(signature!==this._feedbackSignature){this._feedbackSignature=signature;this.render();}});this.render();}
  disconnectedCallback(){this.shadowRoot.querySelectorAll('input[type=range]').forEach(input=>input._satinDrag?.cancel());unbindThemePreferences(this);this._unsubscribe?.();this._registryWatch?.();this._registryConnection=null;this._controlsResize?.disconnect();this.removeSettingsPortal();this._dialog?.remove();this._dialog=null;this._effectDialog?.remove();this._effectDialog=null;this._settingsDialog?.remove();this._settingsDialog=null;this._settingsEditor=null;}
  async send(data={},service='turn_on'){
    if(childLocked(this._config,this._hass?.states)){this.shadowRoot.querySelector('dash6-glass-switch')?.reject();return;}
    this._error=null;
    try{if(this._commandHandler)await this._commandHandler(data,service);else await sendLight(this._hass,this._config.entity,data,service,this._config);this.render();}
    catch(e){reportError(this,e);this.render();}
  }
  async toggleRole(role){
    try{await toggleTargets(this._hass,this.roleTargets(role,this._renderConfig||this._config),this._config);this._error=null;}
    catch(error){reportError(this,error);}this.render();
  }
  roleTargets(role,config){
    const ids=controlTarget(config,role,this._hass.states),selected=this._commandTargets?.();
    return selected?.length&&!(selected.length===1&&selected[0]===config.entity)?ids.filter(id=>selected.includes(id)):ids;
  }
  setSelectionHandler(handler){this._selectionHandler=handler;}
  setCommandHandler(handler,targets){this._commandHandler=handler;this._commandTargets=targets;}
  setBackgroundAction(handler){this._backgroundAction=handler;}
  setSelectionSummary(count,total){this._selectionSummary=count>0&&count<total?{count,total}:null;}
  toggleSelection(id){this._selection.has(id)?this._selection.delete(id):this._selection.add(id);this._selectionHandler?.(id,this._selection);this.render();}
  selectAction(action,segments){const next=nextSelection(segments.map(s=>s.entity),this._selection,action);this._selection.clear();for(const id of next)this._selection.add(id);this._selectionHandler?.(null,this._selection);this.render();}
  open(){
    const config=effectiveConfig(this._config,this._hass.states,this._registry);
    if(!emit(this,'dash5-open-detail',{config}))return;
    const path=config.detail_path;
    if(path&&/^\/(?!\/)/.test(path)){history.pushState(null,'',path);window.dispatchEvent(new Event('location-changed'));return;}
    if(this._dialog?.isConnected)return;
    this._dialog=document.createElement('dash6-light-dialog-v2');this._dialog.configure(config,this._hass,this._selection,()=>this.render());this.shadowRoot.append(this._dialog);this._dialog.open();
  }
  openEffects(){
    if(this._effectDialog?.isConnected)return;
    this._effectDialog=showEffectsPicker(this.shadowRoot,()=>stateFor(this._hass,this._config.entity),data=>this.send(data));
  }
  showConfigGear(){return new URLSearchParams(globalThis.location?.search||'').get('edit')==='1';}
  removeSettingsPortal(){
    this._settingsPortal?.remove();this._settingsPortal=null;this._settingsPortalOverlay=null;this._settingsPortalGear=null;
    this._settingsPortalResize?.disconnect();this._settingsPortalResize=null;
    if(this._settingsPortalScroll){window.removeEventListener('scroll',this._settingsPortalScroll,true);window.removeEventListener('resize',this._settingsPortalScroll);window.visualViewport?.removeEventListener('scroll',this._settingsPortalScroll);window.visualViewport?.removeEventListener('resize',this._settingsPortalScroll);this._settingsPortalScroll=null;}
    if(this._settingsPortalFrame){cancelAnimationFrame(this._settingsPortalFrame);this._settingsPortalFrame=null;}
  }
  positionSettingsPortal(){
    const portal=this._settingsPortal,overlay=this._settingsPortalOverlay,gear=this._settingsPortalGear;
    if(!portal?.isConnected||!overlay?.isConnected||!gear?.isConnected)return;
    const target=gear.getBoundingClientRect(),bounds=overlay.getBoundingClientRect();
    if(!target.width||!target.height||!bounds.width||!bounds.height)return;
    portal.style.setProperty('left',`${target.left-bounds.left}px`,'important');
    portal.style.setProperty('top',`${target.top-bounds.top}px`,'important');
    portal.style.setProperty('width',`${target.width}px`,'important');
    portal.style.setProperty('height',`${target.height}px`,'important');
  }
  syncSettingsPortal(gear){
    if(!this.showConfigGear()||!gear){this.removeSettingsPortal();return;}
    const editMode=ancestorAcrossShadow(this,'HUI-CARD-EDIT-MODE'),overlay=editMode?.shadowRoot?.querySelector('.card-overlay');
    if(!overlay?.isConnected){this.removeSettingsPortal();return;}
    if(!this._settingsPortal||this._settingsPortal.parentElement!==overlay){
      this.removeSettingsPortal();
      const portal=document.createElement('button');portal.type='button';portal.className='dash5-settings-portal';portal.setAttribute('aria-label','Karteneinstellungen öffnen');portal.title='Karteneinstellungen';
      const gearIcon=icon('mdi:cog-outline');gearIcon.setAttribute('aria-hidden','true');gearIcon.style.setProperty('--mdc-icon-size','22px');gearIcon.style.pointerEvents='none';portal.append(gearIcon);
      for(const[property,value]of Object.entries({position:'absolute',display:'grid','place-items':'center',margin:'0',padding:'0',border:'1px solid var(--divider-color,#555)','border-radius':'14px',background:'var(--secondary-background-color,#333)',color:'var(--primary-text-color,#f5f5f5)',cursor:'pointer','touch-action':'manipulation','pointer-events':'auto','z-index':'2',outline:'none'}))portal.style.setProperty(property,value,'important');
      portal.addEventListener('pointerdown',event=>event.stopPropagation());
      portal.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();this.openSettings();});
      overlay.append(portal);this._settingsPortal=portal;this._settingsPortalOverlay=overlay;
      this._settingsPortalScroll=()=>{if(this._settingsPortalFrame)return;this._settingsPortalFrame=requestAnimationFrame(()=>{this._settingsPortalFrame=null;this.positionSettingsPortal();});};
      window.addEventListener('scroll',this._settingsPortalScroll,true);window.addEventListener('resize',this._settingsPortalScroll);window.visualViewport?.addEventListener('scroll',this._settingsPortalScroll);window.visualViewport?.addEventListener('resize',this._settingsPortalScroll);
    }
    this._settingsPortalGear=gear;this._settingsPortal.hidden=Boolean(this._settingsDialog?.open);gear.style.visibility='hidden';
    if(typeof ResizeObserver==='function'){this._settingsPortalResize?.disconnect();this._settingsPortalResize=new ResizeObserver(()=>this._settingsPortalScroll?.());this._settingsPortalResize.observe(this);this._settingsPortalResize.observe(overlay);this._settingsPortalResize.observe(gear);}
    this.positionSettingsPortal();this._settingsPortalScroll?.();
  }
  async openSettings(){
    if(this._settingsDialog?.isConnected)return;
    await this.ensureStoredConfig();
    await import('./light-editor.js');
    if(!this._hass||!this._settingsStorageAvailable){reportError(this,'Karteneinstellungen können nicht gespeichert werden: Home-Assistant-Benutzerspeicher nicht verfügbar.');this.render();return;}
    const dialog=el('dialog',{class:'settings-dialog','aria-label':'Lichtkarte konfigurieren'}),shell=el('div',{class:'settings-shell'}),header=el('header',{class:'settings-header'}),title=el('div',{class:'grow'}),content=el('div',{class:'settings-body'}),footer=el('footer',{class:'settings-footer'}),status=el('span',{class:'settings-status',role:'status','aria-live':'polite'},'Änderungen werden als Entwurf angezeigt. Speichern wirkt nur auf diese Karte in diesem Dashboard.'),editor=document.createElement('dash6-light-card-editor-v2');
    title.append(el('h2',{},`${displayName(this._config,stateFor(this._hass,this._config.entity))} konfigurieren`),el('span',{class:'muted hint'},'Auch in Auto-Entities und verschachtelten Karten sicher speicherbar.'));
    let draft=copy(this._config),valid=true,saving=false;
    const close=()=>{dialog.close();dialog.remove();if(this._settingsDialog===dialog){this._settingsDialog=null;this._settingsEditor=null;}this._config=normalizeConfig(this._userPatch?applyConfigPatch(this._baseConfig,this._userPatch):this._baseConfig);this.render();};
    const cancel=button('Abbrechen',close,{'aria-label':'Karteneinstellungen verwerfen'});
    const save=button('Speichern',async()=>{
      if(!valid||saving)return;saving=true;save.disabled=true;reset.disabled=true;cancel.disabled=true;status.textContent='Wird in Home Assistant gespeichert…';
      try{
        const patch=createConfigPatch(this._baseConfig,draft);await saveCardConfigPatch(this._hass,this._storageKey,patch);this._userPatch=patch;this._config=normalizeConfig(patch?applyConfigPatch(this._baseConfig,patch):this._baseConfig);dialog.close();dialog.remove();this._settingsDialog=null;this._settingsEditor=null;this.render();
      }catch(error){saving=false;save.disabled=!valid;reset.disabled=false;cancel.disabled=false;status.textContent=`Speichern fehlgeschlagen: ${error?.message||'Home Assistant nicht erreichbar'}`;}
    },{class:'primary'});
    const reset=button('Dashboard-Vorgabe',async()=>{
      if(saving)return;saving=true;save.disabled=true;reset.disabled=true;cancel.disabled=true;status.textContent='Dashboard-Vorgabe wird wiederhergestellt…';
      try{await saveCardConfigPatch(this._hass,this._storageKey,undefined);this._userPatch=undefined;this._config=copy(this._baseConfig);dialog.close();dialog.remove();this._settingsDialog=null;this._settingsEditor=null;this.render();}
      catch(error){saving=false;save.disabled=!valid;reset.disabled=false;cancel.disabled=false;status.textContent=`Wiederherstellung fehlgeschlagen: ${error?.message||'Home Assistant nicht erreichbar'}`;}
    },{disabled:!this._userPatch});
    const refreshDraft=event=>{
      event.stopPropagation();draft=copy(event.detail.config);
      try{this._config=normalizeConfig(draft);valid=true;status.textContent='Entwurf geändert · Speichern übernimmt ihn nur für diese Karte.';}
      catch(error){valid=false;status.textContent=`Eingabe prüfen: ${error?.message||'Ungültige Kartenkonfiguration'}`;}
      save.disabled=!valid;this.render();
    };
    editor.hass=this._hass;editor.setConfig(draft);editor.addEventListener('config-changed',refreshDraft);
    header.append(title,button('×',close,{'aria-label':'Karteneinstellungen schließen'}));content.append(editor);footer.append(status,reset,cancel,save);shell.append(header,content,footer);dialog.append(shell);this._settingsDialog=dialog;this._settingsEditor=editor;
    dialog.addEventListener('click',event=>{if(event.target===dialog)close();});dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    this.shadowRoot.append(dialog);dialog.showModal();if(this._settingsPortal)this._settingsPortal.hidden=true;
  }
  makeGraph(card,config){
    const graphConfigValue=graphConfig(config,this._hass?.states||{});if(!graphConfigValue)return;
    const graphKey=[config.power_entity,config.energy_entity,config.graph?.source,config.graph?.span,config.graph?.interval,config.graph?.update_interval,config.graph?.height].join('|');
    if(graphKey!==this._graphKey){this._graphKey=graphKey;this._graphCard=null;this._graphPromise=null;}
    const layer=el('div',{class:'power-graph','aria-label':'24-Stunden-Leistungsverlauf'});layer.style.height=`${config.graph.height}px`;layer.style.bottom='0';layer.addEventListener('click',event=>event.stopPropagation());card.insertBefore(layer,card.firstChild);
    if(this._graphCard){this._graphCard.hass=this._hass;layer.append(this._graphCard);return;}
    if(!this._graphPromise){this._graphPromise=typeof window.loadCardHelpers==='function'?window.loadCardHelpers().then(helpers=>{
      if(!helpers?.createCardElement)throw new Error('Kartenhilfe nicht verfügbar');
      return window.__dash6Cards.create(graphConfigValue);
    }).catch(()=>null):Promise.resolve(null);}
    this._graphPromise.then(graph=>{if(!graph||!this._config||this._graphKey!==graphKey)return;this._graphCard=graph;graph.hass=this._hass;const current=this.shadowRoot.querySelector('.power-graph');if(current?.isConnected)current.append(graph);});
  }
  renderModeBar(c,modes,actual,caps){
    if(c.controls.buttons==='group'){
      const bar=this._modeBar||(this._modeBar=document.createElement('dash6-glass-segments'));
      bar.className='mode-bar glass-mode-bar';bar.style.width=c.controls.label==='icon'?'140px':'100%';
      bar.configure({options:modes.map(mode=>({value:mode,label:MODES[mode],icon:({brightness:'mdi:brightness-6',color_temp:'mdi:thermometer',color:'mdi:palette',white:'mdi:lightbulb-outline'})[mode],disabled:!caps[mode]})),value:this._mode,label:'Lichtfunktion auswählen',iconsOnly:c.controls.label==='icon'});
      bar.onselection=mode=>{this._mode=mode;const controls=bar.parentElement;if(!controls)return;const old=[...controls.children].filter(child=>child!==bar);old.forEach(child=>child.querySelectorAll('input[type=range]').forEach(input=>input._satinDrag?.cancel()));const slider=this.renderSliderForMode(controls,stateFor(this._hass,c.entity),mode);const motion=!matchMedia('(prefers-reduced-motion: reduce)').matches;for(const child of old){if(motion&&child.animate){const rect=child.getBoundingClientRect(),parent=controls.getBoundingClientRect();Object.assign(child.style,{position:'absolute',top:(rect.top-parent.top)+'px',left:(rect.left-parent.left)+'px',width:rect.width+'px',pointerEvents:'none'});child.setAttribute('aria-hidden','true');child.querySelectorAll('input,button').forEach(e=>e.disabled=true);child.animate([{opacity:1},{opacity:0}],{duration:180,easing:'ease-out'}).finished.catch(()=>{}).then(()=>child.remove());}else child.remove();}if(slider){c.controls.position==='bottom'?controls.insertBefore(slider,bar):controls.append(slider);if(motion)slider.animate?.([{opacity:0,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'cubic-bezier(.22,.8,.25,1)'});}};
      if(!bar._listener){bar.addEventListener('selection-changed',e=>{e.stopPropagation();bar.onselection(e.detail.value);});bar._listener=true;}
      return bar;
    }
    const label=c.controls.label||'icon',bar=el('div',{class:`mode-bar ${c.controls.buttons==='group'?'grouped':''} ${c.controls.density==='compact'?'compact':''} ${label==='icon'?'icon-only':'text-only'}`,'aria-label':'Lichtfunktion auswählen'});
    for(const mode of modes){const supported=Boolean(caps[mode]);const tab=button('',()=>{if(!supported)return;this._mode=mode;this._animateSlider=true;this.render();},{'aria-label':MODES[mode]+(supported?'':' (nicht unterstützt)'),'title':MODES[mode]+(supported?'':' · nicht unterstützt'),'aria-pressed':this._mode===mode,'data-current':mode===actual,disabled:!supported});tab.append(chooserLabel(mode,label));if(mode===actual)tab.append(el('span',{class:'visually-hidden'},' · aktueller Lichtmodus'));bar.append(tab);}
    return bar;
  }
  renderSliderForMode(target,state,mode){
    const a=state?.attributes||{},disabled=!available(state);
    if(mode==='brightness')return slider('Helligkeit',1,100,finite(a.brightness)?Math.max(1,Math.round(a.brightness/2.55)):100,' %',`linear-gradient(90deg,#444,${lightColor({...state,state:'on'})})`,v=>this.send({brightness_pct:v}),disabled,undefined,this);
    if(mode==='color_temp'){
      const bounds=kelvinBounds(state);
      return bounds?slider('Farbtemperatur',...bounds,clamp(controlKelvin(state)||bounds[0],...bounds),' K',kelvinTrack,v=>this.send({color_temp_kelvin:v}),disabled,undefined,this):button('Weiß im Gerätedialog einstellen',()=>this.moreInfo());
    }
    if(mode==='color')return slider('Farbton',0,360,a.hs_color?.[0]||0,'°',hueTrack,v=>this.send({hs_color:[v,a.hs_color?.[1]??100]}),disabled,undefined,this);
    if(mode==='white')return slider('Weißkanal',1,255,a.brightness||255,'',kelvinTrack,v=>this.send({white:v}),disabled,undefined,this);
    if(mode==='effect')return button(a.effect&&!neutralEffects.has(String(a.effect).toLocaleLowerCase())?`Effekt: ${a.effect}`:'Effekt auswählen',()=>this.openEffects(),{class:'effect-entry full'});
    return null;
  }
  renderControls(target,state,c){
    this._controlsResize?.disconnect();this._controlsResize=null;
    const caps=capabilities(state,c),actual=activeMode(state);
    const preferred=preferredControlMode(state,caps);
    const modeStamp=actual+":"+warmHue(state);if(this._actual!==modeStamp){this._actual=modeStamp;this._mode=preferred;}
    const controls=el('div',{class:`controls layout-${c.controls.position||'top'}${state?.state==='off'?' main-off':''}`});
    if(c.controls.mode==='separate'){
      if(caps.brightness)controls.append(this.renderSliderForMode(controls,state,'brightness'));
      const colorMode=currentColorMode(state,caps,this._colorMode);if(colorMode){this._colorMode=colorMode;controls.append(this.renderSliderForMode(controls,state,colorMode));}
      if(caps.effect)controls.append(this.renderSliderForMode(controls,state,'effect'));
    }else{
      const slots=['brightness','color_temp',caps.color?'color':caps.white?'white':'color'];
      const selectable=slots.filter(mode=>caps[mode]);
      if(!selectable.includes(this._mode))this._mode=selectable.includes(preferred)?preferred:selectable[0];
      const bar=this.renderModeBar(c,slots,actual,caps),selected=this._mode,control=selected?this.renderSliderForMode(controls,state,selected):null;
      controls.append(bar);if(control)controls.append(control);
      if(c.controls.position==='bottom')controls.append(bar);
    }
    if(c.controls.mode==='separate'&&c.controls.position==='bottom')controls.classList.add('layout-bottom');
    target.append(controls);if(this._animateSlider){this._animateSlider=false;if(!matchMedia('(prefers-reduced-motion: reduce)').matches)controls.querySelector('.slider-wrap')?.animate?.([{opacity:0},{opacity:1}],{duration:280,easing:'ease-out'});}
  }
  renderMainBack(target,c,placement){
    const prefs=c.main_back;if(!prefs?.enabled||prefs.placement!==placement)return;
    if(!c.segments.length&&!prefs.main_entity&&!prefs.back_entity)return;
    const group=el('div',{class:'toggle-actions','aria-label':'Haupt- und Backlight'});
    for(const[role,label,materialIcon,show]of [['main','Hauptlicht','mdi:ceiling-light',prefs.show_main!==false],['back','Backlight','mdi:led-strip-variant',prefs.show_back!==false]]){
      const ids=this.roleTargets(role,c);if(!show||!ids.length)continue;
      const on=ids.some(id=>stateFor(this._hass,id)?.state==='on'),toggle=button('',()=>this.toggleRole(role),{'data-role':role,'aria-label':`${label} ${on?'ausschalten':'einschalten'}`,'title':`${label} ${on?'aus':'ein'}`,'aria-pressed':on,disabled:!ids.some(id=>available(this._hass.states[id]))});toggle.append(icon(materialIcon));group.append(toggle);
    }
    if(group.childElementCount)target.append(group);
  }
  renderInlineSegments(card,c){
    if(c.segment_display.placement!=='inline'||!c.segments.length)return;
    const wrapper=el('section',{class:'inline-segments','aria-label':'Enthaltene Lichter'}),title=el('div',{class:'row'});title.append(el('strong',{class:'grow'},'Enthaltene Lichter'));
    selectionToolbar(title,c.segments,this._selection,action=>this.selectAction(action,c.segments));wrapper.append(title);
    if(c.segment_display.style==='list'){
      const stack=el('div',{class:'member-stack'});for(const item of c.segments){const child=document.createElement(TYPES.light);child._selection=this._selection;child.classList.toggle('selected',this._selection.has(item.entity));child.setConfig({...c,...item,type:`custom:${TYPES.light}`,entity:item.entity,segments:item.segments||[],scenes:[],power_entity:item.power_entity,energy_entity:item.energy_entity,segment_display:{...c.segment_display,placement:'detail'},graph:{...c.graph,show:Boolean(item.power_entity||item.energy_entity)}});child.selectionHandler=id=>this.toggleSelection(id);child.hass=this._hass;stack.append(child);}wrapper.append(stack);
    }else wrapper.append(segmentPicker(c.segments,optimisticStates(this._hass),this._selection,id=>this.toggleSelection(id),c.segment_display.style,c.segment_display.columns));
    card.append(wrapper);
  }
  render(){
    if(!this._config||!this._hass||this._dragging)return;
    const feedbackID=this._config.entity;this._feedbackSignature=JSON.stringify([stateFor(this._hass,feedbackID),optimistic.errorEvents.get(feedbackID),optimistic.pending(feedbackID)]);
    const c=effectiveConfig(this._config,this._hass.states,this._registry), state=stateFor(this._hass,c.entity), a=state?.attributes||{}, actual=activeMode(state), effectRunning=state?.state==='on'&&Boolean(a.effect)&&!neutralEffects.has(String(a.effect).toLocaleLowerCase());this._renderConfig=c;
    // Keep a currently open dialog alive across HA updates.
    const dialog=this._dialog,focusIndex=[...this.shadowRoot.querySelectorAll('button,input,select')].indexOf(this.shadowRoot.activeElement),oldCard=this.shadowRoot.querySelector('ha-card.card');if(!this.shadowRoot.querySelector('style'))addStyle(this.shadowRoot);
    const card=el('ha-card',{class:'card'}), head=el('div',{class:'head'}), targets=this._commandTargets?.(), on=targets?.length?targets.every(id=>stateFor(this._hass,id)?.state==='on'):state?.state==='on';
    const power=oldCard?.querySelector('dash6-glass-switch')||document.createElement('dash6-glass-switch');
    power.setConfig({...c,name:displayName(c,state),icon:c.icon||'mdi:lightbulb',group:this instanceof Dash5LightgroupCard||c.segments.length>0,member_entities:targets?.length?targets:c.segments.map(s=>s.entity)});power.managed=true;power.visual={...switchVisual({...c,name:displayName(c,state),group:this instanceof Dash5LightgroupCard||c.segments.length>0,member_entities:targets?.length?targets:c.segments.map(s=>s.entity)},optimisticStates(this._hass),lightColor),on};
    if(!power._dash6Bound){power.addEventListener('toggle-request',e=>{e.stopPropagation();this.send({},e.detail.on?'turn_on':'turn_off')});power._dash6Bound=true;}
    const link=this._backgroundAction!==undefined?el('div',{class:'detail-link'}):button('',()=>this.open(),{class:'detail-link','aria-label':`${displayName(c,state)} Details öffnen`}), text=el('span',{class:'grow'});
    const status=[];
    if(childLocked(c,this._hass.states))status.push('Kindersicherung aktiv');
    if(!state||state.state==='unavailable')status.push('Nicht verfügbar');
    else if(state.state==='unknown')status.push('Status unbekannt');
    else if(!on)status.push('Aus');
    else{if(finite(a.brightness))status.push(`${Math.round(a.brightness/2.55)} %`);if(a.color_mode==='color_temp'&&a.color_temp_kelvin>0)status.push(`${Math.round(a.color_temp_kelvin)} K`);else if(effectRunning)status.push('Effekt '+a.effect);else if(actual==='color')status.push('Farbton '+Math.round(a.hs_color?.[0]||0)+'°');else if(!status.length)status.push('Ein');}
    if(c.segments.length)status.push(`${c.segments.filter(s=>stateFor(this._hass,s.entity)?.state==='on').length}/${c.segments.length} an`);
    if(optimistic.pending(c.entity))status.push(optimistic.errors.has(c.entity)?'Noch nicht bestätigt':'Wird übernommen…');
    const name=el('span',{class:'name'},displayName(c,state));if(this._selectionSummary)name.append(el('strong',{class:'selection-summary'},` (${this._selectionSummary.count} von ${this._selectionSummary.total})`));text.append(name,el('span',{class:'status'},status.join(' · ')));link.append(text);head.append(power,link);this.renderMainBack(head,c,'header');let gear=null;if(this.showConfigGear()){gear=button('',()=>this.openSettings(),{class:'settings-trigger','aria-label':'Karteneinstellungen öffnen','title':'Karteneinstellungen'});gear.append(icon('mdi:cog-outline'));head.append(gear);}card.append(head);
    if(capabilities(state,c).effect){
      card.classList.add('has-effect-trigger');
      const title=effectRunning?'Effekt '+a.effect+' beenden':'Lichteffekt auswählen';
      const trigger=button('',()=>{if(effectRunning)this.send(stopEffectData(state));else this.openEffects();},{class:'effect-trigger','aria-label':title,title,'aria-pressed':effectRunning,disabled:!available(state)});
      trigger.append(icon('mdi:creation'));card.append(trigger);
    }
    const metrics=[];for(const id of [c.power_entity,c.energy_entity]){const s=this._hass.states[id];if(available(s))metrics.push(`${s.state} ${s.attributes.unit_of_measurement||''}`);}
    if(metrics.length)card.append(el('p',{class:'metrics muted'},metrics.join(' · ')));
    this.renderInlineSegments(card,c);
    if(capabilities(state,c).brightness||capabilities(state,c).color_temp||capabilities(state,c).color||capabilities(state,c).white)this.renderControls(card,state,c);
    const occurrence=optimistic.errorEvents.get(c.entity);if(occurrence&&occurrence!==this._seenError){this._seenError=occurrence;reportError(this,occurrence.message);}head.append(errorIndicator(this));
    card.addEventListener('click',e=>{if(!e.composedPath().some(n=>n.tagName&&['BUTTON','INPUT','SELECT','DASH6-GLASS-SWITCH'].includes(n.tagName))){if(this._backgroundAction!==undefined)this._backgroundAction?.();else if(this._selectionHandler){e.stopPropagation();this._selectionHandler(c.entity,this._selection);}else this.open();}});
    if(oldCard)oldCard.replaceWith(card);else this.shadowRoot.insertBefore(card,dialog||null);
    this.makeGraph(card,c);this.syncSettingsPortal(gear);
    if(focusIndex>=0&&!dialog)card.querySelectorAll('button,input,select')[focusIndex]?.focus({preventScroll:true});
  }
  moreInfo(){emit(this,'hass-more-info',{entityId:this._config.entity});}
}
export class Dash5LightgroupCard extends Dash5LightCard {}

export class Dash5LightDialog extends Base {
  constructor(){super();this.attachShadow({mode:'open'});this._selection=new Set();this._stack=[];this._selecting=false;}
  configure(config,hass,selection=new Set(),onSelectionChange=()=>{}){this._config=config;this._hass=hass;this._current=config;this._selection=selection;this._onSelectionChange=onSelectionChange;}
  set hass(hass){this._hass=hass;this.refresh();}
  connectedCallback(){bindThemePreferences(this);this._unsubscribe=optimistic.subscribe(()=>this.refresh());}
  disconnectedCallback(){this.shadowRoot.querySelectorAll('input[type=range]').forEach(input=>input._satinDrag?.cancel());unbindThemePreferences(this);this._unsubscribe?.();}
  open(){
    addStyle(this.shadowRoot,`dialog{padding:0;border:1px solid var(--divider-color,#555);border-radius:20px;background:var(--card-background-color,#202020);color:inherit;width:min(680px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:hidden}dialog::backdrop{background:#0009;backdrop-filter:blur(6px)}.shell{display:flex;flex-direction:column;max-height:calc(100dvh - 26px);padding:12px;padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:max(12px,env(safe-area-inset-right,0px))}.dialog-head{display:flex;align-items:center;gap:8px;flex:none;padding-bottom:8px}.body{overflow:auto;overscroll-behavior:contain;min-height:0;padding:2px;display:grid;gap:8px}.actions{display:grid;gap:8px;flex:none;padding-top:8px;padding-bottom:max(0px,env(safe-area-inset-bottom,0px));background:var(--card-background-color,#202020)}.member{display:flex;align-items:flex-start;gap:8px}.member>dash6-govee-light-card-v2{flex:1;min-width:0}.choose{flex:none;margin-top:12px}.effects{display:grid;gap:8px;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr))}@media(max-width:599px){dialog{width:100%;max-width:100%;height:100dvh;max-height:100dvh;border-radius:0;margin:0}.shell{height:100dvh;max-height:100dvh;padding-top:max(12px,env(safe-area-inset-top,0px))}}`);
    this._dialog=el('dialog',{'aria-label':this._config.detail_title||this._config.name||'Lichtsteuerung'});
    this._shell=el('div',{class:'shell'});this._head=el('header',{class:'dialog-head'});this._body=el('div',{class:'body'});this._actions=el('footer',{class:'actions'});
    this._shell.append(this._head,this._body);this._dialog.append(this._shell);this.shadowRoot.append(this._dialog);
    this._dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
    this._dialog.addEventListener('click',e=>{if(e.target===this._dialog){const r=this._dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.close();}});
    this.addEventListener('dash5-open-detail',e=>{e.preventDefault();e.stopPropagation();if(e.detail.config.entity===this._current.entity)return;this._stack.push({config:this._current,scroll:this._body.scrollTop});this._current=e.detail.config;this.render();});
    this.render();this._dialog.showModal();
  }
  close(){this.shadowRoot.querySelectorAll('input[type=range]').forEach(input=>input._satinDrag?.cancel());const owner=this.getRootNode()?.host;this._dialog.close();if(owner)owner._dialog=null;this.remove();}
  back(){if(this._bulk){this._bulk=false;this.render();return;}const previous=this._stack.pop();if(previous){this._current=previous.config;this.render();this._body.scrollTop=previous.scroll;}else this.close();}
  card(config,{root=false,member=false}={}){
    const card=document.createElement(TYPES.light);card._selection=this._selection;
    if(member)card.setBackgroundAction(null);
    if(root){card.setBackgroundAction(null);card.setCommandHandler((data,service)=>this.sendRootCommand(data,service),()=>selectedControlTargets(this._current,this._selection,this._hass.states));card.setSelectionSummary(this._current.segments.filter(item=>this._selection.has(item.entity)).length,this._current.segments.length);}
    card.setConfig(config);card.hass=this._hass;return card;
  }
  async sendRootCommand(data,service){
    const ids=selectedControlTargets(this._current,this._selection,this._hass.states).filter(id=>available(this._hass.states[id]));
    if(!ids.length)throw new Error('Kein verfügbares Licht ausgewählt.');
    const results=await Promise.allSettled(ids.map(id=>sendLight(this._hass,id,data,service,this._current)));
    const failed=results.flatMap((result,index)=>result.status==='rejected'?[ids[index]]:[]);
    if(failed.length)throw new Error(`Änderung fehlgeschlagen: ${failed.map(id=>this._hass.states[id]?.attributes?.friendly_name||id).join(', ')}`);
  }
  toggleSelection(id){if(id)this._selection.has(id)?this._selection.delete(id):this._selection.add(id);this._onSelectionChange?.(id,this._selection);this.render();}
  selectionAction(action,segments){const next=nextSelection(segments.map(item=>item.entity),this._selection,action);this._selection.clear();for(const id of next)this._selection.add(id);this._onSelectionChange?.(null,this._selection);this.render();}
  selectedLeaves(){return leafEntities([...this._selection],this._hass.states,this._config.entity).filter(id=>available(this._hass.states[id]));}
  refresh(){
    if(!this._body)return;
    for(const card of this._body.querySelectorAll(TYPES.light))card.hass=this._hass;
    if(this._count)this._count.textContent=`${this._selection.size} ausgewählt · ${this.selectedLeaves().length} verfügbare Lichter`;
    // Keep child cards and their controls synchronized without disturbing an open effect picker.
    for(const node of this._body.querySelectorAll('[data-member]')){
      const entity=node.dataset.member;node.setAttribute('aria-pressed',String(this._selection.has(entity)));
    }
    for(const node of this._body.querySelectorAll('[data-effect]'))node.setAttribute('aria-pressed',String(stateFor(this._hass,this._current.entity)?.attributes.effect===node.dataset.effect));
    for(const node of this._body.querySelectorAll('[data-segment]')){const id=node.dataset.segment,state=stateFor(this._hass,id);node.setAttribute('aria-pressed',String(this._selection.has(id)));node.style.setProperty('--segment-color',lightColor(state));node.disabled=!available(state);}
    for(const node of this._body.querySelectorAll('[data-role]')){const selected=selectedControlTargets(this._current,this._selection,this._hass.states),ids=controlTarget(this._current,node.dataset.role,this._hass.states).filter(id=>selected.length===1&&selected[0]===this._current.entity||selected.includes(id));node.setAttribute('aria-pressed',String(ids.some(id=>stateFor(this._hass,id)?.state==='on')));node.disabled=!ids.some(id=>available(this._hass.states[id]));}
    for(const node of this._body.querySelectorAll('[data-scene-state]'))node.setAttribute('aria-pressed',String(this._hass.states[node.dataset.sceneState]?.state==='on'));
    for(const node of this._body.querySelectorAll('[data-original-card]'))node.hass=this.controllerHass();
  }
  render(){
    this._head.replaceChildren();this._body.replaceChildren();this._actions.replaceChildren();this._count=null;
    const title=this._bulk?'Gemeinsam einstellen':this._current.detail_title||displayName(this._current,this._hass.states[this._current.entity]);
    this._head.append(button('‹',()=>this.back(),{'aria-label':'Zurück'}),el('h2',{class:'grow'},title),button('×',()=>this.close(),{'aria-label':'Schließen'}));
    if(this._bulk){this.renderBulk();return;}
    const c=this._current;
    this._body.append(this.card({...c,segments:[]},{root:true}));
    this.renderMainBack(this._body,c,'detail');
    if(c.segments?.length){
      const tools=el('div',{class:'stack'});tools.append(el('h3',{},'Enthaltene Lichter'));selectionToolbar(tools,c.segments,this._selection,action=>this.selectionAction(action,c.segments));this._body.append(tools);
      if(c.segment_display?.style!=='list'){
        this._body.append(segmentPicker(c.segments,optimisticStates(this._hass),this._selection,id=>this.toggleSelection(id),c.segment_display.style,c.segment_display.columns));
        const details=el('details');details.append(el('summary',{},'Lichter einzeln bedienen'));this.appendMemberCards(details,c);this._body.append(details);
      }else this.appendMemberCards(this._body,c);
    }
    this.renderScenes(c);
    this._message=el('p',{role:'status','aria-live':'polite'});this._body.append(this._message);this.refresh();
  }
  appendMemberCards(target,c){
    const stack=el('div',{class:'member-stack'});
    for(const segment of c.segments){
      const selecting=c.segment_display?.style==='list',row=el('div',{class:`member-card${selecting?' member':''}${this._selection.has(segment.entity)?' selected':''}`,'data-member':segment.entity});
      if(selecting)row.append(button(this._selection.has(segment.entity)?'✓':'',()=>this.toggleSelection(segment.entity),{class:'member-select','aria-label':`${segment.name||this._hass.states[segment.entity]?.attributes?.friendly_name||segment.entity} ${this._selection.has(segment.entity)?'abwählen':'auswählen'}`,'aria-pressed':this._selection.has(segment.entity)}));
      row.append(this.card({...c,...segment,type:`custom:${TYPES.light}`,entity:segment.entity,name:segment.name,segments:segment.segments||[],scenes:[],power_entity:segment.power_entity,energy_entity:segment.energy_entity,main_back:{...c.main_back,enabled:false},segment_display:{...c.segment_display,placement:'detail'},show_effects:segment.show_effects??c.show_effects,show_color_temp:segment.show_color_temp??c.show_color_temp},{member:true}));stack.append(row);
    }
    target.append(stack);
  }
  renderMainBack(target,c,placement){
    if(!c.main_back?.enabled||c.main_back.placement!==placement||(!c.segments?.length&&!c.main_back.main_entity&&!c.main_back.back_entity))return;
    const group=el('div',{class:'toggle-actions','aria-label':'Haupt- und Backlight'});
    for(const[role,label,materialIcon,show]of [['main','Hauptlicht','mdi:ceiling-light',c.main_back.show_main!==false],['back','Backlight','mdi:led-strip-variant',c.main_back.show_back!==false]]){
      const selected=selectedControlTargets(c,this._selection,this._hass.states),ids=controlTarget(c,role,this._hass.states).filter(id=>selected.length===1&&selected[0]===c.entity||selected.includes(id));if(!show||!ids.length)continue;
      const on=ids.some(id=>stateFor(this._hass,id)?.state==='on'),toggle=button('',async()=>{try{await toggleTargets(this._hass,ids,c);}catch(error){this.message(error.message,true);}this.refresh();},{'data-role':role,'aria-label':`${label} ${on?'ausschalten':'einschalten'}`,'title':`${label} ${on?'aus':'ein'}`,'aria-pressed':on,disabled:!ids.some(id=>available(this._hass.states[id]))});toggle.append(icon(materialIcon));group.append(toggle);
    }
    if(group.childElementCount)target.append(group);
  }
  renderIndividualExtras(c){
    const state=stateFor(this._hass,c.entity), caps=capabilities(state,c), a=state?.attributes||{};
    // Keep native RGBW/RGBWW controls available via the device dialog, rather than invent channel mapping.
    if(caps.effect)this._body.append(button(a.effect&&!neutralEffects.has(String(a.effect).toLocaleLowerCase())?`Effekt ändern · ${a.effect}`:'Effekt auswählen',()=>showEffectsPicker(this.shadowRoot,()=>stateFor(this._hass,c.entity),data=>this.individual(data)),{class:'full'}));
  }
  async individual(data){try{await sendLight(this._hass,this._current.entity,data,'turn_on',this._current);this.refresh();}catch(e){this.message(e.message,true);}}
  controllerHass(){
    const hass=this._hass,states={...hass.states};for(const id of new Set([...optimistic.entries.keys(),...optimistic.intents.keys()]))states[id]=stateFor(hass,id);
    return {...hass,states,callService:(domain,service,data={},target)=>{
      const raw=data.entity_id||target?.entity_id,ids=typeof raw==='string'?raw.split(',').map(id=>id.trim()):raw;
      if(domain==='light'&&['turn_on','turn_off','toggle'].includes(service)&&Array.isArray(ids)&&ids.length&&ids.every(lightID)&&!target?.area_id&&!target?.device_id){
        const payload={...data};delete payload.entity_id;
        return Promise.all(ids.map(id=>sendLight(hass,id,payload,service==='toggle'?(stateFor(hass,id)?.state==='on'?'turn_off':'turn_on'):service,this._config)));
      }
      return hass.callService(domain,service,data,target);
    }};
  }
  async mountOriginal(target,config){
    const controller='govee-segment-light-card';
    const attach=(card,cardConfig)=>{card.setConfig(cardConfig);card.dataset.originalCard='true';card.hass=this.controllerHass();target.append(card);};
    if(customElements.get(controller)){
      try{attach(document.createElement(controller),legacyControllerConfig(config));return;}catch{/* Preserve access through the existing Mushroom fallback below. */}
    }
    let helpers;
    try{helpers=await window.loadCardHelpers?.();}catch{/* Native details remain available. */}
    if(!target.isConnected)return;
    const entries=[{entity:config.entity,name:config.name},...(config.segments||[])];
    if(customElements.get('mushroom-light-card')){
      for(const item of entries){
        const cardConfig={type:'custom:mushroom-light-card',entity:item.entity,name:item.name,show_brightness_control:true,show_color_control:true,show_color_temp_control:config.show_color_temp!==false,use_light_color:true,collapsible_controls:false,tap_action:{action:'more-info'},icon_tap_action:{action:'toggle'}};
        try{attach(document.createElement('mushroom-light-card'),cardConfig);}catch{target.append(button(`${item.name||item.entity} · Gerätedetails`,()=>{emit(this,'hass-more-info',{entityId:item.entity});this.close();}));}
      }
    }else if(helpers?.createCardElement){
      for(const item of entries){const card=helpers.createCardElement({type:'tile',entity:item.entity,name:item.name,tap_action:{action:'more-info'}});card.dataset.originalCard='true';card.hass=this.controllerHass();target.append(card);}
    }else target.append(el('p',{class:'muted'},'Original- und Mushroom-Karte sind nicht geladen. Alle Gerätedetails sind über den folgenden Button erreichbar.'));
  }
  renderScenes(c){
    if(!c.scenes?.length)return;
    this._body.append(el('h3',{},'Szenen · ganze Gruppe'));const group=el('div',{class:'scenes'});
    for(const scene of c.scenes){const b=button(scene.name||this._hass.states[scene.entity]?.attributes.friendly_name||scene.entity,async()=>{
      b.disabled=true;this.message('Szene wird gestartet…');try{await this._hass.callService('scene','turn_on',{entity_id:scene.entity});this.message('Szene gestartet.');}catch{this.message('Szene konnte nicht gestartet werden.',true);}finally{b.disabled=false;}
    },{'data-scene-state':scene.state_entity,'aria-pressed':scene.state_entity?this._hass.states[scene.state_entity]?.state==='on':false,disabled:!this._hass.states[scene.entity]});if(scene.icon)b.prepend(icon(scene.icon));group.append(b);}this._body.append(group);
  }
  message(text,error=false){if(error){reportError(this,text);this._message?.parentElement?.append(errorIndicator(this));if(this._message)this._message.textContent='';}else if(this._message){this._message.textContent=text;this._message.className='';}}
  renderBulk(){
    const ids=this.selectedLeaves(), caps=bulkCapabilities(ids,this._hass.states), draft={};
    this._body.append(el('p',{},`${ids.length} ausgewählte Lichter. Nur geänderte Werte werden übernommen.`));
    this._body.append(el('p',{class:'muted'},'Unterschiedliche Ausgangswerte bleiben erhalten, bis du den jeweiligen Regler veränderst.'));
    const note=el('p',{role:'status'},'Noch keine Änderung ausgewählt.');this._body.append(note);
    const set=(key,value)=>{if(['color_temp_kelvin','hs_color','effect'].includes(key))for(const other of ['color_temp_kelvin','hs_color','effect'])delete draft[other];draft[key]=value;note.textContent='Geändert: '+Object.keys(draft).map(k=>({brightness_pct:'Helligkeit',color_temp_kelvin:'Weiß',hs_color:'Farbe',effect:'Effekt'}[k])).join(', ');apply.disabled=false;};
    if(caps.brightness)this._body.append(slider('Neue Helligkeit',1,100,50,' %','linear-gradient(90deg,#444,#fff)',v=>set('brightness_pct',v)));
    if(caps.color_temp)this._body.append(slider('Neue Farbtemperatur',...caps.bounds,Math.round((caps.bounds[0]+caps.bounds[1])/2),' K',kelvinTrack,v=>set('color_temp_kelvin',v)));
    if(caps.color)this._body.append(slider('Neue Farbe',0,360,0,'°',hueTrack,v=>set('hs_color',[v,100])));
    if(caps.effects?.length){const select=el('select',{'aria-label':'Gemeinsamer Effekt'});select.append(el('option',{value:''},'Effekt unverändert'));for(const effect of caps.effects)select.append(el('option',{value:effect},effect));select.addEventListener('change',()=>{if(select.value)set('effect',select.value);});this._body.append(select);}
    this._message=el('p',{role:'status','aria-live':'polite'});this._body.append(this._message);
    const apply=button(`Auf ${ids.length} Lichter anwenden`,()=>this.apply(draft,'turn_on'),{class:'primary full',disabled:true});this._actions.append(apply);
  }
  async apply(data,service){
    const ids=this.selectedLeaves();if(!ids.length){this.message('Keine verfügbaren Lichter ausgewählt.',true);return;}
    // Revalidate immediately before dispatch: membership/capabilities may have changed while editing.
    const caps=bulkCapabilities(ids,this._hass.states);
    if((data.hs_color&&!caps.color)||(data.color_temp_kelvin&&(!caps.color_temp||data.color_temp_kelvin<caps.bounds[0]||data.color_temp_kelvin>caps.bounds[1]))||(data.brightness_pct&&!caps.brightness)||(data.effect&&!caps.effects?.includes(data.effect))){this.message('Die gemeinsamen Fähigkeiten haben sich geändert. Auswahl erneut öffnen.',true);return;}
    this.message('Änderungen werden übernommen…');const controls=[...this._actions.querySelectorAll('button')];controls.forEach(b=>b.disabled=true);
    const results=await Promise.allSettled(ids.map(id=>sendLight(this._hass,id,data,service,this._config)));
    const failed=results.flatMap((r,i)=>r.status==='rejected'?[ids[i]]:[]);
    this.message(failed.length?`${ids.length-failed.length} aktualisiert; fehlgeschlagen: ${failed.map(id=>this._hass.states[id]?.attributes.friendly_name||id).join(', ')}`:`Auf ${ids.length} Lichter angewendet.`,failed.length>0);
    controls.forEach(b=>b.disabled=false);
  }
}


if(globalThis.customElements){
  for(const[name,cls]of [[TYPES.light,Dash5LightCard],[TYPES.group,Dash5LightgroupCard],['dash6-light-dialog-v2',Dash5LightDialog]])if(!customElements.get(name))customElements.define(name,cls);
  window.customCards=window.customCards||[];
  for(const[type,name]of [[TYPES.light,'DASH5 Govee Licht'],[TYPES.group,'DASH5 Lichtgruppe']])if(!window.customCards.some(c=>c.type===type))window.customCards.push({type,name,description:'Touchfreundliche Lichtsteuerung mit Einzeldetails und gemeinsamer Auswahl',preview:true});
}

export {Base,copy,el,button,emit,loadEntityRegistry,addStyle};
