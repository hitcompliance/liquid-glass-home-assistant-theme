// Optional contract test against downloaded pinned upstream files, never vendored.
// node tests/embedded-upstream-browser.mjs /path/to/upstream-checkout
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const upstream = path.resolve(process.argv[2]);
const lock = JSON.parse(await readFile(path.join(root, 'dependencies.lock.json'), 'utf8'));
const dep = lock.dependencies.find(d => d.id === 'embedded-view-card');
const served = new Map();
for (const asset of dep.assets) {
  const relative = new URL(asset.url).pathname.split('/' + dep.commit + '/')[1];
  const bytes = await readFile(path.join(upstream, relative));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256);
  served.set('/upstream/' + asset.path, bytes);
}
served.set('/adapter.js', await readFile(path.join(root, 'src/dash6/embedded-card.js')));
const server = http.createServer((req, res) => {
  const bytes = served.get(req.url);
  if (!bytes) {res.writeHead(404); res.end(); return;}
  res.writeHead(200, {'Content-Type': 'text/javascript'}); res.end(bytes);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({headless: true});
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/adapter.js`);
  const result = await page.evaluate(async () => {
    await import('/adapter.js'); // Test adapter waiting for upstream as well.
    await import('/upstream/embedded-view-card.js');
    await customElements.whenDefined('dash6-embedded-view-card');
    class View extends HTMLElement {
      _createLayoutElement(config) {
        if (!customElements.get('hui-sections-view')) {
          customElements.define('hui-sections-view', class extends HTMLElement {});
          customElements.define('dash6-sections-view', class extends HTMLElement {});
        }
      }
    }
    customElements.define('hui-view', View);
    const views = [{path: 'living', type: 'sections'}, {path: 'other', type: 'panel'}];
    const card = document.createElement('dash6-embedded-view-card');
    card.setConfig({type: 'custom:dash6-embedded-view-card', view: 'living'});
    card._hass = {user: {id: 'test'}, locale: {language: 'de'}};
    card._getHuiRoot = () => ({lovelace: {config: {views}, urlPath: 'dash6', editMode: true}});
    await card._renderTarget('dash6', 'living', false);
    const rendered = card._activeViewElement;
    const editor = card.constructor.getConfigElement();
    editor.setConfig({type: 'custom:dash6-embedded-view-card', mode: 'dynamic', target_entity: 'input_text.target'});
    return {adapted: rendered.viewConfig.type, original: views[0].type, editorType: editor._config.type, target: editor._config.target_entity, originalSubclass: card instanceof customElements.get('embedded-view-card')};
  });
  assert.deepEqual(result, {adapted: 'custom:dash6-sections-view', original: 'sections', editorType: 'custom:dash6-embedded-view-card', target: 'input_text.target', originalSubclass: true});
  assert.deepEqual(failures, []);
  console.log('Verified real pinned upstream with adapter in Chromium: loading, target lookup, sections, immutable source and editor.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
