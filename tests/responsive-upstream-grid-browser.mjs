// Verify the independently installed original layout-card using its real Lit lifecycle.
// DASH6_LAYOUT_CARD_REFERENCE=/path/layout-card.js node tests/responsive-upstream-grid-browser.mjs
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const reference=process.env.DASH6_LAYOUT_CARD_REFERENCE;
if(!reference)throw Error('DASH6_LAYOUT_CARD_REFERENCE required');
const upstream=await readFile(reference),responsive=await readFile(new URL('../src/dash6/responsive-layouts.js',import.meta.url));
const server=createServer((req,res)=>{res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/html');res.end(req.url==='/upstream.js'?upstream:req.url==='/responsive.js'?responsive:'<style>body{margin:0;--dash6-satin-enabled:1}grid-layout{display:block;width:100%}</style>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch();
try{
 const page=await browser.newPage({viewport:{width:700,height:900}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.evaluate(async()=>{
  await import('/responsive.js');await import('/upstream.js');await customElements.whenDefined('grid-layout');await Promise.resolve();
  const layout=window.layout=document.createElement('grid-layout');
  layout.setConfig({layout:{'grid-template-columns':'repeat(2,minmax(0,1fr))',gap:'8px'},cards:[{},{}]});
  layout.cards=[document.createElement('div'),document.createElement('div')];
  layout.cards.forEach((card,i)=>{card.style.cssText='height:48px;min-width:0;background:gray';card.textContent='Card'+i;});
  document.body.append(layout);
 });
 const measure=()=>page.evaluate(()=>layout.cards.map(card=>card.getBoundingClientRect().toJSON()));
 await page.waitForFunction(()=>layout.shadowRoot.querySelector('#root')?.children.length===2);
 for(const width of [700,699,390,700]){
  await page.setViewportSize({width,height:900});
  await page.waitForFunction(narrow=>{const a=layout.cards.map(card=>card.getBoundingClientRect());return (a[0].y!==a[1].y)===narrow;},width<700);
  const rect=await measure();assert.equal(rect[0].y===rect[1].y,width===700);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: original grid-layout real lifecycle,699/390 one column,700 two columns restored, no overflow.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
