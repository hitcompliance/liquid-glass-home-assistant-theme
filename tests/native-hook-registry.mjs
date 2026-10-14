import assert from 'node:assert/strict';
import {createScopedRegistry} from '../src/dash6/native-hook-registry.js';
let path='/dashboard-primary/room-a';
class Native{constructor(){this.calls=[];}set cards(value){assert.ok(this instanceof Native);this._cards=value;}get cards(){return this._cards;}updated(){this.calls.push('native');}static styles=['upstream'];}
const classes=new Map([['hui-test-card',Native]]),registry={get:n=>classes.get(n),define:(n,C)=>{assert.ok(!classes.has(n));classes.set(n,C);},whenDefined:n=>Promise.resolve(classes.get(n)),upgrade:()=>{}};
const prod=createScopedRegistry(registry,()=>!path.startsWith('/dashboard-snapshot'));
const backup=createScopedRegistry(registry,()=>path.startsWith('/dashboard-snapshot'),['snapshot-']);
for(const [r,label] of [[prod,'production'],[backup,'frozen']]){
 const prototype=r.get('hui-test-card').prototype;
 assert.equal(prototype._testInstalled,undefined);
 prototype._testInstalled=true;assert.ok(Object.hasOwn(prototype,"_testInstalled"));assert.equal(Object.getOwnPropertyDescriptor(prototype,"_testInstalled").value,true);
 const old=prototype.updated;prototype.updated=function(){old.apply(this);this.calls.push(label);};
}
const native=new Native();native.updated();assert.deepEqual(native.calls,['native','production']);
path='/dashboard-snapshot/wohnzimmer';native.calls=[];native.updated();assert.deepEqual(native.calls,['native','frozen']);
path='/dashboard-primary/room-b';native.calls=[];native.updated();assert.deepEqual(native.calls,['native','production']);
class FrozenChild extends backup.get('hui-test-card'){};
backup.define('snapshot-test-card',FrozenChild);const child=new FrozenChild();assert.ok(child instanceof Native);
const other=new FrozenChild();child.cards=['first'];other.cards=['second'];assert.deepEqual(child.cards,['first']);assert.deepEqual(other.cards,['second']);child.calls.push('child');assert.deepEqual(other.calls,[]);assert.ok(Object.hasOwn(child,'calls'));
assert.equal(backup.get('snapshot-test-card'),FrozenChild);assert.deepEqual(FrozenChild.styles,['upstream']);
// Function properties that are non-configurable on ES class constructors do not trigger Proxy invariant errors.
assert.ok(backup.get('hui-test-card').prototype);
console.log('PASS: scoped native hooks, registration flags, inherited setters and instance state remain independent across dashboards.');
