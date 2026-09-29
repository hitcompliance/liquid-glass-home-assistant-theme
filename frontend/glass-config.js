/* Visual settings for the SVG-only optical layer. No canvas or WebGL path. */
export const STORAGE_KEY = 'liquid-glass-ha:settings:v1';
export const OPTIC_KEYS = ['strength', 'depth', 'curvature', 'bend', 'dispersion', 'frost', 'sheen', 'specular', 'glow', 'brightness', 'saturate'];
export const OPTIC_LIMITS = {
  strength: [0, 0.8, 0.01], depth: [0, 1, 0.01], curvature: [0, 1, 0.01],
  bend: [0, 1, 0.01], dispersion: [0, 0.6, 0.01], frost: [0, 30, 0.5],
  sheen: [0, 1, 0.01], specular: [0, 1, 0.01], glow: [0, 1, 0.01],
  brightness: [-0.2, 0.2, 0.005], saturate: [0.5, 2, 0.01],
};
export const DEFAULTS = Object.freeze({
  enabled: true, mode: 'auto', motion: true, maxLenses: 8,
  wallpaper: '/local/liquid-glass-living-room.jpg',
  controls: { accent: '#66b9ff', buttonTint: 'rgba(42, 69, 99, 0.42)',
    buttonOutline: 'rgba(219, 239, 255, 0.30)', controlBlur: 10,
    iconGlow: 0.26, graphGlow: 0.18 },
  dark: { tint: 'rgba(25, 42, 65, 0.30)', outline: 'rgba(235, 247, 255, 0.35)',
    optics: { strength: 0.33, depth: 0.65, curvature: 0.20, bend: 0.56,
      dispersion: 0.17, frost: 4, sheen: 0.65, specular: 0.55,
      glow: 0.20, brightness: 0.025, saturate: 1.25 } },
  light: { tint: 'rgba(235, 244, 255, 0.28)', outline: 'rgba(255, 255, 255, 0.70)',
    optics: { strength: 0.29, depth: 0.62, curvature: 0.18, bend: 0.52,
      dispersion: 0.13, frost: 4, sheen: 0.70, specular: 0.50,
      glow: 0.16, brightness: 0.04, saturate: 1.16 } },
});

const copy = (value) => JSON.parse(JSON.stringify(value));
let volatileSettings;
const validColor = (value, fallback) =>
  typeof value === 'string' && (/^#[\da-f]{3,8}$/i.test(value) || /^rgba?\([\d.,\s%]+\)$/i.test(value)) ? value : fallback;

export function normalizeSettings(input = {}) {
  const out = copy(DEFAULTS);
  out.enabled = input.enabled !== false;
  out.mode = ['auto', 'dark', 'light'].includes(input.mode) ? input.mode : 'auto';
  out.motion = input.motion !== false;
  out.maxLenses = Math.max(0, Math.min(12, Math.round(Number(input.maxLenses) || 8)));
  if (typeof input.wallpaper === 'string' && /^(\/local\/|https?:\/\/)/.test(input.wallpaper)) out.wallpaper = input.wallpaper;
  for (const key of ['accent', 'buttonTint', 'buttonOutline']) {
    out.controls[key] = validColor(input.controls?.[key], out.controls[key]);
  }
  for (const [key, max] of [['controlBlur', 30], ['iconGlow', 1], ['graphGlow', 1]]) {
    const raw = Number(input.controls?.[key]);
    if (Number.isFinite(raw)) out.controls[key] = Math.max(0, Math.min(max, raw));
  }
  for (const mode of ['dark', 'light']) {
    const source = input[mode] || {};
    out[mode].tint = validColor(source.tint, out[mode].tint);
    out[mode].outline = validColor(source.outline, out[mode].outline);
    for (const key of OPTIC_KEYS) {
      const raw = Number(source.optics?.[key]);
      const [min, max] = OPTIC_LIMITS[key];
      if (Number.isFinite(raw)) out[mode].optics[key] = Math.max(min, Math.min(max, raw));
    }
  }
  return out;
}

export function readSettings() {
  if (volatileSettings) return normalizeSettings(volatileSettings);
  try { return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
  catch { return normalizeSettings(); }
}

export function writeSettings(next) {
  const value = normalizeSettings(next);
  volatileSettings = value;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* private browser mode */ }
  window.dispatchEvent(new CustomEvent('liquid-glass-settings-changed', { detail: value }));
  return value;
}

export function resolvedMode(settings) {
  if (settings.mode !== 'auto') return settings.mode;
  const host = document.querySelector('home-assistant');
  const scheme = host ? getComputedStyle(host).colorScheme : getComputedStyle(document.documentElement).colorScheme;
  return scheme.includes('light') && !scheme.includes('dark') ? 'light' : 'dark';
}

export function opticsFor(element, settings, mode) {
  const result = { ...settings[mode].optics };
  const css = getComputedStyle(element);
  for (const key of OPTIC_KEYS) {
    const raw = css.getPropertyValue(`--lg-optic-${key}`).trim();
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) {
      const [min, max] = OPTIC_LIMITS[key];
      result[key] = Math.max(min, Math.min(max, value));
    }
  }
  return result;
}

