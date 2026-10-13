import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(tmpdir()+'/navigation-lens-');
await build({entryPoints:[root+'/src/dash6/hooks.js'],bundle:true,format:'esm',outfile:temp+'/hooks.js'});
const base=await readFile(root+'/src/dash6/base.css','utf8');
const navCSS=base.slice(base.indexOf('/* DASH6 navigation lens:'),base.indexOf('/* Optical icon lenses:'));
const html=`<!doctype html><html><head><style>html{--dash6-satin-enabled:1;--primary-text-color:white;--primary-color:#8af;--dash5-elasticity:1}body{background:#17202b}fixture-link{display:block;width:250px}</style></head><body><script type="module">
import {overlay} from '/hooks.js';
class Link extends HTMLElement{constructor(){super();this.attachShadow({mode:'open'}).innerHTML='<style>ha-card{display:block;height:42px;border:0;background:transparent;box-shadow:none}'+${JSON.stringify(navCSS)}+'</style><ha-card><span id="name">Küche</span></ha-card>';}}
customElements.define('fixture-link',Link);window.desktop=[];
for(const active of [true,false]){const host=document.createElement('fixture-link');host.className='dash5-navigation-link dash6-nav-lens';host.dataset.navActive=String(active);document.body.append(host);desktop.push(host);}
window.loadCardHelpers=async()=>({});window.__dash6Cards={};
const trigger=document.createElement('button');trigger.textContent='Open';trigger._config={variables:{room_title:'Küche',sidebar_cards:[{type:'custom:vertical-stack-in-card',cards:[{name:'Küche',icon:'mdi:stove',tap_action:{navigation_path:'/dash-6/kuche'}},{name:'Other',icon:'mdi:home',tap_action:{navigation_path:'/dash-6/other'}}]}]}};trigger._hass={};document.body.append(trigger);overlay(trigger,{},'');trigger.click();window.ready=true;
</script></body></html>`;
const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/hooks.js'?'text/javascript':'text/html');res.end(req.url==='/hooks.js'?await readFile(temp+'/hooks.js'):html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/dash-6/kuche`);await page.waitForFunction(()=>window.ready&&document.querySelector('#embedded-sidebar-modal nav a[aria-current=page]'));
 const read=()=>page.evaluate(()=>{const style=e=>{const s=getComputedStyle(e);return {background:s.backgroundImage,border:s.borderTopWidth,shadow:s.boxShadow};};return {desktop:desktop.map(h=>style(h.shadowRoot.querySelector('ha-card'))),overlay:[...document.querySelectorAll('#embedded-sidebar-modal nav a')].map(style)};});
 const defaults=await read();for(const values of [defaults.desktop,defaults.overlay]){assert.ok(values[0].background.includes('radial-gradient(110% 95%'),'Active glass uses the bedroom reference sheen');assert.ok(values[0].background.includes('rgba(98, 105, 112, 0.24)'),'Active glass uses the bedroom reference material');assert.ok(values[0].shadow.includes('rgba(255, 255, 255, 0.38)'),'Active glass uses the bedroom reference inset highlight');}for(const values of [defaults.desktop,defaults.overlay]){assert.notEqual(values[0].background,'none');assert.equal(values[0].border,'1px');assert.notEqual(values[0].shadow,'none');assert.equal(values[1].background,'none');assert.equal(values[1].shadow,'none');}
 await page.evaluate(()=>{for(const host of [desktop[0],document.querySelector('#embedded-sidebar-modal')]){host.style.setProperty('--dash6-nav-lens-active-background','linear-gradient(rgb(10,20,30),rgb(40,50,60))');host.style.setProperty('--dash6-nav-lens-active-border','2px solid rgb(7,8,9)');host.style.setProperty('--dash6-nav-lens-active-shadow','rgb(1,2,3) 0px 3px 6px');}});
 const themed=await read();for(const values of [themed.desktop,themed.overlay]){assert.equal(values[0].border,'2px');assert.ok(values[0].background.includes('rgb(10, 20, 30)'));assert.ok(values[0].shadow.includes('rgb(1, 2, 3)'));}
 assert.deepEqual(errors,[]);console.log('PASS: desktop sidebar and real mobile overlay retain active glass background, border and shadow without theme tokens; inactive links stay neutral; explicit theme overrides win. No navigation or services performed.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
