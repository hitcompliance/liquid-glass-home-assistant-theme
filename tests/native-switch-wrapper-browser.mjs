import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

// Button Card custom fields reevaluate their complete nested definition, call
// setConfig on a same-type card, then assign hass. Unlike a native host rerender,
// this overlaps asynchronous wrapper creation with updates of its previous child.
// No HA connection: native actions are recorded and service calls are forbidden.
const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(tmpdir()+'/native-switch-wrapper-');
await build({stdin:{contents:`export {LitElement,html} from 'lit';import './src/dash6/satin-native.js';`,resolveDir:root},bundle:true,format:'esm',outfile:temp+'/fixture.js'});
const html=`<!doctype html><html data-dash6-satin-preview><head><style>
html{--dash6-satin-enabled:1;--primary-text-color:white;--primary-color:#8af}body{background:#182027}
</style></head><body><script type="module">
import {LitElement,html} from '/fixture.js';
window.actions=[];window.services=[];window.outerActions=0;window.parents=[];window.factoryGate=null;window.factoryQueue=[];window.nativeChildren=[];
document.body.addEventListener('action',()=>outerActions++);
class NativeIcon extends LitElement{
 static properties={_hass:{attribute:false},_config:{state:true}};
 set hass(value){this._hass=value;}
 setConfig(config){this._config={press_action:{action:'none'},release_action:{action:'none'},icon_press_action:{action:'none'},icon_release_action:{action:'none'},...config,lock:{enabled:false,...config.lock}};}
 render(){return html\`<ha-card id="card" @action=\${e=>actions.push({entity:this._config.entity,gesture:e.detail.action})}><div id="img-cell"><ha-state-icon id="icon"></ha-state-icon><span>\${this._hass?.states[this._config.entity]?.state}</span></div></ha-card>\`;}
}
customElements.define('fixture-native-icon',NativeIcon);
window.loadCardHelpers=async()=>({createCardElement:async definition=>{const gate=factoryQueue.shift()||factoryGate;if(gate)await gate;const child=document.createElement('fixture-native-icon');child.setConfig(definition);nativeChildren.push(child);return child;}});
class ParentFields extends LitElement{
 static properties={hass:{attribute:false}};
 constructor(){super();this._config={type:'custom:button-card',lock:{enabled:false}};this.card=document.createElement('dash6-satin-native-card');this.signature='';}
 render(){
  const definition={type:'custom:button-card',entity:this.entity,icon:'mdi:power',show_name:false,show_state:false,tap_action:{action:'toggle'},hold_action:{action:'more-info'},styles:{card:[{width:'42px'},{height:'42px'}],icon:[{color:this.hass.states[this.entity].state==='on'?'black':'white'}]}};
  const config={type:'custom:dash6-satin-native-card',definition},signature=JSON.stringify(config);
  if(signature!==this.signature){this.signature=signature;this.setting=this.card.setConfig(config);}
  this.card.hass=this.hass;
  return html\`<ha-card><div id="device" @action=\${e=>e.stopPropagation()}>\${this.card}</div><div id="graph">graph preserved</div></ha-card>\`;
 }
}
customElements.define('fixture-parent-fields',ParentFields);
const state=(id,on)=>({states:{[id]:{entity_id:id,state:on?'on':'off',attributes:{}}},callService:()=>{services.push('unexpected');throw Error('No services allowed');}});
window.state=state;
for(const domain of ['switch','light','fan','input_boolean']){const parent=document.createElement('fixture-parent-fields');parent.entity=domain+'.nested';parent.hass=state(parent.entity,true);document.body.append(parent);await parent.updateComplete;await parent.setting;await parent.card.updateComplete;await new Promise(r=>setTimeout(r,20));parents.push(parent);}
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
    const settle=async()=>{await Promise.all(parents.map(p=>p.card.updateComplete));await new Promise(r=>setTimeout(r,20));};
    const check=on=>{for(const parent of parents){const card=parent.card,child=card._child,control=card._adapter?.control;if(!control?.isConnected||control.getRootNode().host!==child||child.shadowRoot.querySelectorAll('dash6-glass-switch').length!==1||control.model.on!==on)throw Error('Nested wrapper has missing or stale adapter for '+parent.entity);if(parent.shadowRoot.querySelector('#graph').textContent!=='graph preserved')throw Error('Graph changed');}};
    check(true);
    for(let index=0;index<40;index++){
     let release;factoryGate=new Promise(r=>release=r);
     const old=parents.map(p=>p.card._child);
     for(const parent of parents)parent.hass=state(parent.entity,Boolean(index%2));
     await Promise.all(parents.map(p=>p.updateComplete));await settle();
     // Allow the pending wrapper update to finish while creation still waits.
     release();factoryGate=null;await Promise.all(parents.map(p=>p.setting));await settle();
     check(Boolean(index%2));
     for(const child of old)if(child.shadowRoot.querySelector('dash6-glass-switch'))throw Error('Old child adapter not disposed');
     for(const parent of parents)parent.card._adapter.control.shadowRoot.querySelector('button').click();
     await new Promise(r=>setTimeout(r,160));
    }
    const counted=actions.length;
    // A superseded asynchronous factory must never replace the newest card,
    // even when it completes after the current adapter has already mounted.
    const parent=parents[0],card=parent.card,base=structuredClone(card._definition);
    let releaseFirst,releaseLast;
    factoryQueue.push(new Promise(r=>releaseFirst=r),new Promise(r=>releaseLast=r));
    const obsolete=card.setConfig({definition:{...base,icon:'mdi:obsolete'}});await Promise.resolve();await Promise.resolve();
    const latest=card.setConfig({definition:{...base,icon:'mdi:check'}});await Promise.resolve();await Promise.resolve();
    releaseLast();await latest;await settle();const current=card._child,control=card._adapter.control;
    releaseFirst();await obsolete;await settle();
    if(card._child!==current||card._adapter.control!==control||control._config.icon!=='mdi:check'||!control.isConnected)throw Error('Obsolete factory replaced the current card');
    // Fresh reconfiguration must retain existing exclusion guards, including
    // locks and momentary service actions, then recover when they are removed.
    for(const extra of [{lock:{enabled:true}},{press_action:{action:'call-service',service:'switch.turn_on'}},{entity:'lock.protected'}]){
     await card.setConfig({definition:{...base,...extra}});await settle();
     if(card._adapter.control||card._child.shadowRoot.querySelector('dash6-glass-switch'))throw Error('Protected native card gained a switch');
    }
    await card.setConfig({definition:base});await settle();check(true);
    for(const parent of parents)parent.remove();await settle();
    const cleaned=nativeChildren.every(child=>!child.shadowRoot?.querySelector('dash6-glass-switch'));
    return {parents:parents.length,reconfigurations:40,counted,cleaned,outerActions,services:services.length};
   });
   assert.deepEqual(result,{parents:4,reconfigurations:40,counted:160,cleaned:true,outerActions:0,services:0});assert.deepEqual(errors,[]);
   console.log(name+': '+JSON.stringify(result));
  }finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
