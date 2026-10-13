import {build} from 'esbuild';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const bundle=await build({entryPoints:['src/dash6/layouts.js'],bundle:true,write:false,format:'iife',loader:{'.css':'text'},logLevel:'silent'});
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:700,height:900}});
 await page.goto('about:blank');
 await page.evaluate(()=>{
  document.body.style.cssText='margin:0;--dash6-satin-enabled:1';
  class Grid extends HTMLElement {
   static styles=[];
   constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<style>:host{display:block}#root{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}#root>div{height:48px;min-width:0}.controls{display:grid;grid-template-columns:repeat(3,1fr)}</style><div id="root"><div>A<div class="controls"><button>Up</button><button>Stop</button><button>Down</button></div></div><div style="grid-column:2">B</div></div>';}
   connectedCallback(){this.updated();for(const s of this.constructor.styles.flat(Infinity)){const style=document.createElement('style');style.textContent=s.cssText||'';this.shadowRoot.append(style);}}
   updated(){}
  }
  customElements.define('grid-layout',Grid);
  customElements.define('hui-grid-card',class extends Grid{});
  customElements.define('hui-sections-view',class extends Grid {
   constructor(){super();this.shadowRoot.innerHTML='<style>:host{display:block}.content{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:8px}.section{height:48px}.section:first-child{grid-column:span4}.section:last-child{grid-column:span6}</style><div class="content"><div class="section" style="grid-column:span 4">Climate</div><div class="section" style="grid-column:span 6">Weather</div></div>';}
  });
  class Masonry extends Grid {
   constructor(){super();this.shadowRoot.innerHTML='<style>:host{display:block}#columns{display:flex}.column{width:50%;height:96px}.column>div{height:48px}</style><div id="columns"><div class="column"><div>A</div><div>B</div></div><div class="column"><div>C</div><div>D</div></div></div>';}
  }
  customElements.define('hui-masonry-view',Masonry);
  customElements.define('masonry-layout',class extends Masonry{});
  customElements.define('ultra-card',class extends Grid {
   constructor(){super();this.shadowRoot.innerHTML='<style>:host{display:block}.card-row{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.card-column{height:48px}</style><div class="card-row"><div class="card-column"><div class="external-card-module-container">A</div></div><div class="card-column"><div class="external-card-module-container">B</div></div></div>';}
  });
 });
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.waitForFunction(()=>customElements.get('dash6-inline-pill-layout')&&customElements.get('dash6-ultra-card'));
 await page.evaluate(()=>{
  window.cards=['hui-grid-card','grid-layout','dash6-ultra-card','hui-sections-view','hui-masonry-view','masonry-layout','dash6-inline-pill-layout'].map(name=>{const card=document.createElement(name);document.body.append(card);card.updated();return card;});
 });
 const measure=()=>page.evaluate(()=>cards.map(card=>{
  const root=card.shadowRoot.querySelector('#root,.card-row,.content,#columns'),parts=[...root.children],rect=parts.map(part=>part.getBoundingClientRect().toJSON());
  return {name:card.localName,rect,grid:getComputedStyle(root).gridTemplateColumns,controls:card.shadowRoot.querySelector('.controls')&&getComputedStyle(card.shadowRoot.querySelector('.controls')).gridTemplateColumns};
 }));
 for(const width of [700,699,390,700]){
  await page.setViewportSize({width,height:900});
  const data=await measure();
  for(const item of data.slice(0,6)){
   assert.equal(item.rect[0].y===item.rect[1].y,width===700,`${item.name} at${width}`);
   if(width<700)assert.equal(item.rect[0].width,item.rect[1].width,`${item.name} widths`);
  }
  assert.equal(data[6].rect[0].y,data[6].rect[1].y,'Pills still share a row');
  assert.equal(await page.evaluate(()=>cards[4].shadowRoot.querySelectorAll('.column>div').length),4,'Native masonry keeps all cards');
  assert.equal(await page.evaluate(()=>cards[5].shadowRoot.querySelectorAll('.column>div').length),4,'Generic masonry keeps all cards');
  assert.equal(data[0].controls.split(' ').length,3,'Cover controls retain three internal columns');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,'No overflow');
 }
 await page.setViewportSize({width:699,height:900});
 await page.evaluate(()=>{document.body.style.setProperty('--dash6-satin-enabled','0');cards.slice(0,2).forEach(card=>card.updated());});
 const disabled=await measure();
 assert.equal(disabled[0].rect[0].y,disabled[0].rect[1].y,'Native grid theme-off unchanged');
 assert.equal(disabled[1].rect[0].y,disabled[1].rect[1].y,'Grid layout theme-off unchanged');
 console.log('PASS: native grids, room-slot grid-layout and Ultra content stack at699/390, retain700 columns, pills/internal controls and theme-off grids preserved.');
} finally {await browser.close();}
