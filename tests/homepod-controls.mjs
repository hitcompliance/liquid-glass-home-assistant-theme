import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
const server=createServer(async(req,res)=>{try{res.setHeader('Content-Type',req.url.endsWith('.js')?'text/javascript':'text/html');res.end(req.url==='/'?'<!doctype html><body></body>':await readFile(new URL('..'+req.url,import.meta.url)));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{for(const engine of [chromium,webkit]){const browser=await engine.launch({headless:true});try{const page=await browser.newPage();await page.goto('http://127.0.0.1:'+server.address().port);const result=await page.evaluate(async()=>{
 class Native extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<ha-card><div class="controls"><div class="start"></div></div></ha-card>';this.style.setProperty('--dash6-satin-enabled','1');}updated(){}}
 customElements.define('hui-media-control-card',Native);await import('/src/dash6/homepod-controls.js');await new Promise(r=>setTimeout(r,20));
 const calls=[],id='media_player.example_speaker',card=new Native();card._config={entity:id};card.hass={states:{[id]:{state:'off',attributes:{friendly_name:'Example HomePod',volume_level:.4}}},callService:async(...args)=>calls.push(args)};document.body.append(card);card.updated();
 const root=card.shadowRoot,volume=root.querySelector('.dash6-pod-volume'),offOpacity=getComputedStyle(volume).opacity,labelDisplay=getComputedStyle(root.querySelector('.dash6-pod-label')).display;
 card.hass.states[id].state='playing';card.updated();for(const b of root.querySelectorAll('.dash6-pod-transport button'))b.click();const input=volume.querySelector('input');input.value='67';input.dispatchEvent(new Event('change'));await Promise.resolve();
 const bottom=getComputedStyle(volume).marginBottom,margin=getComputedStyle(volume).marginLeft,liveOpacity=getComputedStyle(volume).opacity,transparent=getComputedStyle(root.querySelector('ha-card')).backgroundColor;
 card.style.setProperty('--dash6-satin-enabled','0');card.updated();const restored=!root.querySelector('.dash6-pod-volume')&&!card.hasAttribute('data-dash6-homepod');
 return {bottom,offOpacity,labelDisplay,margin,liveOpacity,transparent,restored,calls};
 });assert.equal(result.offOpacity,'0.5');assert.equal(result.labelDisplay,'none');assert.equal(result.margin,'12px');assert.equal(result.bottom,'8px');assert.equal(result.liveOpacity,'1');assert.equal(result.transparent,'rgba(0, 0, 0, 0)');assert.equal(result.restored,true);assert.deepEqual(result.calls.map(c=>c[1]),['media_previous_track','media_play_pause','media_next_track','volume_set']);assert.equal(result.calls[3][2].volume_level,.67);console.log('PASS '+engine.name()+': portable HomePod recognition, controls, volume, off opacity, alignment and theme gate.');}finally{await browser.close();}}}finally{server.close();}
