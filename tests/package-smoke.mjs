import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve,dirname,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {chromium,webkit} from 'playwright';

// Uses the checked-in portable dist, not the private staging bundle or a live HA.
// Only HA/vendor dependencies are stubs. Every package-owned Card is the real class.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const yaml=path=>JSON.parse(execFileSync('ruby',['-ryaml','-rjson','-e','puts JSON.generate(YAML.safe_load(STDIN.read,aliases:true))'],{input:readFileSync(resolve(root,path)),encoding:'utf8'}));
const dashboard=yaml('examples/dashboard.yaml'),themes=Object.assign({},...readdirSync(resolve(root,'themes')).filter(name=>/\.ya?ml$/.test(name)).map(name=>yaml('themes/'+name)));
const profileIndex=JSON.parse(await readFile(resolve(root,'src/dash6/profile-index.json'),'utf8'));
const profiles=JSON.parse(await readFile(resolve(root,'src/dash6/profiles.json'),'utf8'));
const demoDashboard=yaml('examples/demo-dashboard.yaml');
const demoConfigs=[];
function demoCollect(x){if(!x||typeof x!=='object')return;if(x.type==='custom:dash6-demo-card')demoConfigs.push(x);Object.values(x).forEach(demoCollect);}
demoCollect(demoDashboard);
const examples=[];
function collect(value){if(Array.isArray(value))return value.forEach(collect);if(!value||typeof value!=='object')return;if(value.type?.startsWith('custom:'))examples.push(value);Object.values(value).forEach(collect);}
collect(dashboard);
const ownExamples=examples.filter(c=>c.type.startsWith('custom:dash')||['custom:vacuum-dock-card','custom:liquid-glass-card'].includes(c.type));
const ownTypes=[...new Set(ownExamples.map(c=>c.type.slice(7)))];
assert.equal(ownTypes.length,29,'All 28 current package card/alias types plus the optional original SVG wrapper are in the example');

