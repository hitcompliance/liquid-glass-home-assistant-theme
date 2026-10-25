import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {expandFavorites, compressFavorites} from '../src/dash7/favorites-model.js';

const fixture = JSON.parse(await readFile(new URL('../../backups/DASH7/2026-10-17_initial/DASH7-copy-complete.json', import.meta.url), 'utf8')).views[1].cards[0];
const before = structuredClone(fixture);
const compact = compressFavorites(fixture);
assert.deepEqual(expandFavorites(compact), fixture, 'Live snapshot and all settings roundtrip losslessly');
assert.deepEqual(fixture, before, 'Input remains unchanged');
assert.deepEqual(compressFavorites(compact), compact, 'Compression is idempotent');
assert.ok(JSON.stringify(compact).length < JSON.stringify(fixture).length * .6, 'Nested duplication shrinks materially');
const unknown = {...fixture, future_setting: {enabled: true}, dash7_favorites_format: 42};
assert.deepEqual(compressFavorites(unknown), unknown, 'Future formats remain untouched');
const mismatch = {sources: [{card: {cards: [{entity: 'a'}]}, children: [{path: ['cards', 0], card: {entity: 'b'}, future: 7}]}], custom: ['preserve']};
assert.deepEqual(expandFavorites(compressFavorites(mismatch)), mismatch, 'Different child snapshots remain intact');
assert.throws(() => expandFavorites({dash7_favorites_format: 1, sources: [{dash7_card_from_parent: true, path: ['missing']}]}), /invalid compact/);
console.log(`DASH7 favorites roundtrip passed: ${JSON.stringify(fixture).length} → ${JSON.stringify(compact).length} bytes`);

// Exercise the editor boundary without loading or modifying the installed bundle.
const registry = new Map();
class Element extends EventTarget {
  attachShadow() { return this.shadowRoot = {append() {}}; }
}
class ExistingEditor extends Element { setConfig(config) { this.config = config; } }
class ExistingCard extends Element { setConfig(config) { this.config = config; } static getStubConfig() { return {}; } }
globalThis.HTMLElement = Element;
globalThis.customElements = {get: name => registry.get(name), define: (name, value) => registry.set(name, value), whenDefined: () => Promise.resolve()};
globalThis.document = {createElement: name => new (registry.get(name))()};
registry.set('dash6-favorites-card', ExistingCard);
registry.set('dash6-favorites-editor', ExistingEditor);
const {registerFavoritesAdapter} = await import('../src/dash7/favorites-card.js');
await registerFavoritesAdapter();
const editor = document.createElement('dash7-favorites-editor');
editor.setConfig({...compact, type: 'custom:dash7-favorites-card', future_setting: {keep: true}});
assert.deepEqual(editor._editor.config.sources, fixture.sources, 'Existing editor receives expanded catalog');
let saved, events = 0;
editor.addEventListener('config-changed', event => { saved = event.detail.config; events++; });
editor._editor.dispatchEvent(new CustomEvent('config-changed', {detail: {config: {...editor._editor.config, grouping: 'none'}}}));
assert.equal(events, 1, 'Exactly one adapted save event');
assert.equal(saved.type, 'custom:dash7-favorites-card');
assert.equal(saved.grouping, 'none');
assert.deepEqual(saved.future_setting, {keep: true});
assert.deepEqual(expandFavorites(saved).sources, fixture.sources, 'GUI save roundtrips entire catalog');
const card = document.createElement('dash7-favorites-card');
card.setConfig(saved);
assert.deepEqual(card.config.sources, fixture.sources, 'Existing renderer receives expanded cards');
console.log('DASH7 existing editor/card adapters preserve settings and compact GUI saves.');
