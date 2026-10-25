import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {chromium, webkit} from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const built = await build({stdin: {contents: `
import {favoritesRenderConfig} from './src/dash6/favorites-gui.js';
import {extractCatalog,toggleSelection} from './src/dash6/favorites-model.js';
window.renderFavorites=favoritesRenderConfig;
const source={dashboard:'fixture',view:'room',title:'Raum',viewOrder:0};
const tile=name=>({type:'tile',entity:'light.'+name,name});
const sources=extractCatalog([{type:'heading',heading:'Titel'},tile('Zulu'),tile('Alpha'),
 {type:'vertical-stack',title:'Container',cards:[{type:'heading',heading:'Untertitel'},tile('A'),tile('B')]},
 {type:'vertical-stack',title:'Abgewählt',cards:[tile('PromotedX'),tile('PromotedY')]}],source);
sources.push(...extractCatalog([tile('AndererRaum')],{...source,view:'room2',title:'Zweiter Raum',viewOrder:1}));
let selected=sources.reduce((ids,node)=>toggleSelection(sources,ids,node.id,true),[]);
selected=selected.filter(id=>id!==sources[4].id);
window.initial={dashboard:'fixture',sources,selected,grouping:'source_view',sort:'alpha'};
window.original=JSON.stringify(initial);window.services=[];window.changes=[];
window.hass={states:{},entities:{},callService:async(...args)=>services.push(args)};
window.openEditor=config=>{window.editor?.remove();window.editor=document.createElement('dash6-favorites-editor');
 editor.hass=hass;editor.setConfig(config);editor.addEventListener('config-changed',event=>changes.push(event.detail.config));document.body.append(editor);};
openEditor(initial);window.ready=true;
`, resolveDir: root}, bundle: true, write: false, format: 'esm'});

const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{font:16px system-ui;margin:8px;background:#123;color:#fff;--divider-color:#789;--card-background-color:#123;--primary-text-color:#fff;--secondary-text-color:#ccd;--primary-color:#8cf}</style>
<script type="module">
customElements.define('neutral-card',class extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});}setConfig(config){this._config=config;this.shadowRoot.textContent=JSON.stringify(config);}set hass(value){this._hass=value;}
});
window.__dash6Cards={create:async config=>{const tag=config.type?.startsWith('custom:')?config.type.slice(7):'';
 const card=document.createElement(customElements.get(tag)?tag:'neutral-card');card.setConfig(config);return card;}};
await import('/favorites.js');
</script>`;
const server = createServer((req, res) => {
  res.setHeader('content-type', req.url === '/favorites.js' ? 'text/javascript' : 'text/html');
  res.end(req.url === '/favorites.js' ? built.outputFiles[0].text : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  for (const [name, engine] of Object.entries({chromium, webkit})) {
    const browser = await engine.launch({headless: true});
    try {
      for (const width of [390, 1200]) {
        const page = await browser.newPage({viewport: {width, height: 900}, hasTouch: width === 390}), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(`http://127.0.0.1:${server.address().port}/fixture/favorites`);
        await page.waitForFunction(() => window.ready && editor._preview?._body);
        const before = await page.evaluate(() => renderFavorites(editor._config, hass));
        await page.getByRole('combobox', {name: 'Kartensortierung', exact: true}).selectOption('manual');
        assert.deepEqual(await page.evaluate(() => renderFavorites(editor._config, hass)), before, 'entering manual mode retains the current render order');
        const region = page.getByRole('region', {name: 'Manuelle Kartenreihenfolge', exact: true});
        assert.equal(await region.getByRole('button', {name: 'AndererRaum nach oben verschieben', exact: true}).isDisabled(), true, 'groups keep their boundaries');
        const bUp = region.getByRole('button', {name: 'B nach oben verschieben', exact: true});
        const size = await bUp.boundingBox();
        assert.ok(size.width >= 44 && size.height >= 44, 'touch target is at least 44px');
        if (width === 390) await bUp.tap(); else {await bUp.focus(); await page.keyboard.press('Enter');}
        await page.waitForFunction(() => {
          const group=renderFavorites(editor._config,hass).cards[0],container=group.cards.find(card=>card.title==='Container');
          return container.cards[1].name==='B' && editor._preview?._body?._config.cards[0].cards.find(card=>card.title==='Container')?.cards[1].name==='B';
        });
        const headingDown = region.getByRole('button', {name: 'Untertitel nach unten verschieben', exact: true});
        await headingDown.focus(); await page.keyboard.press('Space');
        await page.waitForFunction(() => renderFavorites(editor._config,hass).cards[0].cards.find(card=>card.title==='Container').cards[0].name==='B');
        assert.equal(await page.evaluate(() => editor.shadowRoot.activeElement?.getAttribute('aria-label')), 'Untertitel nach unten verschieben', 'keyboard focus follows the moved card');
        await region.getByRole('button', {name: 'PromotedY nach oben verschieben', exact: true}).click();
        const draft = await page.evaluate(() => JSON.parse(JSON.stringify(changes.at(-1))));
        assert.deepEqual(draft.selected, await page.evaluate(() => initial.selected));
        assert.deepEqual(draft.sources, await page.evaluate(() => initial.sources));
        const rendered = await page.evaluate(() => renderFavorites(editor._config,hass));
        assert.deepEqual(rendered.cards.map(card=>card.cards[0].heading), ['Raum', 'Zweiter Raum']);
        const promoted = rendered.cards[0].cards.filter(card=>card.name?.startsWith('Promoted')).map(card=>card.name);
        assert.deepEqual(promoted, ['PromotedY', 'PromotedX']);
        await page.evaluate(config => openEditor(config), draft);
        await page.waitForFunction(() => editor._preview?._body);
        assert.deepEqual(await page.evaluate(() => renderFavorites(editor._config,hass)), rendered, 'saved configuration reopens with the manual hierarchy order');
        assert.equal(await page.evaluate(() => JSON.stringify(initial)), await page.evaluate(() => original));
        assert.equal(await page.evaluate(() => services.length), 0);
        assert.deepEqual(errors, []);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'editor remains within the viewport');
        console.log(`${name} ${width}px: manual GUI moves, headings, nested/promoted children, preview, persistence, group boundaries and no device actions passed.`);
        await page.close();
      }
    } finally {await browser.close();}
  }
} finally {await new Promise(resolve => server.close(resolve));}