async function fixture(data){
 const {dashboard,examples,themes,profiles,demoConfigs}=data;
 window.calls=[];window.reads=[];window.mounts=[];window.mountErrors=[];window.factoryCalls=[];window.actions=[];
 for(const[key,value]of Object.entries(themes['DASH6 Satin Glass']))if(typeof value==='string'&&key!=='card-mod-theme')document.documentElement.style.setProperty('--'+key,value);
 const states={};
 const make=id=>{if(states[id])return;const domain=id.split('.')[0];const attrs={friendly_name:id.split('.')[1].replaceAll('_',' ')};let state='on';
  if(domain==='light')Object.assign(attrs,{supported_color_modes:['hs','color_temp'],color_mode:'hs',hs_color:[180,75],rgb_color:[64,230,230],brightness:153,min_color_temp_kelvin:2000,max_color_temp_kelvin:6500,effect_list:['Wave','Pulse'],effect:'none'});
  if(domain==='fan')Object.assign(attrs,{percentage:50,oscillating:false,supported_features:63});
  if(domain==='sensor'){state=id.includes('energie')?'2.4':'42';Object.assign(attrs,{unit_of_measurement:id.includes('energie')?'kWh':id.includes('restzeit')?'h':id.includes('batterie')?'%':id.includes('dauer')?'min':'W'});}
  if(domain==='climate'){state='heat_cool';Object.assign(attrs,{hvac_modes:['off','heat','cool','heat_cool'],preset_modes:['none','eco','comfort'],preset_mode:'eco',temperature:22,current_temperature:21,target_temp_low:20,target_temp_high:24,min_temp:7,max_temp:35,supported_features:401});}
  if(domain==='cover'){state='open';Object.assign(attrs,{current_position:50,supported_features:4});}
  if(domain==='vacuum'){state='docked';Object.assign(attrs,{battery_level:90,fan_speed:'balanced',fan_speed_list:['quiet','balanced','turbo','max'],supported_features:16383});}
  if(domain==='lock')state='locked';
  if(domain==='binary_sensor')state='off';
  if(['button','event','scene'].includes(domain))state='2026-10-01T12:00:00Z';
  if(['select','input_select'].includes(domain)){const options=id.includes('wischintensitat')?['moderate','high']:id.includes('wischroute')?['standard','deep']:id.includes('reinigung')?['vac_and_mop','vacuum','mop']:id.includes('lichtmodus')?['Lesen','Entspannen']:['balanced','smart'];state=options[0];attrs.options=options;}
  if(domain==='media_player')state='off';
  states[id]={entity_id:id,state,attributes:attrs,last_changed:'2026-10-01T12:00:00Z',last_updated:'2026-10-01T12:00:00Z'};
 };
 const scan=value=>{if(typeof value==='string'){for(const match of value.matchAll(/\b(?:light|switch|fan|input_boolean|input_select|select|sensor|binary_sensor|climate|cover|vacuum|lock|button|event|scene|media_player|remote)\.[a-z0-9_]+\b/g))make(match[0]);}else if(value&&typeof value==='object')Object.values(value).forEach(scan);};scan(dashboard);scan(profiles);
 states['light.demo_gruppe'].attributes.entity_id=['light.demo_lampe_links','light.demo_lampe_rechts'];
 states['light.demo_schrankgruppe'].attributes.entity_id=['light.demo_schrank_oben','light.demo_schrank_unten'];
 const read=async message=>{reads.push(message.type);if(message.type==='lovelace/config')return dashboard;if(message.type==='frontend/get_user_data')return {value:null};if(message.type?.endsWith('_registry/list'))return [];if(message.type?.startsWith('history/'))return {states:{}};return {};};
 const hass={states,locale:{language:'de',number_format:'comma_decimal',time_format:'24',date_format:'DMY'},language:'de',config:{unit_system:{temperature:'°C'},time_zone:'Europe/Berlin'},user:{id:'test-user'},areas:{},devices:{},entities:{},panels:{},localize:key=>key.split('.').pop(),formatEntityState:s=>s.state,formatEntityName:s=>s.attributes.friendly_name||s.entity_id,formatEntityAttributeValue:(_s,_key,value)=>value,callService:async(...args)=>calls.push(args),callWS:read,callApi:async(_method,path)=>{reads.push(path);return [];},connection:{sendMessagePromise:read,subscribeEvents:async()=>()=>{},addEventListener:()=>{}}};window.hass=hass;
 const define=(name,Class)=>{if(!customElements.get(name))customElements.define(name,Class);};
 for(const tag of ['ha-card','ha-icon','ha-state-icon','ha-attribute-icon','ha-form','ha-relative-time','ha-state-control-vacuum-status'])define(tag,class extends HTMLElement{});
 class Native extends HTMLElement{
  static styles=[];static async getConfigElement(){const e=document.createElement('div');e.setConfig=()=>{};return e;}
  constructor(){super();this.attachShadow({mode:'open'});}
  createRenderRoot(){return this.shadowRoot;}setConfig(config){this._config=structuredClone(config);this.config=this._config;if(this.isConnected)this.draw();}
  get hass(){return this._hass;}set hass(value){this._hass=value;this.requestUpdate();}
  get updateComplete(){return Promise.resolve(true);}getCardSize(){return 3;}
  connectedCallback(){this.draw();}disconnectedCallback(){}updated(){}render(){return '';}
  requestUpdate(){if(this._queued)return;this._queued=true;queueMicrotask(()=>{this._queued=false;if(this.isConnected)this.updated(new Map());});}
  draw(){if(this.shadowRoot.querySelector('ha-card'))return;this.shadowRoot.innerHTML='<style>:host{display:block;min-width:0}ha-card{display:block;position:relative;min-height:44px;padding:12px;box-sizing:border-box;background:#24313f;color:white;border-radius:16px}</style><ha-card><span class="native-name"></span></ha-card>';this.shadowRoot.querySelector('.native-name').textContent=this._config?.name||this._config?.title||this.localName;}
 }
 for(const tag of ['hui-entities-card','hui-markdown-card','hui-tile-card','hui-heading-card','hui-media-control-card','hui-weather-forecast-card','hui-picture-entity-card','hui-grid-card','hui-vertical-stack-card','hui-horizontal-stack-card','hui-sections-view','grid-layout','mini-graph-card'])define(tag,class extends Native{});
 define('ha-control-slider',class extends Native{draw(){if(this.shadowRoot.querySelector('.slider'))return;this.shadowRoot.innerHTML='<style>:host{display:block}.slider{height:180px;width:62px;background:#334455;border-radius:20px}</style><div class="slider" role="slider" tabindex="0"></div>';}});
 define('ha-state-control-climate-temperature',class extends Native{draw(){if(this.shadowRoot.querySelector('ha-control-circular-slider'))return;this.shadowRoot.innerHTML='<ha-control-circular-slider></ha-control-circular-slider>';}});
 define('ha-control-circular-slider',class extends Native{draw(){if(this.shadowRoot.querySelector('svg'))return;this.shadowRoot.innerHTML='<style>svg{width:201px;height:201px}.background{fill:none;stroke:#445566;stroke-width:15}.target{fill:none;stroke:white;stroke-width:18;stroke-linecap:round}.target-border{fill:none;stroke:#ddd;stroke-width:24;stroke-linecap:round}</style><svg id="slider" viewBox="0 0 201 201"><path class="background" d="M25 155 A85 85 0 1 1 175 155"/><path class="target-border low" d="M25 155 A85 85 0 1 1 175 155" stroke-dasharray="0 500" stroke-dashoffset="-100"/><path class="target low" d="M25 155 A85 85 0 1 1 175 155" stroke-dasharray="0 500" stroke-dashoffset="-100"/><path class="target-border high" d="M25 155 A85 85 0 1 1 175 155" stroke-dasharray="0 500" stroke-dashoffset="-240"/><path class="target high" d="M25 155 A85 85 0 1 1 175 155" stroke-dasharray="0 500" stroke-dashoffset="-240"/></svg>';}});
 define('hui-thermostat-card',class extends Native{draw(){if(this.shadowRoot.querySelector('ha-state-control-climate-temperature'))return;this.shadowRoot.innerHTML='<style>:host{display:block}ha-card{display:block;background:#334455}.container{display:flex;justify-content:center}</style><ha-card><div class="container"><ha-state-control-climate-temperature></ha-state-control-climate-temperature></div></ha-card>';}});
 define('button-card',class extends Native{draw(){if(this.shadowRoot.querySelector('#icon'))return;super.draw();const card=this.shadowRoot.querySelector('ha-card');card.id='card';const holder=document.createElement('div');holder.id='img-cell';const icon=document.createElement('ha-state-icon');icon.id='icon';icon.icon=this._config?.icon||'mdi:power';holder.append(icon);card.prepend(holder);card.addEventListener('action',event=>actions.push({entity:this._config.entity,action:event.detail.action}));for(const[name,item]of Object.entries(this._config?.custom_fields||{}))if(item?.card){const field=document.createElement('div');field.id=name;card.append(field);window.helpers.createCardElement(item.card).then(child=>{child.hass=this.hass;field.append(child);}).catch(error=>mountErrors.push('nested '+name+': '+error.message));}}});
 for(const tag of ['mushroom-light-card','mushroom-fan-card','mushroom-template-card'])define(tag,class extends Native{draw(){if(this.shadowRoot.querySelector('mushroom-shape-icon'))return;super.draw();const icon=document.createElement('mushroom-shape-icon');icon.slot='icon';icon.icon=this._config?.icon||'mdi:lightbulb';this.shadowRoot.querySelector('ha-card').prepend(icon);icon.addEventListener('action',event=>actions.push({entity:this._config.entity,action:event.detail.action}));}});
 define('mushroom-shape-icon',class extends HTMLElement{});
 define('apexcharts-card',class extends Native{async _initialLoad(){}async _updateData(){} _firstDataLoad(){return this._updateData();}_updateOnInterval(){return this._updateData();}});
 define('auto-entities',class extends Native{connectedCallback(){super.connectedCallback();this.update_card?.([]);}});
 define('ultra-card',class extends Native{draw(){if(this.shadowRoot.querySelector('.external-card-module-container'))return;super.draw();for(const row of this._config?.layout?.rows||[])for(const col of row.columns||[])for(const module of col.modules||[]){const box=document.createElement('div');box.className='external-card-module-container';this.shadowRoot.querySelector('ha-card').append(box);helpers.createCardElement(module.card_config).then(child=>{child.hass=this.hass;box.append(child);}).catch(error=>mountErrors.push('ultra: '+error.message));}}});
 define('hui-view',class extends Native{set viewConfig(value){this._view=value;this.draw();}draw(){if(!this._view||this.shadowRoot.querySelector('dash6-sections-view'))return;const el=document.createElement('dash6-sections-view');el.setConfig?.(this._view);el.hass=this._hass;this.shadowRoot.append(el);}});
 window.helpers={importMoreInfoControl:async()=>{},createCardElement:async config=>{const tag=config.type.startsWith('custom:')?config.type.slice(7):'hui-'+config.type+'-card';factoryCalls.push(tag);if(!customElements.get(tag))throw Error('Unregistered card '+tag);const card=document.createElement(tag);if(typeof card.setConfig!=='function')throw Error('Missing setConfig '+tag);await card.setConfig(config);return card;}};window.loadCardHelpers=async()=>helpers;
 const app=document.createElement('home-assistant');app.hass=hass;document.body.append(app);let cursor=app;for(const tag of ['home-assistant-main','ha-panel-lovelace','hui-root']){const next=document.createElement(tag);cursor.attachShadow({mode:'open'}).append(next);cursor=next;}cursor.lovelace={urlPath:'portable-example',config:dashboard,editMode:false};
 await import('/package/dist/dash6-cards.js');await import('/package/dist/vacuum-dock-card.js');await import('/package/frontend/dash5-glass.js');
 for(const config of examples){const type=config.type.slice(7);await customElements.whenDefined(type);try{const card=await helpers.createCardElement(config);const shell=document.createElement('section');shell.className='example';shell.style.width='380px';shell.dataset.card=type;document.querySelector('#cards').append(shell);shell.append(card);card.hass=hass;await card.updateComplete;mounts.push({type,card,config});}catch(error){mountErrors.push(type+': '+error.message);}}
 for(const[key,definition]of Object.entries(profiles)){const card=await helpers.createCardElement({type:'custom:dash6-profile-card',profile:key});document.querySelector('#profiles').append(card);card.hass=hass;await card.updateComplete;mounts.push({type:'profile:'+key,card,config:definition});}
 window.areaProfile=await helpers.createCardElement({type:'custom:dash6-profile-card',profile:'sample-entities',area:'Kitchen'});document.querySelector('#profiles').append(areaProfile);areaProfile.hass=hass;await areaProfile.updateComplete;
 window.demos=[];for(const config of demoConfigs){const card=document.createElement('dash6-demo-card');card.setConfig(config);const shell=document.createElement('section');shell.className='example';shell.style.width='380px';shell.dataset.demo=config.card.type;document.querySelector('#cards').append(shell);shell.append(card);card.hass=hass;await card.updateComplete;window.demos.push(card);}
 window.ready=true;
}

