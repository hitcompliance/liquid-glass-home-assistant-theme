import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {chromium,webkit} from 'playwright';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

// Actual CSS translate starts, including delayed theme binding and native redraw.
// Synthetic public entities; no HA connection and no device services.
const root=fileURLToPath(new URL('..',import.meta.url));
const temp=await mkdtemp(tmpdir()+'/glass-switch-motion-');
await build({stdin:{contents:`export {LitElement,html} from 'lit';export {keyed} from 'lit/directives/keyed.js';export {bindSatinNativeCard} from './src/dash6/satin-native.js';import './src/dash6/glass-switch.js';import './src/dash6/universal-material-refinements.js';`,resolveDir:root},bundle:true,format:'esm',outfile:temp+'/fixture.js'});
const html=`<!doctype html><html data-dash6-satin-preview><head><style>
html{--primary-text-color:white;--primary-color:#8af;--dash6-satin-card-background:#765432;--dash6-satin-card-border:2px solid red;--dash6-satin-card-shadow:0 0 9px red;--dash6-satin-switch-duration:360ms;--dash6-satin-elastic-duration:240ms}body{background:#182027}
</style></head><body><script type="module">
window.travel=[];window.actions=[];window.services=[];
const attach=Element.prototype.attachShadow;
Element.prototype.attachShadow=function(options){const root=attach.call(this,options);root.addEventListener('transitionrun',e=>{if(e.target.classList.contains('lens')&&e.propertyName==='translate')travel.push({id:this.id,time:performance.now()});});return root;};
const {LitElement,html,keyed,bindSatinNativeCard}=await import('/fixture.js');window.bindSatinNativeCard=bindSatinNativeCard;
window.sleep=ms=>new Promise(r=>setTimeout(r,ms));
window.paint=async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await sleep(30);};
window.state=(on,brightness=128)=>({states:{'light.test':{entity_id:'light.test',state:on?'on':'off',attributes:{brightness,supported_color_modes:['hs'],hs_color:[30,70]}}},callService:()=>{services.push('unexpected');throw Error('No services allowed');}});
window.make=async(id,on=true)=>{const s=document.createElement('dash6-glass-switch');s.id=id;s.setConfig({entity:'light.test'});s.hass=state(on);document.body.append(s);await s.updateComplete;await paint();return s;};
class NativeIcon extends LitElement{
 static properties={hass:{attribute:false},phase:{state:true}};
 constructor(){super();this.phase=0;this._config={type:'custom:button-card',entity:'light.test',icon:'mdi:power',show_name:false,show_state:false,tap_action:{action:'toggle'},styles:{card:[{width:'42px'},{height:'42px'}]}};}
 render(){return html\`<style>#card{background:#aaa;border:3px solid blue;box-shadow:0 0 5px blue}#card::before,#card::after{content:'';position:absolute;inset:0;background:red;border:2px solid red;box-shadow:0 0 4px red}</style><ha-card id="card" @action=\${e=>actions.push(e.detail.action)}>\${keyed(this.phase,html\`<div id="img-cell"><ha-state-icon id="icon"></ha-state-icon></div>\`)}</ha-card>\`;}
}
customElements.define('fixture-native-icon',NativeIcon);window.ready=true;
</script></body></html>`;
const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?await readFile(temp+'/fixture.js'):html);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try{
 for(const [name,launcher] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await launcher.launch({headless:true});
  try{
   const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(`http://127.0.0.1:${server.address().port}/`);await page.waitForFunction(()=>window.ready);
   const result=await page.evaluate(async()=>{
    const s=await make('direct');
    document.documentElement.style.setProperty('--dash6-satin-enabled','1');await paint();await sleep(450);
    const themeMount=travel.length;travel.length=0;
    const lens=s.shadowRoot.querySelector('.lens'),pos=()=>parseFloat(getComputedStyle(lens).translate)||0;
    s.hass=state(false);await s.updateComplete;
    // Inspect the real CSS transition in the same task as Lit's commit. Pause
    // its clock at a finite midpoint so slow CI frames cannot finish and remove
    // it before the identity check. CSS cancellation/restarts still create a
    // different object and fail, including during the subsequent painted updates.
    const transition=lens.getAnimations().find(a=>a.transitionProperty==='translate');
    if(!transition)throw Error('Real state change did not create a translate transition');
    const travelDuration=transition.effect.getTiming().duration;
    transition.pause();transition.currentTime=travelDuration/3;await transition.ready;await paint();const first=travel.length;
    const inFlight={playState:transition.playState,currentTime:transition.currentTime,duration:travelDuration};
    const identities=[];
    for(let i=0;i<3;i++){s.setConfig({entity:'light.test'});s.hass=state(false,40+i*20);s._squeezing=i===1;s.visual={...s.model,brightness:40+i*20,color:'#aaf',satinColor:'#fa0',group:true,count:i,total:3,colors:['red','blue','green']};await s.updateComplete;await paint();identities.push(transition===lens.getAnimations().find(a=>a.transitionProperty==='translate'));}
    const same=travel.length,retained=identities.every(Boolean);
    const beforeReverse=pos();s.visual=undefined;s.hass=state(true);await s.updateComplete;
    const reverseStart=pos();await paint();const reversals=travel.length;await sleep(500);const final=pos();
    const recreated=await make('recreated',false);for(let i=0;i<5;i++){recreated.hass=state(false,80+i);await recreated.updateComplete;await paint();}
    const recreatedStarts=travel.filter(e=>e.id==='recreated').length;
    const late=document.createElement('dash6-glass-switch');late.id='late';late.setConfig({entity:'light.test'});document.body.append(late);await late.updateComplete;await paint();late.hass=state(true);await late.updateComplete;await paint();const lateStarts=travel.filter(e=>e.id==='late').length;
    const native=document.createElement('fixture-native-icon');native.hass=state(true);document.body.append(native);await native.updateComplete;await paint();const frame=native.shadowRoot.querySelector('#card'),initialUnified=frame.hasAttribute('data-dash6-unified-glass');const adapter=bindSatinNativeCard(native,native._config);await adapter.control.updateComplete;await paint();
    const readPlate=()=>{const surface=getComputedStyle(frame);return {background:surface.backgroundColor,image:surface.backgroundImage,border:surface.borderTopWidth,shadow:surface.boxShadow,before:getComputedStyle(frame,'::before').display,after:getComputedStyle(frame,'::after').display,marked:frame.hasAttribute('data-dash6-satin-surface'),unified:frame.hasAttribute('data-dash6-unified-glass')};};const plate=readPlate();
    travel.length=0;for(let i=0;i<4;i++){native.phase++;await native.updateComplete;await paint();}const redrawStarts=travel.length;const redrawPlate=readPlate();
    // Theme refresh and native style changes must not reacquire a glass plate.
    frame.style.setProperty('width','42px');window.dispatchEvent(new Event('theme-changed'));await paint();const refreshedPlate=readPlate();
    adapter.control.shadowRoot.querySelector('button').click();await sleep(150);
    s.setConfig({entity:'light.test',child_lock:true});await s.updateComplete;s.shadowRoot.querySelector('button').click();await s.updateComplete;const rejected=s._rejecting;await sleep(520);
    return {themeMount,first,same,inFlight,identities,retained,reversals,beforeReverse,reverseStart,final,recreatedStarts,lateStarts,redrawStarts,initialUnified,plate,redrawPlate,refreshedPlate,actions:actions.length,services:services.length,rejected,cleared:!s._rejecting,duration:getComputedStyle(lens).transitionDuration};
   });
   console.log(name+': '+JSON.stringify(result));
   assert.equal(result.themeMount,0,'delayed theme binding must not animate a known state');assert.equal(result.first,1);assert.equal(result.same,1);assert.equal(result.retained,true,'same-target in-flight transition retains its identity');assert.equal(result.reversals,2);
   assert.equal(result.inFlight.playState,'paused');assert.ok(result.inFlight.currentTime>0&&result.inFlight.currentTime<result.inFlight.duration,'identity checks use a genuine unfinished transition');assert.deepEqual(result.identities,[true,true,true]);
   assert.ok(result.beforeReverse>0&&result.beforeReverse<55);assert.ok(Math.abs(result.beforeReverse-result.reverseStart)<5,'counterchange starts at current rendered position');assert.equal(result.final,0);assert.equal(result.recreatedStarts,0);assert.equal(result.lateStarts,0);assert.equal(result.redrawStarts,0);
   assert.equal(result.initialUnified,true,'fixture exercises unified glass before compact classification');
   const clearPlate={background:'rgba(0, 0, 0, 0)',image:'none',border:'0px',shadow:'none',before:'none',after:'none',marked:false,unified:false};assert.deepEqual(result.plate,clearPlate);assert.deepEqual(result.redrawPlate,clearPlate);assert.deepEqual(result.refreshedPlate,clearPlate);
   assert.equal(result.actions,1);assert.equal(result.services,0);assert.equal(result.rejected,true);assert.equal(result.cleared,true);assert.ok(result.duration.includes('0.36s')&&result.duration.includes('0.24s'));assert.deepEqual(errors,[]);
   await page.locator('#direct').hover();
   await page.waitForFunction(()=>parseFloat(getComputedStyle(document.querySelector('#direct').shadowRoot.querySelector('.lens')).scale)>1,'hover feedback remains');
   await page.mouse.down();
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#direct').shadowRoot.querySelector('.lens')).transform.startsWith('matrix(1.1, 0, 0, 0.86'),'press feedback remains');
   await page.mouse.move(500,500);await page.mouse.up();
   await page.emulateMedia({reducedMotion:'reduce'});
   const reduced=await page.evaluate(async()=>{travel.length=0;const s=document.querySelector('#direct');s.hass=state(false);await s.updateComplete;await paint();return {starts:travel.length,scale:getComputedStyle(s.shadowRoot.querySelector('.lens')).scale};});
   assert.deepEqual(reduced,{starts:0,scale:'1'});assert.deepEqual(errors,[]);
  }catch(error){throw new Error(name+' motion regression failed: '+error.message,{cause:error});}finally{await browser.close();}
 }
}finally{await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}
