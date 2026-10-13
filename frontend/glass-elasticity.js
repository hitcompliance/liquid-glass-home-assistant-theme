/* Cursor-following feedback for explicit DASH5 controls. No renderer dependency. */
const ROOT_KEY = '__dash5ElasticityController';
const REDUCED = '(prefers-reduced-motion: reduce)';
const EXCLUDED = 'input,select,textarea,[role="slider"],ha-slider,.slider,.slider-wrap,.power-graph,apexcharts-card,.room-mini-header,.room-header,.mini-header,[data-dash5-no-elastic]';
const CONTROL = 'ha-card.dash5-pill,ha-card.dash5-navigation-link,ha-card.dash5-scene,ha-card.dash5-icon-button,ha-card.dash5-elastic,[data-dash5-elastic]';

export const clampStrength = (value) => Math.max(0, Math.min(3, Number.isFinite(Number(value)) ? Number(value) : 1));

function isDash5() { return location.pathname === '/dash-5' || location.pathname.startsWith('/dash-5/'); }
function isAllowed(element) {
  return isDash5() || Boolean(getComputedStyle(element).getPropertyValue('--dash5-elasticity').trim());
}

function controlFromPath(path) {
  if (path.some((node) => node instanceof Element && node.matches(EXCLUDED))) return null;
  const scene = path.some((node) => node instanceof Element &&
    String(node._config?.entity || '').startsWith('scene.'));
  const lightHost = path.some((node) => node instanceof Element &&
    ['DASH5-GOVEE-LIGHT-CARD-V2', 'DASH5-MULTI-LIGHT-CARD-V2'].includes(node.tagName));
  const overlay = path.some((node) => node instanceof Element && node.id === 'embedded-sidebar-modal');
  for (const node of path) {
    if (!(node instanceof Element)) continue;
    if (node.matches(':disabled,[aria-disabled="true"]')) return null;
    if (node.matches(CONTROL)) return node;
    if (overlay && node.matches('nav a')) return node;
    if (scene && node.tagName === 'HA-CARD') return node;
    if (lightHost && node.matches('button.power,button.effect-trigger,.mode-bar button')) return node;
  }
  return null;
}