const html='<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{margin:20px;background:#101820;color:#fff;font:14px system-ui}#cards{display:flex;flex-wrap:wrap;align-items:start;gap:20px}.example{min-width:0}#profiles{display:flex;flex-wrap:wrap;gap:20px}#profiles>*{width:380px}</style></head><body><div id="cards"></div><div id="profiles"></div><script type="module">('+fixture.toString()+')('+JSON.stringify({dashboard,examples:ownExamples,themes,profiles,demoConfigs})+').catch(error=>{window.fatal=error.stack;console.error(error);});</script></body></html>';
const requests=[],external=[],missing=[];
const server=createServer(async(req,res)=>{const url=new URL(req.url,'http://localhost');try{if(url.pathname.startsWith('/package/')){const path=resolve(root,'.'+url.pathname.slice('/package'.length));assert.ok(path.startsWith(root+'/'));requests.push(url.pathname);res.setHeader('content-type',({'.js':'text/javascript','.json':'application/json','.jpg':'image/jpeg','.css':'text/css'})[extname(path)]||'application/octet-stream');res.end(await readFile(path));}else if(url.pathname==='/favicon.ico'){res.writeHead(204);res.end();}else{res.setHeader('content-type','text/html');res.end(html);}}catch(error){missing.push(url.pathname);res.writeHead(404);res.end(error.message);}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
let browser;
try{
 for(const[name,engine]of [['Chromium',chromium],['WebKit',webkit]]){
  browser=await engine.launch({headless:true});const context=await browser.newContext({viewport:{width:1200,height:900},reducedMotion:'no-preference'});await context.route('**/*',route=>{if(!route.request().url().startsWith(origin+'/')){external.push(route.request().url());return route.abort();}return route.continue();});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/portable-example/overview');await page.waitForFunction(()=>window.ready||window.fatal,{timeout:15000});assert.equal(await page.evaluate(()=>window.fatal),undefined);assert.deepEqual(await page.evaluate(()=>mountErrors),[]);
  await page.waitForFunction(()=>mounts.every(({card})=>!card.isUpdatePending&&(!('_child'in card)||card._child||card._error)),{timeout:15000});
  assert.equal(await page.evaluate(()=>calls.length),0,'Mounting every card sends no service');assert.deepEqual(errors,[],'No runtime exceptions from actual portable classes');
  const report=await page.evaluate(()=>mounts.map(({type,card})=>({type,tag:card.localName,error:card._error||'',connected:card.isConnected,shadow:!!card.shadowRoot})));for(const result of report){assert.equal(result.error,'',result.type);assert.equal(result.connected,true,result.type);assert.equal(result.shadow,true,result.type);}
  assert.deepEqual(new Set(report.filter(r=>!r.type.startsWith('profile:')).map(r=>r.tag)),new Set(ownTypes));assert.equal(report.filter(r=>r.type.startsWith('profile:')).length,Object.keys(profileIndex).length,'All generic profiles are loaded and mounted');
  assert.equal(await page.evaluate(()=>areaProfile._child._config.filter.include[0].area),'Kitchen','Profile area replaces the actual static Auto-Entities area filter');
  await page.waitForFunction(()=>mounts.find(x=>x.type==='dash6-govee-light-card-v2').card.shadowRoot.querySelector('dash6-glass-switch')?.hasAttribute('data-satin'));
  const power=page.locator('[data-card="dash6-govee-light-card-v2"]').first().locator('dash6-glass-switch button').first();
  assert.equal(await power.evaluate(button=>button.getAttribute('aria-checked')),'true');await page.waitForTimeout(550);const knobLeft=await power.evaluate(button=>button.querySelector('.lens').getBoundingClientRect().left-button.getBoundingClientRect().left);
  await power.click();assert.equal(await page.evaluate(()=>calls.length),0,'Real portable squeeze precedes action');await page.waitForFunction(()=>calls.length===1);assert.deepEqual(await page.evaluate(()=>calls[0]),['light','turn_off',{entity_id:'light.demo_lampe'}]);await page.waitForTimeout(600);const moved=await power.evaluate(button=>({left:button.querySelector('.lens').getBoundingClientRect().left-button.getBoundingClientRect().left,checked:button.getAttribute('aria-checked'),translate:getComputedStyle(button.querySelector('.lens')).translate,satin:button.getRootNode().host.hasAttribute('data-satin')}));assert.ok(moved.left>knobLeft+45,'Off lens moves right on a non-DASH6 URL: '+JSON.stringify({knobLeft,...moved}));
  await page.evaluate(()=>calls.length=0);
  const fallback=await page.locator('[data-card="dash6-glass-switch"] dash6-glass-switch').first().evaluate(card=>({satin:card.hasAttribute('data-satin'),ink:card.style.getPropertyValue('--sw-ink'),width:card.getBoundingClientRect().width}));assert.deepEqual(fallback,{satin:true,ink:'var(--dash6-satin-fallback-color,#ffd65a)',width:88});
  const group=page.locator('[data-card="dash6-lightgroup-card-v2"]').first();await group.locator('.name').first().click();await page.waitForFunction(()=>mounts.find(x=>x.type==='dash6-lightgroup-card-v2').card.shadowRoot.querySelector('dash6-light-dialog-v2')?.shadowRoot.querySelector('dialog')?.open);assert.equal(await group.locator('dialog[open]').count(),1,'Actual group background opens its own modal');assert.equal(await page.evaluate(()=>calls.length),0,'Opening group modal sends no device action');await page.keyboard.press('Escape');await page.waitForTimeout(30);
  const light=page.locator('[data-card="dash6-govee-light-card-v2"]').first();await light.locator('.mode-bar button').first().click();await page.waitForTimeout(300);assert.equal(await page.evaluate(()=>calls.length),0,'Changing slider mode only changes the UI');const input=light.locator('input[type=range]').first();const before=await input.evaluate(el=>({value:el.value,text:el.parentElement.querySelector('output')?.textContent}));
  await input.dispatchEvent('pointerdown',{pointerId:77,button:0,pointerType:'mouse'});await page.waitForTimeout(180);const pressed=await light.locator('dash6-slider-lens').first().evaluate(el=>({touching:el.hasAttribute('touching'),scale:Number(getComputedStyle(el.shadowRoot.querySelector('.glass')).scale)}));assert.equal(pressed.touching,true);assert.ok(pressed.scale>=1.25,'Portable pressed lens grows clearly');
  await input.evaluate(el=>{el.value='23';el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await page.evaluate(()=>calls.length),0,'Drag has no service until release');assert.equal(await input.evaluate(el=>el.parentElement.querySelector('output')?.textContent),before.text,'Committed readout remains frozen during drag');
  await page.evaluate(()=>window.dispatchEvent(new PointerEvent('pointerup',{pointerId:77,button:0})));await page.waitForFunction(()=>calls.length===1);assert.equal(await page.evaluate(()=>calls[0][1]),'turn_on');assert.equal(await page.evaluate(()=>calls[0][2].brightness_pct),23);await page.evaluate(()=>calls.length=0);
  const segments=page.locator('[data-card="dash6-segmented-control-card"]').first();await segments.locator('button').last().click();await page.waitForFunction(()=>calls.length===1);assert.deepEqual(await page.evaluate(()=>calls[0]),['input_select','select_option',{entity_id:'input_select.demo_lichtmodus',option:'Entspannen'}]);await page.evaluate(()=>calls.length=0);
  assert.equal(await page.evaluate(()=>demos.length),8,'Every interactive demo example is mounted');
  const demoLight=page.locator('[data-demo="custom:dash6-govee-light-card-v2"]').first();
  const demoPower=demoLight.locator('dash6-glass-switch button').first();await demoPower.click();await page.waitForTimeout(600);assert.equal(await demoPower.getAttribute('aria-checked'),'false');assert.equal(await page.evaluate(()=>calls.length),0,'Demo service is isolated from HA');
  const demoGroup=page.locator('[data-demo="custom:dash6-lightgroup-card-v2"]');await demoGroup.locator('.name').first().click();assert.equal(await demoGroup.locator('dialog[open]').count(),1);await page.keyboard.press('Escape');
  assert.equal(await demoGroup.locator('svg.group,.members').count(),0,'Group switch has only one icon and no member LEDs');assert.doesNotMatch(await demoGroup.locator('dash6-glass-switch .readout').first().textContent(),/\d+\s*\/\s*\d+/);
  await page.evaluate(()=>{document.documentElement.style.setProperty('--dash6-satin-enabled','0');window.dispatchEvent(new Event('theme-changed'));});await page.waitForFunction(()=>!mounts.find(x=>x.type==='dash6-glass-switch').card.hasAttribute('data-satin'));assert.equal(await page.locator('[data-card="dash6-glass-switch"] dash6-glass-switch').first().evaluate(card=>card.getBoundingClientRect().width),104,'Theme-off restores original switch geometry');assert.equal(await page.evaluate(()=>calls.length),0,'Theme change sends no service');assert.deepEqual(errors,[]);
  console.log(`PASS ${name}: ${ownExamples.length} example entries / ${ownTypes.length} actual package types + ${Object.keys(profileIndex).length} profiles; portable URL scope; no startup actuation; real switch/slider/group/select gestures; theme-off.`);
  await browser.close();browser=null;
 }
 assert.ok(requests.some(url=>url.includes('/dist/chunks/')),'Both modules load bundled shared chunks');assert.ok(requests.some(url=>url.includes('/dist/profiles/')),'Profiles load from the portable distribution');assert.deepEqual(missing,[],'No missing distribution file');assert.deepEqual(external,[],'No remote or live HA access');
 console.log('PASS: all package-owned classes from portable dist; HA/vendor rendering mocked, device services exclusively recorded.');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
