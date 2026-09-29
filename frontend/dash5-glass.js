/* Optional optical layer for DASH5. The Home Assistant controls stay in their own DOM. */
import { LiquidGlass } from './ybouane-liquidglass-1.0.3.js';

const PATH = window.__DASH5_LIQUID_GLASS_PATH__ || '/dash-5/wohnzimmer';
const PHOTO = window.__DASH5_LIQUID_GLASS_PHOTO__ || '/local/liquid-glass-living-room.jpg';
const MAX_LENSES = 8;
const MIN_WIDTH = 190;
const MIN_HEIGHT = 68;
const MAX_HEIGHT = 700;
const CONFIG = {
  blurAmount: 0.07,
  refraction: 0.82,
  chromAberration: 0.015,
  edgeHighlight: 0.18,
  specular: 0.15,
  fresnel: 0.82,
  cornerRadius: 16,
  zRadius: 14,
  shadowOpacity: 0.12,
};

let instance = null;
let root = null;
let view = null;
let container = null;
let lenses = [];
let assigned = new Map();
let originals = new Map();
let cardElements = [];
let pending = false;
let starting = false;
let timer = null;

function deepElements(start, result = []) {
  for (const element of start.querySelectorAll('*')) {
    result.push(element);
    if (element.shadowRoot) deepElements(element.shadowRoot, result);
  }
  return result;
}

function active() {
  return location.pathname === PATH
    && window.__DASH5_LIQUID_GLASS_DISABLE__ !== true
    && !!getComputedStyle(document.documentElement).getPropertyValue('--lg-surface').trim()
    && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function dashboardContainer() {
  return deepElements(document).find((element) => element.tagName === 'HUI-VIEW-CONTAINER') || null;
}

function alpha(color) {
  const match = color.match(/rgba?\(([^)]+)\)/);
  if (!match) return 0;
  const parts = match[1].split(',');
  return parts.length > 3 ? Number(parts[3]) : 1;
}

function scanCards() {
  if (!view) return [];
  cardElements = [];
  for (const element of deepElements(view)) {
    const parentTag = element.getRootNode().host?.tagName || '';
    const isCard = element.tagName === 'HA-CARD'
      || (parentTag === 'DASH5-GOVEE-LIGHT-CARD-V2' && element.classList.contains('card'));
    if (!isCard || parentTag === 'MINI-GRAPH-CARD') continue;
    const background = getComputedStyle(element).backgroundColor;
    if (alpha(background) < 0.3) continue;
    cardElements.push(element);
  }
}

function candidates() {
  const found = [];
  for (const element of cardElements) {
    if (!element.isConnected) continue;
    const box = element.getBoundingClientRect();
    if (box.width < MIN_WIDTH || box.height < MIN_HEIGHT || box.height > MAX_HEIGHT
      || box.bottom < 60 || box.top > innerHeight - 12) continue;
    found.push({ element, box });
  }
  // Keep outer card surfaces when a card contains another frosted card.
  const deduped = found.filter((item) => !found.some((other) =>
    other !== item && other.element.contains(item.element)
      && Math.abs(other.box.left - item.box.left) < 8
      && Math.abs(other.box.top - item.box.top) < 8));
  deduped.sort((a, b) => a.box.top - b.box.top || b.box.width - a.box.width);
  return deduped.slice(0, innerWidth < 600 ? 4 : MAX_LENSES);
}

function restoreCard(element) {
  const old = originals.get(element);
  if (!old) return;
  for (const [property, [value, priority]] of old) {
    if (value) element.style.setProperty(property, value, priority);
    else element.style.removeProperty(property);
  }
  originals.delete(element);
}

function softenCard(element) {
  if (originals.has(element)) return;
  const old = new Map();
  for (const property of ['background-color', 'backdrop-filter', '-webkit-backdrop-filter']) {
    old.set(property, [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]);
  }
  originals.set(element, old);
  element.style.setProperty('background-color', 'rgba(21, 31, 44, 0.48)', 'important');
  element.style.setProperty('backdrop-filter', 'none', 'important');
  element.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
}

