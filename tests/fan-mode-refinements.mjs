import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {fanFixture} from './fan-mode-fixture.mjs';
const fixture=await fanFixture();
try{for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(fixture.url);await page.waitForFunction(()=>window.ready);
 assert.deepEqual(await page.evaluate(()=>calls),[],'initial state never sends services');
 for(const [a,f,expected]of [['on','off','auto'],['on','on','on'],['off','off','off'],['off','on','off'],['off','unknown','off'],['off','unavailable','off'],['on','unknown',null],['unavailable','on',null]]){
  await page.evaluate(([a,f])=>stamp(a,f),[a,f]);assert.equal(await page.evaluate(()=>sw._mode),expected,a+'/'+f);
 }
 for(const [a,f,mode,expected]of [
  ['off','off','on',[['fan','turn_on','fan.example'],['input_boolean','turn_on','input_boolean.example_force']]],
  ['on','on','off',[['input_boolean','turn_off','input_boolean.example_force'],['fan','turn_off','fan.example']]],
  ['off','off','auto',[['fan','turn_on','fan.example']]],
  ['off','on','auto',[['input_boolean','turn_off','input_boolean.example_force'],['fan','turn_on','fan.example']]],
  ['on','on','auto',[['input_boolean','turn_off','input_boolean.example_force']]],
  ['on','off','on',[['input_boolean','turn_on','input_boolean.example_force']]],
  ['on','off','off',[['fan','turn_off','fan.example']]],
  ['off','on','off',[]],['on','off','auto',[]],['on','on','on',[]]
 ]){
  await page.evaluate(async([a,f,mode])=>{await stamp(a,f);calls=[];await sw.select(mode);},[a,f,mode]);assert.deepEqual(await page.evaluate(()=>calls),expected,a+'/'+f+' -> '+mode);
 }
 for(const [a,f]of [['on','unknown'],['unavailable','on'],['off','unavailable']]){
  await page.evaluate(async([a,f])=>{await stamp(a,f);calls=[];for(const mode of ['auto','on','off'])await sw.select(mode);},[a,f]);assert.deepEqual(await page.evaluate(()=>calls),[]);assert.equal(await page.evaluate(()=>[...sw.shadowRoot.querySelectorAll('button')].every(b=>b.disabled)),true);
 }
 const serial=await page.evaluate(async()=>{await stamp('off','off');calls=[];let release;const pending=new Promise(r=>release=r);sw.hass.callService=async(d,s,p)=>{calls.push([d,s,p.entity_id]);await pending;};const job=sw.select('on');await Promise.resolve();const first=[...calls],disabled=[...sw.shadowRoot.querySelectorAll('button')].every(b=>b.disabled);await sw.select('off');release();await job;return {first,disabled,all:calls,busy:sw._busy};});assert.deepEqual(serial,{first:[['fan','turn_on','fan.example']],disabled:true,all:[['fan','turn_on','fan.example'],['input_boolean','turn_on','input_boolean.example_force']],busy:false});
 const failure=await page.evaluate(async()=>{await stamp('off','off');calls=[];sw.hass.callService=async(d,s,p)=>{calls.push([d,s,p.entity_id]);throw Error('Service failed');};await sw.select('on');return {calls,error:sw.shadowRoot.querySelector('.error').textContent,busy:sw._busy,enabled:[...sw.shadowRoot.querySelectorAll('button')].every(b=>!b.disabled)};});assert.deepEqual(failure,{calls:[['fan','turn_on','fan.example']],error:'Service failed',busy:false,enabled:true});
 await page.evaluate(async()=>{await stamp('on','off');calls=[];await sw.select('on');});assert.deepEqual(await page.evaluate(()=>calls),[['input_boolean','turn_on','input_boolean.example_force']]);assert.equal(await page.evaluate(()=>sw.shadowRoot.querySelector('.error').textContent),'','successful retry clears prior error');
 assert.equal(await page.evaluate(()=>customElements.get('dash6-fan-card').getConfigElement().schema.some(s=>s.name==='force_switch_entity')),true);
 assert.deepEqual(errors,[]);console.log('PASS '+engine.name()+': fan truth table, availability, service order/serialization, duplicate guards, failure/recovery, GUI schema; all calls simulated.');
 }finally{await browser.close();}
}}finally{await fixture.close();}
