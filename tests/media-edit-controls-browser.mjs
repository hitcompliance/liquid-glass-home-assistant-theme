import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {build} from 'esbuild';
import {chromium, webkit} from 'playwright';

// Bundle the real renderers in memory; do not write the distributable package.
const bundle = await build({
  stdin: {contents: `export {TYPES} from './src/dash6/light-cards.js';
    import './src/dash6/segmented-control.js';
    import './src/dash6/media-card.js';
    import './src/dash6/media-refinements.js';
    import './src/dash6/media-artwork-refinements.js';
    import './src/dash6/interaction-refinements.js';`, resolveDir: process.cwd()},
  bundle: true, write: false, format: 'iife', globalName: 'Controls',
  loader: {'.css': 'text'}, logLevel: 'silent',
});
const server = createServer((req, res) => res.end('<!doctype html><body></body>'));
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    try {
      for (const width of [900, 390]) {
        const page = await browser.newPage({viewport: {width, height: 900}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/`);
        await page.evaluate(() => {
          document.body.style.cssText = 'margin:16px;background:#333;color:white;--primary-text-color:white;--secondary-text-color:#aaa;--dash6-satin-enabled:1;--card-background-color:#222;--secondary-background-color:#333;--divider-color:#666';
          customElements.define('ha-card', class extends HTMLElement {
            constructor() { super(); this.attachShadow({mode: 'open'}).innerHTML = '<style>:host{display:block}</style><slot></slot>'; }
          });
          class Native extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({mode: 'open'}).innerHTML = '<style>ha-card{display:block;min-height:90px}.controls{height:44px}</style><ha-card><div class="media-info">Native media title</div><div class="controls"><button>Native transport</button></div></ha-card>';
            }
            setConfig(config) { this._config = config; }
            updated() {}
          }
          customElements.define('hui-media-control-card', Native);
          customElements.define('firemote-card', class extends HTMLElement { setConfig(config) { this._config = config; } });
          customElements.define('hui-card-edit-mode', class extends HTMLElement {
            constructor() {
              super();
              this.attachShadow({mode: 'open'}).innerHTML = '<style>:host{display:block;position:relative}.card-overlay{position:absolute;inset:0;pointer-events:auto}</style><slot></slot><div class="card-overlay"></div>';
            }
          });
          window.loadCardHelpers = async () => ({createCardElement(config) {
            const card = document.createElement(config.type === 'media-control' ? 'hui-media-control-card' : 'firemote-card');
            card.setConfig(config);
            return card;
          }});
        });
        await page.addScriptTag({content: bundle.outputFiles[0].text});
        await page.evaluate(async () => {
          const services = [], writes = [];
          const hass = {
            language: 'de', entities: {}, devices: {}, areas: {},
            states: {
              'media_player.apple': {state: 'idle', attributes: {friendly_name: 'Apple TV'}},
              'media_player.fire': {state: 'off', attributes: {friendly_name: 'Fernseher'}},
              'remote.apple': {state: 'on', attributes: {}},
              'light.example': {state: 'on', attributes: {friendly_name: 'Langes Licht mit Zusatzfunktionen', brightness: 180, color_mode: 'brightness', supported_color_modes: ['brightness'], effect_list: ['None', 'Rainbow']}},
            },
            callService: async (...args) => services.push(args),
            connection: {sendMessagePromise: async message => {
              if (message.type === 'frontend/set_user_data') writes.push(message);
              return message.type === 'frontend/get_user_data' ? {value: null} : [];
            }},
          };
          const media = document.createElement('dash6-appletv-card');
          media.setConfig({apple_entity: 'media_player.apple', apple_remote: 'remote.apple', fire_entity: 'media_player.fire'});
          media.hass = hass;
          document.body.append(media);
          const light = document.createElement(Controls.TYPES.light);
          light.setConfig({entity: 'light.example', main_back: {enabled: false}, rows: {controls: true, scenes: false}});
          light.hass = hass;
          document.body.append(light);
          await light.ensureStoredConfig();
          await media.updateComplete;
          window.fixture = {media, light, hass, services, writes};
        });
        await page.waitForFunction(() => fixture.media.shadowRoot.querySelector('#dash6-artwork-shell-css'));
        const footer = page.locator('dash6-appletv-card').getByRole('button', {name: 'Fernbedienungen', exact: true});
        const footerOpacity = () => footer.evaluate(button => getComputedStyle(button.parentElement).opacity);
        await page.mouse.move(0, 0);
        await page.waitForFunction(() => getComputedStyle(fixture.media.shadowRoot.querySelector('.footer')).opacity === '0.3');
        assert.equal(await footer.evaluate(button => getComputedStyle(button.parentElement).visibility), 'visible');
        assert.equal(await page.evaluate(() => getComputedStyle(fixture.media._native.shadowRoot.querySelector('.controls')).visibility), 'hidden');
        await footer.hover();
        await page.waitForFunction(() => getComputedStyle(fixture.media.shadowRoot.querySelector('.footer')).opacity === '1');
        assert.equal(await footerOpacity(), '1');
        await footer.focus();
        await page.mouse.move(0, 0);
        assert.equal(await footerOpacity(), '1');
        await page.keyboard.press('Enter');
        await page.getByRole('dialog', {name: 'Fernseher und Apple TV'}).waitFor();
        await page.getByRole('button', {name: 'Schließen', exact: true}).click();
        await page.evaluate(() => document.activeElement?.blur());
        for (const [apple, fire] of [['playing', 'off'], ['off', 'playing'], ['off', 'off']]) {
          await page.evaluate(async ({apple, fire}) => {
            const states = {...fixture.hass.states,
              'media_player.apple': {...fixture.hass.states['media_player.apple'], state: apple},
              'media_player.fire': {...fixture.hass.states['media_player.fire'], state: fire},
            };
            fixture.media.hass = {...fixture.hass, states};
            await fixture.media.updateComplete;
          }, {apple, fire});
          await page.waitForFunction(({apple}) => fixture.media._native?._config.entity === (apple === 'playing' ? 'media_player.apple' : 'media_player.fire'), {apple});
          await page.waitForFunction(() => getComputedStyle(fixture.media.shadowRoot.querySelector('.footer')).opacity === '0.3');
          assert.equal(await footer.evaluate(button => getComputedStyle(button.parentElement).visibility), 'visible');
        }

        const geometry = () => page.evaluate(() => {
          const rect = node => {const {x, y, width, height} = node.getBoundingClientRect(); return {x, y, width, height};};
          const roots = [fixture.media.shadowRoot, fixture.light.shadowRoot];
          return roots.map(root => [...root.querySelectorAll('ha-card,.player,.footer,.head,.detail-link,.light-extras,.controls,.slider-wrap')].map(rect));
        });
        const before = await geometry();
        await page.evaluate(async () => {
          history.replaceState({}, '', '/?edit=1');
          window.dispatchEvent(new Event('location-changed'));
          fixture.light.render();
          await fixture.media.updateComplete;
        });
        await page.waitForFunction(() => fixture.media.shadowRoot.querySelector('.media-config-gear'));
        assert.deepEqual(await geometry(), before, 'Edit gears must not change card or content geometry');
        for (const [tag, selector] of [['dash6-appletv-card', '.media-config-gear'], ['dash6-govee-light-card-v2', '.settings-trigger']]) {
          const gear = page.locator(tag).locator(selector);
          assert.equal(await gear.evaluate(node => getComputedStyle(node).position), 'absolute');
          const gearRect = await gear.boundingBox();
          const hit = await gear.evaluate(node => {
            const r = node.getBoundingClientRect();
            const top = node.getRootNode().elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
            return top === node || node.contains(top);
          });
          assert.equal(hit, true, `${tag} gear must float above overlapping content: ${JSON.stringify(gearRect)}`);
          assert.ok(gearRect.width > 0);
        }
        await page.locator('dash6-appletv-card').getByRole('button', {name: 'Apple-TV-Karteneinstellungen öffnen'}).click();
        await page.getByRole('dialog', {name: 'Apple TV und Fernseher konfigurieren'}).waitFor();
        await page.getByRole('button', {name: 'Abbrechen', exact: true}).click();
        await page.locator('dash6-govee-light-card-v2').getByRole('button', {name: 'Karteneinstellungen öffnen'}).click();
        await page.getByRole('dialog', {name: 'Lichtkarte konfigurieren'}).waitFor();
        await page.getByRole('button', {name: 'Karteneinstellungen verwerfen', exact: true}).click();

        // Native edit overlays capture card clicks; the portals must retain the same gear positions.
        await page.evaluate(async () => {
          for (const card of [fixture.media, fixture.light]) {
            const wrapper = document.createElement('hui-card-edit-mode');
            card.before(wrapper);
            wrapper.append(card);
          }
          fixture.light.render();
          await fixture.media.updated();
        });
        for (const [field, selector, portalField] of [['media', '.media-config-gear', '_mediaGearPortal'], ['light', '.settings-trigger', '_settingsPortal']]) {
          const positions = await page.evaluate(({field, selector, portalField}) => {
            const card = fixture[field], gear = card.shadowRoot.querySelector(selector), portal = card[portalField];
            const read = node => {const {x, y, width, height} = node.getBoundingClientRect(); return {x, y, width, height};};
            return {gear: read(gear), portal: read(portal), position: getComputedStyle(portal).position};
          }, {field, selector, portalField});
          assert.deepEqual(positions.gear, positions.portal);
          assert.equal(positions.position, 'absolute');
        }
        await page.getByRole('button', {name: 'Apple-TV-Karteneinstellungen öffnen'}).click();
        await page.getByRole('dialog', {name: 'Apple TV und Fernseher konfigurieren'}).waitFor();
        await page.getByRole('button', {name: 'Abbrechen', exact: true}).click();
        await page.getByRole('button', {name: 'Karteneinstellungen öffnen', exact: true}).click();
        await page.getByRole('dialog', {name: 'Lichtkarte konfigurieren'}).waitFor();
        await page.getByRole('button', {name: 'Karteneinstellungen verwerfen', exact: true}).click();
        await page.evaluate(async () => {
          history.replaceState({}, '', '/');
          window.dispatchEvent(new Event('location-changed'));
          fixture.light.render();
          await fixture.media.updateComplete;
        });
        await page.waitForFunction(() => !fixture.media.shadowRoot.querySelector('.media-config-gear'));
        assert.equal(await page.evaluate(() => fixture.light.shadowRoot.querySelector('.settings-trigger')), null);
        assert.equal(await page.evaluate(() => document.querySelectorAll('hui-card-edit-mode').length && [...document.querySelectorAll('hui-card-edit-mode')].every(node => !node.shadowRoot.querySelector('button'))), true);
        assert.deepEqual(await page.evaluate(() => [fixture.services.length, fixture.writes.length]), [0, 0]);
        assert.deepEqual(errors, [], 'The real renderers must complete without browser errors');
        console.log(`PASS ${engine.name()} ${width}px: remote button 30%/hover/focus/click, floating gears without layout shift, clickable edit portals, edit-off cleanup, no service calls or saved settings.`);
        await page.close();
      }
    } finally { await browser.close(); }
  }
} finally { server.close(); }

