import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
const result=await build({stdin:{contents:`import {demoHass} from './src/dash6/demo-scope.js';import{sceneMatches,sceneTarget}from'./src/dash6/scene-state.js';window.demoHass=demoHass;window.sceneMatches=sceneMatches;window.sceneTarget=sceneTarget;`,resolveDir:process.cwd()},bundle:true,format:'esm',write:false});
const runtimeData=await readFile('support/demo-runtime-data.json','utf8');
const server=createServer((req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;if(pathname==='/demo-runtime-data.json'){res.setHeader('content-type','application/json');res.end(runtimeData);return;}res.setHeader('content-type',pathname==='/test.js'?'text/javascript':'text/html');res.end(pathname==='/test.js'?result.outputFiles[0].text:'<!doctype html><script>document.addEventListener("context-request",e=>{e.stopImmediatePropagation();e.callback({real:true},()=>{});},true)</script><script type="module" src="/test.js"></script>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(const engine of [chromium,webkit]){
  const browser=await engine.launch();
  try{
   const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}`);await page.waitForFunction(()=>window.demoHass);
   const report=await page.evaluate(async()=>{
    const own='light.liquid_glass_demo_lampe',real='light.real_lamp',calls=[];
    const h={states:{[own]:{state:'on',attributes:{}},[real]:{state:'off',attributes:{}}},entities:{[own]:{entity_id:own,device_id:'demo',area_id:'demo'},[real]:{entity_id:real,device_id:'real',area_id:'real'}},devices:{demo:{area_id:'demo'},real:{area_id:'real'}},areas:{demo:{name:'DASH6 Demo'},real:{name:'Private'}},callService:async(...args)=>calls.push(args),callWS:async m=>m.type==='config/entity_registry/list'?[{entity_id:own},{entity_id:real}]:{},callApi:async()=>[],connection:{subscribeMessage:async()=>()=>{}}};
    const scoped=demoHass(h),blocked=[];
    for(const [data,target] of [[{entity_id:real}],[{}],[{entity_id:[own,real]}],[{entity_id:own,area_id:'real'}],[{entity_id:own},{device_id:'real'}]]){
     try{await scoped.callService('light','turn_on',data,target);blocked.push(false);}catch{blocked.push(true);}
    }
    await scoped.callService('light','turn_off',{entity_id:own});
    const registry=await scoped.callWS({type:'config/entity_registry/list'});
    const scene={state:'x',attributes:{liquid_glass_demo:true,scene_targets:{[own]:{state:'on',brightness:100}}}};
    const states={[own]:{state:'on',attributes:{brightness:100}},'scene.liquid_glass_demo_test':scene};
    const target=sceneTarget({states},'scene.liquid_glass_demo_test',()=>{});
    const before=sceneMatches(target,states);states[own].attributes.brightness=50;const after=sceneMatches(target,states);
    // Render the real scope element and verify a propagated hass update.
    class FakeCard extends HTMLElement{setConfig(c){this.config=c;}set hass(v){this.value=v;}getCardSize(){return 7;}}
    customElements.define('test-child',FakeCard);window.loadCardHelpers=async()=>({createCardElement:c=>{const e=document.createElement('test-child');e.setConfig(c);return e;}});
    const wrapper=document.createElement('dash6-demo-scope');wrapper.setConfig({mode:'entities',card:{type:'test-child'}});wrapper.hass=h;document.body.append(wrapper);await new Promise(r=>setTimeout(r,20));
    const rendered=wrapper.firstElementChild?.value?.states;
    return {blocked,calls,ids:Object.keys(scoped.states),devices:Object.keys(scoped.devices),areas:Object.keys(scoped.areas),registry,before,after,rendered:Object.keys(rendered||{}),size:wrapper.getCardSize()};
   });
   assert.deepEqual(report.blocked,[true,true,true,true,true]);assert.equal(report.calls.length,1);assert.deepEqual(report.ids,['light.liquid_glass_demo_lampe']);assert.deepEqual(report.devices,['demo']);assert.deepEqual(report.areas,['demo']);assert.equal(report.registry.length,1);assert.equal(report.before,true);assert.equal(report.after,false);assert.deepEqual(report.rendered,report.ids);assert.equal(report.size,7);
   const browserReport=await page.evaluate(async()=>{
    const calls=[],id='light.liquid_glass_demo_links',h={states:{'light.real':{state:'on'}},entities:{},user:{is_admin:true},callService:(...a)=>calls.push(a),callWS:(...a)=>calls.push(a),callApi:(...a)=>calls.push(a),connection:{}};
    const wrapper=document.createElement('dash6-demo-scope');wrapper.setConfig({card:{type:'test-child'}});wrapper.hass=h;document.body.append(wrapper);
    for(let i=0;i<100&&!wrapper.firstElementChild?.value?.states[id];i++)await new Promise(r=>setTimeout(r,20));
    if(!wrapper.firstElementChild)throw Error(wrapper.textContent||'Demo child did not initialize');
    const context=wrapper.firstElementChild.value;await context.callService('light','turn_off',{entity_id:id});
    const updated=wrapper.firstElementChild.value.states[id].state;
    let leaked=0;const listener=()=>leaked++;document.addEventListener('hass-more-info',listener);
    // Body portals are outside the original scope, but retain its marked hass.
    const portal=document.createElement('div');portal.hass=context;document.body.append(portal);portal.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:id},bubbles:true,composed:true}));
    const dialog=document.querySelector('dialog[aria-label="Demo-Entity & Verlauf"]'),detail=dialog?.querySelector('dash6-demo-entity-detail');
    let contextStates,unsubscribe,api,registries,connection;const request=(key,callback,subscribe=false)=>{const e=new Event('context-request',{bubbles:true,composed:true});Object.assign(e,{context:key,callback,subscribe});portal.dispatchEvent(e);};
    request('states',(value,unsub)=>{contextStates=value;unsubscribe=unsub||unsubscribe;},true);request('hassApi',value=>api=value);request('hassRegistries',value=>registries=value);
    request('hassConnection',value=>connection=value);
    await api.callService('light','turn_on',{entity_id:id});const contextUpdated=contextStates[id].state;unsubscribe();
    const result={calls,updated,leaked,dialog:!!dialog?.open,detail:detail?.entity,count:Object.keys(context.states).length,real:!!context.states['light.real'],contextUpdated,contextReal:!!registries.entities['light.real'],imageUrl:connection.hassUrl('/api/camera_proxy/camera.liquid_glass_demo_camera')};
    dialog?.close();portal.remove();wrapper.remove();document.removeEventListener('hass-more-info',listener);return result;
   });
   assert.deepEqual(browserReport.calls,[]);assert.equal(browserReport.updated,'off');assert.equal(browserReport.leaked,0);assert.equal(browserReport.dialog,true);assert.equal(browserReport.detail,'light.liquid_glass_demo_links');assert.ok(browserReport.count>700);assert.equal(browserReport.real,false);assert.equal(browserReport.contextUpdated,'on');assert.equal(browserReport.contextReal,false);
   assert.ok(browserReport.imageUrl.endsWith('/assets/liquid-glass-living-room.jpg'));
   console.log(engine.name()+': legacy scope and browser default, state propagation, portal More Info isolation and no real calls OK');
  }finally{await browser.close();}
 }
}finally{server.close();}
