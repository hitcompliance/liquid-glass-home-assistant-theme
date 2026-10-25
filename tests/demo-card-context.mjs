import assert from 'node:assert/strict';
import {withDemoCardContext} from '../src/dash6/demo-card-context.js';
let resolveRuntime,subscribed=0,unsubscribed=0,notify;
const pending=new Promise(resolve=>{resolveRuntime=resolve;});
class Base {setConfig(config){this.config=config;}set hass(hass){this.context=hass;}get hass(){return this.context;}}
const runtime={hass:host=>({demo:true,hostName:host.name}),subscribe:callback=>{subscribed++;notify=callback;return()=>unsubscribed++;}};
const Card=withDemoCardContext(Base,{loadRuntime:()=>pending,entityHass:host=>({legacy:true,hostName:host.name})});
const card=new Card();card.isConnected=true;
card.setConfig({liquid_glass_demo_mode:'browser'});card.hass={name:'real host'};
assert.equal(card.hass,undefined,'No host context while local simulation loads');
resolveRuntime(runtime);await pending;await Promise.resolve();
assert.deepEqual(card.hass,{demo:true,hostName:'real host'});assert.equal(subscribed,1);
card.hass={name:'updated host'};notify();assert.equal(card.hass.hostName,'updated host');assert.equal(subscribed,1);
card.disconnectedCallback();assert.equal(unsubscribed,1);card.connectedCallback();assert.equal(subscribed,2);
card.setConfig({liquid_glass_demo_mode:'entities'});assert.equal(card.hass.legacy,true);
card.setConfig({});const normal={name:'normal host'};card.hass=normal;assert.equal(card.hass,normal,'Normal user Ultra cards retain the host');
const inherited={__liquidGlassDemoRuntime:runtime};card.setConfig({liquid_glass_demo_mode:'browser'});card.hass=inherited;assert.equal(card.hass,inherited,'Nested demo cards reuse their context');
card.disconnectedCallback();
console.log('Structural demo card: async isolation, updates, lifecycle, native host and legacy mode passed');
