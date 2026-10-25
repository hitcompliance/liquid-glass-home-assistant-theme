import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

class Node {
  constructor(tag='div') { this.tag=tag;this.children=[];this.attributes=new Map();this.textContent='';this.hidden=false; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(key,value) { this.attributes.set(key,value); }
  toggleAttribute(key,value) { if(value)this.attributes.set(key,'');else this.attributes.delete(key); }
  querySelector(selector) {
    if(selector==='.head span')return this.header;
    return this.children.find(node=>selector==='.'+node.className) || this.children.map(node=>node.querySelector(selector)).find(Boolean) || null;
  }
}
let resolveWeather;
class Base extends Node {
  constructor(){super();this.shadowRoot=new Node();this.shadowRoot.header=new Node('span');this.overview=new Node();this.overview.className='overview';this.shadowRoot.append(this.overview);}
  render() {}
  updateValues() { this.nonWeatherUpdated=true; }
  async makeWeather() { await new Promise(resolve=>{resolveWeather=resolve;});const forecast=new Node();forecast.className='forecast';this.shadowRoot.append(forecast); }
}
const registry=new Map([['dash6-home-overview-card',Base]]);
const context=vm.createContext({HTMLElement:Node,customElements:{get:name=>registry.get(name),define:(name,type)=>registry.set(name,type),whenDefined:async()=>{}},document:{createElement:tag=>new Node(tag)},console,structuredClone});
const source=await fs.readFile(new URL('../src/dash7/overview-card.js',import.meta.url),'utf8');
vm.runInContext(source.replace('export async function','async function'),context);
await new Promise(resolve=>setImmediate(resolve));
const Card=registry.get('dash7-home-overview-card');
assert.ok(Card,'subclass registers');
const card=new Card();card._config={kind:'weather',entity:'weather.test'};
const update=(state)=>{card.hass={states:state===undefined?{}:{'weather.test':state},formatEntityState:s=>s.state==='sunny'?'Sonnig':s.state};card.updateValues();};
for(const state of [undefined,{state:'unknown',attributes:{}},{state:'unavailable',attributes:{temperature:NaN}}]){
  update(state);assert.equal(card.shadowRoot.header.textContent,'Wetter');assert.equal(card.attributes.has('data-weather-unavailable'),true);const status=card.shadowRoot.querySelector('.weather-status');assert.equal(status.hidden,false);assert.equal(status.textContent,'Wetterdaten derzeit nicht verfügbar.');
}
for(const temperature of [null,undefined,NaN,'', 'invalid']){
  update({state:'sunny',attributes:{temperature}});assert.equal(card.shadowRoot.header.textContent,'Sonnig');assert.equal(card.attributes.has('data-weather-unavailable'),false);assert.equal(card.shadowRoot.querySelector('.weather-status').hidden,true);
}
update({state:'unavailable',attributes:{}});
const statusBefore=card.shadowRoot.querySelector('.weather-status');
const pending=card.makeWeather();resolveWeather();await pending;
assert.equal(card.shadowRoot.querySelector('.weather-status'),statusBefore,'async forecast insertion retains existing status');
assert.equal(statusBefore.hidden,false);assert.equal(card.attributes.has('data-weather-unavailable'),true);
assert.ok(card.shadowRoot.querySelector('.forecast'),'native forecast can resolve while unavailable');
update({state:'sunny',attributes:{temperature:12.5,temperature_unit:'°C'}});
assert.equal(card.shadowRoot.header.textContent,'Sonnig · 12,5 °C');assert.equal(card.attributes.has('data-weather-unavailable'),false);assert.equal(statusBefore.hidden,true);
assert.ok(source.includes(':host([data-weather-unavailable]) .forecast{display:none!important}'),'async forecast hidden by persistent host CSS rule');
card._config={kind:'energy'};card.updateValues();assert.equal(card.nonWeatherUpdated,true,'other domains delegate to base');
console.log('PASS: missing/unknown/unavailable/null/undefined/NaN/empty/invalid temperatures, asynchronous insertion, valid recovery and domain delegation');