function place() {
  if (!instance || !root) return;
  const next = candidates();
  let changed = false;
  const nextSet = new Set(next.map((item) => item.element));
  for (const element of [...originals.keys()]) if (!nextSet.has(element)) restoreCard(element);
  for (let index = 0; index < lenses.length; index++) {
    const lens = lenses[index];
    const item = next[index];
    if (!item) {
      lens.style.left = '-100px';
      lens.style.top = '-100px';
      lens.style.width = '1px';
      lens.style.height = '1px';
      assigned.delete(lens);
      continue;
    }
    const box = item.element.getBoundingClientRect();
    const x = Math.round(box.x);
    const y = Math.round(box.y);
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    const key = `${x},${y},${width},${height}`;
    if (lens.dataset.geometry !== key) {
      lens.style.left = `${x}px`;
      lens.style.top = `${y}px`;
      lens.style.width = `${width}px`;
      lens.style.height = `${height}px`;
      lens.dataset.geometry = key;
      changed = true;
    }
    assigned.set(lens, item.element);
    softenCard(item.element);
  }
  if (changed) instance.markChanged();
  root.dataset.ready = 'true';
  root.dataset.lenses = String(next.length);
  root.dataset.fps = String(instance.fps);
  window.__liquidGlassDASH5 = {
    active: true,
    lenses: next.length,
    fps: instance.fps,
    source: 'ybouane/liquidglass 1.0.3',
  };
}

function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; refresh(); });
}

function cleanup() {
  if (instance) instance.destroy();
  instance = null;
  root?.remove();
  root = null;
  for (const element of [...originals.keys()]) restoreCard(element);
  if (view) {
    for (const [property, [value, priority]] of viewStyle) {
      if (value) view.style.setProperty(property, value, priority);
      else view.style.removeProperty(property);
    }
  }
  if (container) {
    if (containerIsolation[0]) container.style.setProperty('isolation', ...containerIsolation);
    else container.style.removeProperty('isolation');
  }
  view = null;
  container = null;
  lenses = [];
  assigned.clear();
  cardElements = [];
  window.__liquidGlassDASH5 = { active: false };
}

let viewStyle = new Map();
let containerIsolation = ['', ''];

async function mount(nextContainer) {
  if (starting || instance) return;
  starting = true;
  try {
    container = nextContainer;
    view = [...container.children].find((element) => element.tagName === 'HUI-VIEW');
    if (!view) return;
    viewStyle = new Map(['position', 'z-index'].map((name) =>
      [name, [view.style.getPropertyValue(name), view.style.getPropertyPriority(name)]]));
    containerIsolation = [container.style.getPropertyValue('isolation'), container.style.getPropertyPriority('isolation')];
    container.style.setProperty('isolation', 'isolate');
    view.style.setProperty('position', 'relative');
    view.style.setProperty('z-index', '1');

    root = document.createElement('div');
    root.id = 'dash5-liquid-glass-optics';
    root.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:0;overflow:hidden;';
    const image = document.createElement('img');
    image.src = PHOTO;
    image.alt = '';
    image.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;pointer-events:none;';
    root.append(image);
    const tint = document.createElement('div');
    tint.style.cssText = 'position:absolute;inset:0;background:linear-gradient(110deg,rgba(4,10,18,.25),rgba(5,14,28,.14) 52%,rgba(3,9,19,.26));pointer-events:none;';
    root.append(tint);
    for (let i = 0; i < MAX_LENSES; i++) {
      const lens = document.createElement('div');
      lens.dataset.config = JSON.stringify(CONFIG);
      lens.style.cssText = 'position:absolute;left:-100px;top:-100px;width:1px;height:1px;border-radius:16px;pointer-events:none;z-index:2;';
      root.append(lens);
      lenses.push(lens);
    }
    container.insertBefore(root, view);
    await image.decode();
    if (!active() || !root.isConnected) { cleanup(); return; }
    instance = await LiquidGlass.init({ root, glassElements: lenses });
    scanCards();
    place();
  } catch (error) {
    console.warn('DASH5 glass optics unavailable:', error);
    cleanup();
  } finally {
    starting = false;
  }
}

function refresh() {
  if (!active()) { if (root) cleanup(); return; }
  const current = dashboardContainer();
  if (!current) return;
  if (container && current !== container) cleanup();
  if (instance) { scanCards(); place(); }
  else if (!starting) mount(current);
}

if (!window.__liquidGlassDASH5Loader) {
  window.__liquidGlassDASH5Loader = true;
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  timer = window.setInterval(refresh, 1500);
  refresh();
}

export { refresh as refreshDash5Glass };
