import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from '../node_modules/esbuild/lib/main.js';
import {extractCatalog, filterSelectedTree, toggleSelection, selectionState} from '../src/dash6/favorites-model.js';

const metadata = {dashboard: 'dash-6', view: 'room', title: 'Raum', viewOrder: 2};
const walk = (value, visit) => {
  if (!value || typeof value !== 'object') return;
  visit(value); for (const child of Object.values(value)) walk(child, visit);
};
const count = (value, predicate) => {let total = 0; walk(value, item => {if (predicate(item)) total++;}); return total;};
const sceneSource = (room = 'Raum') => ({type: 'custom:auto-entities', card_param: 'cards', show_empty: false,
  filter: {template: `{% set room="${room}" %}{{ area_entities(room) }}`},
  card: {type: 'custom:layout-card', layout_type: 'custom:grid-layout', layout: {gap: '8px', 'grid-template-columns': 'repeat(4,1fr)'}}});

test('selected descendants replace an unchecked wrapper inside a selected ancestor, preserving order and template', () => {
  const original = {type: 'custom:dash6-stack-card', title: 'Raum', cards: [
    {type: 'tile', entity: 'light.before'},
    {type: 'custom:vertical-stack-in-card', cards: [{type: 'heading', heading: 'Szenen'}, sceneSource(), {type: 'tile', entity: 'light.after'}]},
    {type: 'tile', entity: 'light.last'},
  ]};
  const catalog = extractCatalog(original, metadata), root = catalog[0], wrapper = root.children[1];
  const before = JSON.stringify(catalog);
  let selected = toggleSelection(catalog, [], root.id, true);
  selected = selected.filter(id => id !== wrapper.id && id !== wrapper.children[0].id);
  const [rendered] = filterSelectedTree(catalog, selected);
  assert.deepEqual(rendered.card.cards, [original.cards[0], sceneSource(), original.cards[1].cards[2], original.cards[2]]);
  assert.deepEqual(rendered.children.map(node => node.id), [root.children[0].id, wrapper.children[1].id, wrapper.children[2].id, root.children[2].id]);
  assert.equal(JSON.stringify(catalog), before, 'saved source snapshots are unchanged');
});

test('only selected deepest leaves survive multiple unchecked containers', () => {
  const root = extractCatalog({type: 'grid', columns: 2, cards: [{type: 'vertical-stack', cards: [
    {type: 'horizontal-stack', cards: [{type: 'tile', entity: 'light.a'}, {type: 'tile', entity: 'light.b'}]},
    {type: 'tile', entity: 'light.c'},
  ]}]}, metadata)[0];
  const a = root.children[0].children[0].children[0], c = root.children[0].children[1];
  const [rendered] = filterSelectedTree([root], [root.id, a.id, c.id]);
  assert.deepEqual(rendered.card.cards.map(card => card.entity), ['light.a', 'light.c']);
  assert.equal(rendered.card.columns, 2);
  assert.equal(count(rendered.card, card => card.type === 'vertical-stack' || card.type === 'horizontal-stack'), 0);
});

test('one promoted card fills a single-card slot; several escape as separate cards without a new wrapper', () => {
  const root = extractCatalog({type: 'custom:render', definition: {type: 'vertical-stack', cards: [{type: 'tile', entity: 'light.a'}, {type: 'tile', entity: 'light.b'}]}}, metadata)[0];
  const [a, b] = root.children[0].children;
  assert.deepEqual(filterSelectedTree([root], [root.id, a.id])[0].card.definition, a.card);
  const rendered = filterSelectedTree([root], [root.id, a.id, b.id]);
  assert.equal('definition' in rendered[0].card, false);
  assert.deepEqual(rendered.slice(1).map(node => node.card), [a.card, b.card]);
  assert.equal(count(rendered.map(node => node.card), card => card.type === 'vertical-stack'), 0);
});

