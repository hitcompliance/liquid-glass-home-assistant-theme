import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';

// A standalone checkout uses a neutral contract fixture. Optionally run against
// a separately installed original layout-card: DASH6_LAYOUT_CARD_REFERENCE=/path/layout-card.js.
const reference = process.env.DASH6_LAYOUT_CARD_REFERENCE;
const contract = `
class Masonry extends HTMLElement {
  static styles=[];
  constructor(){super();this.attachShadow({mode:'open'});this._observer=new ResizeObserver(()=>this.draw());}
  connectedCallback(){this._observer.observe(this);this.draw();}
  disconnectedCallback(){this._observer.disconnect();}
  setConfig(config){this._config=config;this.draw();}
  set cards(value){this._cards=value;this.draw();}get cards(){return this._cards||[];}
  draw(){if(!this._config)return;this.shadowRoot.adoptedStyleSheets=this.constructor.styles.flat().filter(Boolean);
    const cols=Math.max(1,Math.min(3,Math.floor(this.clientWidth/300)));const grid=document.createElement('div');
    grid.style.cssText='display:grid;grid-template-columns:repeat('+cols+',minmax(0,1fr))';
    for(let i=0;i<cols;i++){const col=document.createElement('div');col.className='column';grid.append(col);}
    this.cards.forEach((card,i)=>grid.children[i%cols].append(card));this.shadowRoot.replaceChildren(grid);}
}
customElements.define('masonry-layout',Masonry);
customElements.define('layout-card',class extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});}
  setConfig(config){this._config=config;this._cards=config.cards.map(card=>window.loadCardHelpersSync.createCardElement(card));}
  connectedCallback(){this.shadowRoot.innerHTML='<style>:host{display:block}dash6-favorites-masonry-layout{display:block}</style>';this.shadowRoot.append(document.createElement('dash6-favorites-masonry-layout'));}
});`;
const refinements = await readFile(new URL('../src/dash6/dashboard-refinements.js', import.meta.url), 'utf8');
const layout = reference ? await readFile(reference, 'utf8') : contract;
const html = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:0}layout-card{display:block;width:100%}</style><script type="module">
customElements.define('neutral-fixture-card',class extends HTMLElement {
  constructor(){super();this.attachShadow({mode:'open'});}
  setConfig(config){this._config=config;this.shadowRoot.innerHTML='<style>:host{display:block;height:120px;box-sizing:border-box;background:#345;color:white}</style><div>'+config.name+'</div>';}
  getCardSize(){return 3;}
});
window.loadCardHelpersSync={createCardElement:config=>{const card=document.createElement('neutral-fixture-card');card.setConfig(config);return card;}};
window.loadCardHelpers=async()=>window.loadCardHelpersSync;
await import('/layout.js');await import('/refinements.js');await customElements.whenDefined('dash6-favorites-masonry-layout');
const card=document.createElement('layout-card');card.setConfig({type:'custom:layout-card',layout_type:'custom:dash6-favorites-masonry',layout:{width:300,max_cols:3,max_width:600,card_margin:0,margin:0,padding:0,reflow:false,min_height:1},cards:Array.from({length:6},(_,index)=>({type:'custom:neutral-fixture-card',name:'Card '+index}))});card.hass={states:{}};document.body.append(card);window.fixture=card;window.ready=true;
</script>`;
const server = createServer((req, res) => {
  res.setHeader('content-type', req.url.endsWith('.js') ? 'text/javascript' : 'text/html');
  res.end(req.url === '/layout.js' ? layout : req.url === '/refinements.js' ? refinements : html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1050, height: 900}}), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.ready, null, {timeout: 8000}).catch(error => {throw new Error(error.message + '; runtime=' + JSON.stringify(errors));});
  const state = async () => page.evaluate(() => {
    const masonry = fixture.shadowRoot.querySelector('dash6-favorites-masonry-layout');
    const columns = [...masonry.shadowRoot.querySelectorAll('.column')];
    const cards = columns.flatMap(col => [...col.children]).filter(card => card.localName === 'neutral-fixture-card');
    return {configured: !!masonry._config, cards: cards.length, columns: columns.length,
      gaps: columns.map(col => getComputedStyle(col).gap),
      overflow: document.documentElement.scrollWidth > innerWidth,
      distances: columns.flatMap(col => [...col.children].slice(1).map((card, index) => Math.round((card.getBoundingClientRect().top - col.children[index].getBoundingClientRect().bottom)*100)/100)),
    };
  });
  await page.waitForFunction(() => fixture.shadowRoot.querySelector('dash6-favorites-masonry-layout')?.shadowRoot?.querySelectorAll('neutral-fixture-card').length === 6, null, {timeout: 5000}).catch(async error => {throw new Error(error.message + '; state=' + JSON.stringify(await state()) + '; runtime=' + JSON.stringify(errors));});
  const desktop = await state();
  assert.equal(desktop.configured, true); assert.equal(desktop.cards, 6); assert.ok(desktop.columns >= 2);
  assert.ok(desktop.gaps.every(gap => gap === '8px')); assert.ok(desktop.distances.every(gap => gap === 8));
  await page.setViewportSize({width: 390, height: 900});
  await page.waitForFunction(() => fixture.shadowRoot.querySelector('dash6-favorites-masonry-layout').shadowRoot.querySelectorAll('.column').length === 1, null, {timeout: 5000});
  const mobile = await state();
  assert.equal(mobile.cards, 6); assert.equal(mobile.overflow, false); assert.ok(mobile.distances.every(gap => gap === 8));
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({layoutDependency: reference ? 'original-layout-card' : 'neutral-contract-fixture', desktop, mobile, errors}));
} finally {await browser.close(); await new Promise(resolve => server.close(resolve));}
