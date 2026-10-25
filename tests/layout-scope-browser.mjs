import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium, webkit} from 'playwright';

const bundle = await build({stdin:{contents:"import {inLayoutScope} from './src/dash6/layout-scope.js';import {syncResponsiveSections} from './src/dash6/sections-responsive.js';window.layoutTest={inLayoutScope,syncResponsiveSections};",resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
for (const engine of [chromium,webkit]) {
 const browser = await engine.launch();
 try {
  const page = await browser.newPage({viewport:{width:1200,height:800}});
  await page.route('http://layout.test/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0;--dash6-satin-enabled:1"></body>'}));
  await page.goto('http://layout.test/my-own-dashboard/room');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  await page.evaluate(()=>{
   window.outer=document.createElement('hui-view');document.body.append(outer);
   const wrapper=document.createElement('div');outer.append(wrapper);wrapper.attachShadow({mode:'open'});
   window.inner=document.createElement('hui-view');wrapper.shadowRoot.append(inner);
   inner._config={type:'panel',cards:[{type:'custom:dash6-ultra-card'}]};
   window.sections=document.createElement('hui-sections-view');inner.append(sections);
   sections.attachShadow({mode:'open'}).innerHTML='<style>.content{display:grid;grid-template-columns:2fr 1fr}.section{height:40px}</style><div class="content"><div class="section">A</div><div class="section">B</div></div>';
   sections._config={max_columns:10,sections:[{column_span:4},{column_span:6}]};
  });
  for (const [config,expected] of [
   [{type:'panel',cards:[{type:'custom:dash6-ultra-card'}]},true],
   [{type:'sections',cards:[{type:'custom:dash6-ultra-card'}]},false],
   [{panel:true,cards:[{type:'custom:dash6-ultra-card'}]},false],
   [{type:'panel',cards:[{type:'custom:ultra-card'}]},false],
   [{type:'panel',cards:[{type:'entities'},{type:'custom:dash6-ultra-card'}]},false],
   [{type:'panel',cards:[]},false],
   [{type:'panel'},false],
   [null,false],
  ]) {
   const state=await page.evaluate(config=>{
    outer._config=config;layoutTest.syncResponsiveSections(sections);
    const content=sections.shadowRoot.querySelector('.content');
    return {active:layoutTest.inLayoutScope(sections),marked:sections.hasAttribute('data-liquid-glass-sections-layout'),style:!!sections.shadowRoot.querySelector('style[data-liquid-glass-sections-style]'),widths:[...content.children].map(e=>e.getBoundingClientRect().width)};
   },config);
   assert.equal(state.active,expected,JSON.stringify(config));
   assert.equal(state.marked,expected);assert.equal(state.style,expected);
   if(!expected)assert.ok(Math.abs(state.widths[0]/state.widths[1]-2)<.01,'Native 2:1 grid restored');
  }
  // Existing theme and legacy markers cannot activate a native Energy view.
  assert.equal(await page.evaluate(()=>{
   const preview=document.createElement('hui-view-container');preview.viewConfig={type:'panel',cards:[{type:'custom:dash6-ultra-card'}]};document.body.replaceChildren(preview);
   const embedded=document.createElement('hui-view');embedded._config={type:'sections'};preview.append(embedded);
   const child=document.createElement('div');embedded.append(child);return layoutTest.inLayoutScope(child);
  }),true,'The outer standalone preview view also wins over embedded view config');
  await page.goto('http://layout.test/energy/electricity');
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  assert.equal(await page.evaluate(()=>{
   const view=document.createElement('hui-view');view._config={type:'sections'};document.body.append(view);
   const host=document.createElement('hui-sections-view');view.append(host);
   host.attachShadow({mode:'open'}).innerHTML='<style data-dash6-sections-style></style><div class="content"><div class="section" data-dash6-section-empty style="--dash6-section-row:2"></div></div>';
   host.setAttribute('data-dash6-sections-layout','');host.style.setProperty('--dash6-section-heading-font-size','18px');
   layoutTest.syncResponsiveSections(host);
   return !host.hasAttribute('data-dash6-sections-layout')&&!host.shadowRoot.querySelector('[data-dash6-section-empty],style[data-dash6-sections-style]')&&host.style.getPropertyValue('--dash6-section-heading-font-size')==='18px';
  }),true);
  console.log(engine.name()+': exact outer view structure, arbitrary dashboard path, nested shadow view, native grid restoration and Energy legacy cleanup passed');
 } finally {await browser.close();}
}
