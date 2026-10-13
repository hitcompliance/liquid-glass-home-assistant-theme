import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

// Real Lit rerenders and real adapter/control. Native action events are recorded;
// no HA server is connected, and no service call is permitted in this test.
const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(tmpdir()+'/native-switch-lifecycle-');
await build({stdin:{contents:`import './src/dash6/card-refinements.js';export {LitElement,html} from 'lit';export {keyed} from 'lit/directives/keyed.js';export {bindSatinNativeCard} from './src/dash6/satin-native.js';`,resolveDir:root},bundle:true,format:'esm',outfile:temp+'/fixture.js'});
const html=`<!doctype html><html data-dash6-satin-preview><head><style>
html{--dash6-satin-enabled:1;--primary-text-color:white;--primary-color:#8af}body{background:#182027}fixture-native{display:inline-block;width:130px;margin:10px}
</style></head><body><script type="module">
import {LitElement,html,keyed,bindSatinNativeCard} from '/fixture.js';
window.actions=[];window.calls=[];window.outerActions=0;window.fixtures=[];
document.body.addEventListener('action',()=>outerActions++);
class FixtureNative extends LitElement{
 static properties={hass:{attribute:false},phase:{state:true}};
 constructor(){super();this.phase=0;this._config={};}
 render(){const c=this._config,state=this.hass.states[c.entity].state;return html\`<ha-card id="card" @action=\${e=>actions.push({entity:c.entity,gesture:e.detail.action})}>\${keyed(this.phase,html\`<div id="img-cell">\${c.type==='custom:button-card'?html\`<ha-state-icon id="icon"></ha-state-icon>\`:html\`<mushroom-shape-icon slot="icon"></mushroom-shape-icon>\`}<span>\${state}</span></div>\`)}</ha-card>\`;}
}
customElements.define('fixture-native',FixtureNative);
for(const type of ['custom:button-card','custom:mushroom-entity-card'])for(const domain of ['switch','light','fan','input_boolean']){
 const host=document.createElement('fixture-native');host._config={type,entity:domain+'.test',icon:'mdi:power-socket-eu',tap_action:{action:'toggle'},show_name:false,show_state:false,styles:{card:[{width:'42px'},{height:'42px'}]}};
 host.hass={states:{[host._config.entity]:{entity_id:host._config.entity,state:'on',attributes:{}}},callService:()=>{calls.push('unexpected service');throw Error('No services allowed');}};
 document.body.append(host);await host.updateComplete;const adapter=bindSatinNativeCard(host,host._config);await adapter.control.updateComplete;fixtures.push({host,adapter});
}
window.generic=[];
for(const name of ['hui-tile-card','hui-light-card','hui-entity-card','button-card','mushroom-light-card','mushroom-entity-card']){
 customElements.define(name,class extends FixtureNative{});await Promise.resolve();
 const host=document.createElement(name);host._config={type:'custom:button-card',entity:'light.generic',tap_action:{action:'toggle'}};host.hass={states:{'light.generic':{state:'on',attributes:{}}}};
 document.body.append(host);await host.updateComplete;generic.push(host);
}
window.ready=true;
</script></body></html>`;
const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?await readFile(temp+'/fixture.js'):html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(const [name,launcher] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await launcher.launch({headless:true});
  try{
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.ready);
   const result=await page.evaluate(async()=>{
    const settle=async()=>{await new Promise(r=>setTimeout(r,20));await Promise.all(fixtures.map(f=>f.adapter.control?.updateComplete));};
    for(let index=0;index<40;index++){
     for(const {host} of fixtures){const id=host._config.entity;host.hass={...host.hass,states:{[id]:{entity_id:id,state:index%2?'on':'off',attributes:{}}}};host.phase++;}
     await Promise.all(fixtures.map(f=>f.host.updateComplete));await settle();
     for(const {host,adapter} of fixtures){const icon=host.shadowRoot.querySelector('#icon,mushroom-shape-icon');if(!adapter.control?.isConnected||host.shadowRoot.querySelectorAll('dash6-glass-switch').length!==1||icon.style.display!=='none'||adapter.control.model.on!==Boolean(index%2))throw Error('Switch lost or stale after independent Lit rerender '+index);}
    }
    const controls=fixtures.map(f=>f.adapter.control);
    // Lit/styleMap can restore the existing native icon without replacing it.
    for(const {host} of fixtures)host.shadowRoot.querySelector('#icon,mushroom-shape-icon').style.display='block';await settle();
    const kept=fixtures.every((f,i)=>f.adapter.control===controls[i]&&f.host.shadowRoot.querySelector('#icon,mushroom-shape-icon').style.display==='none');
    // Text-only Hass rerenders keep the lens and synchronize its visual state.
    for(const {host} of fixtures){const id=host._config.entity;host.hass={...host.hass,states:{[id]:{entity_id:id,state:'off',attributes:{}}}};}await Promise.all(fixtures.map(f=>f.host.updateComplete));await settle();
    const feedback=fixtures.every((f,i)=>f.adapter.control===controls[i]&&!f.adapter.control.model.on);
    for(const f of fixtures)f.adapter.control.shadowRoot.querySelector('button').click();await new Promise(r=>setTimeout(r,160));
    const counted=actions.length;
    for(const {host,adapter} of fixtures){adapter.dispose();host.phase++;}await Promise.all(fixtures.map(f=>f.host.updateComplete));await settle();
    const cleaned=fixtures.every(({host,adapter})=>!adapter.control&&!host.shadowRoot.querySelector('dash6-glass-switch')&&host.shadowRoot.querySelector('#icon,mushroom-shape-icon').style.display!=='none');
    for(let index=0;index<10;index++){
     for(const host of generic){host.phase++;host.hass={states:{'light.generic':{state:index%2?'on':'off',attributes:{}}}};}
     await Promise.all(generic.map(host=>host.updateComplete));
     await Promise.all(generic.map(host=>host._refinedLightSwitch?.updateComplete));
     for(const host of generic){const switches=host.shadowRoot.querySelectorAll('dash6-glass-switch');if(switches.length!==1||host.shadowRoot.querySelector('#icon').style.display!=='none'||switches[0].model.on!==Boolean(index%2))throw Error('Generic native light fallback lost '+host.localName);}
    }
    for(const host of generic){host._config={...host._config,lock:{enabled:true}};host.requestUpdate();}await Promise.all(generic.map(host=>host.updateComplete));
    const genericCleaned=generic.every(host=>!host.shadowRoot.querySelector('dash6-glass-switch')&&host.shadowRoot.querySelector('#icon').style.display!=='none');
    return {generic:generic.length,genericCleaned,fixtures:fixtures.length,rerenders:40,kept,feedback,counted,cleaned,outerActions,services:calls.length};
   });
   assert.deepEqual(result,{generic:6,genericCleaned:true,fixtures:8,rerenders:40,kept:true,feedback:true,counted:8,cleaned:true,outerActions:0,services:0});assert.deepEqual(errors,[]);
   console.log(name+': '+JSON.stringify(result));
  }finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
