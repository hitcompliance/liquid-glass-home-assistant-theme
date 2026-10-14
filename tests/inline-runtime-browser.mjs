import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';

// Test the actual public runtime entry without importing the compatibility store.
const result=await build({entryPoints:[fileURLToPath(new URL('../src/dash6/inline-card.js',import.meta.url))],bundle:true,write:false,format:'esm',loader:{'.css':'text'},metafile:true});
assert.equal(Object.keys(result.metafile.inputs).some(name=>/profiles-store|profile-index|profiles\.json/.test(name)),false);
const bundle=result.outputFiles[0].text;
const html=`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;color:white;background:#123;--divider-color:#888;--dash6-satin-enabled:1}dash6-direct-card{display:block;width:100%}</style><script type="module">
window.actions=[];window.requests=[];
class Neutral extends HTMLElement{
 constructor(){super();this.attachShadow({mode:'open'});this.shadowRoot.innerHTML='<ha-card style="display:block"><div class="controls"><button>A</button><button>B</button><button>C</button></div></ha-card>';this.addEventListener('click',()=>actions.push('device'));}
 setConfig(config){this._config=config;}
 set hass(hass){this._hass=hass;this.updates=(this.updates||0)+1;}
 get updateComplete(){return Promise.resolve();}
 connectedCallback(){const card=this.shadowRoot.querySelector('ha-card');this.initialHeight=getComputedStyle(card).height;this.initialRadius=getComputedStyle(card).borderRadius;}
 getCardSize(){return 2;}
}
customElements.define('neutral-device',Neutral);customElements.define('hui-heading-card',class extends Neutral{});
window.loadCardHelpers=async()=>({createCardElement:config=>{const tag=config.type.startsWith('custom:')?config.type.slice(7):'hui-'+config.type+'-card';const card=document.createElement(tag);card.setConfig(config);return card;}});
await import('/runtime.js');
window.hass={states:{'sensor.neutral':{state:'12',attributes:{}}},entities:{}};
window.card=document.createElement('dash6-direct-card');card.setConfig({card:{type:'custom:neutral-device',entity:'sensor.neutral',dash6_css:{style:'ha-card{height:116px;border-radius:16px}.controls{display:grid;grid-template-columns:repeat(3,1fr)}'}}});card.hass=hass;document.body.append(card);window.ready=true;
</script></html>`;
const requests=[];
const server=createServer((req,res)=>{requests.push(req.url);res.setHeader('content-type',req.url==='/runtime.js'?'text/javascript':'text/html');res.end(req.url==='/runtime.js'?bundle:html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(const [name,engine] of Object.entries({chromium,webkit})){
  const browser=await engine.launch({headless:true});
  try{
   const page=await browser.newPage({viewport:{width:390,height:700}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.ready&&card._child?.isConnected);
   const first=await page.evaluate(()=>({height:card._child.initialHeight,radius:card._child.initialRadius,api:Object.keys(window.__dash6Cards),columns:getComputedStyle(card._child.shadowRoot.querySelector('.controls')).gridTemplateColumns.split(' ').length}));
   assert.equal(first.height,'116px',name+' material geometry before first connected render');assert.equal(first.radius,'16px');assert.equal(first.columns,3);
   assert.ok(first.api.includes('overlay')&&first.api.includes('remote')&&first.api.includes('create')&&first.api.includes('mapCards'));
   assert.equal(first.api.includes('profile')||first.api.includes('loadProfile'),false);
   await page.evaluate(()=>{window.firstChild=card._child;card.setConfig(structuredClone(card._publicConfig));card.hass={...hass,states:{'sensor.neutral':{state:'13',attributes:{}}}};});
   await page.waitForFunction(()=>card._child?._hass?.states['sensor.neutral'].state==='13');assert.equal(await page.evaluate(()=>card._child===firstChild),true,'identical config and hass update reuse child');
   await page.evaluate(()=>{card.remove();document.body.append(card);});await page.waitForFunction(()=>card._child?.isConnected);
   assert.equal(await page.evaluate(()=>card._publicConfig.card.entity),'sensor.neutral','inline definition survives reconnect');
   assert.equal(await page.evaluate(()=>window.__dash6Cards.mapCards({type:'thermostat',entity:'climate.neutral'}).type),'custom:dash6-thermostat-card');
   assert.equal(await page.evaluate(()=>actions.length),0);assert.deepEqual(errors,[]);
  }finally{await browser.close();}
 }
 assert.equal(requests.some(url=>/profiles|room-loader|\.json/.test(url)),false,'direct runtime never fetches external configuration');
 console.log('Inline runtime: Chromium/WebKit first-render material, controls, child reuse, reconnect, hooks and no profile dependency passed.');
}finally{await new Promise(resolve=>server.close(resolve));}
