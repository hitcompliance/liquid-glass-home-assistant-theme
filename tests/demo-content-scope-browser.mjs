import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
const result=await build({stdin:{contents:"import{inDASH6ContentScope}from'./src/dash6/scope.js';import{syncGraphContent}from'./src/dash6/graph-card-content.js';window.contentScope={inDASH6ContentScope,syncGraphContent};",resolveDir:process.cwd()},bundle:true,format:'iife',write:false});
for(const engine of [chromium,webkit]){
 const browser=await engine.launch();try{
 const page=await browser.newPage();await page.route('http://scope.test/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));
 for(const [path,active,preview]of [['/dash-6/test',true,false],['/liquid-glass-demo/flur',true,false],['/liquid-glass-gallery/demo',true,false],['/liquid-glass-hue-demo/raum-test',true,false],['/unrelated',false,false],['/dash6-bkp-2/test',false,false],['/public-demo',true,true]]){
  await page.goto('http://scope.test'+path);if(preview)await page.evaluate(()=>document.documentElement.setAttribute('data-dash6-satin-preview',''));
  await page.addScriptTag({content:result.outputFiles[0].text});
  const state=await page.evaluate(()=>{const host=document.createElement('div');host.attachShadow({mode:'open'});host.shadowRoot.innerHTML='<ha-card id="card"><div id="graph"></div><div id="values"><div>24 W</div><div>10 kWh</div></div></ha-card>';document.body.append(host);contentScope.syncGraphContent(host);return{active:contentScope.inDASH6ContentScope(),hidden:getComputedStyle(host.shadowRoot.querySelector('#values').children[1]).display==='none'};});
  assert.equal(state.active,active,path);assert.equal(state.hidden,active,path);
 }
 console.log(engine.name()+': DASH6/demo graph scope, public preview and protected dashboard boundaries passed');
 }finally{await browser.close();}
}
