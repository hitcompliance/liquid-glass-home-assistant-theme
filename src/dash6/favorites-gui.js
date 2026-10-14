import {scopedCustomElements as customElements} from './scoped-elements.js';
import {LitElement, html, css} from 'lit';
import {createDemoContext} from './demo-card.js';
import {materializeDynamicCard, resolveRoomSlot,resolveInlineDomain} from './favorites-dynamic-catalog.js';
import {extractCatalog, toggleSelection, selectionState,reconcileDynamicSelection, filterSelectedTree, normalizeOptions, groupFavorites, sourceViewKey, compareSourceViews, DEFAULT_DOMAIN_ORDER, normalizeViewLabel} from './favorites-model.js';

const TYPE = 'custom:dash6-favorites-card';
const clone = value => structuredClone(value);
const treeWalk = (nodes, visit) => { for (const node of nodes || []) { visit(node); treeWalk(node.children, visit); } };
const catalogLabel = (card, hass) => card._favorites_load_error ? `Kartenprofil ${card.profile} (nicht auflösbar)` : [card.heading, card.title, card.name].find(value => typeof value === 'string' && !/\[\[\[|\{%|\{\{/.test(value)) || hass?.states?.[card.entity]?.attributes?.friendly_name || card.entity || (card.profile && `Kartenprofil ${card.profile}`) || ({'custom:auto-entities': 'Dynamische Karten', 'custom:dash6-room-slot-card': 'Dynamischer Raumblock'}[card.type]) || card.type;
const labels = {climate: 'Klima', sensor: 'Sensoren', scene: 'Szenen', light: 'Beleuchtung', cover: 'Verdunklung', fan: 'Lüfter', media_player: 'Medien', vacuum: 'Staubsauger', switch: 'Schalter', lock: 'Schlösser', camera: 'Kameras', binary_sensor: 'Zustände', other: 'Weitere Karten'};
const STRUCTURAL = ['views', 'layout', 'cards', 'card', 'definition', 'headings','grid','sections', 'rows', 'columns', 'modules', 'card_config', 'external_card', 'config', 'overrides', 'custom_fields'];

export function favoritesConfig(value = {}) {
  const config = {...value, type: TYPE, title: value.title ?? 'Favoriten', dashboard: value.dashboard ?? 'dash-6', sources: clone(value.sources || []), selected: [...(value.selected || value.selected_ids || [])]};
  return {...config, ...normalizeOptions({...config, domainOrder: value.domainOrder || 'source_view_order'})};
}

function withDashboardViewOrder(config) {
  const root = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main')?.shadowRoot?.querySelector('ha-panel-lovelace')?.shadowRoot?.querySelector('hui-root');
  const lovelace = root?.lovelace;
  if (!lovelace?.config?.views || (lovelace.urlPath || 'lovelace') !== config.dashboard) return config;
  const ranks = new Map(lovelace.config.views.map((view, index) => [view.path ?? String(index), index]));
  const rank = nodes => nodes.map(node => ({...node, source: node.source?.dashboard === config.dashboard ? {...node.source, viewOrder: ranks.get(node.source.view)} : node.source, children: rank(node.children || [])}));
  return {...config, sources: rank(config.sources || [])};
}
const headingCard = card => !!card && (card.type === 'heading' || headingCard(card.definition));
const originalStack = card => !!card && (card.type === 'custom:dash6-stack-card' || originalStack(card.definition));
const hidden = (id, hass) => !!(hass?.entities?.[id]?.hidden_by || hass?.entities?.[id]?.disabled_by || hass?.entities?.[id]?.hidden);

/** Only primary entities are inspected; thermostat/dock/power helper references stay intact. */
function visibleConfig(input, hass, showHeadings) {
  if (Array.isArray(input)) return input.map(card => visibleConfig(card, hass, showHeadings)).filter(Boolean);
  if (!input || typeof input !== 'object') return input;
  if (typeof input.entity === 'string' && hidden(input.entity, hass)) return null;
  if (!showHeadings && headingCard(input)) return null;
  const result = {...input};
  for (const key of STRUCTURAL) if (result[key] && typeof result[key] === 'object') result[key] = key === 'custom_fields' ? Object.fromEntries(Object.entries(result[key]).map(([name, field]) => [name, visibleConfig(field, hass, showHeadings)])) : visibleConfig(result[key], hass, showHeadings);
  if (Array.isArray(result.entities)) result.entities = result.entities.filter(row => !hidden(typeof row === 'string' ? row : row?.entity, hass));
  if (Array.isArray(result.cards) && input.cards?.length && (!result.cards.length || result.cards.every(headingCard) && !input.cards.every(headingCard))) return null;
  if (input.type === 'external_card' && !result.card_config) return null;
  if (['conditional', 'custom:mod-card'].includes(input.type) && !result.card) return null;
  if (input.type === 'custom:dash6-render-card' && !result.definition) return null;
  if (input.type === 'custom:dash6-domain-grid' && !result.grid) return null;
  if (input.definition && !result.definition) return null;
  if (input.card && !result.card && !input.filter) return null;
  return result;
}

export function favoritesRenderConfig(value, hass) {
  const config = favoritesConfig(value);
  const selected = filterSelectedTree(config.sources, config.selected).map(node => ({...node, card: visibleConfig(node.card, hass, config.headings || headingCard(node.card))})).filter(node => node.card);
  function renderNode(node) {
    if (!node.kind) return node.card;
    const cards = node.children.map(renderNode).filter(Boolean);
    if (!cards.length) return null;
    // A saved room stack already contains its own original heading and frame.
    if (cards.length === 1 && !node.children[0].kind && originalStack(cards[0])) return cards[0];
    return {type: 'custom:dash6-stack-card', cards: [...(node.heading ? [{type: 'heading', heading: node.label}] : []), ...cards]};
  }
  return {type: 'custom:layout-card', layout_type: 'custom:dash6-favorites-masonry', layout: {width: 300, max_cols: 3, max_width: 600, card_margin: 0, margin: 0, padding: 0, reflow: false, min_height: 1}, cards: groupFavorites(selected, {...config, domainLabels: labels}).map(renderNode).filter(Boolean)};
}

async function resolveProfiles(value, ancestors = new Set(), hass) {
  if (Array.isArray(value)) return (await Promise.all(value.map(item => resolveProfiles(item, ancestors, hass)))).filter(item => item !== null);
  if (!value || typeof value !== 'object') return value;
  if (value.type === TYPE || value.type === 'custom:dash6-favorites-gui') return null;
  let result = clone(value);
  if(result.type==='custom:dash6-direct-card'&&result.card)return resolveProfiles(result.card,ancestors,hass);
  if(result.type==='custom:dash6-domain-card')result=resolveInlineDomain(result);
  if (result.type === 'custom:dash6-room-slot-card') result = await resolveRoomSlot(result, hass);
  if (result.type === 'custom:dash6-profile-card' && result.profile) {
    if (ancestors.has(result.profile)) throw new Error(`Zyklisches Kartenprofil: ${result.profile}`);
    const next = new Set(ancestors); next.add(result.profile);
    const bridge = window.__dash6Cards;
    let profile; try { profile = bridge?.loadProfile ? await bridge.loadProfile(result.profile) : bridge?.profile?.(result.profile); } catch (error) { return {...result, _favorites_load_error: error.message}; }
    if (!profile) throw new Error(`Kartenprofil ist noch nicht verfügbar: ${result.profile}`);
    const definition = {...clone(profile), ...clone(result.overrides || {})};
    if (result.area) {
      const swap = item => typeof item === 'string' ? item.replace(/area_entities\((['"])[^'"]+\1\)/g, `area_entities(${JSON.stringify(result.area)})`) : Array.isArray(item) ? item.map(swap) : item && typeof item === 'object' ? Object.fromEntries(Object.entries(item).map(([key, child]) => [key, key === 'area' && typeof child === 'string' ? result.area : swap(child)])) : item;
      result = swap(definition);
    } else result = definition;
    return resolveProfiles(result, next, hass);
  }
  for (const key of STRUCTURAL) if (result[key] && typeof result[key] === 'object') result[key] = key === 'custom_fields' ? Object.fromEntries(await Promise.all(Object.entries(result[key]).map(async ([name, field]) => [name, await resolveProfiles(field, ancestors,hass)]))) : await resolveProfiles(result[key], ancestors, hass);
  return result;
}
export {resolveProfiles};

function readonlyHass(hass) {
  if (!hass) return hass;
  const refuse = () => Promise.reject(new Error('Die Vorschau ist schreibgeschützt.'));
  const callWS = message => /(?:call_service|\/create$|\/update$|\/delete$|\/save$)/.test(message?.type || '') ? refuse() : hass.callWS(message);
  return new Proxy(hass, {get(target, key) {
    if (key === 'callService') return refuse;
    if (key === 'callWS') return callWS;
    if (key === 'callApi') return (method, ...args) => String(method).toUpperCase() === 'GET' ? target.callApi(method, ...args) : refuse();
    if (key === 'connection') return new Proxy(target.connection || {}, {get(connection, property) {if (property === 'sendMessagePromise') return message => /(?:call_service|\/create$|\/update$|\/delete$|\/save$)/.test(message?.type || '') ? refuse() : connection.sendMessagePromise(message); const result = connection[property]; return typeof result === 'function' ? result.bind(connection) : result;}});
    const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
  }});
}

async function waitForCards() {
  if (window.__dash6Cards?.create) return;
  await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error('DASH6-Karten konnten nicht geladen werden.')), 15000); customElements.whenDefined('dash6-profile-card').then(() => { clearTimeout(timer); resolve(); }); });
}
async function createCard(config) {
  await waitForCards();
  if (!window.__dash6Cards?.create) throw new Error('DASH6-Karten werden noch geladen.');
  return window.__dash6Cards.create(config);
}

class FavoritesCard extends LitElement {
  static properties = {hass: {attribute: false}, _body: {state: true}, _header: {state: true}, _error: {state: true},_demoEditor:{state:true}};
  static styles = css`:host{display:block;min-width:0}.favorites{display:flex;flex-direction:column;gap:8px}.favorites>*{min-width:0;margin:0!important}.error{color:var(--error-color);padding:12px}`;
  static getConfigElement() { return document.createElement('dash6-favorites-editor'); }
  static getStubConfig() { return favoritesConfig(); }
  setConfig(value) { this._config = favoritesConfig(value);if(value.demo_gui&&!this._demoLoaded){this._demoLoaded=true;try{const saved=JSON.parse(localStorage.getItem(this._demoKey())||'null');if(saved?.demo_gui)this._config=favoritesConfig(saved);}catch{}} this._signature = ''; this._build(); }
  _demoKey(){return 'dash6-demo-favorites:'+this._config.dashboard;}
  _renderHass(){
    if(!this._config?.demo_gui)return this.hass;
    this._demoContext??=createDemoContext(this.hass,value=>{for(const card of [this._header,this._body])if(card)card.hass=value;});
    return this._demoContext.hass;
  }
  _editDemo(){
    const editor=document.createElement('dash6-favorites-editor');editor.hass=this._renderHass();editor.setConfig(this._config);
    this._demoDraft=clone(this._config);editor.addEventListener('config-changed',event=>{event.stopPropagation();this._demoDraft=clone(event.detail.config);});
    this._demoEditor=editor;this._demoEscape=event=>{if(event.key==='Escape')this._closeDemo();};window.addEventListener('keydown',this._demoEscape);
  }
  _closeDemo(){window.removeEventListener('keydown',this._demoEscape);this._demoEditor=null;}
  _saveDemo(){try{localStorage.setItem(this._demoKey(),JSON.stringify(this._demoDraft));this.setConfig(this._demoDraft);this._closeDemo();}catch(error){this._error=error.message;}}
  disconnectedCallback(){super.disconnectedCallback();this._closeDemo();}
  getCardSize() { return Math.max(3, Math.ceil((this.getBoundingClientRect()?.height || 200) / 50)); }
  updated(changed) { if (changed.has('hass') && this.hass?.entities !== this._registry) { this._registry = this.hass?.entities; this._build(); } for (const card of [this._header, this._body]) if (card) card.hass = this._renderHass(); }
  async _build() {
    if (!this._config) return;
    const body = favoritesRenderConfig(withDashboardViewOrder(this._config), this._renderHass()), signature = JSON.stringify([this._config.title, body]);
    if (signature === this._signature) return;
    this._signature = signature; const token = this._token = (this._token || 0) + 1;
    try {
      const [header, rendered] = await Promise.all([createCard({type: 'custom:dash6-area-header', title: this._config.title, show_clock: true, time_zone: 'Europe/Berlin'}), createCard(body)]);
      if (token !== this._token) return;
      header.hass = this._renderHass(); rendered.hass = this._renderHass(); this._header = header; this._body = rendered; this._error = '';
    } catch (error) { if (token === this._token) {this._error = error.message; this._signature = '';} }
  }
  render() { return html`<style>.favorites{position:relative}.demo-cog{position:absolute;right:8px;top:8px;z-index:5;border:1px solid var(--divider-color);border-radius:10px;background:var(--card-background-color);color:inherit;padding:8px;cursor:pointer}.demo-backdrop{position:fixed;inset:0;z-index:10000;background:#0008;display:grid;place-items:center;padding:16px}.demo-dialog{max-width:1200px;width:100%;max-height:90vh;overflow:auto;background:var(--card-background-color);border:1px solid var(--divider-color);border-radius:16px;padding:16px;box-sizing:border-box}.demo-actions{display:flex;gap:8px;justify-content:flex-end}.demo-actions button{min-height:44px;font:inherit;padding:8px 16px}</style><div class="favorites">${this._header || ''}${this._body || ''}${this._config?.demo_gui?html`<button class="demo-cog" aria-label="Favoriten bearbeiten" @click=${this._editDemo}><ha-icon icon="mdi:cog"></ha-icon></button>`:''}${this._error ? html`<div class="error">${this._error}</div>` : ''}</div>${this._demoEditor?html`<div class="demo-backdrop" @click=${()=>this._closeDemo()}><div class="demo-dialog" role="dialog" aria-label="Demo-Favoriten konfigurieren" aria-modal="true" @click=${event=>event.stopPropagation()}><p>Simulation. Änderungen werden nur in diesem Browser gespeichert.</p>${this._demoEditor}<div class="demo-actions"><button @click=${()=>this._closeDemo()}>Abbrechen</button><button @click=${()=>this._saveDemo()}>Demo speichern</button></div></div></div>`:''}`; }
}

class FavoritesEditor extends LitElement {
  static properties = {hass: {attribute: false}, _config: {state: true}, _catalog: {state: true}, _preview: {state: true}, _loading: {state: true}, _error: {state: true}, _allDashboards: {state: true}, _nativeEditor: {state: true}, _search: {state: true}};
  static styles = css`:host{display:block;min-width:0}.panes{display:grid;grid-template-columns:minmax(260px,.9fr) minmax(300px,1.1fr);gap:16px}:host([native-dialog]) .panes{grid-template-columns:minmax(0,1fr)}:host([native-dialog]) .preview-pane{display:none}.pane{min-width:0;border:1px solid var(--divider-color);border-radius:16px;padding:12px}.tree{max-height:65vh;overflow:auto}.row{display:flex;align-items:flex-start;gap:8px;padding:5px 0}.row input{width:20px;height:20px;flex:none;margin:0}.row span{overflow-wrap:anywhere}.children{margin-left:22px;border-left:1px solid var(--divider-color);padding-left:10px}.group-actions{font-size:13px;font-weight:400;white-space:nowrap}.group-actions a{color:var(--primary-color);text-decoration:none}.group-actions a:hover{text-decoration:underline}.card-type{opacity:.7}.partial{color:var(--secondary-text-color);font-size:12px}h3{margin:0 0 8px}h4{margin:14px 0 6px}label.field{min-width:0;display:flex;flex-direction:column;gap:4px;margin:8px 0}input[type=text],select{font:inherit;padding:8px;border:1px solid var(--divider-color);border-radius:8px;background:var(--card-background-color);color:var(--primary-text-color);min-width:0}.controls{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:0 12px}.span{grid-column:1/-1}.preview{user-select:none;min-height:150px;max-height:65vh;overflow:auto;overscroll-behavior:contain}.preview-content{pointer-events:none}.error{color:var(--error-color)}button{font:inherit;border:1px solid var(--divider-color);border-radius:8px;padding:8px;background:var(--card-background-color);color:var(--primary-text-color);cursor:pointer}p{margin:8px 0;font-size:13px;color:var(--secondary-text-color)}@media(max-width:750px){.panes{grid-template-columns:minmax(0,1fr)}.tree,.preview{max-height:45vh}.controls{grid-template-columns:1fr}}`;
  connectedCallback() {
    super.connectedCallback();
    let parent = this;
    while (parent) {
      if (parent.localName === 'hui-dialog-edit-card') {
        this._nativeEditor = true;
        this.setAttribute('native-dialog', '');
        this._nativePreview = parent.shadowRoot?.querySelector('.element-preview');
        if (this._nativePreview) {
          // Keep the scroll container interactive; only its device controls are inert.
          this._previewWasInert = this._nativePreview.hasAttribute('inert');
          this._nativePreview.removeAttribute('inert');
          this._previewChildren = new Map();
          const protect = () => {
            for (const child of this._nativePreview.children) {
              if (!this._previewChildren.has(child)) this._previewChildren.set(child, child.hasAttribute('inert'));
              child.setAttribute('inert', '');
            }
          };
          protect();
          this._previewObserver = new MutationObserver(protect);
          this._previewObserver.observe(this._nativePreview, {childList: true});
        }
        break;
      }
      parent = parent.parentElement || parent.getRootNode()?.host;
    }
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this._previewObserver?.disconnect();
    for (const [child, wasInert] of this._previewChildren || []) if (!wasInert) child.removeAttribute('inert');
    if (this._nativePreview && this._previewWasInert) this._nativePreview.setAttribute('inert', '');
  }
  setConfig(value) { this._config = favoritesConfig(value); const saved = new Map(this._config.sources.map(node => [node.id, node])); this._catalog = (this._catalog || []).map(node => clone(saved.get(node.id) || node)); for (const node of this._config.sources) if (!this._catalog.some(item => item.id === node.id)) this._catalog.push(clone(node)); this._previewSignature = ''; this._previewBuild(); this._loadCatalog(); }
  updated(changed) {
    if (changed.has('hass')) { this._loadCatalog(); this._previewBuild(); }
    if (this._preview) this._preview.hass = readonlyHass(this.hass);
  }
  _emit(patch = {}) {
    this._config = favoritesConfig({...this._config, ...patch});
    this.dispatchEvent(new CustomEvent('config-changed', {detail: {config: clone(this._config)}, bubbles: true, composed: true}));
    this._previewBuild();
  }
  _choose(node, checked) {
    const selected = toggleSelection(this._catalog, this._config.selected, node.id, checked);
    this._emit({selected, sources: this._snapshots(selected)});
  }
  _chooseGroup(nodes, checked) {
    let selected = [...this._config.selected];
    for (const node of nodes) selected = toggleSelection(this._catalog, selected, node.id, checked);
    this._emit({selected, sources: this._snapshots(selected)});
  }
  _snapshots(ids) {
    const selected = new Set(ids);
    return this._catalog.filter(node => {let used = false; treeWalk([node], child => {if (selected.has(child.id)) used = true;}); return used;}).map(clone);
  }
  async _loadCatalog(force = false) {
    if (!this.hass?.callWS || !this._config || this._loading) return;
    const path = typeof location === 'object' ? location.pathname.split('/').filter(Boolean) : [];
    const dashboard = path[0] && !['config', 'profile'].includes(path[0]) ? path[0] : this._config.dashboard;
    const key = `${dashboard}:${!!this._allDashboards}`;
    if (!force && key === this._catalogKey) return;
    this._catalogKey = key; this._loading = true; const token = this._loadToken = (this._loadToken || 0) + 1;
    try {
      await waitForCards();
      let dashboards = [{url_path: dashboard, title: dashboard}];
      if (this._allDashboards) {
        const result = await this.hass.callWS({type: 'lovelace/dashboards/list'});
        dashboards = [{url_path: dashboard, title: dashboard}, ...(Array.isArray(result) ? result : result?.dashboards || [])].filter((item, index, all) => all.findIndex(other => other.url_path === item.url_path) === index);
      }
      const catalog = []; const errors = [];
      for (const item of dashboards) {
        try {
          const raw = await this.hass.callWS({type: 'lovelace/config', url_path: item.url_path === 'lovelace' ? null : item.url_path});
          const resolved = await resolveProfiles(raw, new Set(), this.hass);
          resolved.views = (resolved.views || []).map((view, viewOrder) => ({...view, _favoritesViewOrder: viewOrder})).filter(view => !(item.url_path === dashboard && (view.path ?? String(view._favoritesViewOrder)) === path[1]));
          for (const view of resolved.views) catalog.push(...extractCatalog(view, {dashboard: item.url_path, view: view.path, title: view.title, viewOrder: view._favoritesViewOrder}, {view: true, cardLabel: card => catalogLabel(card, this.hass)}));
        } catch (error) {errors.push(`${item.title || item.url_path}: ${error.message}`);}
      }
      if (token !== this._loadToken) return;
      // Existing selected snapshots retain their complete original layout and controls.
      const selected = new Set(this._config.selected), saved = new Map(this._config.sources.map(node => [node.id, node]));
      const preserve = node => {let used = false; treeWalk([node], child => {if (selected.has(child.id)) used = true;}); return used;};
      this._catalog = catalog.map(node => saved.has(node.id) && preserve(saved.get(node.id)) ? clone(saved.get(node.id)) : node);
      for (const node of this._config.sources) if (!this._catalog.some(item => item.id === node.id)) this._catalog.push(clone(node));
      this._error = errors.join(' · ');
    } catch (error) {this._error = error.message; this._catalogKey = '';}
    finally {if (token === this._loadToken) this._loading = false;}
  }
  async _previewBuild() {
    if (!this._config || this._nativeEditor) return;
    const signature = JSON.stringify([this._config, Object.entries(this.hass?.entities || {}).filter(([, entry]) => entry.hidden_by || entry.disabled_by).map(([id]) => id)]);
    if (signature === this._previewSignature) return;
    this._previewSignature = signature; const token = this._previewToken = (this._previewToken || 0) + 1;
    try {
      // A demo draft preview must reflect the current edit rather than loading
      // its saved browser preference or offering another settings launcher.
      const card = await createCard({...this._config, demo_gui: false});
      if (token !== this._previewToken) return;
      card.hass = readonlyHass(this.hass); card.setAttribute('inert', ''); this._preview = card;
    } catch (error) {if (token === this._previewToken) {this._error = error.message; this._previewSignature = '';}}
  }
  async _materialize(node) {
    this._dynamicBusy ??= new Set(); if (this._dynamicBusy.has(node.id)) return; this._dynamicBusy.add(node.id); this.requestUpdate();
    try {
      const result = await materializeDynamicCard(node.card, this.hass); if (result.status !== 'ready') throw new Error(result.error || 'Diese dynamische Auswahl kann nicht einzeln aufgelöst werden.');
      const [resolved] = extractCatalog(result.card, node.source, {idPrefix: `dynamic:${node.id}:`, cardLabel: card => catalogLabel(card, this.hass)});
      const fresh = {...resolved, id: node.id, label: `${node.label} · ermittelte Karten`, source: node.source, path: node.path, absolutePath: node.absolutePath, order: node.order};
      const {node:replacement,selected}=reconcileDynamicSelection(node,fresh,this._config.selected);
      const swap = nodes => nodes.map(item => item.id === node.id ? replacement : {...item, children: swap(item.children || [])});
      this._catalog = swap(this._catalog);
      this._emit({selected, sources: this._snapshots(selected)}); this._error = '';
    } catch (error) { this._error = error.message; }
    finally { this._dynamicBusy.delete(node.id); this.requestUpdate(); }
  }
  _matches(node) { const q = (this._search || '').trim().toLocaleLowerCase('de'); return !q || [node.label, node.card?.type, node.source?.title, node.domain].some(value => String(value || '').toLocaleLowerCase('de').includes(q)) || (node.children || []).some(child => this._matches(child)); }
  _treeNode(node) {
    const state = selectionState(node, this._config.selected);
    return html`<div class="row"><input type="checkbox" aria-label=${node.label} .checked=${state.checked} .indeterminate=${state.partial && !state.checked} @change=${event => this._choose(node, event.target.checked)}><span>${node.label} <span class="card-type">(${node.card?.type || (node.heading ? 'heading' : 'card')})</span>${state.partial ? html`<span class="partial"> · Teilauswahl</span>` : ''}</span></div>${node.card?._favorites_room_source || node.card?._favorites_inline_source || ['custom:auto-entities','custom:dash6-auto-entities'].includes(node.card?.type) && node.card.filter?.template ? html`<button class="dynamic-load" ?disabled=${this._dynamicBusy?.has(node.id)} @click=${() => this._materialize(node)}>${this._dynamicBusy?.has(node.id) ? 'Ermittelt …' : 'Enthaltene Karten ermitteln'}</button>` : ''}${node.children?.length ? html`<details open><summary class="partial">${node.children.length} Unterkarten</summary><div class="children">${node.children.filter(child => this._matches(child)).map(child => this._treeNode(child))}</div></details>` : ''}`;
  }
  _orderedViews() {
    const byKey = new Map();
    for (const node of filterSelectedTree(withDashboardViewOrder(this._config).sources, this._config.selected)) {
      const key = sourceViewKey(node), old = byKey.get(key);
      if (!old || (node.source?.viewOrder ?? Infinity) < (old.source?.viewOrder ?? Infinity)) byKey.set(key, node);
    }
    return [...byKey.values()].sort((a, b) => compareSourceViews(a, b, this._config));
  }
  _moveView(key, direction) {
    const order = this._orderedViews().map(sourceViewKey), index = order.indexOf(key), target = index + direction;
    if (index < 0 || target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target], order[index]];
    this._emit({viewOrderMode: 'manual', manualViewOrder: order});
  }
  _groupLinks(label, nodes, viewKey) {
    const choose = (event, selected) => {
      event.preventDefault(); event.stopPropagation();
      if (viewKey && selected) this._viewOpen.set(viewKey, true);
      this._chooseGroup(nodes, selected);
    };
    return html`<span class="group-actions">[ <a href="#" aria-label=${`Alle Karten in ${label} auswählen`} @click=${event => choose(event, true)}>alle auswählen</a> / <a href="#" aria-label=${`Alle Karten in ${label} abwählen`} @click=${event => choose(event, false)}>alle abwählen</a> ]</span>`;
  }
  _sourceTree() {
    const dashboards = new Map();
    for (const node of this._catalog || []) {
      if (!this._matches(node)) continue;
      const dashboard = node.source?.dashboard || this._config.dashboard;
      if (!dashboards.has(dashboard)) dashboards.set(dashboard, new Map());
      const views = dashboards.get(dashboard), view = node.source?.view || '';
      if (!views.has(view)) views.set(view, []); views.get(view).push(node);
    }
    return [...dashboards].sort(([a], [b]) => a.localeCompare(b, 'de')).map(([dashboard, views]) => html`<h4>${dashboard} ${this._groupLinks(dashboard, (this._catalog || []).filter(node => (node.source?.dashboard || this._config.dashboard) === dashboard))}</h4>${[...views].sort(([, a], [, b]) => (a[0].source?.viewOrder || 0) - (b[0].source?.viewOrder || 0)).map(([view, nodes]) => {
      this._viewOpen ??= new Map(); const viewKey = `${dashboard}/${view}`;
      const states = nodes.map(node => selectionState(node, this._config.selected));
      const opened = !!this._search || (this._viewOpen.get(viewKey) ?? states.some(state => state.checked || state.partial));
      return html`<details ?open=${opened} @toggle=${event => {if (event.target !== event.currentTarget) return; const next = event.currentTarget.open; if (this._viewOpen.get(viewKey) !== next) {this._viewOpen.set(viewKey, next); this.requestUpdate();}}}><summary>${normalizeViewLabel(nodes[0].source?.title || view)} ${this._groupLinks(`${dashboard}/${view}`, (this._catalog || []).filter(node => (node.source?.dashboard || this._config.dashboard) === dashboard && (node.source?.view || '') === view), viewKey)}</summary>${opened ? html`<div class="children">${nodes.map(node => this._treeNode(node))}</div>` : ''}</details>`;
    })}`);
  }
  render() {
    if (!this._config) return html``;
    const c = this._config, domainSourceAllowed = ['source_view', 'source_view_domain'].includes(c.grouping);
    return html`<div class="controls">
      <label class="field">Titel<input type="text" .value=${c.title} @change=${event => this._emit({title: event.target.value})}></label>
      <label class="field">Gruppierung<select aria-label="Gruppierung" .value=${c.grouping} @change=${event => this._emit({grouping: event.target.value})}><option value="source_view">Quellansicht</option><option value="source_view_domain">Quellansicht → Domain</option><option value="domain">Domain</option><option value="domain_source_view">Domain → Quellansicht</option><option value="none">Keine Gruppierung</option></select></label>
      <label class="field">Kartensortierung<select aria-label="Kartensortierung" .value=${c.sort} @change=${event => this._emit({sort: event.target.value})}><option value="domain_alpha">Domain → alphabetisch</option><option value="alpha">Alphabetisch</option><option value="source_domain_alpha" ?disabled=${c.grouping !== 'domain'}>Quellansicht → Domain → alphabetisch</option></select></label>
      <label class="field">Domain-Reihenfolge<select aria-label="Domain-Reihenfolge" .value=${c.domainOrder} @change=${event => this._emit({domainOrder: event.target.value})}><option value="source_view_order" ?disabled=${!domainSourceAllowed}>Reihenfolge der Quellansicht</option><option value="alpha">Alphabetisch</option><option value="manual">Eigene Reihenfolge</option></select></label>
      <label class="field">View-Reihenfolge<select aria-label="View-Reihenfolge" .value=${c.viewOrderMode || 'dashboard'} @change=${event => this._emit({viewOrderMode: event.target.value, manualViewOrder: event.target.value === 'manual' ? this._orderedViews().map(sourceViewKey) : c.manualViewOrder || []})}><option value="dashboard">Dashboard-Reihenfolge</option><option value="manual">Manuell überschreiben</option></select></label>
      ${c.viewOrderMode === 'manual' ? html`<div class="span"><p>Nicht aufgeführte Views folgen in Dashboard-Reihenfolge; zusätzliche Views danach alphabetisch.</p>${this._orderedViews().map((node, index, nodes) => html`<div class="row"><span style="flex:1">${normalizeViewLabel(node.source?.title || node.source?.view)}${node.source?.dashboard !== c.dashboard ? html` · ${node.source?.dashboard}` : ''}</span><button aria-label=${`${normalizeViewLabel(node.source?.title || node.source?.view)} nach oben`} ?disabled=${index === 0} @click=${() => this._moveView(sourceViewKey(node), -1)}>↑</button><button aria-label=${`${normalizeViewLabel(node.source?.title || node.source?.view)} nach unten`} ?disabled=${index === nodes.length - 1} @click=${() => this._moveView(sourceViewKey(node), 1)}>↓</button></div>`)}</div>` : ''}
      ${c.domainOrder === 'manual' ? html`<label class="field span">Domain-Reihenfolge (durch Komma getrennt)<input type="text" .value=${(c.manualDomainOrder || DEFAULT_DOMAIN_ORDER).join(', ')} @change=${event => this._emit({manualDomainOrder: event.target.value.split(',').map(value => value.trim()).filter(Boolean)})}></label>` : ''}
      <label class="row"><input type="checkbox" .checked=${c.headings} @change=${event => this._emit({headings: event.target.checked})}>Gruppenüberschriften anzeigen</label>
      <label class="row"><input type="checkbox" .checked=${!!this._allDashboards} @change=${event => {this._allDashboards = event.target.checked; this._loadCatalog(true);}}>Alle Dashboards anbieten</label>
    </div><div class="panes"><section class="pane"><h3>Karten und Überschriften auswählen</h3><p>Ein Bereich wählt seine Unterkarten mit aus. Einzelne Unterkarten lassen sich anschließend abwählen.</p><button ?disabled=${this._loading} @click=${() => this._loadCatalog(true)}>${this._loading ? 'Lädt …' : 'Quellen aktualisieren'}</button>${this._error ? html`<p class="error">${this._error}</p>` : ''}<label class="field">Suchen<input type="text" aria-label="Karten oder Ansichten suchen" placeholder="Karten oder Ansichten suchen" .value=${this._search || ''} @input=${event => {this._search = event.target.value;}}></label><div class="tree">${this._sourceTree()}</div></section><section class="pane preview-pane"><h3>Live-Vorschau</h3><p>Vorschau ohne Gerätebedienung. Änderungen werden im nativen Karteneditor übernommen.</p><div class="preview" tabindex="0" role="region" aria-label="Live-Vorschau"><div class="preview-content" inert>${this._preview || html`<p>Wähle die gewünschten Inhalte aus.</p>`}</div></div></section></div>`;
  }
}

if (!customElements.get('dash6-favorites-card')) customElements.define('dash6-favorites-card', FavoritesCard);
if (!customElements.get('dash6-favorites-editor')) customElements.define('dash6-favorites-editor', FavoritesEditor);
window.customCards ??= [];
window.customCards.push({type: 'dash6-favorites-card', name: 'DASH6 Favoriten', description: 'Karten hierarchisch auswählen, gruppieren und sortieren.', preview: true});
