/* DASH5 optical layer using samasante/liquid-glass. HA controls remain untouched. */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { SvgGlass as Glass } from './.samasante-svg-build.js';
import './glass-card.js';
import { installGlassElasticity } from './glass-elasticity.js';
import { readSettings, resolvedMode, opticsFor, cardMaterial, mountSettingsUI, unmountSettingsUI } from './glass-config.js';

installGlassElasticity();

const PATH = window.__DASH5_LIQUID_GLASS_PATH__ || '/dash-5/wohnzimmer';

let root;
let reactRoot;
let view;
let container;
let cardElements = [];
let pending = false;
let originalView = new Map();
let originalIsolation = ['', ''];
let originalContainerPosition = ['', ''];
const originalCards = new Map();
const cardIds = new WeakMap();
const activeCardById = new Map();
let nextCardId = 1;
let lastSignature = '';
let settings = readSettings();
let lastMode = 'dark';
const originalTheme = new Map();

function themeValues() {
  const profile = settings[lastMode];
  const light = lastMode === 'light';
  const image = settings.wallpaper.replaceAll('"', '%22');
  return {
    '--lg-surface': profile.tint,
    '--lg-outline': profile.outline,
    '--lg-blur': `blur(${profile.optics.frost}px) saturate(${Math.round(profile.optics.saturate * 100)}%)`,
    '--lg-motion-duration': settings.motion ? '180ms' : '0ms',
    '--ha-card-background': light ? 'rgba(235, 244, 255, .38)' : 'rgba(21, 31, 44, .50)',
    '--card-background-color': light ? 'rgba(235, 244, 255, .38)' : 'rgba(21, 31, 44, .50)',
    '--primary-text-color': light ? '#122238' : '#f5f9ff',
    '--secondary-text-color': light ? '#41556d' : '#b8c7dc',
    '--divider-color': profile.outline,
    '--lg-accent': settings.controls.accent,
    '--lg-control-surface': settings.controls.buttonTint,
    '--lg-control-outline': settings.controls.buttonOutline,
    '--lg-control-blur': `blur(${settings.controls.controlBlur}px) saturate(150%)`,
    '--lg-icon-glow': `drop-shadow(0 0 ${Math.round(settings.controls.iconGlow * 12)}px ${settings.controls.accent})`,
    '--lg-graph-glow': `drop-shadow(0 0 ${Math.round(settings.controls.graphGlow * 10)}px ${settings.controls.accent})`,
    '--slider-color': settings.controls.accent,
    '--primary-color': settings.controls.accent,
    '--lovelace-background': `linear-gradient(110deg, rgba(4,10,18,.13), rgba(5,14,28,.06) 52%, rgba(3,9,19,.13)), url("${image}") center / cover fixed`,
  };
}

function applyThemeValues() {
  const values = themeValues();
  for (const host of [document.documentElement, document.querySelector('home-assistant')].filter(Boolean)) {
    if (!originalTheme.has(host)) originalTheme.set(host, new Map(Object.keys(values).map((key) =>
      [key, [host.style.getPropertyValue(key), host.style.getPropertyPriority(key)]])));
    for (const [key, value] of Object.entries(values)) {
      if (host.style.getPropertyValue(key) !== value) host.style.setProperty(key, value);
    }
  }
}

function restoreThemeValues() {
  for (const [host, values] of originalTheme) {
    for (const [key, [value, priority]] of values) {
      if (value) host.style.setProperty(key, value, priority);
      else host.style.removeProperty(key);
    }
  }
  originalTheme.clear();
}

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
    if (originalCards.has(element) || alpha(getComputedStyle(element).backgroundColor) >= 0.05) cardElements.push(element);
  }
}

function candidates() {
  const found = [];
  for (const element of cardElements) {
    if (!element.isConnected) continue;
    const box = element.getBoundingClientRect();
    if (box.width < 80 || box.height < 45 || box.height > 700
      || box.bottom < 0 || box.top > innerHeight
      || getComputedStyle(element).getPropertyValue('--lg-optics-disabled').trim() === '1') continue;
    found.push({ element, box });
  }
  const deduped = found.filter((item) => !found.some((other) =>
    other !== item && other.element.contains(item.element)
      && Math.abs(other.box.left - item.box.left) < 8
      && Math.abs(other.box.top - item.box.top) < 8));
  deduped.sort((a, b) => a.box.top - b.box.top || b.box.width - a.box.width);
  return deduped.slice(0, innerWidth < 600 ? Math.min(4, settings.maxLenses) : settings.maxLenses);
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
  if (!originalCards.has(element)) {
    const old = new Map();
    for (const property of ['background-color', 'backdrop-filter', '-webkit-backdrop-filter']) {
      old.set(property, [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]);
    }
    originalCards.set(element, old);
  }
  element.style.setProperty('background-color', cardMaterial(element, settings, lastMode).tint, 'important');
  element.style.setProperty('backdrop-filter', 'none', 'important');
  element.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
}

