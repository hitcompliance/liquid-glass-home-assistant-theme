import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
const bundle=await build({stdin:{contents:`import './src/dash6/media-card.js';import './src/dash6/glass-switch.js';import './src/dash6/media-refinements.js';`,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',loader:{'.css':'text'},logLevel:'silent'});
for(const engine of [chromium,webkit]){const browser=await engine.launch();try{
 const page=await browser.newPage();await page.setContent('<body></body>');await page.evaluate(()=>{
  document.documentElement.setAttribute('data-dash6-satin-preview','');
  customElements.define('hui-media-control-card',class extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<ha-card><div class="background"></div><div class="controls"></div></ha-card>'}setConfig(c){this._config=c}updated(){}});
  window.loadCardHelpers=async()=>({createCardElement:c=>{const e=document.createElement('hui-media-control-card');e.setConfig(c);return e}});
 });await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(()=>{
  window.calls=[];window.queries=[];window.adb='mWakefulness=Awake\nDisplay Power: state=ON';
  window.card=document.createElement('dash6-appletv-card');card.setConfig({name:'Wohnzimmer TV & Apple TV',apple_entity:'media_player.apple',tv_entity:'media_player.tv',tv_remote:'remote.tv',tv_power_on_button:'button.refresh',tv_power_off_button:'button.power'});
  card.hass={states:{'media_player.apple':{state:'off',attributes:{friendly_name:'Apple device'}},'media_player.tv':{state:'off',attributes:{friendly_name:'Fire device'}},'remote.tv':{state:'off',attributes:{}},'button.refresh':{state:'unknown'},'button.power':{state:'unknown'}},callService:async(...args)=>calls.push(args),callWS:async data=>{queries.push(data);return {response:{'media_player.tv':{adb_response:adb}}}}};document.body.append(card);
 });const sw=page.locator('dash6-appletv-card dash6-glass-switch');await sw.waitFor();assert.equal(await page.evaluate(()=>queries.length),0,'ADB is opt-in');
 assert.equal(await page.locator('.satin-media-name').textContent(),'Wohnzimmer TV & Apple TV');assert.equal(await sw.evaluate(e=>e.visual.available),true,'remote off is reachable even when media player off');
 await page.evaluate(()=>{card.setConfig({...card._config,tv_status_command:'adb shell dumpsys power | grep -e "mWakefulness=" -e "Display Power"'});});
 await page.waitForFunction(()=>card._tvAdbStatus?.on===true);assert.equal(await sw.evaluate(e=>e.visual.on),true,'ADB awake overrules off media state');
 const query=await page.evaluate(()=>queries[0]);assert.equal(query.service,'adb_command');assert.equal(query.service_data.command,'dumpsys power | grep -e "mWakefulness=" -e "Display Power"');assert.equal(query.return_response,true);
 await page.evaluate(()=>{card.hass={...card.hass,states:{...card.hass.states,'media_player.apple':{state:'playing',attributes:{friendly_name:'Different Apple name'}}}};});await page.waitForFunction(()=>card._nativeId==='media_player.apple');assert.equal(await page.locator('.satin-media-name').textContent(),'Wohnzimmer TV & Apple TV');
 // Older cached card implementations need not have this method for the shared header.
 await page.evaluate(()=>{card.tvPowerAvailable=undefined;card.requestUpdate();});await page.waitForTimeout(40);assert.equal(await sw.evaluate(e=>e.visual.available),true);
 for(const remote of ['on','off','unknown','unavailable'])for(const desired of [true,false]){
  await page.evaluate(({remote,desired})=>{card.hass={...card.hass,states:{...card.hass.states,'media_player.tv':{state:'unavailable',attributes:{}},'remote.tv':{state:remote}}};card._tvPending=null;card.requestUpdate();},{remote,desired});await page.waitForTimeout(20);
  assert.equal(await sw.evaluate(e=>e.visual.available),true);
  await sw.evaluate((e,on)=>e.dispatchEvent(new CustomEvent('toggle-request',{detail:{on},bubbles:true,composed:true})),desired);await page.waitForTimeout(20);
  assert.deepEqual(await page.evaluate(()=>calls.pop()),['on','off'].includes(remote)?['remote',desired?'turn_on':'turn_off',{entity_id:'remote.tv'}]:['button','press',{entity_id:desired?'button.refresh':'button.power'}]);
 }
 await page.evaluate(()=>{card.remove();});const before=await page.evaluate(()=>queries.length);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>queries.length),before,'disconnection cancels pending status query');
 console.log(engine.name()+': fester Kartenname, ADB-Priorität, erreichbare Remote bei unbekanntem TV, beide BLE-Fallbacks und Cache-Kompatibilität bestanden.');
}finally{await browser.close()}}
