import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
const built=await build({entryPoints:[fileURLToPath(new URL('../src/dash6/favorites-gui.js',import.meta.url))],bundle:true,write:false,format:'esm'});
const html=`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;--divider-color:#888;--primary-text-color:#fff;--card-background-color:#123;background:#123;color:#fff;margin:12px}</style><script type="module">
window.services=[];window.subscriptions=0;window.unsubscribed=0;
customElements.define('neutral-preview',class extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'});}setConfig(c){this._config=c;this.shadowRoot.textContent='Read-only preview';}});
window.__dash6Cards={create:async c=>{const card=document.createElement('neutral-preview');card.setConfig(c);return card;}};
await import('/favorites.js');
const domain={type:'custom:dash6-domain-card',cards:[{type:'custom:vertical-stack-in-card',cards:[{type:'heading',heading:'Devices'},{type:'tile',entity:'switch.known'}]}],known_entity_ids:['switch.known'],combine:true,columns:2,edge_alignment:'flush',query:{group:'neutral-group',template:'{{ fixture_cards | to_json }}',index:0,canonical:true}};
window.dashboard={views:[{path:'room',title:'Room',cards:[domain,{type:'custom:dash6-direct-card',card:{type:'tile',entity:'light.neutral'}}]}]};window.original=JSON.stringify(dashboard);
window.hass={states:{'switch.known':{state:'on',attributes:{friendly_name:'Known'}},'switch.extra':{state:'on',attributes:{friendly_name:'Extra'}},'light.neutral':{state:'on',attributes:{friendly_name:'Neutral'}}},entities:{},callService:async(...args)=>services.push(args),callWS:async()=>dashboard,connection:{subscribeMessage:async callback=>{subscriptions++;setTimeout(()=>callback({result:JSON.stringify({'0':JSON.stringify([[{type:'tile',entity:'switch.known'},{type:'tile',entity:'switch.extra'}]])})}),0);return()=>unsubscribed++;}}};
window.editor=document.createElement('dash6-favorites-editor');editor.setConfig({dashboard:'example',sources:[],selected:[],grouping:'none'});editor.hass=hass;document.body.append(editor);window.ready=true;
</script>`;
const requests=[];
const server=createServer((req,res)=>{requests.push(req.url);res.setHeader('content-type',req.url==='/favorites.js'?'text/javascript':'text/html');res.end(req.url==='/favorites.js'?built.outputFiles[0].text:html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:'+server.address().port+'/example/favorites');await page.waitForFunction(()=>window.editor?._catalog?.length===2&&!window.editor?._loading);
   assert.equal(await page.evaluate(()=>editor._catalog[1].card.type),'tile','fresh direct card is transparently resolved');
   await page.getByRole('textbox',{name:'Karten oder Ansichten suchen',exact:true}).fill('Room');
   const root=page.getByRole('checkbox',{name:'custom:dash6-render-card',exact:true});await root.check();await page.getByRole('checkbox',{name:'Known',exact:true}).uncheck();
   assert.equal(await page.getByRole('checkbox',{name:'Known',exact:true}).isChecked(),false);assert.equal(await root.isChecked(),true);
   await page.getByRole('button',{name:'Enthaltene Karten ermitteln',exact:true}).click();await page.waitForFunction(()=>editor._catalog[0].label.includes('ermittelte Karten')&&!editor._dynamicBusy.size);
   assert.equal(await page.getByRole('checkbox',{name:'Known',exact:true}).isChecked(),false,'known exclusion survives actual GUI materialization');
   assert.equal(await page.getByRole('checkbox',{name:'Extra',exact:true}).isChecked(),true,'new child inherits selected parent');
   assert.equal(await page.evaluate(()=>editor._config.selected.includes(editor._catalog[0].id)),true,'parent selection is stable');
   assert.equal(await page.evaluate(()=>subscriptions),1);assert.equal(await page.evaluate(()=>unsubscribed),1);
   await page.evaluate(()=>window.saved=JSON.stringify(editor._config));await page.getByRole('button',{name:'Quellen aktualisieren',exact:true}).click();await page.waitForFunction(()=>!editor._loading);
   assert.equal(await page.evaluate(()=>JSON.stringify(editor._config)===saved),true,'refresh preserves selected snapshots byte-identically');
   assert.equal(await page.evaluate(()=>JSON.stringify(dashboard)===original),true);assert.equal(await page.evaluate(()=>services.length),0);assert.deepEqual(errors,[]);
   console.log(name+': Favorites inline catalog, discovery, child exclusions, snapshot refresh and no device actions passed.');
  }finally{await browser.close();}
 }
 assert.equal(requests.some(url=>/profiles|room-loader|\.json/.test(url)),false,'fresh inline catalog never fetches an external store');
}finally{await new Promise(resolve=>server.close(resolve));}
