import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import {createServer} from 'node:http';
import assert from 'node:assert/strict';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html');res.end('<!doctype html><body></body>');});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const bundle=await build({stdin:{contents:"export * from './src/dash6/background-image-variants.js';export * from './src/dash6/responsive-background.js';export * from './src/dash6/theme-editor.js';",resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'B',define:{'import.meta.url':JSON.stringify(origin+'/runtime.js')},logLevel:'silent'});
try{for(const [name,engine] of Object.entries({chromium,webkit})){
 const browser=await engine.launch({headless:true});try{
 const page=await browser.newPage();await page.goto(origin+'/dash-6/test');
 await page.evaluate(()=>customElements.define('hui-view-background',class extends HTMLElement{updated(){};}));
 await page.addScriptTag({content:bundle.outputFiles[0].text});
 const result=await page.evaluate(async()=>{
 const wait=async(predicate)=>{for(let n=0;n<300;n++){if(predicate())return;await new Promise(r=>setTimeout(r,20));}throw Error('timeout '+B.backgroundVariantStatus().state+' image='+getComputedStyle(document.querySelector('hui-view-background')).backgroundImage.slice(0,100)+' styleLen='+document.querySelector('hui-view-background').style.cssText.length);};
 const canvas=document.createElement('canvas');canvas.width=1920;canvas.height=128;const c=canvas.getContext('2d');for(let x=0;x<1920;x++){c.fillStyle=x%12<6?'#fff':'#123456';c.fillRect(x,0,1,128);}const source=canvas.toDataURL();
 const host=document.createElement('hui-view-background');host.style.cssText=`--view-background: linear-gradient(#0001,#0002), url('${source}');background:var(--view-background) center/cover no-repeat;opacity:.7;position:fixed`;document.body.append(host);host.updated();await new Promise(r=>setTimeout(r,30));const original=host.style.backgroundImage;const initial=B.backgroundVariantStatus().state;
 const choose=value=>{document.documentElement.style.setProperty('--dash6-background-image-variant',value);window.dispatchEvent(new Event('dash6-theme-settings-changed'));};
 choose('light');await wait(()=>B.backgroundVariantStatus().state==='ready');const ready=B.backgroundVariantStatus();const style={image:host.style.backgroundImage,position:host.style.position,opacity:host.style.opacity,size:getComputedStyle(host).backgroundSize,filter:host.style.filter};
 const variants=await B.prepareBackgroundVariants(source,new URL('/assets/',location.href));const repeated=await B.prepareBackgroundVariants(source,new URL('/assets/',location.href));const sizes=Object.values(variants.variants).map(b=>b.size);const checksums=await Promise.all(Object.values(variants.variants).map(async b=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await b.arrayBuffer()))).join(',')));
 choose('softer');choose('original');await wait(()=>B.backgroundVariantStatus().state==='original');await new Promise(r=>setTimeout(r,40));const restored=host.style.backgroundImage===original;
 choose('very_light');await wait(()=>B.backgroundVariantStatus().state==='ready');history.pushState({},'', '/dashboard-dash7/test');window.dispatchEvent(new Event('location-changed'));await wait(()=>host.style.backgroundImage===original);const excluded=host.style.backgroundImage===original;
 history.pushState({},'', '/dash-6/test');choose('light');await wait(()=>B.backgroundVariantStatus().state==='ready');host.style.setProperty('--view-background','url("/missing.png")');host.updated();await wait(()=>B.backgroundVariantStatus().state==='error');const failureOriginal=!host.style.backgroundImage.includes('blob:');
 const schema=B.themeControls.find(x=>x.name==='background_image_variant');const variables=B.settingsVariables({background_image_variant:'softer'});
 const card=document.createElement('dash6-theme-editor-card');card.setConfig({expanded:true});document.body.append(card);await card.updateComplete;card.change({...card.preferences(),background_image_variant:'light'},{...card.preferences(),background_image_variant:'original'});const saved=JSON.parse(localStorage.getItem('dash6-satin-theme-preferences-v1'));card.exportValues();const exported=card._export.includes('dash6-background-image-variant: "light"');card.reset();const reset=!localStorage.getItem('dash6-satin-theme-preferences-v1');
 const constant=new Uint8ClampedArray(16*16*4).fill(255);const flat=B.blurBitmap(constant,16,16,5).every(v=>v===255);const transparent=new Uint8ClampedArray([255,0,0,255,0,0,0,0,0,0,0,0]);const alpha=B.blurBitmap(transparent,3,1,1.5);const noBlackFringe=[0,4,8].every(i=>alpha[i+3]===0||alpha[i]===255);
 return {initial,ready:{state:ready.state,downloads:ready.downloads.length,width:ready.width,height:ready.height,persistent:ready.persistent},style:{...style,image:style.image.includes('linear-gradient')&&style.image.includes('blob:')},same:variants===repeated,sizes,different:new Set(checksums).size,restored,excluded,failureOriginal,schema:schema.selector.select.options.length,variables,saved:saved['dash6-background-image-variant'],exported,reset,flat,noBlackFringe,key:variants.key};
 });
 assert.equal(result.initial,'original');assert.equal(result.ready.downloads,3);assert.equal(result.ready.width,1920);assert.equal(result.ready.height,128);assert.equal(result.ready.persistent,true);assert.equal(result.style.image,true);assert.ok(result.style.size.includes('cover'));assert.equal(result.style.position,'fixed');assert.equal(result.style.opacity,'0.7');assert.equal(result.style.filter,'');assert.equal(result.same,true);assert.equal(result.different,3);for(const key of ['restored','excluded','failureOriginal','exported','reset','flat','noBlackFringe'])assert.equal(result[key],true,key);assert.equal(result.schema,4);assert.equal(result.saved,'light');assert.equal(result.variables['dash6-background-image-variant'],'softer');
 // Fresh module/page must reuse IndexedDB-generated blobs.
 await page.reload();await page.addScriptTag({content:bundle.outputFiles[0].text});
 const persisted=await page.evaluate(async key=>new Promise((resolve,reject)=>{const r=indexedDB.open('dash6-background-images-v1');r.onsuccess=()=>{const q=r.result.transaction('images').objectStore('images').get(key);q.onsuccess=()=>resolve(Object.keys(q.result.variants));q.onerror=reject;};r.onerror=reject;}),result.key);assert.equal(persisted.length,3);
 console.log('PASS',name,JSON.stringify({...result,key:undefined}));
 }finally{await browser.close();}
}}finally{server.close();}
