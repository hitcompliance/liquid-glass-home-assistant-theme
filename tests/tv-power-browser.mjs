import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
const b=await build({stdin:{contents:"import './src/dash6/media-card.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',loader:{'.css':'text'},logLevel:'silent'});
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{const page=await browser.newPage();await page.setContent('<body></body>');
 await page.evaluate(()=>{customElements.define('ha-card',class extends HTMLElement{});customElements.define('hui-media-control-card',class extends HTMLElement{setConfig(c){this.config=c}});window.loadCardHelpers=async()=>({createCardElement:c=>{let e=document.createElement('hui-media-control-card');e.setConfig(c);return e}})});
 await page.addScriptTag({content:b.outputFiles[0].text});
 const result=await page.evaluate(async()=>{let calls=[];let card=document.createElement('dash6-media-card');card.setConfig({apple_entity:'media_player.apple',tv_entity:'media_player.tv',tv_remote:'remote.tv',tv_power_on_button:'button.refresh',tv_power_off_button:'button.power',fire_button_power:'button.power'});let results=[];
 for(let state of ['on','unknown','unavailable',null])for(let desired of [true,false]){card.hass={states:{'media_player.tv':{state:'unavailable',attributes:{}},'media_player.apple':{state:'off',attributes:{}},'button.refresh':{state:'unknown'},'button.power':{state:'unknown'},...(state?{'remote.tv':{state,attributes:{}}}:{})},callService:async(...args)=>calls.push(args)};let before=calls.length;await card.tvPower(desired);results.push({state,desired,call:calls.at(-1),count:calls.length-before,on:card.tvVisualOn(),available:card.tvPowerAvailable(!desired)});clearTimeout(card._tvTimer);card._tvPending=null;}
 card._selected='fire';await card.send('wakeup');clearTimeout(card._tvTimer);card._tvPending=null;await card.send('suspend');clearTimeout(card._tvTimer);return {results,modal:calls.slice(-2)}});
 for(const r of result.results){assert.equal(r.count,1);assert.equal(r.on,r.desired);assert.equal(r.available,true);assert.deepEqual(r.call,r.state==='on'?['remote',r.desired?'turn_on':'turn_off',{entity_id:'remote.tv'}]:['button','press',{entity_id:r.desired?'button.refresh':'button.power'}])}
 assert.deepEqual(result.modal,[['button','press',{entity_id:'button.refresh'}],['button','press',{entity_id:'button.power'}]]);console.log(engine.name()+': Remote/Fallback, Optimistik bei unbekanntem TV und Modalbefehle bestanden.');
 }finally{await browser.close()}
}
