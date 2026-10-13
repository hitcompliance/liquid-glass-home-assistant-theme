// Standalone neutral fixtures use upstream layout-card's real root-margin contract.
// Set DASH6_LAYOUT_CARD_REFERENCE to a separately installed original for live parity.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
const loader=await readFile(new URL('../src/dash6/room-loader.js',import.meta.url),'utf8');
const reference=process.env.DASH6_LAYOUT_CARD_REFERENCE;
const contract=`
class Grid extends HTMLElement{
 static styles=[];
 constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<div id="root"></div>';}
 async setConfig(config){this._config=config;this.draw();}
 set cards(cards){this._cards=cards;this.draw();}get cards(){return this._cards||[];}
 connectedCallback(){this.draw();}disconnectedCallback(){this._mq?.removeEventListener('change',this._change);}
 draw(){if(!this._config)return;this.shadowRoot.adoptedStyleSheets=this.constructor.styles.flat(Infinity);const root=this.shadowRoot.querySelector('#root');root.replaceChildren(...this.cards);root.style.cssText='display:grid;grid-template-columns:'+this._config.layout['grid-template-columns'];if(!this._mq){const [query]=Object.keys(this._config.layout.mediaquery||{});if(query){this._mq=matchMedia(query);this._change=()=>this.draw();this._mq.addEventListener('change',this._change);}}if(this._mq?.matches)root.style.gridTemplateColumns=this._config.layout.mediaquery[this._mq.media]['grid-template-columns'];}
}
const defaults=new CSSStyleSheet();defaults.replaceSync(':host{display:block;height:100%;box-sizing:border-box}#root{display:grid;justify-content:stretch;margin:var(--layout-margin,0px 4px);padding:var(--layout-padding,4px 0);height:var(--layout-height,auto);overflow-y:var(--layout-overflow,visible)}#root>*{margin:var(--masonry-view-card-margin,4px 4px 8px)}');Grid.styles=[defaults];customElements.define('grid-layout',Grid);
customElements.define('layout-card',class extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});}
 async setConfig(config){this._config=config;const tag=config.layout_type.replace('custom:','');await customElements.whenDefined(tag);const grid=document.createElement(tag);await grid.setConfig({layout:config.layout,cards:config.cards});grid.cards=await Promise.all(config.cards.map(c=>window.__dash6Cards.create(c)));this.shadowRoot.replaceChildren(grid);this._grid=grid;}
 set hass(h){this._hass=h;for(const c of this._grid?.cards||[])c.hass=h;}get hass(){return this._hass;}
});`;
const upstream=reference?await readFile(reference,'utf8'):contract;
const configs={neutral:{template:'neutral',slots:[{index:0,known:['switch.known'],initial:[{type:'custom:vertical-stack-in-card',cards:[{type:'heading',heading:'Devices'},{type:'custom:neutral-device',entity:'switch.known'}]}]}]}};
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;font:16px system-ui;--divider-color:#888;--dash5-thin-border:1px solid #ccc;--dash5-thin-background:rgba(255,255,255,.04);background:#123;color:#fff}dash6-room-slot-card{width:100%;display:block}</style><script type="module">
class Device extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'});}setConfig(c){this._config=c;this.shadowRoot.innerHTML='<style>:host{display:block;min-width:0;margin:0}ha-card{display:block;height:116px;box-sizing:border-box;border:1px solid #aaa;border-radius:16px;background:rgba(20,25,30,.7)}.controls{display:grid;grid-template-columns:repeat(3,1fr)}</style><ha-card><div>'+c.entity+'</div><div class="controls"><button>A</button><button>B</button><button>C</button></div></ha-card>';this.addEventListener('click',()=>window.actions++);}getCardSize(){return 2;}}
customElements.define('neutral-device',Device);customElements.define('dash6-profile-card',class extends HTMLElement{});
class Heading extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'});}setConfig(c){this.shadowRoot.innerHTML='<style>:host{display:block;height:40px}h2{margin:0;font-size:24px}</style><h2>'+c.heading+'</h2>';}}
customElements.define('neutral-heading',Heading);
class Stack extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'});}async setConfig(c){const cards=await Promise.all(c.cards.map(create));this.shadowRoot.replaceChildren(...cards);this.style.display='block';this._cards=cards;}set hass(h){for(const c of this._cards||[])c.hass=h;}}
customElements.define('neutral-stack',Stack);
async function create(c){const tag=c.type==='heading'?'neutral-heading':c.type==='vertical-stack'||c.type==='custom:vertical-stack-in-card'||c.type==='custom:dash6-stack-card'?'neutral-stack':c.type.replace('custom:','');const child=document.createElement(tag);await child.setConfig(c);return child;}
window.__dash6Cards={create};window.loadCardHelpers=async()=>({createCardElement:c=>{const tag=c.type==='heading'?'neutral-heading':['vertical-stack','custom:vertical-stack-in-card','custom:dash6-stack-card'].includes(c.type)?'neutral-stack':c.type.replace('custom:','');const el=document.createElement(tag);el.setConfig(c);return el;}});window.actions=0;
await import('/upstream.js');await import('/loader.js');
const states=Object.fromEntries(['known','extra1','extra2','extra3','extra4','nested'].map(name=>['switch.'+name,{entity_id:'switch.'+name,state:'on',attributes:{}}]));
window.emit=null;window.hass={states,entities:{},connection:{subscribeMessage:async(fn)=>{window.emit=fn;return()=>{};}}};
window.slot=document.createElement('dash6-room-slot-card');slot.setConfig({room:'neutral',slot:0,columns:2,mobile_columns:1,mobile_breakpoint:700,edge_alignment:'flush'});slot.hass=hass;document.body.append(slot);
window.setCount=count=>emit({result:[Array.from({length:count},(_,i)=>({type:'custom:neutral-device',entity:'switch.'+(i?'extra'+i:'known')}))]});window.ready=true;
</script>`;
const server=createServer((req,res)=>{if(req.url.startsWith('/local/')){res.setHeader('content-type','application/json');res.end(JSON.stringify(configs));return;}res.setHeader('content-type',req.url.endsWith('.js')?'text/javascript':'text/html');res.end(req.url==='/upstream.js'?upstream:req.url==='/loader.js'?loader:html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const results=[];
try{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready&&window.emit);
   const measure=()=>page.evaluate(()=>{const wrapper=slot._fixed,frame=wrapper.shadowRoot.querySelector('.frame'),heading=wrapper.shadowRoot.querySelector('.heading'),layout=frame.firstElementChild,grid=layout.shadowRoot.querySelector('dash6-room-flush-grid-layout'),cards=grid.cards.map(c=>c.shadowRoot.querySelector('ha-card').getBoundingClientRect().toJSON());return {frame:frame.getBoundingClientRect().toJSON(),heading:heading.getBoundingClientRect().toJSON(),cards,overflow:getComputedStyle(frame).overflow,gap:getComputedStyle(grid.shadowRoot.querySelector('#root')).gap,padding:getComputedStyle(frame).padding,controls:getComputedStyle(grid.cards[0].shadowRoot.querySelector('.controls')).gridTemplateColumns,scrollWidth:document.documentElement.scrollWidth};});
   for(const count of [4,5]){
    await page.evaluate(n=>setCount(n),count);await page.waitForFunction(n=>slot._fixed?.shadowRoot?.querySelector('.frame')?.firstElementChild?.shadowRoot?.querySelector('dash6-room-flush-grid-layout')?.cards?.length===n,count);
    for(const width of [390,699,700,1200,700]){
     await page.setViewportSize({width,height:1000});await page.waitForFunction(narrow=>{const grid=slot._fixed.shadowRoot.querySelector('.frame').firstElementChild.shadowRoot.querySelector('dash6-room-flush-grid-layout'),cards=grid.cards;return (cards[0].getBoundingClientRect().top!==cards[1].getBoundingClientRect().top)===narrow;},width<700);
     const m=await measure(),c=m.cards;const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<.1,msg+' '+a+' vs '+b);
     assert.ok(m.heading.bottom<=m.frame.top,'heading outside frame');assert.equal(m.gap,'8px');assert.equal(m.overflow,'hidden');assert.equal(m.scrollWidth,width);assert.equal(m.controls.split(' ').length,3,'three internal control columns');
     if(width>=700){near(c[0].left,m.frame.left,'first left');near(c[1].right,m.frame.right,'first right');near(c[0].top,m.frame.top,'first top');near(c[1].top,m.frame.top,'second top');near(c[1].left-c[0].right,8,'column gap');for(let i=2;i<count;i++)near(c[i].top-c[i-2].bottom,8,'row gap');near(c.at(-1).bottom,m.frame.bottom,'last bottom');near(c[count%2?count-1:count-2].bottom,m.frame.bottom,'last left bottom');if(count%2)near(c.at(-1).width,(m.frame.width-8)/2,'odd stays half width');assert.equal(m.padding,'0px');}
     else{assert.equal(m.padding,'8px');for(let i=1;i<count;i++){near(c[i].left,c[0].left,'one column');near(c[i].top-c[i-1].bottom,8,'mobile row gap');}near(c[0].left-m.frame.left,8,'normal mobile inset');}
     results.push({engine:name,count,width,frame:[m.frame.x,m.frame.y,m.frame.width,m.frame.height],first:c.slice(0,2).map(r=>[r.x,r.y,r.width,r.height]),last:c.slice(-2).map(r=>[r.x,r.y,r.width,r.height]),gap:m.gap});
    }
   }
   await page.evaluate(()=>{slot.hass={...hass,entities:{'switch.extra4':{hidden_by:'user'}}};});await page.waitForFunction(()=>slot._fixed?.shadowRoot?.querySelector('.frame')?.firstElementChild?.shadowRoot?.querySelector('dash6-room-flush-grid-layout')?.cards?.length===4);assert.equal((await measure()).cards.length,4,'registry-hidden dynamic card is removed on hass update');
   await page.evaluate(()=>{const fixed=slot._fixed;slot.hass={...hass,entities:{'switch.extra4':{hidden_by:'user'}},states:{...hass.states,'switch.known':{...hass.states['switch.known'],state:'off'}}};window.sameFixed=fixed===slot._fixed;});assert.equal(await page.evaluate(()=>sameFixed),true,'hass-only update preserves child');
   await page.evaluate(()=>{slot.setConfig({room:'neutral',slot:0,columns:1,combine:true});slot.hass=hass;});await page.waitForFunction(()=>slot._fixedKey.includes('custom:vertical-stack-in-card')&&slot._fixedKey.includes('repeat(1,minmax(0,1fr))'));
   await page.evaluate(()=>emit({result:[[{type:'custom:vertical-stack-in-card',cards:[{type:'heading',heading:'Devices'},{type:'custom:neutral-device',entity:'switch.known'},{type:'custom:vertical-stack-in-card',cards:[{type:'custom:neutral-device',entity:'switch.nested'}]}]}]]}));await page.waitForFunction(()=>slot._fixedKey.includes('switch.nested'));
   const combined=await page.evaluate(()=>JSON.parse(slot._fixedKey));assert.equal(combined.cards.filter(c=>c.type==='heading').length,1);const items=combined.cards.at(-1).cards;assert.equal(items.length,2);assert.equal(items[0].entity,'switch.known');assert.equal(items[1].type,'custom:vertical-stack-in-card','nested wrapper retained');assert.equal(items[1].cards[0].entity,'switch.nested');await page.evaluate(()=>{slot.hass={...hass,entities:{'switch.known':{hidden_by:'user'}}};});await page.waitForFunction(()=>!slot._fixedKey.includes('switch.known'));const hidden=await page.evaluate(()=>JSON.parse(slot._fixedKey));assert.equal(hidden.cards.filter(c=>c.type==='heading').length,1,'domain heading survives when only dynamic cards remain');assert.equal(hidden.cards.at(-1).cards.length,1);assert.equal(await page.evaluate(()=>actions),0);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 }
 console.log(JSON.stringify({layoutDependency:reference?'original-layout-card':'upstream-grid-contract-fixture',results}));
}finally{await new Promise(resolve=>server.close(resolve));}