test('Ultra external-card module retains its design when an unchecked inner wrapper has one selected child', () => {
  const root = extractCatalog({type: 'custom:ultra-card', rows: [{columns: [{modules: [
    {type: 'external_card', id: 'module', design: {padding: 8}, card_config: {type: 'vertical-stack', cards: [{type: 'tile', entity: 'light.a'}]}},
  ]}]}]}, metadata)[0];
  const leaf = root.children[0].children[0];
  const [rendered] = filterSelectedTree([root], [root.id, leaf.id]);
  assert.deepEqual(rendered.card.rows[0].columns[0].modules[0], {type: 'external_card', id: 'module', design: {padding: 8}, card_config: leaf.card});
});

// Import the real render-config function with a minimal Lit registration shim.
// No browser, subscriptions or device services are involved in these config tests.
const bundle = await build({entryPoints: [fileURLToPath(new URL('../src/dash6/favorites-gui.js', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{
  name: 'lit-config-test', setup(api) {
    api.onResolve({filter: /^lit$/}, () => ({path: 'lit', namespace: 'test'}));
    api.onLoad({filter: /.*/, namespace: 'test'}, () => ({contents: 'export class LitElement {} export const html=()=>null,css=()=>null;'}));
  },
}]});
globalThis.window ??= {};
globalThis.customElements ??= {get: () => true, define: () => {}};
const {favoritesRenderConfig} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('four neutral room sources render selected scenes after unchecking their frames and headings', () => {
  const sources = ['Room A', 'Room B', 'Room C', 'Room D'].flatMap((title, index) => extractCatalog({
    type: 'custom:dash6-stack-card', cards: [{type: 'heading', heading: title},
      {type: 'custom:vertical-stack-in-card', cards: [{type: 'heading', heading: 'Szenen'}, sceneSource(title)]},
      {type: 'tile', entity: `light.fixture_${index}`},
    ],
  }, {dashboard: 'test-dashboard', view: `fixture-${index}`, title, viewOrder: index}));
  const original = JSON.stringify(sources), wrappers = sources.map(node => node.children[1]);
  let selected = [];
  for (const root of sources) selected = toggleSelection(sources, selected, root.id, true);
  for (const wrapper of wrappers) {
    selected = toggleSelection(sources, selected, wrapper.id, false);
    selected = toggleSelection(sources, selected, wrapper.children[1].id, true);
    assert.equal(selected.includes(wrapper.id), false);
    assert.equal(selected.includes(wrapper.children[0].id), false);
    assert.equal(selected.includes(wrapper.children[1].children[0].id), true, 'reselecting auto-entities selects its layout child');
  }
  const rendered = favoritesRenderConfig({dashboard: 'test-dashboard', sources, selected}, {entities: {}});
  for (const wrapper of wrappers) {
    const expected = wrapper.children[1].card, matches = [];
    walk(rendered, card => {if (card.type === expected.type && JSON.stringify(card.filter) === JSON.stringify(expected.filter)) matches.push(card);});
    assert.deepEqual(matches, [expected], 'each scene template, layout and options survive exactly once');
  }
  assert.equal(count(rendered, card => card.heading === 'Szenen'), 0);
  assert.equal(count(rendered, card => card.type === 'custom:vertical-stack-in-card'), 0);
  assert.equal(JSON.stringify(sources), original);
});

test('unchecking a parent then reselecting its child renders that child without the parent', () => {
  const catalog = extractCatalog({type: 'custom:vertical-stack-in-card', cards: [
    {type: 'heading', heading: 'Szenen'}, sceneSource(),
  ]}, metadata), parent = catalog[0], auto = parent.children[1], layout = auto.children[0];
  let selected = toggleSelection(catalog, [], parent.id, true);
  selected = toggleSelection(catalog, selected, parent.id, false);
  assert.deepEqual(selected, [], 'unchecking a parent clears every descendant');
  selected = toggleSelection(catalog, selected, auto.id, true);
  assert.deepEqual(selected, [auto.id, layout.id]);
  assert.deepEqual(selectionState(parent, selected), {checked: false, partial: true});
  assert.deepEqual(selectionState(auto, selected), {checked: true, partial: false});
  const rendered = favoritesRenderConfig({sources: catalog, selected, grouping: 'none', headings: false}, {entities: {}});
  assert.deepEqual(rendered.cards, [sceneSource()]);
  assert.equal(count(rendered, card => card.type === 'custom:vertical-stack-in-card' || card.type === 'heading'), 0);
});
