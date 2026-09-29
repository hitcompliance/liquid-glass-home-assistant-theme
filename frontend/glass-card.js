/* Optional wrapper for per-card optical controls inside Ultra Card external_card. */
import { OPTIC_KEYS, OPTIC_LIMITS } from './glass-config.js';

const EVENTS = { bubbles: true, composed: true };
const safeOptics = (raw = {}) => Object.fromEntries(OPTIC_KEYS
  .filter((key) => Number.isFinite(Number(raw[key])))
  .map((key) => {
    const [min, max] = OPTIC_LIMITS[key];
    return [key, Math.max(min, Math.min(max, Number(raw[key])))];
  }));

class LiquidGlassCard extends HTMLElement {
  static getConfigElement() { return document.createElement('liquid-glass-card-editor'); }
  static getStubConfig() { return { card: { type: 'entities', entities: [] }, glass: {} }; }
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) {
    if (!config?.card?.type) throw new Error('Liquid Glass Card benötigt eine eingebettete card-Konfiguration.');
    const next = JSON.stringify(config.card);
    this._config = config;
    if (next !== this._cardKey) {
      this._cardKey = next;
      this._createCard(config.card);
    }
    this._applyGlass();
  }
  set hass(value) { this._hass = value; if (this._card) this._card.hass = value; }
  get hass() { return this._hass; }
  getCardSize() { return this._card?.getCardSize?.() || 3; }
  getGridOptions() { return this._card?.getGridOptions?.() || { columns: 12, min_columns: 3 }; }
  async _createCard(config) {
    const key = this._cardKey;
    this.shadowRoot.replaceChildren();
    try {
      const helpers = await window.loadCardHelpers();
      if (key !== this._cardKey) return;
      const card = helpers.createCardElement(config);
      this._card = card;
      if (this._hass) card.hass = this._hass;
      this.shadowRoot.append(card);
      this._applyGlass();
    } catch (error) {
      const failure = document.createElement('div');
      failure.textContent = `Karte nicht verfügbar: ${error.message}`;
      this.shadowRoot.append(failure);
    }
  }
  _applyGlass() {
    const glass = this._config?.glass || {};
    for (const key of OPTIC_KEYS) this.style.removeProperty(`--lg-optic-${key}`);
    for (const [key, value] of Object.entries(safeOptics(glass.optics))) {
      this.style.setProperty(`--lg-optic-${key}`, String(value));
    }
    for (const [key, property] of [['tint', '--lg-card-tint'], ['outline', '--lg-card-outline'], ['radius', '--lg-card-radius']]) {
      if (glass[key] !== undefined && glass[key] !== '') this.style.setProperty(property, String(glass[key]));
      else this.style.removeProperty(property);
    }
    this.style.setProperty('--lg-optics-disabled', glass.enabled === false ? '1' : '0');
  }
}

class LiquidGlassCardEditor extends HTMLElement {
  constructor() { super(); this.attachShadow({ mode: 'open' }); }
  setConfig(config) { this._config = JSON.parse(JSON.stringify(config || {})); this.render(); }
  set hass(value) { this._hass = value; }
  changed() {
    this.dispatchEvent(new CustomEvent('config-changed', {
      ...EVENTS, detail: { config: JSON.parse(JSON.stringify(this._config)) },
    }));
  }
  render() {
    if (!this._config) return;
    const root = this.shadowRoot;
    root.replaceChildren();
    const style = document.createElement('style');
    style.textContent = `:host{display:block;color:var(--primary-text-color);font:14px system-ui}label{display:block;margin:12px 0}input,textarea{display:block;width:100%;min-height:44px;box-sizing:border-box;padding:9px;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:inherit;font:inherit}input[type=range]{min-height:28px;accent-color:var(--primary-color)}input[type=checkbox]{display:inline;width:auto;min-height:auto}textarea{min-height:125px}small{color:var(--secondary-text-color)}.error{color:var(--error-color)}.range{display:flex;justify-content:space-between}`;
    root.append(style);
    const heading = document.createElement('h3'); heading.textContent = 'Glasoptik dieser Karte'; root.append(heading);
    const enabled = document.createElement('label'); enabled.textContent = 'Optische Linse aktiv '; const toggle = document.createElement('input');
    toggle.type = 'checkbox'; toggle.checked = this._config.glass?.enabled !== false;
    toggle.onchange = () => { this._config.glass ||= {}; this._config.glass.enabled = toggle.checked; this.changed(); };
    enabled.append(toggle); root.append(enabled);
    const controls = [
      ['strength', 'Lichtbrechung'], ['depth', 'Brechungstiefe'], ['curvature', 'Wölbung'],
      ['bend', 'Randlinse'], ['dispersion', 'Farbsäume'], ['frost', 'Unschärfe'],
      ['sheen', 'Lichtkante'], ['specular', 'Spiegelglanz'], ['glow', 'Leuchten'],
      ['brightness', 'Helligkeit'], ['saturate', 'Sättigung'],
    ];
    for (const [key, title] of controls) {
      const label = document.createElement('label');
      const top = document.createElement('div'); top.className = 'range';
      const name = document.createElement('span'); name.textContent = title;
      const value = document.createElement('span');
      const configured = this._config.glass?.optics?.[key];
      value.textContent = configured === undefined ? 'Standard' : String(configured);
      top.append(name, value); label.append(top);
      const input = document.createElement('input'); input.type = 'range';
      const [min, max, step] = OPTIC_LIMITS[key];
      input.min = min; input.max = max; input.step = step;
      input.value = configured === undefined ? (min + max) / 2 : configured;
      input.oninput = () => { this._config.glass ||= {}; this._config.glass.optics ||= {};
        this._config.glass.optics[key] = Number(input.value); value.textContent = input.value; this.changed(); };
      label.append(input); root.append(label);
    }
    for (const [key, title, hint] of [['tint', 'Glasfarbe', 'rgba(25, 42, 65, 0.30)'],
      ['outline', 'Lichtkante', 'rgba(235, 247, 255, 0.35)'], ['radius', 'Eckenradius', '16px']]) {
      const label = document.createElement('label'); label.textContent = title;
      const input = document.createElement('input'); input.type = 'text'; input.placeholder = hint;
      input.value = this._config.glass?.[key] ?? '';
      input.onchange = () => { this._config.glass ||= {}; this._config.glass[key] = input.value; this.changed(); };
      label.append(input); root.append(label);
    }
    const cardLabel = document.createElement('label'); cardLabel.textContent = 'Eingebettete Karte (JSON)';
    const input = document.createElement('textarea'); input.value = JSON.stringify(this._config.card || {}, null, 2);
    const error = document.createElement('small'); error.className = 'error';
    input.onchange = () => {
      try {
        const parsed = JSON.parse(input.value);
        if (!parsed.type) throw new Error('type fehlt');
        this._config.card = parsed; error.textContent = ''; this.changed();
      } catch (reason) { error.textContent = `Ungültige Karte: ${reason.message}`; }
    };
    cardLabel.append(input, error); root.append(cardLabel);
  }
}

if (!customElements.get('liquid-glass-card')) customElements.define('liquid-glass-card', LiquidGlassCard);
if (!customElements.get('liquid-glass-card-editor')) customElements.define('liquid-glass-card-editor', LiquidGlassCardEditor);
window.customCards ||= [];
if (!window.customCards.some((card) => card.type === 'liquid-glass-card')) {
  window.customCards.push({ type: 'liquid-glass-card', name: 'Liquid Glass Card',
    description: 'Beliebige Home-Assistant-Karte mit Glasoptik und visuellem Editor.', preview: false });
}
