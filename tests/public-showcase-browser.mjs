import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium,webkit} from 'playwright';
const root=resolve('demo'),missing=[],version=JSON.parse(await readFile(resolve('package.json'),'utf8')).version;
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!path.startsWith(root+'/'))throw Error('path');const data=await readFile(path);res.setHeader('content-type',({'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(data);}catch(error){missing.push(req.url);res.writeHead(404);res.end(error.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
try{for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('RUNTIME STACK',e.stack);});
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.goto(origin);await page.waitForFunction(()=>window.demoPreview?.ready||window.demoPreview?.errors?.length,{},{timeout:45000});
  console.log(engine.name()+' boot:',await page.evaluate(()=>({ready:demoPreview.ready,errors:demoPreview.errors,cards:document.querySelector('#runtime-status').textContent})),errors);
  assert.equal(await page.evaluate(()=>demoPreview.ready),true);
  assert.equal(await page.locator('meta[name="liquid-glass-version"]').getAttribute('content'),version);
  const shell=type=>page.locator('[data-card-type="custom:dash6-'+type+'"]');
  for(const kind of ['shoe-cabinet-card','appletv-card','vacuum-card'])assert.equal(await shell(kind).count(),1,kind+' visible on the first view');
  const domain=shell('domain-card');
  await domain.locator('dash6-stack-card[data-tab-ready]').first().waitFor();
  await domain.locator('hui-heading-card.dash6-section-tab').getByRole('heading',{name:'Licht',exact:true}).waitFor();
  assert.equal(await domain.locator('dash6-govee-light-card-v2').count(),2,'One domain contains multiple entity cards');
  const material=await domain.locator('dash6-stack-card[data-tab-ready]').first().evaluate(stack=>{
   const surface=stack.shadowRoot.querySelector('.tab-surface'),walk=r=>[...r.querySelectorAll('*')].flatMap(e=>[e,...(e.shadowRoot?walk(e.shadowRoot):[])]),lights=walk(stack.shadowRoot).filter(e=>e.localName==='dash6-govee-light-card-v2'),frame=stack.getBoundingClientRect();
   return {surface:getComputedStyle(surface).backgroundColor,opacity:getComputedStyle(surface).opacity,dark:lights.map(e=>getComputedStyle(e.shadowRoot.querySelector('ha-card')).backgroundColor),contained:lights.every(e=>{const b=e.getBoundingClientRect();return b.left>=frame.left&&b.right<=frame.right+1&&b.bottom<=frame.bottom+1;}),gap:lights[1].getBoundingClientRect().top-lights[0].getBoundingClientRect().bottom};
  });
  assert.equal(material.opacity,'1');assert.ok(material.contained);assert.ok(Math.abs(material.gap-8)<1);assert.ok(material.dark.every(bg=>bg!==material.surface),'Dark cards remain distinct from the light shell');
  console.log(engine.name()+' domain pattern:',material);
  const proof=resolve('../output/Release-3.3-Demo');await mkdir(proof,{recursive:true});await domain.screenshot({path:proof+'/'+engine.name()+'-domain-block.png'});
  assert.equal(await shell('door-card').count(),2,'Both original door variants are directly visible');
  const apartment=shell('door-card').filter({hasText:'Wohnungstür'}),entrance=shell('door-card').filter({hasText:'Haustür'});
  await page.locator('button[data-entity="button.liquid_glass_demo_klingeln"]').click();
  await entrance.locator('ha-card[data-tone="ring"]').waitFor();
  await page.locator('button[data-entity="switch.liquid_glass_demo_turkontakt_simulation"]').click();
  await apartment.locator('ha-card[data-tone="open"]').waitFor();
  assert.equal(await entrance.locator('ha-card[data-tone="ring"]').count(),0,'Contact opening ends ringing');
  await page.locator('button[data-entity="switch.liquid_glass_demo_schloss_batteriewarnung_simulation"]').click();
  assert.ok(await apartment.locator('.warning').count()>=2,'Contact battery and lock warning are demonstrated');
  await page.locator('button[data-entity="button.liquid_glass_demo_zurucksetzen"]').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('home-assistant')].some(x=>x.shadowRoot));
  for(const [kind,action,label]of [['shoe-cabinet-card','light','Lichtdetails'],['appletv-card','media','Fernseher'],['vacuum-card','clean','Reinigung'],['vacuum-card','dock','Basisstation'],['vacuum-card','maintenance','Verschleißteile']]){
   await shell(kind).locator('[data-detail="'+action+'"]').click();
   await page.waitForFunction(()=>{const walk=r=>[...r.querySelectorAll('dialog[open]')].length||[...r.querySelectorAll('*')].some(e=>e.shadowRoot&&walk(e.shadowRoot));return walk(document);});
   console.log(engine.name()+' detail:',kind,action);
   await page.keyboard.press('Escape');
  }
  for(const kind of ['lightgroup-card-v2','appletv-card']){
   if(kind==='lightgroup-card-v2')await shell(kind).locator('.name').first().click();
   else{const footer=shell(kind).locator('.footer').first();const box=await footer.boundingBox();await footer.click({position:{x:box.width-3,y:3}});}
   await page.waitForFunction(()=>{const walk=r=>[...r.querySelectorAll('dialog[open]')].length||[...r.querySelectorAll('*')].some(e=>e.shadowRoot&&walk(e.shadowRoot));return walk(document);});
   await page.keyboard.press('Escape');console.log(engine.name()+' background dialog:',kind);
  }
  const gui=page.locator('dash6-showcase-card [data-configure]');
  const guiCount=await gui.count();assert.ok(guiCount>=15,'All available card editors are exposed');
  for(let i=0;i<guiCount;i++){
   await gui.nth(i).click();await page.getByRole('dialog',{name:'Karte über GUI konfigurieren',exact:true}).waitFor();
   await page.getByRole('button',{name:'Konfiguration schließen',exact:true}).click();
  }
  await shell('shoe-cabinet-card').getByRole('button',{name:'Weiß',exact:true}).click();
  await page.waitForFunction(()=>demoPreview.hass.states['light.liquid_glass_demo_schuhschrank'].attributes.hs_color[1]===0);
  assert.equal(await page.evaluate(()=>Object.keys(demoPreview.hass.states).every(id=>id.includes('.liquid_glass_demo_'))),true);
  const guiDialog=page.getByRole('dialog',{name:'Karte über GUI konfigurieren',exact:true});
  await shell('shoe-cabinet-card').locator('[data-configure]').click();
  const nameInput=guiDialog.getByLabel('Anzeigename',{exact:true}).first();await nameInput.fill('Schuhschrank · GUI geprüft');await nameInput.press('Tab');
  await guiDialog.getByRole('button',{name:'In Demo übernehmen',exact:true}).click();
  await shell('shoe-cabinet-card').getByText('Schuhschrank · GUI geprüft',{exact:true}).waitFor();
  assert.equal(await shell('shoe-cabinet-card').getByRole('button',{name:'Weiß',exact:true}).getAttribute('aria-pressed'),'true','scene activation reflects confirmed targets');
  for(const path of await page.evaluate(()=>demoPreview.dashboard.views.map(v=>v.path))){
   await page.evaluate(path=>demoPreview.showView(path),path);await page.waitForTimeout(220);console.log(engine.name()+' view:',path);
   for(const b of await page.locator('dash6-showcase-card [data-configure]').all()){
    console.log(engine.name()+' editor:',await b.evaluate(e=>e.getRootNode().host._config.card.type));
    await b.click();try{await guiDialog.waitFor({timeout:5000});}catch(error){console.log('Editor alerts:',await page.getByRole('alert').allTextContents());throw error;}
    await guiDialog.getByRole('button',{name:'Konfiguration schließen',exact:true}).click();
   }
  }
  await page.evaluate(()=>demoPreview.showView('demo'));await page.waitForTimeout(100);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Mobile page has no horizontal overflow');
  const out=resolve('../output/Release-3.3-Demo');await mkdir(out,{recursive:true});await page.screenshot({path:out+'/'+engine.name()+'-mobile.png',fullPage:true});
  console.log(engine.name()+': '+guiCount+' real GUI editors, shoe scenes, TV, vacuum detail dialogs and mobile layout checked; runtime errors:',errors);
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
}}finally{server.close();}
assert.deepEqual(missing.filter(x=>x!=='/favicon.ico'),[],'All public demo assets are present');
