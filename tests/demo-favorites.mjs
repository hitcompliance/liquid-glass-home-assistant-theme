import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {extractCatalog, filterSelectedTree, toggleSelection} from '../src/dash6/favorites-model.js';

const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync('python3', ['scripts/generate-demo-dashboard.py', '--check'], {cwd: root});
const dashboard = JSON.parse(execFileSync('ruby', ['-rjson', '-ryaml', '-e',
  'puts YAML.load_file(ARGV[0]).to_json', 'examples/browser-demo-dashboard.yaml'], {cwd: root, encoding: 'utf8'}));
assert.equal(dashboard.views.length, 4);
const favoritesView = dashboard.views.find(view => view.path === 'favoriten');
assert.equal(favoritesView.theme, 'DASH6 Satin Glass');
const favorites = favoritesView.sections[0].cards.find(card => card.type === 'custom:dash6-favorites-card');
assert.equal(favorites.dashboard, 'liquid-glass-demo');
assert.equal(favorites.demo_gui, true);
const expected = dashboard.views.filter(view => view !== favoritesView).flatMap((view, viewOrder) =>
  extractCatalog(view, {dashboard: favorites.dashboard, view: view.path, title: view.title, viewOrder}, {view: true})
    .filter(node => node.card.type === 'custom:dash6-demo-card'));
assert.equal(expected.length, 8);
assert.deepEqual(favorites.sources, expected, 'saved snapshots must match the native GUI catalog and retain simulation wrappers');
const ids = [];
function walk(nodes) { for (const node of nodes) { ids.push(node.id); walk(node.children || []); } }
walk(expected);
assert.deepEqual(favorites.selected, ids, 'select complete wrappers and descendants initially');
assert.deepEqual(filterSelectedTree(expected, ids).map(node => node.card), expected.map(node => node.card));
const original = JSON.stringify(dashboard);
const removed = toggleSelection(favorites.sources, favorites.selected, favorites.sources[0].id, false);
assert.equal(filterSelectedTree(favorites.sources, removed).length, 7);
assert.equal(JSON.stringify(dashboard), original, 'GUI selection does not modify authored demo views');
for (const node of favorites.sources) {
  assert.equal(node.card.type, 'custom:dash6-demo-card');
  const entities = JSON.stringify(node.card).match(/\b(?:light|switch|fan|cover|climate|sensor)\.[a-z_0-9]+/g) || [];
  assert.ok(entities.every(id => id.split('.')[1].startsWith('demo_')), 'public demo only references neutral example entities');
}
console.log('Demo Favorites: four views, deterministic native snapshots, complete selection and isolated wrapper sources OK');
