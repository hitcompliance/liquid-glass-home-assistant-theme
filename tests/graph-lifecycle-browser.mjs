import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const staged=process.env.DASH6_GRAPH_STAGE;
const bundle=await build({stdin:{contents:`import './src/dash6/segmented-control.js';export * from './src/dash6/light-cards.js';export * from './src/dash6/graph-settings.js';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'Graphs',loader:{'.css':'text'}});
for(const [name,engine]of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}});
 if(staged){
  await page.route('http://graph.test/**',route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/local/dash6-satin/')){const name=url.pathname.slice('/local/dash6-satin/'.length),local=path.join(staged,name),live=path.join('/Volumes/config/www/dash6-satin',name),file=existsSync(local)?local:live;if(existsSync(file))return route.fulfill({path:file,contentType:file.endsWith('.js')?'application/javascript':'application/json'});}return route.fulfill({contentType:'text/html',body:'<!doctype html><body>'});});
  await page.goto('http://graph.test/dash-6/wohnzimmer');await page.addScriptTag({content:readFileSync('/Volumes/config/www/community/apexcharts-card/apexcharts-card.js','utf8')});await page.addScriptTag({url:'http://graph.test/local/dash6-satin/dash6-cards.js',type:'module'});await page.waitForFunction(()=>customElements.get('dash6-govee-light-card-v2')&&customElements.get('dash6-apexcharts-card'));await page.evaluate(()=>window.Graphs={TYPES:{light:'dash6-govee-light-card-v2'}});
 }else{await page.goto('about:blank');await page.addScriptTag({content:bundle.outputFiles[0].text});}
 const result=await page.evaluate(async()=>{
  window.counts={created:0,connected:0,disconnected:0};
  customElements.define('test-history-chart',class extends HTMLElement{connectedCallback(){counts.connected++;}disconnectedCallback(){counts.disconnected++;}});
  window.loadCardHelpers=async()=>({createCardElement(){}});window.__dash6Cards={create:async config=>{counts.created++;const chart=document.createElement('test-history-chart');chart.config=config;return chart;}};
  const config={entity:'light.ceiling',power_entity:'sensor.power',energy_entity:'sensor.energy',main_back:{enabled:false},rows:{controls:true,scenes:false},discovery:{enabled:false}};
  const light={entity_id:'light.ceiling',state:'on',attributes:{friendly_name:'Deckenlicht',supported_color_modes:['brightness'],color_mode:'brightness',brightness:80}};
  const hass={states:{'light.ceiling':light,'sensor.power':{state:'8',attributes:{unit_of_measurement:'W'}},'sensor.energy':{state:'1',attributes:{unit_of_measurement:'kWh'}}},entities:{},callService(){throw Error('No device commands');}};
  const card=document.createElement(Graphs.TYPES.light);card.setConfig(config);card.hass=hass;document.body.append(card);await new Promise(r=>setTimeout(r,80));
  const chart=card._graphCard,frame=card.shadowRoot.querySelector('ha-card.card'),layer=chart.parentNode;
  for(let i=0;i<30;i++){card.hass={...hass,states:{...hass.states,'sensor.power':{state:String(i),attributes:{unit_of_measurement:'W'}}}};await Promise.resolve();}
  const stable={...counts,sameChart:chart===card._graphCard,sameFrame:frame===card.shadowRoot.querySelector('ha-card.card'),sameParent:layer===chart.parentNode,connected:chart.isConnected,metric:card.shadowRoot.querySelector('.metrics').textContent,height:frame.getBoundingClientRect().height,layers:frame.querySelectorAll('.power-graph').length};
  let global;
  if(Graphs.configuredGraph)global=Graphs.configuredGraph({update_interval:'1s',series:[{entity:'sensor.power',type:'line'}]},Graphs.resolveGraphSettings({},'background',{getPropertyValue:()=>''}),hass).update_interval;
  else{const native=document.createElement('dash6-apexcharts-card');native._initialLoad=()=>{};native.setConfig({type:'custom:apexcharts-card',update_interval:'1s',series:[{entity:'sensor.power',type:'line'}]});native.hass=hass;global=native._config.update_interval;}
  card.setConfig({...config,graph:{show:false}});await Promise.resolve();const disabled={layers:card.shadowRoot.querySelectorAll('.power-graph').length,disconnected:counts.disconnected};
  card.setConfig(config);await new Promise(r=>setTimeout(r,40));const reenabled={...counts};card.remove();
  let cadence;
  if(!Graphs.configuredGraph){
   const Chart=customElements.get('dash6-apexcharts-card'),base=Object.getPrototypeOf(Chart.prototype),original=base._updateData,realNow=Date.now;let calls=0,now=realNow();
   const probe=document.createElement('dash6-apexcharts-card');probe._initialLoad=()=>{};probe.setConfig({type:'custom:apexcharts-card',series:[{entity:'sensor.power',type:'line'}]});probe.hass=hass;document.body.append(probe);await probe.updateComplete;
   probe._dash6ChartReady=true;probe._dash6Timed=true;probe._apexChart={};probe._graphs=[];probe._lastDataFetch=0;
   try{base._updateData=async()=>{calls++;};Date.now=()=>now;await probe._updateData();now+=1000;await probe._updateData();now+=298000;await probe._updateData();const before=calls;now+=1001;await probe._updateData();const after=calls;probe._manualRefresh=true;await probe._updateData();cadence={before,after,manual:calls};}
   finally{Date.now=realNow;base._updateData=original;probe._apexChart=undefined;probe._graphs=undefined;probe.remove();}
  }
  return {stable,global,disabled,reenabled,removed:counts.disconnected,cadence};
 });
 assert.equal(result.stable.created,1);assert.equal(result.stable.disconnected,0);assert.ok(result.stable.sameChart&&result.stable.sameFrame&&result.stable.sameParent&&result.stable.connected);assert.equal(result.stable.layers,1);assert.match(result.stable.metric,/29 W/);assert.ok(result.stable.height>=100);assert.equal(result.global,'5min');assert.equal(result.disabled.layers,0);assert.equal(result.disabled.disconnected,1);assert.equal(result.reenabled.created,2);assert.equal(result.removed,2);if(staged)assert.deepEqual(result.cadence,{before:1,after:2,manual:3});
 console.log('PASS '+name+': 30 power changes update values without graph detach/reconnect; five-minute refresh, disable/re-enable and removal work.');
 }finally{await browser.close();}
}
