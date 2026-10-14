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
  ['off','on','off',[['input_boolean','turn_off','input_boolean.example_force']]],['off','off','off',[]],['on','off','auto',[]],['on','on','on',[]]
 ]){
  await page.evaluate(async([a,f,mode])=>{await stamp(a,f);calls=[];await sw.select(mode);},[a,f,mode]);assert.deepEqual(await page.evaluate(()=>calls),expected,a+'/'+f+' -> '+mode);
 }
 for(const [a,f]of [['on','unknown'],['unavailable','on'],['off','unavailable']]){
  await page.evaluate(async([a,f])=>{await stamp(a,f);calls=[];for(const mode of ['auto','on','off'])await sw.select(mode);},[a,f]);assert.deepEqual(await page.evaluate(()=>calls),[]);assert.equal(await page.evaluate(()=>[...sw.shadowRoot.querySelectorAll('button')].every(b=>b.disabled)),true);
 }
 const serial=await page.evaluate(async()=>{await stamp('off','off');calls=[];let release;const pending=new Promise(r=>release=r);sw.hass.callService=async(d,s,p)=>{calls.push([d,s,p.entity_id]);await pending;};const job=sw.select('on');await Promise.resolve();const first=[...calls],disabled=[...sw.shadowRoot.querySelectorAll('button')].every(b=>b.disabled);await sw.select('off');release();await job;return {first,disabled,all:calls,busy:sw._busy};});assert.deepEqual(serial,{first:[['fan','turn_on','fan.example']],disabled:true,all:[['fan','turn_on','fan.example'],['input_boolean','turn_on','input_boolean.example_force']],busy:false});
 const failure=await page.evaluate(async()=>{await stamp('off','off');calls=[];sw.hass.callService=async(d,s,p)=>{calls.push([d,s,p.entity_id]);throw Error('Service failed');};await sw.select('on');return {calls,error:sw.shadowRoot.querySelector('.error').textContent,busy:sw._busy,enabled:[...sw.shadowRoot.querySelectorAll('button')].every(b=>!b.disabled)};});assert.deepEqual(failure,{calls:[['fan','turn_on','fan.example']],error:'Service failed',busy:false,enabled:true});
 await page.evaluate(async()=>{await stamp('on','off');calls=[];await sw.select('on');});assert.deepEqual(await page.evaluate(()=>calls),[['input_boolean','turn_on','input_boolean.example_force']]);assert.equal(await page.evaluate(()=>sw.shadowRoot.querySelector('.error').textContent),'','successful retry clears prior error');
 // Both multi-service directions stream partial HA updates. The source pair
 // changes, but the displayed mode stays put until the final acknowledgement.
 for(const [main,force,target,endMain,endForce]of [['off','off','on','on','on'],['on','on','off','off','off']]){
  const streamed=await page.evaluate(async([main,force,target])=>{
   await stamp(main,force);calls=[];const h=sw.hass,from=sw._mode;let release;
   const gate=new Promise(resolve=>release=resolve);let first;
   h.callService=async(d,s,p)=>{calls.push([d,s,p.entity_id]);h.states[p.entity_id]={...h.states[p.entity_id],state:s==='turn_on'?'on':'off'};sw.hass={...h};await paint();if(calls.length===1){first={mode:sw._mode,visual:sw.dataset.mode,busy:sw._busy};await gate;}};
   const job=sw.select(target);await sleep(100);const held={first,calls:calls.length,from};await sw.select('auto');held.competingCalls=calls.length;release();await job;await paint();return {...held,mode:sw._mode,states:[sw.hass.states['fan.example'].state,sw.hass.states['input_boolean.example_force'].state],total:calls.length};
  },[main,force,target]);
  assert.deepEqual(streamed.first,{mode:streamed.from,visual:streamed.from,busy:true},'partial streamed feedback preserves previous confirmed mode');assert.equal(streamed.calls,1);assert.equal(streamed.competingCalls,1,'busy streaming blocks competing selections');assert.equal(streamed.mode,target);assert.deepEqual(streamed.states,[endMain,endForce]);assert.equal(streamed.total,2);
 }
 for(const confirmed of [true,false]){
  await page.evaluate(async()=>{await stamp('off','off');calls=[];const h=sw.hass;window.publishFinal=()=>{h.states['input_boolean.example_force']={state:'on',attributes:{}};sw.hass={...h};};h.callService=async(d,s,p)=>{calls.push([d,s,p.entity_id]);if(p.entity_id==='fan.example'){h.states[p.entity_id]={state:'on',attributes:{}};sw.hass={...h};await paint();}};await sw.select('on');});
  const waiting=await page.evaluate(async()=>{await sw.select('auto');return {mode:sw._mode,visual:sw.dataset.mode,disabled:[...sw.shadowRoot.querySelectorAll('button')].every(b=>b.disabled),busy:sw.shadowRoot.querySelector('.rail').getAttribute('aria-busy'),calls:calls.length};});assert.deepEqual(waiting,{mode:'off',visual:'off',disabled:true,busy:'true',calls:2},'resolved service promises do not replace final HA acknowledgement');
  if(confirmed)await page.evaluate(()=>publishFinal());else await page.waitForTimeout(1600);
  const settled=await page.evaluate(()=>({mode:sw._mode,visual:sw.dataset.mode,enabled:[...sw.shadowRoot.querySelectorAll('button')].every(b=>!b.disabled),busy:sw.shadowRoot.querySelector('.rail').getAttribute('aria-busy'),calls:calls.length}));assert.equal(settled.mode,confirmed?'on':'auto');assert.equal(settled.visual,settled.mode);assert.equal(settled.enabled,true);assert.notEqual(settled.busy,'true');assert.equal(settled.calls,2,'confirmation or bounded timeout never retries services');
 }
 const partialFailure=await page.evaluate(async()=>{await stamp('off','off');calls=[];const h=sw.hass;h.callService=async(d,s,p)=>{calls.push([d,s,p.entity_id]);if(calls.length===2)throw Error('Force failed after main acknowledgement');h.states[p.entity_id]={...h.states[p.entity_id],state:'on'};sw.hass={...h};await paint();};await sw.select('on');return {mode:sw._mode,visual:sw.dataset.mode,error:sw.shadowRoot.querySelector('.error').textContent,busy:sw._busy,pending:!!sw._pendingMode,states:[sw.hass.states['fan.example'].state,sw.hass.states['input_boolean.example_force'].state],calls:calls.length};});assert.deepEqual(partialFailure,{mode:'auto',visual:'auto',error:'Force failed after main acknowledgement',busy:false,pending:false,states:['on','off'],calls:2},'partial failure reveals the actual pair and clears feedback wait');
 assert.equal(await page.evaluate(()=>customElements.get('dash6-fan-card').getConfigElement().schema.some(s=>s.name==='force_switch_entity')),true);
 const timerConfig=await page.evaluate(async()=>{let definition;window.__dash6Cards={create:async d=>{definition=d;return document.createElement('div');}};const card=document.createElement('dash6-fan-card');await card.setConfig({...config,timer_entity:'timer.example'});return {schema:customElements.get('dash6-fan-card').getConfigElement().schema.find(s=>s.name==='timer_entity'),entity:definition.custom_fields.device.card.timer_entity,triggers:definition.triggers_update};});assert.equal(timerConfig.entity,'timer.example');assert.ok(timerConfig.triggers.includes('timer.example'),'timer state changes retrigger the parent card');assert.deepEqual([].concat(timerConfig.schema.selector.entity.domain),['timer'],'timer field uses native timer selector');
 assert.deepEqual(errors,[]);console.log('PASS '+engine.name()+': fan truth table, availability, service order/serialization, duplicate guards, failure/recovery, GUI schema; all calls simulated.');
 }finally{await browser.close();}
}}finally{await fixture.close();}
