import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const root=resolve('demo'),missing=[];
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost'),p=resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!p.startsWith(root+'/'))throw Error('path');const d=await readFile(p);res.setHeader('content-type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.webp':'image/webp','.jpg':'image/jpeg'})[extname(p)]||'application/octet-stream');res.end(d);}catch(e){missing.push(req.url);res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
try{for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin);await page.waitForFunction(()=>window.demoPreview?.ready||window.demoPreview?.errors.length);
  assert.equal(await page.evaluate(()=>demoPreview.ready),true,JSON.stringify(await page.evaluate(()=>demoPreview.errors)));
  assert.equal(await page.evaluate(()=>demoPreview.dashboard.title),'LIQUID-GLASS-DEMO');
  // A real HA host differs from the card's local simulation. Upstream
  // card-tools must not obtain its global connection for demo templates.
  await page.evaluate(()=>{
   window.hostTemplateCalls=[];
   const app=document.querySelector('home-assistant'),h=app.hass;
   app.hass={...h,connection:{...h.connection,subscribeMessage:async(callback,message)=>{hostTemplateCalls.push(message.type);callback({result:[{type:'markdown',content:'PRIVATE HOST SENTINEL'}]});return()=>{};}}};
   demoPreview.showView('home');
  });
  await page.waitForTimeout(1200);
  assert.deepEqual(await page.evaluate(()=>hostTemplateCalls),[],'Demo Auto Entities templates stay off the host connection');
  assert.equal(await page.getByText('PRIVATE HOST SENTINEL',{exact:true}).count(),0);
  const roomNames=['Wohnzimmer','Küche','Schlafzimmer','Flur','Badezimmer','Büro','Waschkeller'];
  const roomPaths=['wohnzimmer','kuche','schlafzimmer','flur','badezimmer','buro','raum-waschkeller'];
  assert.equal(await page.getByText('Raum öffnen',{exact:true}).count(),7,'Exactly seven copied room cards');
  assert.deepEqual(await page.locator('button-card').evaluateAll(cards=>cards.filter(c=>c._config?.label==='Raum öffnen').map(c=>c._config.name)),roomNames,'Original room titles without gallery rooms or internal prefixes');
  for(let i=0;i<roomNames.length;i++){
   await page.getByText(roomNames[i],{exact:true}).last().click();
   await page.waitForFunction(path=>new URL(location.href).searchParams.get('view')===path,roomPaths[i],{timeout:5000});
   await page.evaluate(()=>demoPreview.showView('home'));
  }
  await page.evaluate(async()=>{
   const config=demoPreview.dashboard.views[0].sections[0].cards[0];
   const scope=(await window.loadCardHelpers()).createCardElement(config);
   const editor=await scope.constructor.getConfigElement();editor.id='storage-scope-editor';
   editor.hass=demoPreview.hass;editor.setConfig(config);document.body.append(editor);
  });
  await page.locator('#storage-scope-editor dash6-profile-editor').waitFor();
  await page.waitForTimeout(300);
  assert.equal(await page.getByText('Unbekanntes DASH6-Kartenprofil: demo-inline',{exact:true}).count(),0);
  await page.evaluate(()=>document.querySelector('#storage-scope-editor').remove());
  assert.equal(await page.evaluate(()=>{const rows=Object.values(demoPreview.hass.entities),copy=new Set(rows.filter(e=>e.entity_id.includes('.liquid_glass_demo_copy_')).map(e=>e.area_id));return rows.filter(e=>!e.entity_id.includes('.liquid_glass_demo_copy_')).some(e=>copy.has(e.area_id));}),false,'Gallery and copied devices use distinct area IDs');
  await page.evaluate(()=>demoPreview.showView('wohnzimmer'));
  await page.locator('dash6-ultra-card').waitFor();
  await page.waitForTimeout(5000);
  assert.equal(await page.evaluate(()=>demoPreview.dashboard.views.find(v=>v.path==='wohnzimmer').cards[0].type),'custom:dash6-ultra-card','Original Panel → Ultra structure');
  assert.ok(await page.locator('[data-liquid-glass-sections-layout]').count()>0,'Room sections use the structurally scoped layout');
  await page.evaluate(async()=>{
   const card=document.querySelector('home-assistant').shadowRoot.querySelector('home-assistant-main').shadowRoot.querySelector('ha-panel-lovelace').shadowRoot.querySelector('hui-root').shadowRoot.querySelector('hui-view-container').shadowRoot.querySelector('dash6-ultra-card');
   const editor=await card.constructor.getConfigElement();editor.id='direct-ultra-editor';
   editor.hass={...demoPreview.hass,__liquidGlassDemoRuntime:undefined,states:{'light.private':{entity_id:'light.private',state:'on',attributes:{}}}};
   editor.setConfig(demoPreview.dashboard.views.find(v=>v.path==='wohnzimmer').cards[0]);document.body.append(editor);
  });
  await page.locator('#direct-ultra-editor ultra-card-editor').waitFor();
  assert.equal(await page.evaluate(()=>!!document.querySelector('#direct-ultra-editor').hass.states['light.private']),false,'Direct Ultra GUI has no host entity access');
  assert.equal(await page.evaluate(()=>{
   const editor=document.querySelector('#direct-ultra-editor');let saved;
   editor.addEventListener('config-changed',event=>saved=event.detail.config,{once:true});
   const config=structuredClone(editor._config.card);delete config.liquid_glass_demo_mode;
   editor._editor.dispatchEvent(new CustomEvent('config-changed',{bubbles:true,composed:true,detail:{config}}));
   return saved?.type==='custom:dash6-ultra-card'&&saved.liquid_glass_demo_mode==='browser';
  }),true,'Original Ultra editor changes retain the local simulation mode');
  await page.evaluate(()=>document.querySelector('#direct-ultra-editor').remove());
  console.log(engine.name(),'wohnzimmer',await page.locator('#runtime-status').innerText(),'errors',errors,'missing',missing.slice(-6));
  await mkdir('../output/Dash6-Copy-3.4',{recursive:true});await page.screenshot({path:'../output/Dash6-Copy-3.4/'+engine.name()+'-wohnzimmer.png'});
  await page.evaluate(()=>demoPreview.showView('flur-inhalt'));
  await page.locator('dash6-shoe-cabinet-card').first().waitFor({timeout:20000});await page.locator('dash6-door-card').first().waitFor();
  await page.screenshot({path:'../output/Dash6-Copy-3.4/'+engine.name()+'-flur.png'});
  await page.evaluate(async()=>{demoPreview.showView('buro-inhalt');const c=demoPreview.dashboard.views.find(v=>v.path==='buro-zusatz').cards[0].card;const helpers=await window.loadCardHelpers();const node=helpers.createCardElement(c);node.hass=demoPreview.hass;document.querySelector('#preview').append(node);});
  await page.locator('dash6-room-slot-card').first().waitFor({state:'attached'});
  await page.waitForFunction(()=>{const walk=r=>[...r.querySelectorAll('*')].flatMap(e=>[e,...(e.shadowRoot?walk(e.shadowRoot):[])]);return walk(document).some(e=>e.localName==='dash6-room-slot-card'&&e.clientHeight>0);});
  await page.waitForTimeout(2000);
  await mkdir('../output/Dash6-Copy-3.4',{recursive:true});await page.screenshot({path:'../output/Dash6-Copy-3.4/'+engine.name()+'-buro.png'});
  assert.deepEqual(errors,[]);console.log(engine.name()+': copied Ultra layout, shoe cabinet, doors and room loader loaded');
 }finally{await browser.close();}
}}finally{server.close();}
