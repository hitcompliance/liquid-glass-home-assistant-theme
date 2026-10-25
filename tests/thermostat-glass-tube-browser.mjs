import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';

const output=process.env.DASH6_GAUGE_TEST_OUTPUT?pathToFileURL(process.env.DASH6_GAUGE_TEST_OUTPUT+'/'):new URL('../../output/Klima-Glas-CSS-20261021/',import.meta.url);
await mkdir(output,{recursive:true});
const background=(await readFile(new URL('../assets/liquid-glass-living-room.jpg',import.meta.url))).toString('base64');
const bundle=await build({stdin:{contents:"import './slider-lens.js';import './interaction-refinements.js';",resolveDir:process.cwd()+'/src/dash6'},bundle:true,write:false,format:'iife',logLevel:'silent'});
const html=`<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
 body{margin:0;min-height:100vh;background:center/cover url(data:image/jpeg;base64,${background});color:white;font-family:Arial,sans-serif;--dash6-satin-enabled:1;--dash6-satin-slider-press-scale:1.3}
 main{margin:20px auto;width:calc(100% - 24px);max-width:390px}h2{display:inline-block;font-size:18px;margin:0;padding:8px 16px;border-radius:16px 16px 0 0;border:1px solid #ffffff80;background:#ffffff24;backdrop-filter:blur(16px);color:#101418}
 .card{position:relative;box-sizing:border-box;height:265px;border:1px solid #ffffff88;border-radius:16px;background:linear-gradient(140deg,#42495088,#262a3188);backdrop-filter:blur(16px);box-shadow:inset 0 1px 0 #ffffff70,0 6px 16px #0003}
 .dial{position:relative;width:201px;height:201px;margin:0 auto}ha-control-circular-slider{display:block;position:relative;width:201px;height:201px}
 .readings{position:absolute;inset:0;pointer-events:none;text-align:center}.state{margin-top:56px;color:#ff812c;font-size:15px}.temps{margin-top:12px;font-size:43px;font-weight:300;white-space:nowrap}.temps small{font-size:19px}.temps sup{font-size:14px;vertical-align:top;line-height:28px}.secondary{color:#d6d4d2}.current{margin-top:12px;color:#ff812c;font-size:16px}
 .features{display:flex;justify-content:space-between;align-items:center;padding:3px 12px 12px}.modes{display:flex;padding:2px;border:1px solid #ffffff40;border-radius:13px;background:#10212c66;box-shadow:inset 0 2px 7px #0006}.modes span,.preset{display:grid;place-items:center;width:42px;height:38px;font-size:23px}.modes .selected,.preset{border:1px solid #ffffff77;background:linear-gradient(145deg,#ffffff33,#ffffff09);box-shadow:inset 0 1px 1px #ffffff99,0 2px 4px #0004;border-radius:10px}.preset{box-sizing:border-box;width:44px;height:42px}
 </style><main><h2>Klima</h2><div class="card"><div class="dial"><ha-control-circular-slider></ha-control-circular-slider><div class="readings"><div class="state">Heizbetrieb</div><div class="temps">23<small>,5</small><sup>°C</sup> <span class="secondary">26<small>,2</small><sup>°C</sup></span></div><div class="current">♨ 23,2 °C</div></div></div><div class="features"><div class="modes"><span>⏻</span><span>♨</span><span>❄</span><span class="selected">☀</span></div><span class="preset">⌂</span></div></div></main>`;

