import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
const temp=await mkdtemp(tmpdir()+'/metered-lock-');
await build({stdin:{contents:`export {configureDeviceLock,childLocked,SWITCH_SCHEMA} from './src/dash6/glass-switch.js';export {SatinNativeEditor} from './src/dash6/satin-native.js';`,resolveDir:process.cwd()},bundle:true,format:'esm',outfile:temp+'/fixture.js'});
const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?await readFile(temp+'/fixture.js'):'<html><body></body></html>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
try{for(const engine of [chromium,webkit]){const browser=await engine.launch();try{const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/`);const result=await page.evaluate(async()=>{
 const m=await import('/fixture.js');let calls=0;
 const raw={type:'custom:button-card',entity:'switch.test',child_lock:true,custom_fields:{device:{card:{type:'custom:button-card',entity:'switch.test',icon:'mdi:fan',tap_action:{action:'toggle'},hold_action:{action:'more-info'}}},status:'input status',values:'measurements'}};
 const c=m.configureDeviceLock(raw);if(c.custom_fields.status!==raw.custom_fields.status||c.custom_fields.values!==raw.custom_fields.values||c.hold_action.action!=='more-info')throw Error('Content/action lost');
 const s=document.createElement('dash6-glass-switch');s.setConfig(c.custom_fields.device.card);s.hass={states:{'switch.test':{state:'on',attributes:{}}},callService:()=>{calls++;}};document.body.append(s);await s.updateComplete;s.shadowRoot.querySelector('button').click();await s.updateComplete;if(!s._rejecting||calls)throw Error('Lock not enforced');
 for(const [state,locked]of [['on',true],['off',false],['true',true],['false',false],['1',true],['0',false],['open',true],['closed',false],['unknown',true],['unavailable',true]])if(m.childLocked({child_lock_entity:'sensor.lock'},{'sensor.lock':{state}})!==locked)throw Error('Wrong binary mapping '+state);
 if(!m.childLocked({child_lock_entity:'sensor.missing'},{}))throw Error('Missing lock must fail closed');
 class FakeEditor extends HTMLElement{setConfig(c){this.config=c;}}customElements.define('test-lock-editor',FakeEditor);
 window.loadCardHelpers=async()=>({createCardElement:()=>({constructor:{getConfigElement:async()=>document.createElement('test-lock-editor')}})});
 const editor=document.createElement('dash6-satin-native-editor');editor.hass=s.hass;document.body.append(editor);await editor.setConfig({type:'custom:dash6-satin-graph-card',definition:c});let saved;editor.addEventListener('config-changed',e=>saved=e.detail.config);const form=editor.shadowRoot.querySelector('ha-form');if(!form||!form.schema.some(f=>f.name==='child_lock')||!form.schema.find(f=>f.name==='child_lock_entity').selector.entity.domain.includes('sensor'))throw Error('GUI missing');
 form.dispatchEvent(new CustomEvent('value-changed',{detail:{value:{child_lock:false,child_lock_entity:'sensor.lock',switch_style:'liquid_glass'}}}));if(saved.definition.custom_fields.device.card.child_lock||saved.definition.custom_fields.device.card.child_lock_entity!=='sensor.lock')throw Error('GUI failed to update control');
 s.setConfig(saved.definition.custom_fields.device.card);s.hass={...s.hass,states:{...s.hass.states,'sensor.lock':{state:'on'}}};await s.updateComplete;s.shadowRoot.querySelector('button').click();if(calls)throw Error('Entity lock allowed service');
 const protectedCard={...raw,lock:{enabled:true}};if(m.configureDeviceLock(protectedCard).custom_fields.device.card.type!=='custom:button-card')throw Error('Vendor lock changed');s.remove();return {calls,gui:true,animation:true};
 });assert.deepEqual(result,{calls:0,gui:true,animation:true});console.log(engine.name()+': lock, GUI, binary states, fail-closed, shared rejection passed');}finally{await browser.close();}}}finally{await new Promise(r=>server.close(r));await rm(temp,{recursive:true,force:true});}