function place() {
  if (!root) return;
  settings = readSettings();
  lastMode = resolvedMode(settings);
  applyThemeValues();
  const next = settings.enabled ? candidates() : [];
  const selected = new Set(next.map((item) => item.element));
  for (const element of [...originalCards.keys()]) {
    if (!selected.has(element)) restoreCard(element);
  }
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = innerHeight;
  const frame = container.getBoundingClientRect();
  const localPosition = (box) => [
    Math.round(box.left - frame.left + container.scrollLeft),
    Math.round(box.top - frame.top + container.scrollTop),
  ];
  const signature = JSON.stringify({ settings, mode: lastMode, viewportWidth, viewportHeight,
    cards: next.map(({ element, box }) => {
      if (!cardIds.has(element)) cardIds.set(element, nextCardId++);
      return [cardIds.get(element), ...localPosition(box),
        Math.round(box.width), Math.round(box.height),
        opticsFor(element, settings, lastMode), cardMaterial(element, settings, lastMode)];
    }) });
  if (signature === lastSignature) { syncWallpaperOffsets(); return; }
  lastSignature = signature;
  activeCardById.clear();
  const rendered = next.map(({ element, box }, index) => {
    const [x, y] = localPosition(box);
    const width = Math.round(box.width);
    const height = Math.round(box.height);
    const cardId = cardIds.get(element);
    activeCardById.set(cardId, element);
    const material = cardMaterial(element, settings, lastMode);
    softenCard(element);
    // Refract a real DOM copy of the fixed photo. Safari supports filter:url()
    // on this copy; it does not support SVG displacement in backdrop-filter.
    // Never transform the source image: WebKit may discard a transformed SVG filter.
    const wallpaper = React.createElement('img', {
      src: settings.wallpaper, alt: '', 'aria-hidden': true, draggable: false,
      'data-lg-card-id': cardId,
      style: { position: 'absolute', left: -Math.round(box.left), top: -Math.round(box.top),
        width: viewportWidth, height: viewportHeight, maxWidth: 'none',
        objectFit: 'cover', objectPosition: 'center', pointerEvents: 'none' },
    });
    return React.createElement(Glass, {
      key: cardId, refract: wallpaper,
      behind: lastMode === 'dark' ? '#142338' : '#dce9f4',
      optics: opticsFor(element, settings, lastMode),
      width, height, radius: material.radius, filterResolution: 1,
      style: { position: 'absolute', left: x, top: y, width, height,
        pointerEvents: 'none', overflow: 'hidden', borderRadius: material.radius,
        background: material.tint, border: `1px solid ${material.outline}`,
        boxShadow: 'inset 1px 1px 0 rgba(255,255,255,.42), 0 12px 32px rgba(0,4,18,.22)' },
    }, React.createElement('span', { 'aria-hidden': true }));
  });
  reactRoot.render(React.createElement(React.Fragment, null, rendered));
  root.dataset.ready = 'true';
  root.dataset.lenses = String(next.length);
  root.dataset.engine = 'samasante-svg-copy';
  window.__liquidGlassDASH5 = { active: settings.enabled, lenses: next.length,
    mode: lastMode, engine: 'SVG filter + DOM wallpaper copy' };
}

function syncWallpaperOffsets() {
  if (!root) return;
  for (const image of root.querySelectorAll('img[data-lg-card-id]')) {
    const card = activeCardById.get(Number(image.dataset.lgCardId));
    if (!card?.isConnected) continue;
    const box = card.getBoundingClientRect();
    // The lens scrolls with its card; only the copy of the fixed photo is
    // offset inside it. No React update or SVG map regeneration on scroll.
    image.style.left = `${-Math.round(box.left)}px`;
    image.style.top = `${-Math.round(box.top)}px`;
  }
}

function cleanup() {
  reactRoot?.unmount();
  reactRoot = undefined;
  root?.remove();
  root = undefined;
  unmountSettingsUI();
  restoreThemeValues();
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
    if (originalContainerPosition[0]) container.style.setProperty('position', ...originalContainerPosition);
    else container.style.removeProperty('position');
  }
  view = undefined;
  container = undefined;
  cardElements = [];
  activeCardById.clear();
  lastSignature = '';
  window.__liquidGlassDASH5 = { active: false };
}

function mount(nextContainer) {
  container = nextContainer;
  view = [...container.children].find((element) => element.tagName === 'HUI-VIEW');
  if (!view) return;
  originalView = new Map(['position', 'z-index'].map((name) =>
    [name, [view.style.getPropertyValue(name), view.style.getPropertyPriority(name)]]));
  originalIsolation = [container.style.getPropertyValue('isolation'), container.style.getPropertyPriority('isolation')];
  originalContainerPosition = [container.style.getPropertyValue('position'), container.style.getPropertyPriority('position')];
  container.style.setProperty('isolation', 'isolate');
  if (getComputedStyle(container).position === 'static') container.style.setProperty('position', 'relative');
  view.style.setProperty('position', 'relative');
  view.style.setProperty('z-index', '1');
  root = document.createElement('div');
  root.id = 'dash5-liquid-glass-optics';
  root.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:0;overflow:visible;overflow-anchor:none;contain:layout style;';
  container.insertBefore(root, view);
  reactRoot = createRoot(root);
  mountSettingsUI();
  scanCards();
  place();
}

function refresh() {
  if (!active()) { if (root) cleanup(); return; }
  const current = dashboardContainer();
  if (!current) return;
  if (container && (current !== container || !view?.isConnected)) cleanup();
  if (!root) {
    try { mount(current); }
    catch (error) { console.warn('DASH5 samasante glass unavailable:', error); cleanup(); }
  } else {
    scanCards();
    place();
  }
}

function checkRoute() {
  if (!active()) { if (root) cleanup(); return; }
  const current = dashboardContainer();
  if (!current) return;
  // Rebuild only after navigation replaces the view. State updates and scrolling
  // must not change the selected lenses or remount their SVG filters.
  if (!root || current !== container || !view?.isConnected) refresh();
}

function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; refresh(); });
}

if (!window.__samasanteGlassDASH5Loader) {
  window.__samasanteGlassDASH5Loader = true;
  window.addEventListener('scroll', syncWallpaperOffsets, true);
  window.addEventListener('resize', schedule);
  window.addEventListener('liquid-glass-settings-changed', schedule);
  window.setInterval(checkRoute, 1500);
  checkRoute();
}

export { refresh as refreshDash5Glass };
