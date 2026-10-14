import test from 'node:test';
import assert from 'node:assert/strict';
import {extractCatalog, filterSelectedTree, groupFavorites, moveManualCardOrder, normalizeOptions, toggleSelection} from '../src/dash6/favorites-model.js';

const source = {dashboard: 'dash-6', view: 'room', title: 'Raum', viewOrder: 0};
const tile = name => ({type: 'tile', entity: `light.${name}`, name});
const selectAll = roots => roots.reduce((ids, root) => toggleSelection(roots, ids, root.id, true), []);

test('manual order is normalized, persisted by IDs, and new cards follow deterministically', () => {
  const nodes = extractCatalog([tile('Zulu'), {type: 'heading', heading: 'Lichter'}, tile('Alpha'), tile('Neu')], source);
  const manualCardOrder = [nodes[2].id, nodes[1].id, nodes[0].id];
  const options = normalizeOptions(JSON.parse(JSON.stringify({sort: 'manual', grouping: 'none', manualCardOrder: [...manualCardOrder, nodes[2].id, null, 5]})));
  assert.deepEqual(options.manualCardOrder, manualCardOrder);
  assert.deepEqual(groupFavorites(nodes, options).map(node => node.id), [...manualCardOrder, nodes[3].id]);
  assert.deepEqual(groupFavorites(nodes.slice().reverse(), options).map(node => node.id), [...manualCardOrder, nodes[3].id]);
  assert.deepEqual(groupFavorites(nodes, {...options, sort: 'alpha'}).map(node => node.label), ['Alpha', 'Lichter', 'Neu', 'Zulu']);
});

test('manual cards keep source-view and domain grouping rules', () => {
  const sources = ['Zulu', 'Alpha'].flatMap((title, viewOrder) => extractCatalog([
    tile(`${title} light`), {type: 'tile', entity: `switch.fixture_${viewOrder}`, name: `${title} switch`},
  ], {...source, title, view: `room-${viewOrder}`, viewOrder}));
  const order = sources.slice().reverse().map(node => node.id);
  const byView = groupFavorites(sources, {sort: 'manual', grouping: 'source_view', manualCardOrder: order});
  assert.deepEqual(byView.map(node => node.label), ['Zulu', 'Alpha']);
  assert.deepEqual(byView[0].children.map(node => node.domain), ['switch', 'light']);
  const byDomain = groupFavorites(sources, {sort: 'manual', grouping: 'domain_source_view', domainOrder: 'manual', manualDomainOrder: ['switch', 'light'], manualCardOrder: order});
  assert.deepEqual(byDomain.map(node => node.key), ['switch', 'light']);
  assert.deepEqual(byDomain[0].children.map(node => node.label), ['Zulu', 'Alpha']);
});

test('nested headings and promoted leaves reorder within their actual array without touching sources', () => {
  const original = {type: 'grid', columns: 2, cards: [
    {type: 'heading', heading: 'Geräte'},
    {type: 'vertical-stack', cards: [tile('A'), tile('B')]},
    tile('C'),
  ]};
  const [root] = extractCatalog(original, source), [heading, wrapper, c] = root.children, [a, b] = wrapper.children;
  const sourcesBefore = JSON.stringify(root), selected = [root.id, heading.id, a.id, b.id, c.id], selectedBefore = [...selected];
  const [rendered] = filterSelectedTree([root], selected, {sort: 'manual', manualCardOrder: [c.id, b.id, heading.id, a.id]});
  assert.deepEqual(rendered.card.cards, [tile('C'), tile('B'), original.cards[0], tile('A')]);
  assert.deepEqual(rendered.children.map(node => node.id), [c.id, b.id, heading.id, a.id]);
  assert.equal(new Set(rendered.children.map(node => node.orderSlot)).size, 1);
  assert.equal(rendered.card.columns, 2);
  assert.equal(JSON.stringify(root), sourcesBefore);
  assert.deepEqual(selected, selectedBefore);
  const promoted = groupFavorites(filterSelectedTree([root], [a.id, b.id], {sort: 'manual', manualCardOrder: [b.id, a.id]}), {sort: 'manual', grouping: 'none', manualCardOrder: [b.id, a.id]});
  assert.deepEqual(promoted.map(node => node.card), [tile('B'), tile('A')]);
});

test('separate array and single-card layout slots retain their positions and actions', () => {
  const original = {type: 'custom:layout-fixture', headings: [{type: 'heading', heading: 'Titel'}], cards: [tile('A'), tile('B')], card: {type: 'button', entity: 'switch.fixed', tap_action: {action: 'more-info'}}};
  const [root] = extractCatalog(original, source), selected = selectAll([root]);
  const byLabel = Object.fromEntries(root.children.map(node => [node.label, node]));
  const [rendered] = filterSelectedTree([root], selected, {sort: 'manual', manualCardOrder: [byLabel.B.id, byLabel['switch.fixed'].id, byLabel.A.id, byLabel.Titel.id]});
  assert.deepEqual(rendered.card.cards, [tile('B'), tile('A')]);
  assert.deepEqual(rendered.card.headings, original.headings);
  assert.deepEqual(rendered.card.card, original.card);
  assert.equal(rendered.children.find(node => node.id === byLabel['switch.fixed'].id).orderSlot, null);
});

test('moves retain deselected IDs and reject invalid directions and group boundaries', () => {
  const siblings = [{id: 'a'}, {id: 'b'}, {id: 'new'}], stored = ['a', 'deselected', 'b', 'other-group'];
  const moved = moveManualCardOrder(siblings, stored, 'b', -1);
  assert.deepEqual(moved, ['b', 'deselected', 'a', 'other-group', 'new']);
  assert.deepEqual(stored, ['a', 'deselected', 'b', 'other-group']);
  assert.deepEqual(moveManualCardOrder(siblings, stored, 'a', -1), stored);
  assert.deepEqual(moveManualCardOrder(siblings, stored, 'new', 1), stored);
  assert.deepEqual(moveManualCardOrder(siblings, stored, 'other-group', -1), stored);
  assert.deepEqual(moveManualCardOrder(siblings, stored, 'a', 2), stored);
});
