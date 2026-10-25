import {chromium,webkit} from 'playwright';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const output=path.resolve('../output/Theme-Speicherbuttons-20261021'),live=path.resolve('dist');
mkdirSync(output,{recursive:true});
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[],cache=new Map();
  let shared={version:1,themes:{'DASH6 Satin Glass':{revision:'r1',values:{'dash6-light-glass-opacity':'0.22',_controls:{light_glass_opacity:22}}}}};
  page.on('console',m=>{if(m.type()==='error')console.log('BROWSER',m.text())});
  page.on('pageerror',e=>{errors.push(e.message);console.log(e.stack);});
  await page.route('http://theme.test/**',async route=>{
   const url=new URL(route.request().url()),rel=url.pathname.replace('/local/dash6-satin/','');
   if(url.pathname==='/local/dash6-satin/theme-defaults.json')return route.fulfill({json:shared});
   if(url.pathname.startsWith('/local/dash6-satin/')){
    const file=path.join(live,rel);
    if(existsSync(file)){if(!cache.has(file))cache.set(file,readFileSync(file));return route.fulfill({body:cache.get(file),contentType:file.endsWith('.js')?'application/javascript':'application/json'});}
   }
   return route.fulfill({contentType:'text/html',body:'<!doctype html><meta name="dash6-assets-root" content="/local/dash6-satin"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="background:#273040;color:white;--dash6-satin-enabled:1;--secondary-text-color:#ccc"></body>'});
  });
  async function init(){
   await page.goto('http://theme.test/dash-6/home');
   await page.evaluate(()=>{window.loadCardHelpers=async()=>({createCardElement:()=>document.createElement('div')});customElements.define('hui-view-container',class extends HTMLElement{});});
   await page.addScriptTag({url:'http://theme.test/local/dash6-satin/dash6-cards.js',type:'module'});
   await page.waitForFunction(()=>customElements.get('dash6-theme-editor-card')?.themeSaveActionsVersion===1);
   await page.evaluate(async initial=>{
    const store=new Map([['themes/dash6-satin-glass.yaml','DASH6 Satin Glass:\n  dash6-light-glass-opacity: "0.22"\nOther Theme:\n  untouched: yes\n'],['themes/liquid-glass.yaml','DASH6 Satin Glass:\n  dash6-dark-glass-opacity: "0.70"\n'],['www/dash6-satin/theme-defaults.json',JSON.stringify(initial)]]);
    window.testFiles=store;window.testShared=structuredClone(initial);window.testWrites=[];window.reloads=0;window.failNextSave=false;
    const hass={user:{id:'test',is_admin:true},states:{},config:{time_zone:'Europe/Berlin',components:['liquid_glass']},callWS:async m=>{
     if(m.type!=='liquid_glass/theme_defaults')throw Error('Unexpected API '+m.type);
     if(window.failNextSave){window.failNextSave=false;throw Error('simulated save failure');}
     if(m.values){window.testShared={version:1,themes:{'DASH6 Satin Glass':{revision:'saved',values:m.values}}};testWrites.push('liquid-glass/theme-defaults.json');}
     return {shared:window.testShared,backup:'backups/test',changed:[]};
    },callService:async(d,s)=>{if(d!=='frontend'||s!=='reload_themes')throw Error('Physical action forbidden');window.reloads++;}};
    const host=document.createElement('hui-view-container');host.style.setProperty('--dash6-satin-enabled','1');document.body.append(host);
    window.editor=document.createElement('dash6-theme-editor-card');editor.hass=hass;editor.setConfig({expanded:true});host.append(editor);await editor.updateComplete;
   },shared);
   await page.waitForFunction(()=>window.__dash6ThemeSettings.readPreferences()['dash6-light-glass-opacity']!==undefined);
  }
  await init();
  assert.equal(await page.getByRole('button',{name:'Alles speichern',exact:true}).count(),1);
  assert.equal(await page.getByRole('button',{name:'Alles für Alle speichern',exact:true}).count(),1);
  await page.evaluate(async()=>{editor.change({...editor.preferences(),light_glass_opacity:37,graph_sidebar_span:'6h',graph_background_span:'12h'});window.__dash6ThemeSettings.replacePreferences({...window.__dash6ThemeSettings.readPreferences(),'dash6-switch-track-border':'7px solid red'});await editor.updateComplete;});
  await page.getByRole('button',{name:'Alles speichern',exact:true}).click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('dash6-satin-theme-saved-v1')));
  assert.equal(saved.values['dash6-light-glass-opacity'],'0.37');assert.equal(saved.values['dash6-graph-sidebar-span'],'6h');assert.equal(saved.values['dash6-switch-track-border'],'7px solid red');
  assert.equal(await page.evaluate(()=>testWrites.length),0);
  await init();
  await page.waitForFunction(()=>window.__dash6ThemeSettings.readPreferences()['dash6-light-glass-opacity']==='0.37');
  await page.evaluate(async()=>{editor.hass={...editor.hass,user:{id:'test',is_admin:false}};editor.requestUpdate();await editor.updateComplete;});
  assert.equal(await page.getByRole('button',{name:'Alles für Alle speichern',exact:true}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Alles speichern',exact:true}).count(),1);
  await page.evaluate(async()=>{editor.hass={...editor.hass,user:{id:'test',is_admin:true}};editor.requestUpdate();await editor.updateComplete;window.failNextSave=true;});
  await page.getByRole('button',{name:'Alles für Alle speichern',exact:true}).click();
  await page.waitForFunction(()=>editor._defaultStatus?.includes('simulated save failure'));
  assert.equal(await page.evaluate(()=>testFiles.get('themes/dash6-satin-glass.yaml').includes('0.22')),true);
  await page.getByRole('button',{name:'Alles für Alle speichern',exact:true}).click();
  await page.waitForFunction(()=>editor._defaultStatus?.startsWith('Als Theme-Default'));
  const published=await page.evaluate(()=>testShared);
  assert.equal(published.themes['DASH6 Satin Glass'].values['dash6-light-glass-opacity'],'0.37');
  assert.equal(published.themes['DASH6 Satin Glass'].values['dash6-switch-track-border'],'7px solid red');
  assert.deepEqual(await page.evaluate(()=>testWrites),['liquid-glass/theme-defaults.json']);
  shared={version:1,themes:{'DASH6 Satin Glass':{revision:'r2',values:{'dash6-light-glass-opacity':'0.22',_controls:{light_glass_opacity:22}}}}};
  await init();await page.waitForFunction(()=>window.__dash6ThemeSettings.readPreferences()['dash6-light-glass-opacity']==='0.22');
  await page.getByRole('button',{name:'Alles speichern',exact:true}).click();
  await page.evaluate(()=>{for(const d of editor.shadowRoot.querySelectorAll('details'))d.open=true;});
  await page.getByRole('button',{name:'Theme-Vorgaben wiederherstellen',exact:true}).click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('dash6-satin-theme-saved-v1')),null);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Alles für Alle speichern',exact:true}).scrollIntoViewIfNeeded();
  assert.equal(await page.getByRole('button',{name:'Alles für Alle speichern',exact:true}).evaluate(e=>e.getBoundingClientRect().right<=innerWidth),true);
  await page.screenshot({path:path.join(output,'Test-'+engine.name()+'-390.png')});
  assert.deepEqual(errors,[]);console.log('PASS '+engine.name()+': footer buttons, all groups/materials, browser persistence, new shared revision, admin controls, integration API, failed-save feedback, reset, 390px.');
 }finally{await browser.close();}
}
