import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {fanFixture} from './fan-mode-fixture.mjs';
const fixture=await fanFixture();
try{for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(fixture.url);await page.waitForFunction(()=>window.ready);
 const status=await page.evaluate(()=>{
  const c={entity:'fan.example',force_switch_entity:'switch.force',running_switch_entity:'switch.a',running_force_switch_entity:'switch.b',remaining_time_entity:'number.rest',fan:true};
  const el=document.createElement('dash6-presence-feedback');el.setConfig(c);document.body.append(el);
  const read=(a,b,rest='1',force='off')=>{el.hass={states:{'fan.example':{state:'on'},'switch.force':{state:force},'switch.a':{state:a},'switch.b':{state:b},'number.rest':{state:rest}}};return el.shadowRoot.querySelector('.text').textContent;};
  const out=[read('off','off'),read('on','off'),read('off','on'),read('unknown','on'),read('on','unavailable'),read('on','on'),read('on','on','1.2','on')];el.remove();return out;
 });
 assert.deepEqual(status,['Auto','Auto','Auto','Auto','Auto','Auto\nAktiv (noch 1 Minute)','Ein\nAktiv (noch 2 Minuten)']);
 const view=()=>page.evaluate(()=>({phase:sw.dataset.phase||null,buttons:[...sw.shadowRoot.querySelectorAll('button')].map(b=>({mode:b.dataset.mode,slot:Number(b.style.getPropertyValue('--slot')),opacity:Number(getComputedStyle(b.firstChild).opacity),x:b.getBoundingClientRect().x,y:b.getBoundingClientRect().y,shadow:getComputedStyle(b.firstChild).boxShadow,transform:getComputedStyle(b.firstChild).transform,returning:b.hasAttribute('data-returning')})),lens:getComputedStyle(sw.shadowRoot.querySelector('.lens')).opacity}));
 for(const [from,to]of [['auto','on'],['on','off'],['off','auto'],['auto','off'],['off','on'],['on','auto']]){
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(from=>{sw.clearPending();sw.hass=state(from==='off'?'off':'on',from==='on'?'on':'off');},from);await page.emulateMedia({reducedMotion:'no-preference'});
  const before=await view(),third=before.buttons.find(b=>![from,to].includes(b.mode)),targetSlot=before.buttons.find(b=>b.mode===to).slot;
  await page.evaluate(to=>{sw.hass=state(to==='off'?'off':'on',to==='on'?'on':'off');},to);
  await page.waitForTimeout(250);let v=await view();assert.equal(v.phase,'raise');assert.equal(v.buttons.find(b=>b.mode===from).slot,0);assert.equal(v.buttons.find(b=>b.mode===to).slot,targetSlot);assert.match(v.buttons.find(b=>b.mode===from).shadow,/inset/);assert.equal(v.lens,'0');assert.notEqual(v.buttons.find(b=>b.mode===from).transform,'none');assert.notEqual(v.buttons.find(b=>b.mode===to).transform,'none');
  await page.waitForTimeout(1470);v=await view();assert.equal(v.phase,'collect');const old=v.buttons.find(b=>b.mode===from);assert.equal(old.slot,targetSlot);assert.equal(old.returning,true);assert.equal(old.shadow,'none');assert.equal(v.buttons.find(b=>b.mode===third.mode).slot,third.slot);const stationary=v.buttons.map(b=>[b.x,b.y]);await page.waitForTimeout(180);assert.deepEqual((await view()).buttons.map(b=>[b.x,b.y]),stationary,'only lens moves during collection');
  await page.waitForTimeout(500);v=await view();assert.equal(v.phase,'lift');await page.waitForTimeout(450);v=await view();assert.equal(v.phase,'carry');await page.waitForTimeout(650);v=await view();assert.equal(v.phase,'settle');await page.waitForTimeout(600);v=await view();assert.equal(v.phase,null);assert.equal(v.buttons.find(b=>b.mode===to).slot,0);assert.equal(v.buttons.find(b=>b.mode===from).slot,targetSlot);assert.equal(v.buttons.find(b=>b.mode===third.mode).slot,third.slot);
 }
 await page.evaluate(()=>{sw.hass=state('on','on')});await page.waitForTimeout(100);await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>!sw.dataset.phase);assert.equal((await view()).phase,null);assert.equal(await page.evaluate(()=>sw._journeyAnimations.length),0);
 assert.deepEqual(await page.evaluate(()=>calls),[]);assert.deepEqual(errors,[]);console.log('PASS '+engine.name()+': physical output status gating, singular/plural, six depth/carry directions, third-slot stability, cancellation; no device commands.');
 }finally{await browser.close();}
}}finally{await fixture.close();}