export function installGlassElasticity() {
  if (window[ROOT_KEY]) return window[ROOT_KEY];
  const reduced = matchMedia(REDUCED);
  const states = new Map();
  let current = null;
  let frame = 0;

  const restore = (element, state) => {
    for (const [property, [value, priority]] of state.original) {
      if (value) element.style.setProperty(property, value, priority);
      else element.style.removeProperty(property);
    }
    states.delete(element);
  };
  const reset = () => {
    current = null;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    for (const [element, state] of states) restore(element, state);
  };
  const ensure = (element) => {
    if (states.has(element)) return states.get(element);
    const original = new Map(['translate', 'scale', 'transition-property', 'transition-duration'].map((property) =>
      [property, [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]]));
    const computed = getComputedStyle(element);
    const properties = computed.transitionProperty.split(',').map((item) => item.trim()).filter(Boolean);
    const baseDurations = computed.transitionDuration.split(',').map((item) => item.trim()).filter(Boolean);
    const durations = properties.map((_, index) => baseDurations[index % baseDurations.length] || '0ms');
    const scaleIndex = properties.indexOf('scale');
    if (scaleIndex >= 0) durations[scaleIndex] = '0ms';
    else { properties.push('scale'); durations.push('0ms'); }
    element.style.setProperty('transition-property', properties.join(', '), 'important');
    element.style.setProperty('transition-duration', durations.join(', '), 'important');
    const state = { original, rect: element.getBoundingClientRect(),
      x: 0, y: 0, vx: 0, vy: 0, sx: 1, sy: 1, vsx: 0, vsy: 0,
      tx: 0, ty: 0, tsx: 1, tsy: 1 };
    states.set(element, state);
    return state;
  };
  const tick = () => {
    frame = 0;
    let moving = false;
    for (const [element, state] of states) {
      if (!element.isConnected || !isAllowed(element) || reduced.matches) { restore(element, state); continue; }
      for (const [position, velocity, target] of [
        ['x', 'vx', 'tx'], ['y', 'vy', 'ty'], ['sx', 'vsx', 'tsx'], ['sy', 'vsy', 'tsy'],
      ]) {
        state[velocity] = (state[velocity] + (state[target] - state[position]) * .17) * .72;
        state[position] += state[velocity];
      }
      element.style.setProperty('translate', `${state.x.toFixed(2)}px ${state.y.toFixed(2)}px`);
      element.style.setProperty('scale', `${state.sx.toFixed(4)} ${state.sy.toFixed(4)}`);
      const settled = Math.abs(state.x - state.tx) + Math.abs(state.y - state.ty)
        + Math.abs(state.sx - state.tsx) * 100 + Math.abs(state.sy - state.tsy) * 100
        + Math.abs(state.vx) + Math.abs(state.vy) < .035;
      if (settled && element !== current) restore(element, state);
      else if (!settled) moving = true;
    }
    if (moving) frame = requestAnimationFrame(tick);
  };
  const run = () => { if (!frame && states.size) frame = requestAnimationFrame(tick); };
  const strengthOf = (element) => clampStrength(getComputedStyle(element).getPropertyValue('--dash5-elasticity').trim() || 1);
  const setTarget = (element, x, y) => {
    const state = ensure(element);
    const rect = state.rect;
    const strength = strengthOf(element);
    if (!strength || rect.width < 16 || rect.height < 16) { reset(); return; }
    const nx = Math.max(-1, Math.min(1, (x - rect.left - rect.width / 2) / (rect.width / 2)));
    const ny = Math.max(-1, Math.min(1, (y - rect.top - rect.height / 2) / (rect.height / 2)));
    const gain = strength * strength;
    state.tx = nx * .7 * gain;
    state.ty = ny * .5 * gain;
    state.tsx = 1 + Math.abs(nx) * .013 * gain;
    state.tsy = 1 - Math.abs(nx) * .005 * gain + Math.abs(ny) * .002 * gain;
    run();
  };
  const move = (event) => {
    if (reduced.matches || !['mouse', 'pen'].includes(event.pointerType) || event.buttons) { reset(); return; }
    const path = event.composedPath();
    const excluded = path.some(node => node instanceof Element && node.matches(EXCLUDED));
    let target = controlFromPath(path);
    if (target && !isAllowed(target)) target = null;
    // Keep hit testing stable when the visual surface moves under the cursor.
    if (!excluded && current && states.has(current)) {
      const { rect } = states.get(current);
      if (event.clientX >= rect.left - 4 && event.clientX <= rect.right + 4
        && event.clientY >= rect.top - 4 && event.clientY <= rect.bottom + 4) target = current;
    }
    if (target !== current) {
      if (current && states.has(current)) {
        const old = states.get(current); old.tx = old.ty = 0; old.tsx = old.tsy = 1;
      }
      current = target;
    }
    if (current) setTarget(current, event.clientX, event.clientY);
    else run();
  };
  // Hand off press/release to the theme's own scale transition.
  const down = () => reset();
  const route = () => reset();
  const out = (event) => { if (!event.relatedTarget) reset(); };
  document.addEventListener('pointermove', move, true);
  document.addEventListener('pointerdown', down, true);
  document.addEventListener('pointercancel', reset, true);
  window.addEventListener('pointerout', out, true);
  window.addEventListener('blur', reset);
  window.addEventListener('scroll', reset, true);
  window.addEventListener('popstate', route);
  window.addEventListener('location-changed', route);
  reduced.addEventListener('change', reset);
  const controller = { reset, destroy() {
    reset();
    document.removeEventListener('pointermove', move, true);
    document.removeEventListener('pointerdown', down, true);
    document.removeEventListener('pointercancel', reset, true);
    window.removeEventListener('pointerout', out, true);
    window.removeEventListener('blur', reset);
    window.removeEventListener('scroll', reset, true);
    window.removeEventListener('popstate', route);
    window.removeEventListener('location-changed', route);
    reduced.removeEventListener('change', reset);
    delete window[ROOT_KEY];
  } };
  window[ROOT_KEY] = controller;
  return controller;
}
