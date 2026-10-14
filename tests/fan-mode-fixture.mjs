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
 const attach=Element.prototype.attachShadow;
 Element.prototype.attachShadow=function(options){const root=attach.call(this,options);root.addEventListener('transitionrun',e=>{if(e.target.classList.contains('lens')&&e.propertyName==='translate')travel.push({id:this.id,time:performance.now()});});return root;};
 await import('/fixture.js');
 window.sleep=ms=>new Promise(r=>setTimeout(r,ms));window.paint=async()=>{await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));await sleep(30);};
 window.config={entity:'fan.example',force_switch_entity:'input_boolean.example_force'};
 window.state=(main='on',force='off',extra={})=>({states:{'fan.example':{state:main,attributes:extra},'input_boolean.example_force':{state:force,attributes:{}}},callService:async(d,s,p)=>{calls.push([d,s,p.entity_id]);}});
 window.make=async(id='fan',main='on',force='off')=>{const s=document.createElement('dash6-fan-mode-switch');s.id=id;s.setConfig(config);s.hass=state(main,force);document.body.append(s);await s.updateComplete;await paint();return s;};
 window.stamp=async(main,force,extra={})=>{sw.hass=state(main,force,extra);await sw.updateComplete;await paint();};window.sw=await make();window.ready=true;
 </script></body></html>`;
 const server=createServer(async(req,res)=>{res.setHeader('Content-Type',req.url==='/fixture.js'?'text/javascript':'text/html');res.end(req.url==='/fixture.js'?await readFile(temp+'/fixture.js'):html);});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:'http://127.0.0.1:'+server.address().port,close:async()=>{await new Promise(resolve=>server.close(resolve));await rm(temp,{recursive:true,force:true});}};
}
