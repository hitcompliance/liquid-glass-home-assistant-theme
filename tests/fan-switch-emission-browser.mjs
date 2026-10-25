import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {fanFixture} from './fan-mode-fixture.mjs';
const fixture=await fanFixture();
try{for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(fixture.url);await page.waitForFunction(()=>window.ready);
  const results=await page.evaluate(async()=>{
   sw.setConfig({...config,running_switch_entity:'switch.physical'});
   const read=()=>{const b=sw.shadowRoot.querySelector('button[aria-checked=true]'),g=b?.querySelector('.ghost'),rotor=g?.querySelector('.fan-rotor'),label=g?.querySelector('.mode-label');return {mode:sw._mode,emission:sw.dataset.emission||null,rotors:[...sw.shadowRoot.querySelectorAll('.fan-rotor')].filter(e=>getComputedStyle(e).display!=='none').length,color:getComputedStyle(sw).getPropertyValue('--fan-emission-color').trim(),rotorLayer:rotor?getComputedStyle(rotor).zIndex:null,labelLayer:label?getComputedStyle(label).zIndex:null,label:label?.textContent,animation:rotor?getComputedStyle(rotor).animationName:null,duration:rotor?getComputedStyle(rotor).animationDuration:null,width:g?.getBoundingClientRect().width};};window.emissionRead=read;
   const rows=[];for(const [main,power,force]of [['off','off','off'],['on','on','off'],['on','on','on'],['on','off','on'],['on','unknown','on'],['on','on','unknown']]){const h=state(main,force);h.states['switch.physical']={state:power,attributes:{}};sw.hass=h;await paint();rows.push({main,power,force,...read()});}
   const h=state('on','on');h.states['switch.physical']={state:'on',attributes:{}};sw.hass=h;await paint();sw._pendingMode={from:'auto',target:'on'};sw._busy=true;sw.hass=h;await paint();const confirmedAuto=read();sw._busy=false;sw.clearPending();sw.sync();await paint();return {rows,confirmedAuto,calls};
  });
  assert.equal(results.rows[0].emission,'off');assert.equal(results.rows[0].color,'#fff');assert.equal(results.rows[0].rotors,0);
  assert.equal(results.rows[1].emission,null);assert.equal(results.rows[1].rotors,0);
  assert.equal(results.rows[2].emission,'on');assert.equal(results.rows[2].color,'#ff7900');assert.equal(results.rows[2].rotors,1);assert.equal(results.rows[2].animation,'fan-button-rotation');assert.equal(results.rows[2].duration,'12s');assert.equal(results.rows[2].rotorLayer,'1');assert.equal(results.rows[2].labelLayer,'2');assert.equal(results.rows[2].width,31.5);
  for(const row of results.rows.slice(3)){assert.equal(row.emission,null);assert.equal(row.rotors,0);}
  assert.equal(results.confirmedAuto.mode,'auto');assert.equal(results.confirmedAuto.emission,'auto');assert.equal(results.confirmedAuto.color,'#ffd000');assert.equal(results.confirmedAuto.label,'Auto');assert.equal(results.confirmedAuto.rotors,1);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>emissionRead().animation),'none');
  const def=await page.evaluate(()=>fanModule.fanDefinition({...config,running_switch_entity:'switch.physical'}));assert.equal(def.custom_fields.rotor,undefined);assert.equal(def.custom_fields.device.card.running_switch_entity,'switch.physical');assert.deepEqual(results.calls,[]);assert.deepEqual(errors,[]);
  console.log('PASS '+engine.name()+': rotor inside active circle behind label; physical pair gating, moderate white/strong orange/yellow, missing states, unchanged geometry, reduced motion; zero services.');
 }finally{await browser.close();}
}}finally{await fixture.close();}
