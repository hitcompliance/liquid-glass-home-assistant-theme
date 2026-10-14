import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium, webkit} from 'playwright';

// Exercise the real mapper/renderer and class decoder without writing dist.
const bundle = await build({
  stdin: {contents: `export {mapCards, create} from './src/dash6/card-runtime.js';
    export {decodeThemeClass, themeClassCSS} from './src/dash6/theme-classes.js';`, resolveDir: process.cwd()},
  bundle: true, write: false, format: 'iife', globalName: 'Runtime',
  loader: {'.css': 'text'}, logLevel: 'silent',
});

for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({viewport: {width: 900, height: 900}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('about:blank');
    await page.evaluate(() => {
      document.body.style.cssText = 'margin:16px;background:#123;color:white;--divider-color:#888;--dash6-satin-enabled:1';
      const css = height => `ha-card{height:${height}px!important;min-height:${height}px!important;max-height:${height}px!important;border-radius:17px!important;padding:3px!important}.controls{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}ha-card::before{content:"Named class"}`;
      document.body.style.setProperty('--dash6-class-probe', JSON.stringify(css(116)));
      document.body.style.setProperty('--dash6-class-probe-wide', JSON.stringify(css(137)));
      document.body.style.setProperty('--dash6-class-scene-probe', JSON.stringify('ha-card{height:64px!important;min-height:64px!important;max-height:64px!important}:host([data-active=true]) ha-card{height:81px!important;min-height:81px!important;max-height:81px!important}'));
      document.body.style.setProperty('--dash6-class-invalid', 'not JSON');
      window.fixture = {created: [], services: [], apiReads: []};
      class Neutral extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({mode: 'open'}).innerHTML = '<style>:host{display:block}ha-card{display:block;box-sizing:border-box}.controls{display:flex}</style><ha-card><div class="controls"><button>A</button><button>B</button><button>C</button></div></ha-card>';
        }
        setConfig(config) {
          this._config = config;
          const card = this.shadowRoot.querySelector('ha-card');
          for (const row of config.styles?.card || []) for (const name of ['height', 'min-height', 'max-height']) if (row[name]) card.style.setProperty(name, row[name]);
        }
        set hass(value) { this._hass = value; this.updates = (this.updates || 0) + 1; }
        get updateComplete() { return Promise.resolve(); }
        getCardSize() { return 2; }
      }
      for (const tag of ['theme-probe', 'dash6-theme-probe', 'button-card', 'hui-tile-card', 'hui-media-control-card', 'hui-heading-card', 'dash6-thermostat-card', 'dash6-cover-card', 'dash6-embedded-view-card']) {
        customElements.define(tag, class extends Neutral {});
      }
      window.loadCardHelpers = async () => ({createCardElement(config) {
        fixture.created.push(structuredClone(config));
        const tag = config.type.startsWith('custom:') ? config.type.slice(7) : 'hui-' + config.type + '-card';
        const card = document.createElement(tag);
        card.setConfig(config);
        return card;
      }});
      fixture.hass = {
        states: {
          'sensor.example': {state: '1', attributes: {}},
          'light.example': {state: 'on', attributes: {friendly_name: 'Example light', supported_color_modes: ['brightness'], brightness: 180, color_mode: 'brightness'}},
          'switch.example': {state: 'on', attributes: {}},
          'scene.example': {state: new Date().toISOString(), attributes: {id: 'theme-class-test'}},
        },
        entities: {}, devices: {}, areas: {},
        callService: async (...args) => fixture.services.push(args),
        callApi: async (method, path) => {
          fixture.apiReads.push([method, path]);
          if (method !== 'GET') throw Error('Only read-only scene lookup allowed');
          return {entities: {'light.example': {state: 'on'}}};
        },
      };
      fixture.leaf = card => {
        while (card?._child) card = card._child;
        return card;
      };
      fixture.read = card => {
        const leaf = fixture.leaf(card), surface = leaf.shadowRoot.querySelector('ha-card'), style = getComputedStyle(surface);
        return {tag: leaf.localName, height: style.height, radius: style.borderRadius,
          columns: getComputedStyle(leaf.shadowRoot.querySelector('.controls')).gridTemplateColumns.split(' ').length,
          content: getComputedStyle(surface, '::before').content,
          classes: leaf.className, sheets: leaf.shadowRoot.adoptedStyleSheets.length};
      };
    });
    await page.addScriptTag({content: bundle.outputFiles[0].text});
    await page.evaluate(async () => {
      fixture.raw = {type: 'custom:theme-probe', entity: 'sensor.example', dash6_css: {class: 'dash6-probe dash6-probe dash6-invalid legacy-class'}};
      fixture.card = await Runtime.create(fixture.raw);
      fixture.card.hass = fixture.hass;
      document.body.append(fixture.card);
    });
    await page.waitForFunction(() => fixture.card?._child?.isConnected && fixture.read(fixture.card).height === '116px');
    const first = await page.evaluate(() => fixture.read(fixture.card));
    assert.equal(first.radius, '16px', 'Common scoped card geometry retains its established corner radius');
    assert.equal(first.columns, 3);
    assert.equal(first.content, '"Named class"');
    assert.equal(await page.evaluate(() => fixture.card._config.skin.css), '', 'No inline CSS is needed');
    assert.equal(await page.evaluate(() => Runtime.decodeThemeClass('not JSON')), '');
    assert.equal(await page.evaluate(() => Runtime.decodeThemeClass('{"css":"invalid object"}')), '');
    assert.equal(await page.evaluate(() => Runtime.themeClassCSS(fixture.card, 'legacy-class dash6-invalid')), '');

    // A theme-variable change takes effect on the next hass refresh and reuses the child/sheet slot.
    await page.evaluate(() => {
      fixture.originalChild = fixture.card._child;
      fixture.createdBefore = fixture.created.length;
      const css = JSON.parse(document.body.style.getPropertyValue('--dash6-class-probe')).replaceAll('116px', '132px');
      document.body.style.setProperty('--dash6-class-probe', JSON.stringify(css));
      fixture.card.hass = {...fixture.hass, states: {...fixture.hass.states, 'sensor.example': {state: '2', attributes: {}}}};
    });
    await page.waitForFunction(() => fixture.read(fixture.card).height === '132px');
    assert.equal(await page.evaluate(() => fixture.card._child === fixture.originalChild), true);
    assert.equal(await page.evaluate(() => fixture.created.length), await page.evaluate(() => fixture.createdBefore));
    assert.equal((await page.evaluate(() => fixture.read(fixture.card))).sheets, first.sheets);
    await page.evaluate(async () => {
      await fixture.card.setConfig(Runtime.mapCards({...fixture.raw, dash6_css: {class: 'dash6-probe-wide'}}));
    });
    await page.waitForFunction(() => fixture.read(fixture.card).height === '137px');
    assert.equal(await page.evaluate(() => fixture.card.shadowRoot.querySelectorAll('theme-probe').length), 1);
    await page.evaluate(() => { fixture.card.remove(); document.body.append(fixture.card); });
    await page.waitForFunction(() => fixture.card._child?.isConnected && fixture.read(fixture.card).height === '137px');
    assert.equal(await page.evaluate(() => fixture.card._config.definition.entity), 'sensor.example');
    assert.equal(await page.evaluate(() => fixture.card.shadowRoot.querySelectorAll('dash6-render-card').length), 0);

    // Both our own card types and native/custom early mapping branches keep the class metadata.
    const mappings = await page.evaluate(() => {
      const skin = {class: 'dash6-probe-wide'};
      const ikea = {type: 'custom:button-card', entity: 'switch.example', custom_fields: {slot_1: 'Power', graph: {card: {type: 'custom:apexcharts-card', series: [{entity: 'sensor.example_power'}]}}}, dash6_css: skin};
      fixture.ikeaRaw = ikea;
      const cases = [
        {type: 'custom:dash6-theme-probe', dash6_css: skin},
        {type: 'custom:dash5-govee-light-card-v2', entity: 'light.example', dash6_css: skin},
        {type: 'thermostat', entity: 'climate.example', dash6_css: skin},
        {type: 'custom:more-info-card', entity: 'cover.example', dash6_css: skin},
        {type: 'custom:embedded-view-card', view: 'example', dash6_css: skin},
        {type: 'custom:button-card', entity: 'light.example', show_name: false, show_state: false, tap_action: {action: 'toggle'}, dash6_css: skin},
        ikea,
      ];
      return cases.map(config => {
        const mapped = Runtime.mapCards(config);
        return {source: config.type, type: mapped.type, childType: mapped.definition?.type, classes: mapped.skin?.classes, css: mapped.skin?.css};
      });
    });
    for (const mapped of mappings) {
      assert.equal(mapped.type, 'custom:dash6-render-card', mapped.source + ' preserves one material wrapper');
      assert.equal(mapped.classes, 'dash6-probe-wide', mapped.source + ' preserves named class');
      assert.notEqual(mapped.childType, 'custom:dash6-render-card', mapped.source + ' does not double wrap');
    }
    await page.evaluate(async () => {
      fixture.own = await Runtime.create({type: 'custom:dash6-theme-probe', dash6_css: {class: 'dash6-probe-wide'}});
      fixture.own.hass = fixture.hass;
      document.body.append(fixture.own);
      fixture.ikea = await Runtime.create(fixture.ikeaRaw);
      fixture.ikea.hass = fixture.hass;
      document.body.append(fixture.ikea);
      fixture.light = await Runtime.create({type: 'custom:dash5-govee-light-card-v2', entity: 'light.example', main_back: {enabled: false}, rows: {controls: false, scenes: false}, dash6_css: {class: 'dash6-probe-wide'}});
      fixture.light.hass = fixture.hass;
      document.body.append(fixture.light);
    });
    await page.waitForFunction(() => fixture.own?._child?.isConnected && fixture.read(fixture.own).height === '137px');
    await page.waitForFunction(() => fixture.ikea?._child?._child?._child?.isConnected && fixture.read(fixture.ikea).height === '137px');
    await page.waitForFunction(() => fixture.light?._child?.isConnected && getComputedStyle(fixture.light._child.shadowRoot.querySelector('ha-card')).height === '137px');
    assert.equal(await page.evaluate(() => fixture.ikea._child.localName), 'dash6-ikea-card');
    assert.equal(await page.evaluate(() => fixture.ikea._child._child.localName), 'dash6-render-card');
    assert.equal(await page.evaluate(() => fixture.ikea._child._child._child.localName), 'button-card');
    assert.equal(await page.evaluate(() => fixture.ikea._child._child.shadowRoot.querySelectorAll('dash6-render-card').length), 0);
    assert.equal(await page.evaluate(() => fixture.ikea._child._child._config.skin.classes), 'dash6-probe-wide');

    // AutoEntities' scene marker is honored without any Jinja CSS, then follows verified member state.
    await page.evaluate(async () => {
      fixture.scene = await Runtime.create({type: 'tile', entity: 'scene.example', dash6_active: true, dash6_css: {class: 'dash6-scene-probe'}});
      fixture.scene.hass = fixture.hass;
      document.body.append(fixture.scene);
    });
    await page.waitForFunction(() => fixture.scene?._child?.dataset.active === 'true' && fixture.read(fixture.scene).height === '81px');
    assert.equal(await page.evaluate(() => Object.hasOwn(fixture.scene._config.definition, 'dash6_active')), false);
    assert.equal(await page.evaluate(() => fixture.scene._config.skin.css.includes('{%')), false);
    await page.evaluate(() => {
      fixture.scene.hass = {...fixture.hass, states: {...fixture.hass.states, 'light.example': {...fixture.hass.states['light.example'], state: 'off'}}};
    });
    await page.waitForFunction(() => fixture.scene._child.dataset.active === 'false' && fixture.read(fixture.scene).height === '64px');
    assert.deepEqual(await page.evaluate(() => fixture.apiReads), [['GET', 'config/scene/config/theme-class-test']]);
    assert.deepEqual(await page.evaluate(() => fixture.services), []);
    assert.deepEqual(errors, []);
    console.log(`PASS ${engine.name()}: JSON theme classes in child shadow CSS, invalid-class rejection, hass/theme refresh, class replacement/reconnect, own/light/IKEA/native mapping retention without duplicate inner wrappers, verified scene activation without Jinja, no device actions.`);
  } finally { await browser.close(); }
}