export function cardMaterial(element, settings, mode) {
  const css = getComputedStyle(element);
  const value = (key, fallback) => css.getPropertyValue(key).trim() || fallback;
  return {
    tint: validColor(value('--lg-card-tint', settings[mode].tint), settings[mode].tint),
    outline: validColor(value('--lg-card-outline', settings[mode].outline), settings[mode].outline),
    radius: Math.max(0, Math.min(60, parseFloat(value('--lg-card-radius', '16')) || 16)),
    disabled: value('--lg-optics-disabled', '0') === '1',
  };
}

const labels = {
  strength: 'Lichtbrechung', depth: 'Brechungstiefe', curvature: 'Wölbung',
  bend: 'Randlinse', dispersion: 'Farbsäume', frost: 'Unschärfe',
  sheen: 'Lichtkante', specular: 'Spiegelglanz', glow: 'Inneres Leuchten',
  brightness: 'Helligkeit', saturate: 'Sättigung',
};

const uiCss = `
#lg-settings-launcher{position:fixed;right:calc(16px + env(safe-area-inset-right));bottom:calc(16px + env(safe-area-inset-bottom));z-index:10000;min-width:48px;min-height:48px;border:1px solid #d8eaff90;border-radius:50%;background:#17304bd9;color:white;box-shadow:0 8px 30px #0009,inset 1px 1px #fff8;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);font-size:23px;cursor:pointer}
#lg-settings-panel{position:fixed;right:calc(16px + env(safe-area-inset-right));bottom:calc(76px + env(safe-area-inset-bottom));z-index:10001;width:min(390px,calc(100vw - 24px));max-height:min(78dvh,750px);overflow:auto;box-sizing:border-box;padding:20px;border:1px solid #e0efff8c;border-radius:24px;background:#13263dea;color:#f5f9ff;box-shadow:0 24px 70px #000b,inset 1px 1px #fff7;backdrop-filter:blur(24px) saturate(145%);-webkit-backdrop-filter:blur(24px) saturate(145%);font:14px system-ui}
#lg-settings-panel *{box-sizing:border-box}#lg-settings-panel h2{font-size:19px;margin:0 0 8px}#lg-settings-panel p{color:#c5d4e5;font-size:12px;line-height:1.45}#lg-settings-panel label{display:block;margin:12px 0 4px}#lg-settings-panel select,#lg-settings-panel input[type=url],#lg-settings-panel input[type=text]{width:100%;min-height:44px;padding:8px;border:1px solid #b9d8ff70;border-radius:10px;background:#0c1e33;color:inherit;font:inherit}#lg-settings-panel input[type=range]{width:100%;accent-color:#65baff;min-height:30px}#lg-settings-panel .lg-row{display:flex;align-items:center;justify-content:space-between;gap:12px}#lg-settings-panel button{min-height:44px;padding:8px 12px;border:1px solid #c4dfff70;border-radius:12px;background:#254767;color:inherit;cursor:pointer}#lg-settings-panel button:focus-visible,#lg-settings-launcher:focus-visible{outline:2px solid #8bcaff;outline-offset:2px}#lg-settings-panel .lg-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}#lg-settings-panel .lg-range{margin-top:8px}#lg-settings-panel .lg-range span{font-variant-numeric:tabular-nums;color:#b9d9fa}#lg-settings-panel .lg-actions{display:flex;gap:8px;margin-top:18px}#lg-settings-panel .lg-actions button{flex:1}@media (prefers-reduced-motion:reduce){#lg-settings-panel,#lg-settings-launcher{transition:none!important}}
`;

