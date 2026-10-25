import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../src/dash6/embedded-card.js', import.meta.url), 'utf8').then(text => text.replace(/^import .*scoped-elements.*;\n/m, ''));
const tags = new Map();
const pending = new Map();
const errors = [];
const context = vm.createContext({
  console: {error: error => errors.push(error)},
  window: {},
  document: {createElement: tag => new (tags.get(tag))()},
  customElements: {
    get: tag => tags.get(tag),
    define(tag, value) {tags.set(tag, value); pending.get(tag)?.();},
    whenDefined(tag) {return tags.has(tag) ? Promise.resolve() : new Promise(resolve => pending.set(tag, resolve));},
  },
});
let configs = 0;
let renders = 0;
let finishNative;
let nativeReady = false;
const initialRender = new Promise(resolve => {finishNative = () => {nativeReady = true; resolve();};});
const originalViews = [{path: 'living', type: 'sections'}, {path: 'other', type: 'panel'}];
class OriginalCard {
  setConfig(value) {configs++; this.config = value;}
  async _renderTarget(dashboard, view, external) {
    renders++;
    this.targetArgs = [dashboard, view, external];
    if (view === 'missing') {this._activeViewElement = null; return;}
    this._activeViewElement = {
      _initialRenderComplete: initialRender,
      index: 0, viewConfig: originalViews[0],
      lovelace: {editMode: true, config: {views: originalViews}},
      _createLayoutElement(config) {assert.equal(nativeReady,true,'never replace a pending native layout');assert.equal(config.type, 'sections'); tags.set('hui-sections-view', class {});},
    };
  }
  static getStubConfig() {return {type: 'custom:embedded-view-card', view: ''};}
}
class OriginalEditor {
  _normalizeConfig(config) {return {...config, type: 'custom:embedded-view-card', mode: config.mode || 'static'};}
}
vm.runInContext(source, context);
assert.equal(tags.has('dash6-embedded-view-card'), false, 'wait for separately loaded upstream');
context.customElements.define('embedded-view-card', OriginalCard);
context.customElements.define('embedded-view-card-editor', OriginalEditor);
await new Promise(resolve => setImmediate(resolve));
const Card = tags.get('dash6-embedded-view-card');
assert.ok(Card.prototype instanceof OriginalCard);
const card = new Card();
card.setConfig({view: 'living'});
card.setConfig({view: 'living'});
assert.equal(configs, 1, 'identical configuration preserves active view');
const rendering = card._renderTarget('other-dashboard', 'living', true);
await new Promise(resolve => setImmediate(resolve));
assert.equal(tags.has('hui-sections-view'),false,'wait for native initial render');
finishNative();
await new Promise(resolve => setImmediate(resolve));
assert.ok(tags.has('hui-sections-view'), 'bootstrap native class without deadlock');
context.customElements.define('dash6-sections-view', class {});
await rendering;
assert.equal(renders, 1);
assert.deepEqual(card.targetArgs, ['other-dashboard', 'living', true]);
assert.equal(card._activeViewElement.viewConfig.type, 'custom:dash6-sections-view');
assert.equal(card._activeViewElement.lovelace.config.views[0].type, 'custom:dash6-sections-view');
assert.equal(originalViews[0].type, 'sections', 'preserve source dashboard');
assert.equal(card._activeViewElement.lovelace.config.views[1], originalViews[1]);
assert.equal(card._activeViewElement.lovelace.editMode, false);
await card._renderTarget('', 'missing', false);
assert.equal(card._activeViewElement, null, 'preserve upstream missing/hidden view result');
assert.equal(Card.getStubConfig().type, 'custom:dash6-embedded-view-card');
const editor = Card.getConfigElement();
assert.ok(editor instanceof OriginalEditor);
const output = editor._normalizeConfig({mode: 'dynamic', target_entity: 'input_text.view', extra: 42});
assert.equal(output.type, 'custom:dash6-embedded-view-card');
assert.equal(output.target_entity, 'input_text.view');
assert.equal(output.extra, 42);
assert.deepEqual(errors, []);
console.log('Embedded adapter: upstream loading, sections bootstrap, immutable config, reuse, missing view and editor verified.');
