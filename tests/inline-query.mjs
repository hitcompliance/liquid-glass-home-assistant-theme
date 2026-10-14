import assert from 'node:assert/strict';
import {test} from 'node:test';
import {execFileSync} from 'node:child_process';
import {batchInlineTemplates,watchInlineQuery} from '../src/dash6/inline-query.js';

const settle=()=>new Promise(resolve=>setTimeout(resolve,15));
function fixture(){
 const subscriptions=[],events=new Map();let active=0,unsubscribed=0;
 const connection={
  subscribeMessage:async(callback,message)=>{const subscription={callback,message,active:true};subscriptions.push(subscription);active++;return ()=>{if(subscription.active){subscription.active=false;active--;unsubscribed++;}};},
  addEventListener:(name,callback)=>events.set(name,callback),removeEventListener:(name,callback)=>{if(events.get(name)===callback)events.delete(name);}
 };
 return {hass:{connection},subscriptions,events,get active(){return active;},get unsubscribed(){return unsubscribed;}};
}
function emit(subscription,templates,values){
 const batch=batchInlineTemplates(templates);
 subscription.callback({result:JSON.stringify(Object.fromEntries(batch.sources.map((source,index)=>[String(index),JSON.stringify(values.get(source))])))});
}

// Set DASH6_JINJA_PYTHON to an interpreter with Jinja2 for server-template parity.
test('complete inline templates retain independent Jinja macro and variable scopes',{skip:!process.env.DASH6_JINJA_PYTHON},()=>{
 const templates=[1,100].map(offset=>`{% macro serialize(x) %}{{ [x + offset] | to_json }}{% endmacro %}{% set offset = ${offset} %}{{ serialize(value) }}`);
 const batch=batchInlineTemplates(templates);
 const rendered=execFileSync(process.env.DASH6_JINJA_PYTHON,['-c',"import json,sys; from jinja2 import Environment; e=Environment(); e.filters['to_json']=json.dumps; print(e.from_string(sys.stdin.read()).render(value=5))"],{input:batch.template,encoding:'utf8'});
 const results=JSON.parse(rendered);batch.sources.forEach((source,index)=>assert.deepEqual(JSON.parse(results[index]),[source.includes('offset = 100')?105:6]));
 assert.equal(batchInlineTemplates([...templates].reverse()).template,batch.template,'membership order is deterministic');
});

test('many distinct inline slices share one group subscription, preserve values and clean up',async()=>{
 const f=fixture(),templates=Array.from({length:12},(_,index)=>`{{ [${index}] | to_json }}`),received=new Map(),stops=[];
 for(const template of templates)stops.push(watchInlineQuery(f.hass,{template,group:'inline-group'},(result,error)=>received.set(template,{result,error})));
 assert.equal(f.subscriptions.length,0,'known-card construction precedes deferred query');await settle();assert.equal(f.subscriptions.length,1);assert.equal(f.active,1);
 const values=new Map(templates.map((source,index)=>[source,[{entity:'sensor.neutral_'+index,styles:{grid:[{'grid-template-areas':'"i"'}]}}]]));
 emit(f.subscriptions[0],templates,values);assert.equal(received.size,12);for(const [template,value]of values)assert.deepEqual(received.get(template),{result:value,error:undefined});
 const duplicate=[];const stopDuplicate=watchInlineQuery(f.hass,{template:templates[0],group:'inline-group'},result=>duplicate.push(result));await settle();assert.equal(f.subscriptions.length,1);assert.deepEqual(duplicate,[values.get(templates[0])]);
 emit(f.subscriptions[0],templates,values);assert.equal(f.subscriptions.length,1);assert.equal(duplicate.length,2,'one notification per result per listener');
 stops[0]();await settle();assert.equal(f.subscriptions.length,1,'same-source peer retains group member');stopDuplicate();await settle();assert.equal(f.subscriptions.length,2);assert.equal(f.active,1);assert.equal(f.unsubscribed,1);
 for(const stop of stops.slice(1))stop();await settle();assert.equal(f.active,0);assert.equal(f.unsubscribed,2);assert.equal(f.events.size,0);
});

test('reconnect, query errors and stale results cannot replace current group values',async()=>{
 const f=fixture(),templates=['{{ [1] | to_json }}','{{ [2] | to_json }}'],received=[];
 const stops=templates.map(template=>watchInlineQuery(f.hass,{template,group:'reconnect-group'},(result,error)=>received.push({template,result,error})));
 await settle();const first=f.subscriptions[0];first.callback({error:{message:'temporary template error'}});assert.equal(received.length,2);
 emit(first,templates,new Map(templates.map((source,index)=>[source,[index]])));assert.equal(received.at(-1).error,undefined);
 f.events.get('ready')();await settle();assert.equal(f.subscriptions.length,2);assert.equal(f.active,1);const count=received.length;
 emit(first,templates,new Map(templates.map(source=>[source,['stale']])));assert.equal(received.length,count,'old callbacks are ignored after reconnect');
 emit(f.subscriptions[1],templates,new Map(templates.map(source=>[source,['current']])));assert.deepEqual(received.at(-1).result,['current']);stops.forEach(stop=>stop());assert.equal(f.active,0);
});

test('disconnect during pending setup unsubscribes the late subscription',async()=>{
 let finish,unsubscribed=0;const hass={connection:{subscribeMessage:()=>new Promise(resolve=>finish=resolve)}};
 const stop=watchInlineQuery(hass,{template:'{{ [] | to_json }}',group:'pending-group'},()=>assert.fail('stale notification'));await settle();stop();finish(()=>unsubscribed++);await settle();assert.equal(unsubscribed,1);
});
