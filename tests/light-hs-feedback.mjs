import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const b=await build({stdin:{contents:"import './src/dash6/segmented-control.js';export * from './src/dash6/light-cards.js';import './src/dash6/light-button-group-refinements.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'L',loader:{'.css':'text'},logLevel:'silent'});
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});
 try{
  const p=await browser.newPage();await p.goto('about:blank');await p.addScriptTag({content:b.outputFiles[0].text});
  const r=await p.evaluate(async()=>{
   let now=1000;Date.now=()=>now;
   const attrs={supported_color_modes:['color_temp','hs'],min_color_temp_kelvin:2127,max_color_temp_kelvin:6535,color_mode:'hs',color_temp_kelvin:null,brightness:216,hs_color:[29,80],rgb_color:[255,150,51]};
   const state=(a={})=>({entity_id:'light.test',state:'on',attributes:{...attrs,...a}}),sample=state(),original=JSON.stringify(sample),estimate=L.inferredKelvin(sample);
   const feedback=new L.CardTemperatureFeedback({now:()=>now});feedback.remember('light.test',{color_temp_kelvin:3200});
   const hold=feedback.get('light.test',state({brightness:17})).attributes;now=30999;const before=feedback.get('light.test',sample).attributes.color_temp_kelvin;now=31000;const after=feedback.get('light.test',sample).attributes.color_temp_kelvin;
   const lastCommands=[{brightness_pct:20},{hs_color:[29,80]},{effect:'Rainbow'},{}].map(data=>{feedback.remember('light.test',{color_temp_kelvin:3200});feedback.remember('light.test',data);return feedback.get('light.test',sample).attributes.color_temp_kelvin;});
   feedback.remember('light.test',{color_temp_kelvin:3200});const red=feedback.get('light.test',state({rgb_color:[255,0,0]})).attributes.color_mode;
   const store=new L.OptimisticStore({now:()=>now}),patch=L.commandPatch(sample,{color_temp_kelvin:3200,brightness:255});store.remember('light.test',patch,sample);store.put('light.test',patch);store.reconcile('light.test',state({brightness:42}));const reconciled=store.get('light.test',state({brightness:42})).attributes;
   let calls=[];const hass=s=>({states:{'light.test':s},entities:{},callService:async(...args)=>calls.push(args)});
   const cards=Object.values(L.TYPES).map(type=>{const c=document.createElement(type);c.setConfig({entity:'light.test',main_back:{enabled:false},discovery:{enabled:false},graph:{show:false}});c.hass=hass(sample);document.body.append(c);return c;});
   const read=c=>({mode:c._mode,kelvin:Number(c.shadowRoot.querySelector('input[aria-label="Farbtemperatur"]')?.value),brightness:c.stateFor('light.test').attributes.brightness});
   const initial=cards.map(read);await cards[0].send({color_temp_kelvin:3200});const immediate=cards.map(read);for(const c of cards)c.hass=hass(state({brightness:77}));const separate=cards.map(read);
   now+=30000;for(const c of cards)c.render();const expired=cards.map(read);
   await cards[0].send({color_temp_kelvin:3500});cards[0].hass=hass(sample);await cards[0].send({brightness_pct:20});cards[0].hass=hass(state({brightness:51}));const brightnessLast=read(cards[0]);
   cards[0]._mode='color';cards[0].render();await cards[0].send({hs_color:[29,80]});cards[0].hass=hass(sample);const whiteColorLast=read(cards[0]);cards[0]._mode='color';cards[0].render();cards[0].hass=hass(state({brightness:23}));const whiteReportMode=read(cards[0]);await cards[0].send({color_temp_kelvin:3200});now+=30000;cards[0].render();const idleExpired=read(cards[0]);const autoCalls=calls.length;for(let i=0;i<4;i++)for(const c of cards)c.hass=hass(sample);const afterAutoCalls=calls.length;for(const c of cards)c.remove();
   return {estimate,unchanged:original===JSON.stringify(sample),hold,before,after,lastCommands,red,reconciled,initial,immediate,separate,expired,idleExpired,brightnessLast,whiteColorLast,whiteReportMode,autoCalls,afterAutoCalls,roundTrips:[2127,2300,3000,4500,6535].map(k=>[k,L.inferredKelvin(state({rgb_color:L.kelvinRGB(k)}))]),rejected:[[255,0,0],[0,255,0],[0,0,255],[255,0,255],[0,0,0],[255,150,NaN]].map(rgb_color=>L.inferredKelvin(state({rgb_color,hs_color:null}))),dimmed:L.inferredKelvin(state({rgb_color:[128,75,26]})),outOfRange:L.inferredKelvin(state({rgb_color:L.kelvinRGB(1800)})),calls};
  });
  assert.ok(r.estimate>=2250&&r.estimate<=2400,JSON.stringify(r));assert.equal(r.unchanged,true);assert.equal(r.hold.color_temp_kelvin,3200);assert.equal(r.hold.brightness,17);assert.equal(r.before,3200);assert.equal(r.after,r.estimate);for(const k of r.lastCommands)assert.equal(k,r.estimate);assert.equal(r.red,'hs');assert.equal(r.reconciled.brightness,42);assert.equal(r.reconciled.color_mode,'hs');
  for(const c of r.initial)assert.equal(c.mode,'color_temp');assert.equal(r.separate[0].kelvin,3200);assert.equal(r.separate[1].kelvin,r.estimate);for(const c of r.separate)assert.equal(c.brightness,77);for(const c of r.expired)assert.equal(c.kelvin,r.estimate);assert.equal(r.brightnessLast.kelvin,r.estimate);assert.equal(r.autoCalls,r.afterAutoCalls);assert.equal(r.autoCalls,5);assert.equal(r.immediate[0].kelvin,3200);assert.equal(r.immediate[1].kelvin,r.estimate);assert.equal(r.idleExpired.kelvin,r.estimate);assert.equal(r.whiteColorLast.mode,'color_temp');assert.equal(r.whiteReportMode.mode,'color_temp');for(const [k,v]of r.roundTrips)assert.ok(Math.abs(k-v)<=30,JSON.stringify(r.roundTrips));for(const v of r.rejected)assert.equal(v,null);assert.ok(Math.abs(r.dimmed-r.estimate)<=30);assert.equal(r.outOfRange,null);
  console.log('PASS',name,JSON.stringify({estimate:r.estimate,separate:r.separate,expired:r.expired,calls:r.afterAutoCalls,roundTrips:r.roundTrips}));
 }finally{await browser.close();}
}
