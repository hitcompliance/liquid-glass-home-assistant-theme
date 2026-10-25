import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const bundle=await build({stdin:{contents:"import './slider-lens.js';import './interaction-refinements.js';",resolveDir:process.cwd()+'/src/dash6'},bundle:true,write:false,format:'iife',logLevel:'silent'});
for(const engine of [chromium,webkit])for(const mobile of [false,true]){
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:500,height:500},isMobile:mobile,hasTouch:mobile,...(mobile?{userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'}:{})});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('about:blank');
  await page.evaluate(()=>{
   const meta=document.createElement('meta');meta.name='viewport';meta.content='width=device-width,initial-scale=1';document.head.append(meta);
   document.body.style.cssText='--dash6-satin-enabled:1;--dash6-satin-slider-press-scale:1.3;background:#345';
   customElements.define('ha-control-circular-slider',class extends HTMLElement{
    constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<style>:host{display:block;width:320px;height:320px}svg{width:320px;height:320px}path{stroke:#f80;stroke-width:8;fill:none;pointer-events:none}[data-interaction]{stroke-width:40;pointer-events:stroke}</style><svg viewBox="0 0 200 200"><g transform="translate(10 70)"><path data-interaction d="M10 0 H150"/><g><path class="target" role="slider" aria-disabled="false" stroke-dashoffset="-30" d="M10 0 H150"/></g><g><path class="target" role="slider" aria-disabled="false" stroke-dashoffset="-90" d="M10 0 H150"/></g></g></svg>';}
    updated(){}disconnectedCallback(){}
   });
  });
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{window.g=document.createElement('ha-control-circular-slider');g.setAttribute('data-dash6-satin-climate','');document.body.append(g);g.updated();window.nativeDowns=0;g.shadowRoot.querySelector('[data-interaction]').addEventListener('pointerdown',()=>nativeDowns++);});
  const lenses=()=>page.evaluate(()=>[...g.shadowRoot.querySelectorAll('dash6-slider-lens[circular]')].map(e=>({x:parseFloat(e.style.getPropertyValue('--lens-x')),y:parseFloat(e.style.getPropertyValue('--lens-y')),diameter:parseFloat(e.style.getPropertyValue('--lens-diameter')),round:getComputedStyle(e.shadowRoot.querySelector('.glass')).borderRadius,disabled:e.hasAttribute('disabled'),touching:e.hasAttribute('touching')})));
  const initial=await lenses();assert.equal(initial.length,2);for(const [i,l] of initial.entries()){assert.ok(Math.abs(l.x-[80,176][i])<.01);assert.ok(Math.abs(l.y-112)<.01);assert.equal(l.round,'50%');}
  assert.equal(await page.evaluate(()=>g.shadowRoot.querySelectorAll('svg filter,svg use,svg defs').length),0,'no SVG filters or duplicated scene');
  for(const [i,l] of initial.entries()){
   const point=await page.evaluate(l=>{const r=g.getBoundingClientRect();return {x:r.left+l.x,y:r.top+l.y};},l);
   await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForTimeout(180);
   const active=await lenses();assert.equal(active[i].touching,true);assert.equal(active[1-i].touching,false);
   const scale=await page.evaluate(i=>getComputedStyle(g.shadowRoot.querySelectorAll('dash6-slider-lens')[i].shadowRoot.querySelector('.glass')).scale,i);assert.equal(Number(scale),1.34);
   await page.mouse.up();await page.mouse.move(450,450);await page.waitForTimeout(50);assert.equal((await lenses())[i].touching,false);
  }
  assert.equal(await page.evaluate(()=>nativeDowns),2,'lens overlays do not intercept native gestures');
  await page.evaluate(()=>{g.shadowRoot.querySelector('.target').setAttribute('stroke-dashoffset','-40');});await page.waitForTimeout(60);assert.ok(Math.abs((await lenses())[0].x-96)<.01,'lens follows native endpoint changes');
  await page.evaluate(()=>{g.shadowRoot.querySelector('.target').setAttribute('aria-disabled','true');});await page.waitForTimeout(60);assert.equal((await lenses())[0].disabled,true);
  await page.evaluate(()=>{const target=g.shadowRoot.querySelectorAll('.target')[1];target.parentElement.remove();});await page.waitForTimeout(60);assert.equal((await lenses()).length,1,'removed native endpoint removes only its lens');
  await page.evaluate(()=>{g.style.setProperty('--dash6-satin-enabled','0');g.updated();});assert.equal((await lenses()).length,0);assert.equal(await page.evaluate(()=>g.shadowRoot.querySelector('.target').style.getPropertyValue('stroke-opacity')),'','theme-off restores native appearance');
  await page.evaluate(()=>{g.style.setProperty('--dash6-satin-enabled','1');g.updated();g.remove();});assert.equal((await lenses()).length,0,'disconnect removes overlays');assert.deepEqual(errors,[]);
  console.log('PASS '+engine.name()+'/'+(mobile?'iOS-profile':'desktop')+': shared round SliderLens, dual endpoints, native pointer hit-through, state changes, disabled endpoint, removal and cleanup; no SVG filter/scene or device commands.');
 }finally{await browser.close();}
}
