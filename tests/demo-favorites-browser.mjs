import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium, webkit} from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const dashboard = JSON.parse(execFileSync('ruby', ['-rjson', '-ryaml', '-e',
  'puts YAML.load_file(ARGV[0]).to_json', 'examples/browser-demo-dashboard.yaml'], {cwd: root, encoding: 'utf8'}));
const config = dashboard.views.find(view => view.path === 'favoriten').sections[0].cards[1];
// Exercise real switch controls with two real, generated hierarchy snapshots.
config.sources = config.sources.filter(node => node.card.card.type === 'custom:dash6-glass-switch');
const selected = new Set(config.sources.flatMap(node => [node.id, ...node.children.map(child => child.id)]));
config.selected = config.selected.filter(id => selected.has(id));
assert.equal(config.sources.length, 2);
const built = await build({stdin: {contents: "import './src/dash6/favorites-gui.js'; import './src/dash6/glass-switch.js';",
  resolveDir: root}, bundle: true, write: false, format: 'esm'});
const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font:16px system-ui;margin:8px;background:#123;color:#fff;--divider-color:#789;--card-background-color:#123;--primary-text-color:#fff;--secondary-text-color:#ccd;--primary-color:#8cf;--dash6-satin-enabled:1}body>dash6-favorites-card{display:block;width:100%}</style>
<script type="module">
window.realCalls={service:0,ws:0,api:0,fetch:0,connection:0};
const forbidden=kind=>async()=>{realCalls[kind]++;throw Error('Demo accessed real '+kind);};
window.realHass={states:{'switch.demo_steckdose':{entity_id:'switch.demo_steckdose',state:'on',attributes:{friendly_name:'Real fixture'}}},entities:{'switch.demo_steckdose':{hidden_by:'user'}},areas:{real:{name:'Real fixture'}},devices:{fixture:{name:'Real fixture'}},locale:{language:'de'},language:'de',
callService:forbidden('service'),callWS:forbidden('ws'),callApi:forbidden('api'),fetchWithAuth:forbidden('fetch'),connection:{sendMessagePromise:forbidden('connection'),subscribeMessage:forbidden('connection'),subscribeEvents:forbidden('connection')}};
window.originalReal=JSON.stringify(realHass.states);
// Keep Home Assistant's structural card helpers neutral. Favorites, its editor,
// simulation contexts, wrappers and actual switch widgets are the real modules.
customElements.define('neutral-card-tree',class extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this.childrenCards=[];}
 setConfig(c){this._config=c;this.childrenCards=(c.cards||[]).map(create);this.shadowRoot.replaceChildren();
  const style=document.createElement('style');style.textContent=':host{display:block;min-width:0}section{display:flex;flex-direction:column;gap:8px}';this.shadowRoot.append(style);
  const section=document.createElement('section');if(c.type==='heading'||c.title){const label=document.createElement('div');label.textContent=c.heading||c.title;section.append(label);}section.append(...this.childrenCards);this.shadowRoot.append(section);}
 set hass(value){this._hass=value;for(const card of this.childrenCards)card.hass=value;}get hass(){return this._hass;}
 getCardSize(){return 3;}
});
function create(c){const tag=c.type.startsWith('custom:')?c.type.slice(7):'';const card=document.createElement(customElements.get(tag)?tag:'neutral-card-tree');card.setConfig(c);return card;}
window.__dash6Cards={create:async c=>create(c)};
await import('/demo.js');
window.fixture=document.createElement('dash6-favorites-card');fixture.setConfig(${JSON.stringify(config)});fixture.hass=realHass;document.body.append(fixture);window.ready=true;
</script>`;
const requests = [];
const server = createServer((req, res) => {
  requests.push(req.url);
  res.setHeader('content-type', req.url === '/demo.js' ? 'text/javascript' : 'text/html');
  res.end(req.url === '/demo.js' ? built.outputFiles[0].text : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  for (const [engineName, engine] of Object.entries({chromium, webkit})) {
    const browser = await engine.launch({headless: true});
    try {
      for (const width of [390, 900]) {
        const context = await browser.newContext({viewport: {width, height: 900}});
        const page = await context.newPage(), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/liquid-glass-demo/favoriten`);
        await page.waitForFunction(() => window.ready && fixture._body && !fixture._error);
        const card = page.locator('body > dash6-favorites-card');
        const cog = card.locator('.demo-cog').first();
        const open = async () => {
          await cog.click();
          await page.waitForFunction(() => fixture._demoEditor?._catalog?.length === 2 && !fixture._demoEditor._loading);
          return card.getByRole('dialog', {name: 'Demo-Favoriten konfigurieren', exact: true});
        };
        let dialog = await open();
        const wrapper = dialog.getByRole('checkbox', {name: 'Steckdose · gelber Fallback', exact: true});
        const child = dialog.getByRole('checkbox', {name: 'Steckdose', exact: true});
        assert.equal(await wrapper.isChecked(), true);
        await wrapper.uncheck();
        assert.equal(await child.isChecked(), false);
        await child.check();
        assert.equal(await wrapper.isChecked(), false, 'selected inner control must promote past an unchecked demo wrapper');
        await dialog.getByRole('combobox', {name: 'Gruppierung', exact: true}).selectOption('none');
        await dialog.getByRole('textbox', {name: 'Titel', exact: true}).fill('Meine Demo-Favoriten');
        await dialog.getByRole('textbox', {name: 'Titel', exact: true}).blur();
        await dialog.getByRole('checkbox', {name: 'Alle Dashboards anbieten', exact: true}).check();
        await dialog.getByRole('button', {name: 'Quellen aktualisieren', exact: true}).click();
        await page.waitForFunction(() => !fixture._demoEditor._loading);
        const beforeSave = await page.evaluate(() => localStorage.getItem(fixture._demoKey()));
        assert.equal(beforeSave, null, 'draft changes do not save preferences');
        await dialog.getByRole('button', {name: 'Demo speichern', exact: true}).click();
        await page.waitForFunction(() => !fixture._demoEditor && fixture._config.title === 'Meine Demo-Favoriten');
        assert.equal(await page.evaluate(() => fixture._config.grouping), 'none');
        const saved = await page.evaluate(() => localStorage.getItem(fixture._demoKey()));
        assert.equal(JSON.parse(saved).title, 'Meine Demo-Favoriten');
        // The real switch now sits outside its demo wrapper. It must still use
        // browser-local simulated states, even if a matching real entity exists.
        const plug = card.getByRole('switch', {name: 'Steckdose ausschalten', exact: true});
        await plug.click();
        await page.waitForFunction(() => fixture._renderHass().states['switch.demo_steckdose'].state === 'off');
        assert.equal(await card.getByRole('switch', {name: 'Steckdose einschalten', exact: true}).getAttribute('aria-checked'), 'false');
        assert.equal(await page.evaluate(() => JSON.stringify(realHass.states)), await page.evaluate(() => originalReal));
        assert.equal(await page.evaluate(() => Object.keys(fixture._renderHass().entities).length), 0, 'real registry is not forwarded');
        assert.equal(await page.evaluate(() => Object.keys(fixture._renderHass().areas).length), 0);
        dialog = await open();
        assert.equal(await dialog.getByRole('checkbox', {name: 'Steckdose', exact: true}).isChecked(), true);
        assert.equal(await dialog.getByRole('checkbox', {name: 'Steckdose · gelber Fallback', exact: true}).isChecked(), false);
        await dialog.getByRole('textbox', {name: 'Titel', exact: true}).fill('Abgebrochener Entwurf');
        await dialog.getByRole('textbox', {name: 'Titel', exact: true}).blur();
        await page.waitForFunction(() => fixture._demoEditor._preview?._config.title === 'Abgebrochener Entwurf', null, {timeout: 5000});
        assert.equal(await page.evaluate(() => fixture._demoEditor.shadowRoot.querySelector('.preview').hasAttribute('inert')), false,
                     'the preview remains scrollable while controls are inert');
        assert.equal(await page.evaluate(() => fixture._demoEditor._preview.hasAttribute('inert')), true);
        await dialog.getByRole('button', {name: 'Abbrechen', exact: true}).click();
        assert.equal(await page.evaluate(() => fixture._config.title), 'Meine Demo-Favoriten');
        assert.equal(await page.evaluate(() => localStorage.getItem(fixture._demoKey())), saved);
        await open();
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !fixture._demoEditor);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mobile/desktop page has no horizontal overflow');
        assert.deepEqual(await page.evaluate(() => realCalls), {service: 0, ws: 0, api: 0, fetch: 0, connection: 0},
                         'editing, preview and promoted control never reach the real HA connection');
        await page.reload();
        await page.waitForFunction(() => window.ready && fixture._body && fixture._config.title === 'Meine Demo-Favoriten');
        dialog = await open();
        assert.equal(await dialog.getByRole('checkbox', {name: 'Steckdose', exact: true}).isChecked(), true, 'saved child-only selection reloads');
        await dialog.getByRole('button', {name: 'Abbrechen', exact: true}).click();
        assert.deepEqual(await page.evaluate(() => realCalls), {service: 0, ws: 0, api: 0, fetch: 0, connection: 0});
        assert.deepEqual(errors, [], `${engineName}/${width} browser errors`);
        console.log(`${engineName}/${width}: demo Favorites GUI save/cancel/reload, hierarchy promotion and isolated real switch passed`);
        await context.close();
      }
    } finally {await browser.close();}
  }
  assert.equal(requests.some(path => /\/api\/|profiles|room-loader|\.json/.test(path)), false, 'demo cannot request real APIs or private card stores');
} finally {await new Promise(resolve => server.close(resolve));}