let ui;
export function mountSettingsUI() {
  if (ui || !document.body) return;
  const style = document.createElement('style');
  style.id = 'lg-settings-style'; style.textContent = uiCss;
  document.head.append(style);
  const launcher = document.createElement('button');
  launcher.id = 'lg-settings-launcher'; launcher.type = 'button';
  launcher.textContent = '✦'; launcher.title = 'Liquid Glass einstellen';
  launcher.setAttribute('aria-label', 'Liquid Glass einstellen');
  launcher.setAttribute('aria-expanded', 'false');
  const panel = document.createElement('section');
  panel.id = 'lg-settings-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Liquid Glass Einstellungen');
  const open = () => { panel.hidden = false; launcher.setAttribute('aria-expanded', 'true'); renderPanel(panel); };
  const close = () => { panel.hidden = true; launcher.setAttribute('aria-expanded', 'false'); launcher.focus(); };
  launcher.addEventListener('click', () => panel.hidden ? open() : close());
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !panel.hidden) close(); });
  document.body.append(launcher, panel);
  ui = { style, launcher, panel };
}

export function unmountSettingsUI() {
  if (!ui) return;
  ui.style.remove(); ui.launcher.remove(); ui.panel.remove(); ui = undefined;
}

function renderPanel(panel) {
  const settings = readSettings();
  panel.replaceChildren();
  const heading = document.createElement('div'); heading.className = 'lg-row';
  heading.innerHTML = '<h2>Liquid Glass</h2><button type="button" aria-label="Schließen">✕</button>';
  heading.querySelector('button').onclick = () => { panel.hidden = true; ui.launcher.setAttribute('aria-expanded', 'false'); };
  panel.append(heading);
  const note = document.createElement('p');
  note.textContent = 'Vorschau sofort · Einstellungen werden in diesem Browser gespeichert.';
  panel.append(note);
  const field = (title, control) => {
    const label = document.createElement('label'); label.textContent = title; label.append(control); panel.append(label); return control;
  };
  const checkbox = (title, key) => {
    const input = document.createElement('input'); input.type = 'checkbox'; input.checked = settings[key];
    input.onchange = () => { settings[key] = input.checked; writeSettings(settings); };
    const label = document.createElement('label'); label.className = 'lg-row'; label.textContent = title; label.append(input); panel.append(label);
  };
  checkbox('Optische Linsen aktiv', 'enabled');
  checkbox('Dezente Bewegung', 'motion');
  const mode = document.createElement('select');
  for (const [value, title] of [['auto', 'System / Theme'], ['dark', 'Dunkel'], ['light', 'Hell']]) {
    const item = document.createElement('option'); item.value = value; item.textContent = title; mode.append(item);
  }
  mode.value = settings.mode;
  mode.onchange = () => { settings.mode = mode.value; writeSettings(settings); renderPanel(panel); };
  field('Darstellung', mode);
  const editMode = document.createElement('select');
  for (const [value, title] of [['dark', 'Dunkle Werte'], ['light', 'Helle Werte']]) {
    const item = document.createElement('option'); item.value = value; item.textContent = title; editMode.append(item);
  }
  editMode.value = panel.dataset.editMode || resolvedMode(settings);
  editMode.onchange = () => { panel.dataset.editMode = editMode.value; renderPanel(panel); };
  field('Werte bearbeiten', editMode);
  const profile = settings[editMode.value];
  for (const [key, title] of [['tint', 'Glasfarbe (rgba oder #hex)'], ['outline', 'Lichtkante (rgba oder #hex)']]) {
    const input = document.createElement('input'); input.type = 'text'; input.value = profile[key];
    input.onchange = () => { profile[key] = input.value; writeSettings(settings); };
    field(title, input);
  }
  for (const key of OPTIC_KEYS) {
    const [min, max, step] = OPTIC_LIMITS[key];
    const wrap = document.createElement('label'); wrap.className = 'lg-range';
    const top = document.createElement('div'); top.className = 'lg-row';
    const name = document.createElement('span'); name.textContent = labels[key];
    const output = document.createElement('span'); output.textContent = String(profile.optics[key]);
    top.append(name, output); wrap.append(top);
    const input = document.createElement('input'); input.type = 'range';
    input.min = min; input.max = max; input.step = step; input.value = profile.optics[key];
    input.oninput = () => { profile.optics[key] = Number(input.value); output.textContent = input.value; writeSettings(settings); };
    wrap.append(input); panel.append(wrap);
  }
  const count = document.createElement('input'); count.type = 'range'; count.min = '0'; count.max = '12'; count.step = '1'; count.value = settings.maxLenses;
  const countLabel = document.createElement('label'); countLabel.textContent = `Gleichzeitige Linsen: ${settings.maxLenses}`;
  count.oninput = () => { settings.maxLenses = Number(count.value); countLabel.firstChild.textContent = `Gleichzeitige Linsen: ${count.value}`; writeSettings(settings); };
  countLabel.append(count); panel.append(countLabel);
  const wallpaper = document.createElement('input'); wallpaper.type = 'url'; wallpaper.value = settings.wallpaper;
  wallpaper.onchange = () => { settings.wallpaper = wallpaper.value; writeSettings(settings); };
  field('Hintergrundbild-URL', wallpaper);
  const controlsHeading = document.createElement('h2'); controlsHeading.textContent = 'Buttons, Regler, Icons & Diagramme';
  controlsHeading.style.marginTop = '20px'; panel.append(controlsHeading);
  for (const [key, title] of [['accent', 'Akzentfarbe'], ['buttonTint', 'Button-Glasfarbe'], ['buttonOutline', 'Button-Lichtkante']]) {
    const input = document.createElement('input'); input.type = 'text'; input.value = settings.controls[key];
    input.onchange = () => { settings.controls[key] = input.value; writeSettings(settings); };
    field(title, input);
  }
  for (const [key, title, max] of [['controlBlur', 'Control-Unschärfe', 30], ['iconGlow', 'Icon-Leuchten', 1], ['graphGlow', 'Graph-Leuchten', 1]]) {
    const label = document.createElement('label');
    const text = document.createElement('span'); text.textContent = `${title}: ${settings.controls[key]}`;
    const input = document.createElement('input'); input.type = 'range'; input.min = '0'; input.max = String(max);
    input.step = max === 1 ? '0.01' : '0.5'; input.value = settings.controls[key];
    input.oninput = () => { settings.controls[key] = Number(input.value); text.textContent = `${title}: ${input.value}`; writeSettings(settings); };
    label.append(text, input); panel.append(label);
  }
  const actions = document.createElement('div'); actions.className = 'lg-actions';
  const reset = document.createElement('button'); reset.textContent = 'Standardwerte';
  reset.onclick = () => { writeSettings(DEFAULTS); renderPanel(panel); };
  const exportButton = document.createElement('button'); exportButton.textContent = 'JSON kopieren';
  exportButton.onclick = async () => { await navigator.clipboard.writeText(JSON.stringify(readSettings(), null, 2)); exportButton.textContent = 'Kopiert'; };
  const importButton = document.createElement('button'); importButton.textContent = 'JSON laden';
  importButton.onclick = () => {
    const area = document.createElement('textarea'); area.placeholder = 'Exportiertes JSON hier einfügen';
    area.style.cssText = 'width:100%;min-height:110px;margin-top:8px;border-radius:10px;background:#0c1e33;color:white;border:1px solid #b9d8ff70;padding:10px';
    const apply = document.createElement('button'); apply.textContent = 'Profil übernehmen';
    const status = document.createElement('p'); status.setAttribute('role', 'status');
    apply.onclick = () => {
      try { writeSettings(JSON.parse(area.value)); renderPanel(panel); }
      catch (error) { status.textContent = `JSON konnte nicht geladen werden: ${error.message}`; }
    };
    panel.append(area, apply, status); area.focus();
  };
  actions.append(reset, exportButton, importButton); panel.append(actions);
}
