/* DASH5 optical layer using samasante/liquid-glass. HA controls remain untouched. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { Glass } from '@samasante/liquid-glass';

const PATH = window.__DASH5_LIQUID_GLASS_PATH__ || '/dash-5/wohnzimmer';
const MAX_LENSES = 8;
const OPTICS = Object.freeze({
  strength: 0.33,
  depth: 0.65,
  curvature: 0.2,
  bend: 0.56,
  dispersion: 0.17,
  frost: 11,
  sheen: 0.65,
  specular: 0.55,
  glow: 0.2,
  brightness: 0.025,
  saturate: 1.25,
});

let root;
let reactRoot;
let view;
let container;
let lenses = [];
let cardElements = [];
let pending = false;
let originalView = new Map();
let originalIsolation = ['', ''];
const originalCards = new Map();

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
    && !!getComputedStyle(document.documentElement).getPropertyValue('--lg-surface').trim();
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
  cardElements = [];
  if (!view) return;
  for (const element of deepElements(view)) {
    const parentTag = element.getRootNode().host?.tagName || '';
    const isCard = element.tagName === 'HA-CARD'
      || (parentTag === 'DASH5-GOVEE-LIGHT-CARD-V2' && element.classList.contains('card'));
    if (!isCard || parentTag === 'MINI-GRAPH-CARD') continue;
    if (alpha(getComputedStyle(element).backgroundColor) >= 0.3) cardElements.push(element);
  }
}

function candidates() {
  const found = [];
  for (const element of cardElements) {
    if (!element.isConnected) continue;
    const box = element.getBoundingClientRect();
    if (box.width < 190 || box.height < 68 || box.height > 700
      || box.bottom < 60 || box.top > innerHeight - 12) continue;
    found.push({ element, box });
  }
  const deduped = found.filter((item) => !found.some((other) =>
    other !== item && other.element.contains(item.element)
      && Math.abs(other.box.left - item.box.left) < 8
      && Math.abs(other.box.top - item.box.top) < 8));
  deduped.sort((a, b) => a.box.top - b.box.top || b.box.width - a.box.width);
  return deduped.slice(0, innerWidth < 600 ? 4 : MAX_LENSES);
}

function restoreCard(element) {
  const old = originalCards.get(element);
  if (!old) return;
  for (const [property, [value, priority]] of old) {
    if (value) element.style.setProperty(property, value, priority);
    else element.style.removeProperty(property);
  }
  originalCards.delete(element);
}

function softenCard(element) {
  if (originalCards.has(element)) return;
  const old = new Map();
  for (const property of ['background-color', 'backdrop-filter', '-webkit-backdrop-filter']) {
    old.set(property, [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]);
  }
  originalCards.set(element, old);
  element.style.setProperty('background-color', 'rgba(21, 31, 44, 0.44)', 'important');
  element.style.setProperty('backdrop-filter', 'none', 'important');
  element.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
}

function place() {
  if (!root || !lenses.length) return;
  const next = candidates();
  const selected = new Set(next.map((item) => item.element));
  for (const element of [...originalCards.keys()]) {
    if (!selected.has(element)) restoreCard(element);
  }
  for (let i = 0; i < lenses.length; i++) {
    const lens = lenses[i];
    const item = next[i];
    if (!item) {
      lens.style.left = '-100px';
      lens.style.top = '-100px';
      lens.style.width = '1px';
      lens.style.height = '1px';
      continue;
    }
    const box = item.element.getBoundingClientRect();
    lens.style.left = `${Math.round(box.left)}px`;
    lens.style.top = `${Math.round(box.top)}px`;
    lens.style.width = `${Math.round(box.width)}px`;
    lens.style.height = `${Math.round(box.height)}px`;
    softenCard(item.element);
  }
  root.dataset.ready = 'true';
  root.dataset.lenses = String(next.length);
  root.dataset.engine = 'samasante-svg';
  window.__liquidGlassDASH5 = { active: true, lenses: next.length, source: '@samasante/liquid-glass 0.1.1' };
}

function cleanup() {
  reactRoot?.unmount();
  reactRoot = undefined;
  root?.remove();
  root = undefined;
  for (const element of [...originalCards.keys()]) restoreCard(element);
  if (view) {
    for (const [property, [value, priority]] of originalView) {
      if (value) view.style.setProperty(property, value, priority);
      else view.style.removeProperty(property);
    }
  }
  if (container) {
    if (originalIsolation[0]) container.style.setProperty('isolation', ...originalIsolation);
    else container.style.removeProperty('isolation');
  }
  view = undefined;
  container = undefined;
  lenses = [];
  cardElements = [];
  window.__liquidGlassDASH5 = { active: false };
}

function mount(nextContainer) {
  container = nextContainer;
  view = [...container.children].find((element) => element.tagName === 'HUI-VIEW');
  if (!view) return;
  originalView = new Map(['position', 'z-index'].map((name) =>
    [name, [view.style.getPropertyValue(name), view.style.getPropertyPriority(name)]]));
  originalIsolation = [container.style.getPropertyValue('isolation'), container.style.getPropertyPriority('isolation')];
  container.style.setProperty('isolation', 'isolate');
  view.style.setProperty('position', 'relative');
  view.style.setProperty('z-index', '1');
  root = document.createElement('div');
  root.id = 'dash5-liquid-glass-optics';
  root.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;pointer-events:none;z-index:0;overflow:hidden;';
  container.insertBefore(root, view);
  reactRoot = createRoot(root);
  flushSync(() => reactRoot.render(React.createElement(React.Fragment, null,
    Array.from({ length: MAX_LENSES }, (_, i) => React.createElement(Glass, {
      key: i,
      optics: OPTICS,
      radius: 16,
      style: {
        position: 'absolute', left: -100, top: -100, width: 1, height: 1,
        pointerEvents: 'none', overflow: 'hidden',
        background: 'rgba(48, 72, 103, 0.14)',
        border: '1px solid rgba(235, 247, 255, 0.22)',
      },
    }, React.createElement('span', { 'aria-hidden': true }))
  ))));
  lenses = [...root.querySelectorAll('[data-liquid-glass="material"]')];
  scanCards();
  place();
}

function refresh() {
  if (!active()) { if (root) cleanup(); return; }
  const current = dashboardContainer();
  if (!current) return;
  if (container && current !== container) cleanup();
  if (!root) {
    try { mount(current); }
    catch (error) { console.warn('DASH5 samasante glass unavailable:', error); cleanup(); }
  } else {
    scanCards();
    place();
  }
}

function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; refresh(); });
}

if (!window.__samasanteGlassDASH5Loader) {
  window.__samasanteGlassDASH5Loader = true;
  window.addEventListener('scroll', schedule, true);
  window.addEventListener('resize', schedule);
  window.setInterval(refresh, 1500);
  refresh();
}

export { refresh as refreshDash5Glass };
