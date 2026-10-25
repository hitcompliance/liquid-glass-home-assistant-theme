import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const root=resolve('demo'),missing=[];
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost'),file=resolve(root,'.'+(u.pathname==='/'?'/index.html':u.pathname));if(!file.startsWith(root+'/'))throw Error('path');res.setHeader('content-type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{missing.push(req.url);res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const output=resolve('../output/Media-Volume-20261025');await mkdir(output,{recursive:true});
try{for(const engine of [chromium,webkit]){const browser=await engine.launch();try{
 const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 await page.goto(origin);await page.waitForFunction(()=>window.demoPreview?.ready);
 // Verify initial attachment without a second HA update: the former HomePod race.
 for(const type of ['appletv','homepod']){
  const sample=page.locator('[data-card-type="custom:dash6-'+type+'-card"]');
  await sample.locator('.dash6-pod-volume input').waitFor();
  assert.equal(await sample.locator('input[data-volume]:visible').count(),0,type+' native volume is hidden');
  assert.equal(await sample.locator('[data-dash6-native-volume]:visible').count(),0,type+' native volume label is hidden');
  assert.equal(await sample.locator('.dash6-pod-volume input:visible').count(),1,type+' has one bottom glass volume slider');
  const placed=await sample.locator('hui-media-control-card').evaluate(p=>{const row=p.shadowRoot.querySelector('.dash6-pod-volume'),card=p.shadowRoot.querySelector('ha-card');return row.parentNode===p.shadowRoot&&row.getBoundingClientRect().top>=card.getBoundingClientRect().bottom-1;});
  assert.equal(placed,true,type+' glass volume remains below the player controls');
  await sample.screenshot({path:output+'/'+engine.name()+'-'+type+'-desktop.png'});
 }
 await page.evaluate(async()=>{
  const c=(await window.loadCardHelpers()).createCardElement({type:'media-control',entity:'media_player.liquid_glass_demo_fernseher'});
  c.hass=demoPreview.hass;c.id='generic-media-volume';document.querySelector('#preview').append(c);
 });
 const generic=page.locator('#generic-media-volume');await generic.locator('.dash6-pod-volume input').waitFor();
 assert.equal(await generic.getAttribute('data-dash6-homepod'),null,'Generic player retains its original power/transport handling');
 assert.equal(await generic.locator('input[data-volume]:visible').count(),0);
 await generic.evaluate(c=>{window.volumeCalls=[];const h=c.hass;c.hass={...h,callService:async(...args)=>{volumeCalls.push(args);return h.callService(...args);}};const progress=document.createElement('ha-slider');progress.className='playback-progress';c.shadowRoot.querySelector('ha-card').append(progress);});
 assert.notEqual(await generic.locator('.playback-progress').evaluate(e=>getComputedStyle(e).display),'none','Playback progress is retained');
 await generic.locator('.dash6-pod-volume input').evaluate(i=>{i.value='61';i.dispatchEvent(new Event('input',{bubbles:true}));i.dispatchEvent(new Event('change',{bubbles:true}));});
 await page.waitForFunction(()=>volumeCalls.length===1);
 assert.deepEqual(await page.evaluate(()=>volumeCalls[0]),['media_player','volume_set',{entity_id:'media_player.liquid_glass_demo_fernseher',volume_level:.61}]);
 await generic.evaluate(c=>{c.style.setProperty('--dash6-satin-enabled','0');c.updated(new Map());});
 assert.equal(await generic.locator('.dash6-pod-volume').count(),0,'Outside Satin the shared row is removed');
 assert.equal(await generic.locator('input[data-volume]:visible').count(),1,'Native volume remains available outside Satin');
 await generic.evaluate(c=>c.remove());
 for(const view of ['domain-bloecke','wohnzimmer']){
  await page.evaluate(v=>demoPreview.showView(v),view);
  await page.waitForFunction(()=>{const find=r=>[...r.querySelectorAll('*')].flatMap(e=>[...(e.localName==='hui-media-control-card'?[e]:[]),...(e.shadowRoot?find(e.shadowRoot):[])]);const players=find(document.querySelector('home-assistant').shadowRoot);return players.length>=2&&players.every(p=>p.shadowRoot.querySelector('.dash6-pod-volume'));});
  assert.equal(await page.locator('hui-media-control-card input[data-volume]:visible').count(),0,'Domain and room views hide duplicate native sliders');
 }
 await page.evaluate(()=>demoPreview.showView('demo'));
 await page.setViewportSize({width:390,height:844});
 for(const type of ['appletv','homepod']){const sample=page.locator('[data-card-type="custom:dash6-'+type+'-card"]');await sample.locator('.dash6-pod-volume input').waitFor();assert.equal(await sample.locator('input[data-volume]:visible').count(),0);await sample.screenshot({path:output+'/'+engine.name()+'-'+type+'-mobile.png'});}
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 console.log(engine.name()+': HomePod/TV/generic media; initial attachment, one bottom volume, no native label, exact volume service, playback progress, room/domain demos and 390px passed');
}finally{await browser.close();}}}finally{server.close();}
assert.deepEqual(missing.filter(x=>x!=='/favicon.ico'),[]);
