import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {planSectionPositions} from '../src/dash6/sections-responsive.js';

const item = (span,rowSpan=1) => ({configuredSpan:span,span,expandedSpan:span===4?6:span,rowSpan});
assert.deepEqual(planSectionPositions([item(4),item(4)],10).map(p=>[p.row,p.column,p.span,p.position]),[[1,1,4,1],[1,5,6,2]]);
assert.deepEqual(planSectionPositions([item(6),item(4)],10).map(p=>p.span),[6,4]);
assert.deepEqual(planSectionPositions([item(6),item(6),item(4)],10,true).map(p=>[p.row,p.column,p.span]),[[1,1,6],[2,1,6],[1,7,4]]);
assert.deepEqual(planSectionPositions([item(4,2),item(6),item(4),item(6)],10,true).map(p=>[p.row,p.column,p.span]),[[1,1,4],[1,5,6],[2,5,6],[3,1,6]]);
// Later dense backfill must revoke expansion if the candidate becomes third.
const backfill=planSectionPositions([item(2,2),item(2),item(6),item(2),item(4),item(2)],10,true);
for(const p of backfill)if(p.expanded)assert.equal(p.position,2);

const bundle=await build({entryPoints:['src/dash6/layouts.js'],bundle:true,write:false,format:'iife',loader:{'.css':'text'},logLevel:'silent'});
// Real RenderCard and RoomSlot implementations expose adapter/shadow boundaries
// that simple direct-child fixtures cannot represent.
const adapters=await build({stdin:{contents:"import './src/dash6/profile-card.js';import './src/dash6/room-loader.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',define:{'import.meta.url':JSON.stringify('http://room-loader.test/room-loader.js')},loader:{'.css':'text'},logLevel:'silent'});
const browser=await (process.env.DASH6_TEST_BROWSER==='webkit'?webkit:chromium).launch({headless:true});
try {
 const page=await browser.newPage({viewport:{width:900,height:1000}});
 await page.goto('about:blank');
 await page.evaluate(()=>{
  document.body.style.cssText='margin:0;--dash6-satin-enabled:1';
  customElements.define('hui-sections-view',class extends HTMLElement {
   static styles=[];
   constructor(){super();this.attachShadow({mode:'open'});this.updates=0;}
   setConfig(config){this._config=config;this.sections=config.sections.map(config=>({config,hidden:false}));this.draw();}
   draw(){
    this.shadowRoot.innerHTML='<style>:host{display:block}.content{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));grid-auto-flow:row;gap:8px}.content.dense{grid-auto-flow:row dense}.section{height:48px;grid-column:span var(--column-span);grid-row:span var(--row-span)}.section:has(hui-section[hidden]){display:none}</style><div class="wrapper"><div class="container"><div class="content"></div></div></div>';
    const content=this.shadowRoot.querySelector('.content');content.classList.toggle('dense',Boolean(this._config.dense_section_placement));
    this._config.sections.forEach((config,index)=>{
     const section=document.createElement('div');section.className='section';
     section.style.setProperty('--column-span',config.column_span);
     section.style.setProperty('--row-span',config.row_span||1);
     const child=document.createElement(config.dynamic?'dash6-auto-entities':'hui-section');child.textContent=String(index);
     if(config.dynamic){child._dash6Signature='ready';child.empty=Boolean(config.empty);}
     section.append(child);content.append(section);
    });
   }
   connectedCallback(){this.updated();}
   updated(){this.updates++;}
  });
 });
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 await page.evaluate(()=>{
  customElements.define('hui-card',class extends HTMLElement {
   constructor(){super();this.attachShadow({mode:'open'});}
   setChild(child){this._card=child;this.shadowRoot.replaceChildren(child);}
  });
  window.nativeCardWrapper=child=>{const wrapper=document.createElement('hui-card');wrapper.setChild(child);return wrapper;};
  window.deepQuery=(root,selector)=>{
   const found=root.querySelector(selector);if(found)return found;
   for(const node of root.querySelectorAll('*'))if(node.shadowRoot){const nested=deepQuery(node.shadowRoot,selector);if(nested)return nested;}
   return null;
  };
  window.deepAll=(root,selector)=>{
   const found=[...root.querySelectorAll(selector)];
   for(const node of root.querySelectorAll('*'))if(node.shadowRoot)found.push(...deepAll(node.shadowRoot,selector));
   return found;
  };
  for(const name of ['hui-grid-card','hui-vertical-stack-card','hui-horizontal-stack-card'])customElements.define(name,class extends HTMLElement {
   constructor(){super();this.attachShadow({mode:'open'});}
   async setConfig(config){this._config=config;const children=await Promise.all((config.cards||[]).map(c=>window.loadCardHelpers().then(h=>h.createCardElement(c))));this.shadowRoot.replaceChildren(...children.map(nativeCardWrapper));}
  });
  window.loadCardHelpers=async()=>({async createCardElement(config){
   const tag=config.type.startsWith('custom:')?config.type.slice(7):'hui-'+config.type+'-card';
   const child=document.createElement(tag);await child.setConfig?.(config);return child;
  }});
 });
 await page.addScriptTag({content:adapters.outputFiles[0].text});
 await page.waitForFunction(()=>customElements.get('dash6-sections-view'));
 const create=async(spans,options={})=>page.evaluate(({spans,options})=>{
  document.querySelectorAll('hui-sections-view,dash6-sections-view').forEach(host=>host.remove());
  window.views=['hui-sections-view','dash6-sections-view'].map(name=>{
   const host=document.createElement(name);
   const config={type:'sections',max_columns:10,dense_section_placement:Boolean(options.dense),sections:spans.map((column_span,index)=>({type:'grid',column_span,row_span:options.rowSpans?.[index]||1,dynamic:options.hiddenIndex===index,empty:options.hiddenIndex===index}))};
   window.savedConfig=JSON.stringify(config);host.setConfig(config);document.body.append(host);return host;
  });
 },{spans,options});
 const settle=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const state=()=>page.evaluate(()=>views.map(host=>({name:host.localName,unchanged:JSON.stringify(host._config)===savedConfig,sections:[...host.shadowRoot.querySelectorAll('.content>.section')].map(section=>({
  display:getComputedStyle(section).display,span:getComputedStyle(section).getPropertyValue('--dash6-section-effective-span').trim(),configured:section.style.getPropertyValue('--dash6-section-span'),
  row:section.dataset.dash6SectionRow,column:section.dataset.dash6SectionColumn,position:section.dataset.dash6SectionPosition,expanded:section.hasAttribute('data-dash6-section-expandable'),rect:section.getBoundingClientRect().toJSON()
 }))})));
 const verifyPair=async(spans,width,expected)=>{
  await page.setViewportSize({width,height:1000});await create(spans);await settle();
  for(const view of await state()){
   assert.equal(view.unchanged,true,view.name+' config unchanged');
   assert.deepEqual(view.sections.map(s=>Number(s.span)),expected,`${view.name} spans at${width}`);
   assert.equal(view.sections[0].rect.y===view.sections[1].rect.y,width>=700,view.name+' row');
   assert.deepEqual(view.sections.map(s=>s.configured),spans.map(String));
   if(width<700)for(const section of view.sections)assert.equal(section.rect.width,width);
   assert.equal(view.sections[1].expanded,width>=900&&spans[0]===4&&spans[1]===4);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,'No horizontal overflow');
 };
 for(const width of [390,699,700,899,900,1200]){
  await verifyPair([4,4],width,width<700?[1,1]:width<900?[5,5]:[4,6]);
  await verifyPair([6,4],width,width<700?[1,1]:width<900?[5,5]:[6,4]);
 }
 // 5/10 and other configured spans retain their desktop and middle widths.
 for(const width of [700,899,900]){
  await page.setViewportSize({width,height:1000});await create([5,5,10,2,8]);await settle();
  for(const view of await state())assert.deepEqual(view.sections.map(s=>Number(s.span)),[5,5,10,2,8]);
 }
 await page.setViewportSize({width:900,height:1000});await create([4,4,4],{hiddenIndex:0});await settle();
 for(const view of await state()){
  assert.equal(view.sections[0].display,'none');assert.equal(view.sections[0].position,undefined);
  assert.deepEqual(view.sections.slice(1).map(s=>[s.position,Number(s.span)]),[['1',4],['2',6]]);
 }
 // Native section visibility is independent of empty custom-list detection.
 await create([4,4,4]);await page.evaluate(()=>views.forEach(host=>{
  host.sections[0].hidden=true;host.shadowRoot.querySelector('hui-section').hidden=true;
  host.dispatchEvent(new Event('section-visibility-changed'));
 }));await settle();
 for(const view of await state())assert.deepEqual(view.sections.slice(1).map(s=>[s.position,Number(s.span)]),[['1',4],['2',6]]);
 // Optimized RoomSlot cards use the same visibility path in native/custom views.
 await create([4,4,4]);await page.evaluate(()=>views.forEach(host=>{
  const section=host.shadowRoot.querySelector('.section');const slot=document.createElement('dash6-room-slot-card');slot.empty=true;
  section.replaceChildren(slot);host.dispatchEvent(new Event('card-visibility-changed'));
 }));await settle();
 for(const view of await state()){
  assert.equal(view.sections[0].display,'none');assert.deepEqual(view.sections.slice(1).map(s=>[s.position,Number(s.span)]),[['1',4],['2',6]]);
 }
 await page.evaluate(()=>views.forEach(host=>{host.shadowRoot.querySelector('dash6-room-slot-card').empty=false;host.dispatchEvent(new Event('card-visibility-changed'));}));await settle();
 for(const view of await state())assert.equal(view.sections[0].display,'block');
 await page.evaluate(()=>views.forEach(host=>{
  host.shadowRoot.querySelector('dash6-room-slot-card').empty=true;host.lovelace={editMode:true};host.updated();
 }));await settle();
 for(const view of await state())assert.equal(view.sections[0].display,'block','Empty sections remain editable');
 await page.evaluate(()=>views.forEach(host=>{
  host.lovelace.editMode=false;host.shadowRoot.querySelector('.section').append(document.createElement('hui-tile-card'));
  host.dispatchEvent(new Event('card-visibility-changed'));
 }));await settle();
 for(const view of await state())assert.equal(view.sections[0].display,'block','Static content keeps mixed section visible');
 // Production wrapping: hui-card → RenderCard → native vertical stack →
 // hui-card → native grid → four hui-card
 // adapters → real RoomSlots,
 // including each slot's hidden known/extra elements and Lit-rendered shadows.
 await create([4,4,4]);await page.evaluate(async()=>{
  window.wrappedSlots=[];window.wrappedAdapters=[];
  for(const host of views){
   const section=host.shadowRoot.querySelector('.section');
   const adapter=document.createElement('dash6-render-card');
   section.replaceChildren(nativeCardWrapper(adapter));
   await adapter.setConfig({type:'custom:dash6-render-card',definition:{type:'vertical-stack',cards:[{type:'grid',cards:Array.from({length:4},(_,slot)=>({type:'custom:dash6-room-slot-card',room:'fixture',slot}))}]},skin:{css:''}});
   await adapter.updateComplete;
   const slots=deepAll(adapter._child.shadowRoot,'dash6-room-slot-card');
   slots.forEach(slot=>slot._visibility());wrappedSlots.push(slots);wrappedAdapters.push(adapter);
   host.dispatchEvent(new Event('card-visibility-changed'));
  }
 });await settle();
 for(const view of await state()){
  assert.equal(view.sections[0].display,'none','Real RenderCard wrapper does not count as fixed content');
  assert.equal(view.sections[0].rect.height,0,'Empty wrapped section has no layout height');
  assert.equal(view.sections[0].position,undefined,'Empty wrapped section gets no position');
  assert.deepEqual(view.sections.slice(1).map(s=>[s.position,Number(s.span)]),[['1',4],['2',6]]);
 }
 await page.evaluate(()=>wrappedSlots.forEach(slots=>{
  const slot=slots[0];slot._fixed=document.createElement('hui-tile-card');slot._known.append(slot._fixed);slot._visibility();
 }));await settle();
 for(const view of await state()){
  assert.equal(view.sections[0].display,'block','Wrapped slot becomes visible');
  assert.deepEqual(view.sections.map(s=>[s.row,s.position,Number(s.span)]),[['1','1',4],['1','2',6],['2','1',4]]);
 }
 await page.evaluate(()=>wrappedSlots.forEach(slots=>{const slot=slots[0];slot._fixed=null;slot._known.replaceChildren();slot._visibility();}));await settle();
 for(const view of await state())assert.equal(view.sections[0].display,'none','Wrapped slot disappears again');
 await page.evaluate(()=>wrappedAdapters.forEach(adapter=>{
  const grid=deepQuery(adapter._child.shadowRoot,'hui-grid-card');
  grid.shadowRoot.append(nativeCardWrapper(document.createElement('hui-tile-card')));
  adapter.dispatchEvent(new Event('card-visibility-changed',{bubbles:true,composed:true}));
 }));await settle();
 for(const view of await state())assert.equal(view.sections[0].display,'block','Ordinary static card inside hui-card keeps mixed wrapped section visible');
 // Visibility and resize updates need no setConfig / native Lit render.
 await create([4,4,4],{hiddenIndex:0});await settle();
 for(const width of [700,899,900,699,390,900]){
  await page.setViewportSize({width,height:1000});await settle();
  for(const view of await state())assert.deepEqual(view.sections.slice(1).map(s=>Number(s.span)),width<700?[1,1]:width<900?[5,5]:[4,6]);
 }
 await page.evaluate(()=>views.forEach(host=>{host.shadowRoot.querySelector('dash6-auto-entities').empty=false;host.dispatchEvent(new Event('card-visibility-changed'));}));await settle();
 for(const view of await state())assert.deepEqual(view.sections.map(s=>[s.row,s.position,Number(s.span)]),[['1','1',4],['1','2',6],['2','1',4]]);
 // Native dense backfill, section row spans, and source DOM order are retained.
 await create([6,6,4],{dense:true});await settle();
 for(const view of await state())assert.deepEqual(view.sections.map(s=>[s.row,s.column,Number(s.span)]),[['1','1',6],['2','1',6],['1','7',4]]);
 await create([4,6,4,6],{dense:true,rowSpans:[2,1,1,1]});await settle();
 for(const view of await state())assert.deepEqual(view.sections.map(s=>[s.row,s.column]),[['1','1'],['1','5'],['2','5'],['3','1']]);
 // An idle observer cannot keep rewriting metadata or triggering reflow passes.
 assert.equal(await page.evaluate(async()=>{
  let mutations=0;const observers=views.map(host=>{const observer=new MutationObserver(records=>mutations+=records.length);observer.observe(host.shadowRoot,{subtree:true,attributes:true,childList:true});return observer;});
  await new Promise(resolve=>setTimeout(resolve,100));observers.forEach(o=>o.disconnect());return mutations;
 }),0,'No idle mutation loop');
 await page.evaluate(()=>views.forEach(host=>{host.remove();document.body.append(host);}));await settle();
 await page.setViewportSize({width:700,height:1000});await settle();
 for(const view of await state())assert.deepEqual(view.sections.map(s=>Number(s.span)),[5,5,5,5]);
 console.log('PASS: native/custom Sections at390/699/700/899/900/1200,4+4/6+4/5+5/10, hidden predecessors,visibility/resize/reconnect,dense/rowspan,no idle loop/config mutation.');
} finally {await browser.close();}
