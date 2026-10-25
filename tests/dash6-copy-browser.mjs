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
  assert.equal(await page.evaluate(()=>{const rows=Object.values(demoPreview.hass.entities),copy=new Set(rows.filter(e=>e.entity_id.includes('.liquid_glass_demo_copy_')).map(e=>e.area_id));return rows.filter(e=>!e.entity_id.includes('.liquid_glass_demo_copy_')).some(e=>copy.has(e.area_id));}),false,'Gallery and copied devices use distinct area IDs');
  await page.evaluate(()=>demoPreview.showView('wohnzimmer'));
  await page.locator('dash6-ultra-card').waitFor();
  await page.waitForTimeout(5000);
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