const report=[];
for(const engine of [chromium,webkit])for(const mobile of [false,true]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({viewport:{width:mobile?390:480,height:370},deviceScaleFactor:2,isMobile:mobile,hasTouch:mobile});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://127.0.0.1/**',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.goto('http://127.0.0.1/dash-6/fixture');
  await page.evaluate(()=>{
   customElements.define('ha-control-circular-slider',class extends HTMLElement{
    constructor(){super();this.attachShadow({mode:'open'}).innerHTML=`<style>
     :host{display:block;width:201px;height:201px}svg{display:block;width:100%;overflow:visible;pointer-events:none}g{fill:none}path{stroke-linecap:round}.background{stroke:#aab4c3;opacity:.3;stroke-width:24}.arc{stroke-width:24}.arc-clear{stroke:#242a33}.arc-colored{opacity:.5}.low{stroke:#ff7b22}.high{stroke:#48a9ff}.target{stroke:white;stroke-width:18}.target-border{stroke:white;stroke-width:24}.inactive .arc{opacity:0}[data-interaction]{stroke:transparent;stroke-width:48;pointer-events:auto}
     </style><svg id="slider" viewBox="0 0 320 320"><g transform="translate(160 160) rotate(135)">
     <path data-interaction d="M145 0 A145 145 0 1 1 0 -145"/>
     <path class="background" d="M145 0 A145 145 0 1 1 0 -145"/>
     <g><path class="arc arc-clear" stroke-dasharray="437 911" d="M145 0 A145 145 0 1 1 0 -145"/><path class="arc arc-colored low" stroke-dasharray="437 911" d="M145 0 A145 145 0 1 1 0 -145"/><path class="arc arc-active low" role="slider" tabindex="0" aria-label="Heizgrenze" aria-valuenow="23.5" aria-disabled="false" stroke-dasharray="12 911" stroke-dashoffset="-425" d="M145 0 A145 145 0 1 1 0 -145"/><path class="target-border low" stroke-dasharray="0 911" stroke-dashoffset="-437" d="M145 0 A145 145 0 1 1 0 -145"/><path class="target" stroke-dasharray="0 911" stroke-dashoffset="-437" d="M145 0 A145 145 0 1 1 0 -145"/></g>
     <g><path class="arc arc-clear" stroke-dasharray="145 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/><path class="arc arc-colored high" stroke-dasharray="145 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/><path class="arc arc-active high" role="slider" tabindex="0" aria-label="Kühlgrenze" aria-valuenow="26.2" aria-disabled="false" stroke-dasharray="0 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/><path class="target-border high" stroke-dasharray="0 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/><path class="target" stroke-dasharray="0 911" stroke-dashoffset="-539" d="M145 0 A145 145 0 1 1 0 -145"/></g></g></svg>`;}
    updated(){} disconnectedCallback(){}
   });
  });
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{window.g=document.querySelector('ha-control-circular-slider');g.setAttribute('data-dash6-satin-climate','');g.updated();window.nativeDowns=0;window.nativeKeys=0;g.shadowRoot.querySelector('[data-interaction]').addEventListener('pointerdown',()=>nativeDowns++);g.shadowRoot.querySelector('[role=slider]').addEventListener('keydown',()=>nativeKeys++);});
  const material=()=>page.evaluate(()=>({lenses:g.shadowRoot.querySelectorAll('dash6-slider-lens[glass-tube]').length,tint:getComputedStyle(g.shadowRoot.querySelector('.arc-colored')).opacity,clear:getComputedStyle(g.shadowRoot.querySelector('.arc-clear')).opacity,filters:g.shadowRoot.querySelectorAll('svg filter,svg use,svg defs').length,scene:getComputedStyle(g.shadowRoot.querySelector('dash6-slider-lens').shadowRoot.querySelector('.scene')).opacity}));
  assert.deepEqual(await material(),{lenses:2,tint:'0',clear:'0',filters:0,scene:'0.38'});
  assert.deepEqual(await page.evaluate(()=>{
   const r=g.shadowRoot;
   return {body:getComputedStyle(r.querySelector('[data-dash6-circular-body]')).opacity,
    halo:getComputedStyle(r.querySelector('[data-dash6-circular-halo]')).filter,
    core:getComputedStyle(r.querySelector('[data-dash6-circular-core]')).filter,
    copies:r.querySelectorAll('[data-dash6-circular-active]').length,
    pointer:getComputedStyle(r.querySelector('[data-dash6-circular-halo]')).pointerEvents};
  }),{body:'0.5',halo:'blur(5px)',core:'blur(0.7px)',copies:3,pointer:'none'});
  const tint=()=>page.evaluate(()=>g.shadowRoot.querySelector('[data-dash6-circular-tint]')?.closest('[data-dash6-circular-lenses]').style.getPropertyValue('--dash6-circular-tint'));
  assert.ok((await tint()).includes('rgb(255, 123, 34)')&&(await tint()).includes('rgb(72, 169, 255)'),'glass tint follows both native arc colors');
  const oldTint=await tint();
  await page.evaluate(()=>g.shadowRoot.querySelector('.arc-colored.low').setAttribute('stroke-dashoffset','--0.5'));await page.waitForTimeout(50);
  assert.ok((await tint()).includes('rgb(255, 123, 34)'),'native invalid start offset uses its rendered zero fallback');
  await page.evaluate(()=>g.shadowRoot.querySelector('.arc-colored.low').setAttribute('stroke-dasharray','420 911'));await page.waitForTimeout(50);
  assert.notEqual(await tint(),oldTint,'native arc range updates the glass color boundary');
  await page.evaluate(()=>g.shadowRoot.querySelector('.arc-colored.low').setAttribute('stroke-dasharray','437 911'));await page.waitForTimeout(50);
  const label=engine.name()+'-'+(mobile?'touch':'desktop');
  await page.screenshot({path:fileURLToPath(new URL('CSS-'+label+'.png',output))});
  const activeTint=()=>page.evaluate(()=>g.shadowRoot.querySelector('[data-dash6-circular-active]')?.closest('[data-dash6-circular-lenses]').style.getPropertyValue('--dash6-circular-active'));
  assert.ok((await activeTint()).includes('rgb(255, 123, 34)'));
  assert.ok((await activeTint()).includes('#f32b1c'),'only the heating interval shifts toward red');
  const warmTint=()=>page.evaluate(()=>g.shadowRoot.querySelector('[data-dash6-circular-warm]')?.closest('[data-dash6-circular-lenses]').style.getPropertyValue('--dash6-circular-warm'));
  assert.ok((await warmTint()).includes('rgb(255, 123, 34)')&&!(await warmTint()).includes('rgb(72, 169, 255)'),'full-strength orange does not change cooling');
  assert.notEqual(await page.evaluate(()=>getComputedStyle(g.shadowRoot.querySelector('[data-dash6-circular-active]')).backgroundImage),'none','browser renders the red mixed gradient');
  assert.ok(!(await activeTint()).includes('rgb(72, 169, 255)'),'zero cooling interval is not emphasized');
  const smallActive=await activeTint();
  await page.evaluate(()=>{const a=g.shadowRoot.querySelector('.arc-active.low');a.setAttribute('stroke-dasharray','80 911');a.setAttribute('stroke-dashoffset','-357');});await page.waitForTimeout(50);
  assert.notEqual(await activeTint(),smallActive,'stronger interval follows changing actual-to-target geometry');
  await page.screenshot({path:fileURLToPath(new URL('Heating-'+label+'.png',output))});
  await page.evaluate(()=>{g.shadowRoot.querySelector('.arc-active.low').setAttribute('stroke-dasharray','0 911');g.shadowRoot.querySelector('.arc-active.high').setAttribute('stroke-dasharray','80 911');});await page.waitForTimeout(50);
  assert.ok(!(await activeTint()).includes('rgb(255, 123, 34)'),'finished heating leaves no stale emphasis');
  assert.ok((await activeTint()).includes('rgb(72, 169, 255)'),'cooling gets the same native interval emphasis');
  assert.ok(!(await activeTint()).includes('#f32b1c'),'cooling has no red mix');
  await page.screenshot({path:fileURLToPath(new URL('Cooling-'+label+'.png',output))});
  await page.evaluate(()=>{const a=g.shadowRoot.querySelector('.arc-active.low');a.setAttribute('stroke-dasharray','12 911');a.setAttribute('stroke-dashoffset','-425');g.shadowRoot.querySelector('.arc-active.high').setAttribute('stroke-dasharray','0 911');});await page.waitForTimeout(50);
  const point=await page.evaluate(()=>{const lens=g.shadowRoot.querySelector('dash6-slider-lens');const r=lens.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  if(mobile)await page.touchscreen.tap(point.x,point.y);
  else{await page.mouse.move(point.x,point.y);await page.mouse.down();await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>g.shadowRoot.querySelector('dash6-slider-lens').hasAttribute('touching')),true);await page.mouse.up();}
  assert.equal(await page.evaluate(()=>nativeDowns),1,'glass leaves native pointer/touch targets reachable');
  await page.evaluate(()=>g.shadowRoot.querySelector('[role=slider]').focus());
  await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>nativeKeys),1,'native keyboard target still receives arrows');
  const before=await page.evaluate(()=>g.shadowRoot.querySelector('dash6-slider-lens').style.getPropertyValue('--lens-x'));
  await page.evaluate(()=>g.shadowRoot.querySelector('.target').setAttribute('stroke-dashoffset','-400'));await page.waitForTimeout(50);
  assert.notEqual(await page.evaluate(()=>g.shadowRoot.querySelector('dash6-slider-lens').style.getPropertyValue('--lens-x')),before,'lens follows native endpoint movement');
  await page.evaluate(()=>g.shadowRoot.querySelector('[role=slider]').setAttribute('aria-readonly','true'));await page.waitForTimeout(50);
  assert.equal(await page.evaluate(()=>g.shadowRoot.querySelector('dash6-slider-lens').hasAttribute('disabled')),true);
  await page.evaluate(()=>{g.style.setProperty('--dash6-satin-enabled','0');g.updated();});
  assert.equal(await page.evaluate(()=>g.shadowRoot.querySelectorAll('[data-dash6-circular-lenses]').length),0);
  assert.equal(await page.evaluate(()=>getComputedStyle(g.shadowRoot.querySelector('.arc-colored')).opacity),'0.5','theme off restores native material');
  await page.evaluate(()=>{g.style.setProperty('--dash6-satin-enabled','1');history.replaceState(null,'','/dashboard-dash7/fixture');g.updated();});
  assert.equal((await material()).lenses,0,'new glass is confined to DASH6');assert.equal((await material()).tint,'0.5');
  await page.evaluate(()=>{history.replaceState(null,'','/dash-6/fixture');g.updated();});assert.equal((await material()).lenses,2);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>{const l=g.shadowRoot.querySelectorAll('dash6-slider-lens')[1];l.setAttribute('touching','');});
  assert.equal(await page.evaluate(()=>getComputedStyle(g.shadowRoot.querySelectorAll('dash6-slider-lens')[1].shadowRoot.querySelector('.glass')).scale),'1');
  await page.evaluate(()=>g.shadowRoot.querySelector('.arc-colored.high').parentElement.remove());await page.waitForTimeout(50);
  assert.equal((await material()).lenses,1,'single-temperature gauge retains exactly one lens');
  assert.ok(!(await tint()).includes('rgb(72, 169, 255)'),'removed cooling arc leaves no stale blue tint');
  await page.evaluate(()=>g.shadowRoot.querySelector('.arc-colored.low').parentElement.classList.add('inactive'));await page.waitForTimeout(50);
  assert.ok(!(await tint()).includes('rgb(255, 123, 34)'),'inactive native arc leaves no active heating tint');
  assert.ok(!(await activeTint()).includes('rgb(255, 123, 34)'),'inactive native arc also removes interval emphasis');
  assert.ok(!(await warmTint()).includes('rgb(255, 123, 34)'),'inactive heating removes the stronger body color');
  assert.ok(await page.evaluate(()=>Array.from(g.shadowRoot.querySelectorAll('[data-dash6-circular-active],[data-dash6-circular-warm]')).every(n=>!getComputedStyle(n).backgroundImage.includes('255, 123, 34'))),'inactive ranges leave no stale light in body, core or halo');
  await page.evaluate(()=>g.remove());assert.deepEqual(errors,[]);
  report.push({engine:engine.name(),mobile,passed:true});console.log('PASS '+label+': clear glass, native pointer/touch and keyboard, moving endpoints, readonly, theme cleanup, dashboard isolation and reduced motion.');
 }finally{await browser.close();}
}
await writeFile(new URL('browser-results.json',output),JSON.stringify(report,null,2)+'\n');
