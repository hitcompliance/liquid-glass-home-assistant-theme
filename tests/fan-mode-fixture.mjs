import {build} from 'esbuild';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {createServer} from 'node:http';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

// Isolated synthetic states only. The fixture never connects to Home Assistant.
export async function fanFixture(){
 const temp=await mkdtemp(tmpdir()+'/fan-modes-');
 await build({entryPoints:[fileURLToPath(new URL('../src/dash6/fan-mode-refinements.js',import.meta.url))],bundle:true,format:'esm',outfile:temp+'/fixture.js'});
 const html=`<!doctype html><html data-dash6-satin-preview><head><meta name="viewport" content="width=device-width"><style>
 html{--primary-text-color:#fff;--primary-color:#8af;--error-color:#f55;--dash6-satin-enabled:1;--dash6-satin-switch-duration:360ms;--dash6-satin-elastic-duration:240ms}body{background:#182027;margin:24px}
 </style></head><body><script type="module">
 window.travel=[];window.calls=[];
 // Timer tests opt into a controlled Date.now/interval clock. Paint and
 // timeout promises remain real so browser transition objects stay genuine.
 window.clock={now:Date.UTC(2030,0,1),intervals:new Map(),starts:0,clears:0};
 if(new URL(location.href).searchParams.has('clock')){
  Date.now=()=>clock.now;let next=1;
  window.setInterval=(callback,delay)=>{const id=next++;clock.intervals.set(id,{callback,delay});clock.starts++;return id;};
  window.clearInterval=id=>{if(clock.intervals.delete(id))clock.clears++;};
  clock.advance=seconds=>{clock.now+=seconds*1000;for(const {callback} of [...clock.intervals.values()])callback();};
 }
 // Local stand-in for HA's icon renderer, so screenshots also show the
 // semantic glyph and its real control opacity without loading any HA page.
 customElements.define('ha-icon',class extends HTMLElement{
  connectedCallback(){const icon=this.getAttribute('icon')||'';const shape=icon.includes('power')?'<path d="M12 3v9M6.3 5.8a8 8 0 1 0 11.4 0"/>':icon.includes('autorenew')?'<path d="M19 8a8 8 0 0 0-13-3L3 8m0-5v5h5M5 16a8 8 0 0 0 13 3l3-3m0 5v-5h-5"/>':'<circle cx="12" cy="12" r="2"/><path d="M12 10c-5-9 8-10 6-4l-4 5M14 12c10-1 6 11 1 7l-2-5M11 14c-5 8-12-2-6-4l5 1"/>';this.innerHTML='<svg viewBox="0 0 24 24" style="display:block;width:var(--mdc-icon-size,20px);height:var(--mdc-icon-size,20px);fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round">'+shape+'</svg>';}
 });
 const attach=Element.prototype.attachShadow;
 Element.prototype.attachShadow=function(options){const root=attach.call(this,options);root.addEventListener('transitionrun',e=>{if(e.target.classList.contains('lens')&&e.propertyName==='translate')travel.push({id:this.id,time:performance.now()});});return root;};
 await import('/fixture.js');
 window.sleep=ms=>new Promise(r=>setTimeout(r,ms));window.paint=async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await sleep(30);};
 window.config={entity:'fan.example',force_switch_entity:'input_boolean.example_force'};
 window.state=(main='on',force='off',extra={})=>({states:{'fan.example':{state:main,attributes:extra},'input_boolean.example_force':{state:force,attributes:{}}},callService:async(d,s,p)=>{calls.push([d,s,p.entity_id]);}});
 window.make=async(id='fan',main='on',force='off')=>{const s=document.createElement('dash6-fan-mode-switch');s.id=id;s.setConfig(config);s.hass=state(main,force);document.body.append(s);await s.updateComplete;await paint();return s;};
 window.stamp=async(main,force,extra={})=>{sw.hass=state(main,force,extra);await sw.updateComplete;await paint();};window.sw=await make();window.ready=true;
 window.timerState=(state,seconds,extra={})=>({state,attributes:{remaining:'00:'+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'),...(state==='active'?{finishes_at:new Date(clock.now+seconds*1000).toISOString()}:{}),...extra}});
 window.setTimer=async(timer,main='on',force='on')=>{sw.setConfig({...config,timer_entity:'timer.example'});const h=state(main,force);if(timer)h.states['timer.example']=timer;sw.hass=h;await sw.updateComplete;await paint();return h;};
 </script></body></html>`;
 const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?await readFile(temp+'/fixture.js'):html);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,close:async()=>{await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}};
}
