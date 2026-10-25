import assert from 'node:assert/strict';
import {withCardTemplateContext} from '../src/dash6/auto-entities-context.js';
let globalSubscriptions=0,subscriptions=[],unsubscribed=0;
class Upstream{
 constructor(){this.isConnected=false;this._renderer=value=>{this.result=value;};}
 setConfig(config){this._config=structuredClone(config);if(config.filter?.template)globalSubscriptions++;}
 connectedCallback(){if(this._config.filter?.template)globalSubscriptions++;}
 updated(){}
 disconnectedCallback(){}
}
const Card=withCardTemplateContext(Upstream),card=new Card();
const connection={subscribeMessage(callback,message){subscriptions.push({callback,message});return Promise.resolve(()=>unsubscribed++);}};
const config={filter:{template:'{{ demo_cards }}'},card:{type:'grid'}};
card.setConfig(config);card.hass={connection};card.isConnected=true;card.connectedCallback();card.updated(new Map());
await Promise.resolve();
assert.equal(globalSubscriptions,0,'Upstream must never resolve the global application connection');
assert.equal(subscriptions.length,1);assert.equal(subscriptions[0].message.template,config.filter.template);
const cards=[{type:'tile',entity:'light.liquid_glass_demo_lampe'}];subscriptions[0].callback({result:cards});
assert.deepEqual(card.result,cards);assert.deepEqual(card._config,config,'Keep template configuration available to the native editor');
card.setConfig({...config,filter:{template:'{{ changed_cards }}'}});await Promise.resolve();
assert.equal(subscriptions.length,2);assert.equal(unsubscribed,1);
subscriptions[0].callback({result:['stale']});assert.deepEqual(card.result,cards);
card.isConnected=false;card.disconnectedCallback();assert.equal(unsubscribed,2);
console.log('Auto Entities: card-local template connection, intact config, stale callbacks and lifecycle cleanup OK');
