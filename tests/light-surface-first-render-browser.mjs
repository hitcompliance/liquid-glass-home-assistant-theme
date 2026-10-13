// Read the actual light renderer synchronously, before global surface discovery.
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const bundle=await build({entryPoints:['src/dash6/light-cards.js'],bundle:true,write:false,format:'iife',globalName:'LightCards',loader:{'.css':'text'},logLevel:'silent'});
for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:800,height:900}});await page.goto('about:blank');await page.evaluate(()=>{document.documentElement.setAttribute('data-dash6-satin-preview','');document.body.style.cssText='--dash6-satin-enabled:1;--dash6-satin-card-background:linear-gradient(135deg,rgba(255,255,255,.14),transparent 48%,rgba(255,255,255,.025)),rgba(24,28,34,.70);--dash6-satin-card-border:1px solid rgba(230,240,248,.22);--dash6-satin-card-shadow:inset 0 1px 0 rgba(255,255,255,.25),inset 0 -1px 2px rgba(0,0,0,.12),0 8px 24px rgba(0,0,0,.18);--dash6-satin-card-filter:blur(8px) saturate(1.08);--dash5-card-radius:16px;--dash6-material-796730b:rgba(0,0,0,.95);background:#456';});
  await page.addScriptTag({content:bundle.outputFiles[0].text});
  const result=await page.evaluate(()=>{
   const refHost=document.createElement('div'),root=refHost.attachShadow({mode:'open'});LightCards.addStyle(root);const ref=document.createElement('ha-card');ref.setAttribute('data-dash6-satin-surface','');root.append(ref);document.body.append(refHost);
   const card=document.createElement(LightCards.TYPES.light);card.setConfig({entity:'light.neutral',name:'Neutral light',main_back:{enabled:false},rows:{controls:false,scenes:false}});card.hass={states:{'light.neutral':{entity_id:'light.neutral',state:'on',attributes:{friendly_name:'Neutral light',supported_color_modes:['brightness'],color_mode:'brightness',brightness:180}}},entities:{},callService:()=>{throw Error('No service calls permitted');}};document.body.append(card);
   const read=n=>{const s=getComputedStyle(n);return Object.fromEntries(['backgroundColor','backgroundImage','borderTopColor','borderTopWidth','borderRadius','boxShadow','backdropFilter','opacity'].map(k=>[k,s[k]]));};
   const initial=card.shadowRoot.querySelector('ha-card.card'),first={marked:initial.hasAttribute('data-dash6-satin-surface'),material:read(initial)},reference=read(ref);
   card.render();const rerender=card.shadowRoot.querySelector('ha-card.card');return {first,reference,next:{marked:rerender.hasAttribute('data-dash6-satin-surface'),material:read(rerender)},controls:!!rerender.querySelector('dash6-glass-switch')};
  });assert.equal(result.first.marked,true);assert.equal(result.next.marked,true);assert.deepEqual(result.first.material,result.reference);assert.deepEqual(result.next.material,result.reference);assert.equal(result.controls,true);assert.equal(result.first.material.backgroundColor,'rgba(24, 28, 34, 0.7)');console.log(JSON.stringify({engine:name,...result}));
 }finally{await browser.close();}
}
