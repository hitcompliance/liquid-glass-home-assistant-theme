// Identical inline templates share a subscription only on the same HA connection.
// There is deliberately no room name, profile store or external configuration.
const connections=new WeakMap();
const parseResult=value=>typeof value==='string'?JSON.parse(value):value;
const notify=(entry,result,error)=>{entry.result=result;entry.error=error;for(const callback of entry.listeners)callback(result,error);};
const frame=callback=>typeof requestAnimationFrame==='function'?requestAnimationFrame(callback):setTimeout(callback,0);
const cancelFrame=id=>typeof cancelAnimationFrame==='function'?cancelAnimationFrame(id):clearTimeout(id);

// Local Jinja macros isolate each complete inline template's variables/macros.
// The group is only a subscription key: it never resolves external configuration.
export function batchInlineTemplates(templates){
 const sources=[...new Set(templates)].sort();
 return {sources,template:sources.map((source,index)=>`{% macro __dash6_inline_query_${index}() %}\n${source}\n{% endmacro %}`).join('\n')+
  '\n{{ {'+sources.map((_source,index)=>JSON.stringify(String(index))+`: __dash6_inline_query_${index}() | trim`).join(', ')+ '} | to_json }}'};
}
function watchGroup(connection,groups,groupKey,template,listener){
 let group=groups.get(groupKey);
 if(!group){
  group={active:true,members:new Map(),generation:0};groups.set(groupKey,group);
  group.schedule=()=>{if(!group.active||group.scheduled!==undefined)return;group.scheduled=frame(()=>{group.scheduled=undefined;rebindGroup(connection,group);});};
  group.onReady=()=>{group.signature=undefined;group.schedule();};connection.addEventListener?.('ready',group.onReady);
 }
 let member=group.members.get(template);if(!member){member={listeners:new Set()};group.members.set(template,member);group.schedule();}
 member.listeners.add(listener);if(member.result!==undefined)listener(member.result,member.error);else if(member.error)listener(null,member.error);
 return ()=>{
  member.listeners.delete(listener);if(member.listeners.size)return;
  group.members.delete(template);
  if(group.members.size){group.schedule();return;}
  group.active=false;group.generation++;if(group.scheduled!==undefined)cancelFrame(group.scheduled);
  group.unsubscribe?.();connection.removeEventListener?.('ready',group.onReady);if(groups.get(groupKey)===group)groups.delete(groupKey);
 };
}
async function rebindGroup(connection,group){
 const batch=batchInlineTemplates(group.members.keys());
 if(!group.active||!batch.sources.length||batch.template===group.signature)return;
 group.signature=batch.template;const generation=++group.generation,previous=group.unsubscribe;group.unsubscribe=null;
 const publish=(result,error)=>{for(const source of batch.sources){const member=group.members.get(source);if(member)notify(member,result?.get(source),error);}};
 try{
  await previous?.();if(!group.active||generation!==group.generation)return;
  const unsubscribe=await connection.subscribeMessage(event=>{
   if(!group.active||generation!==group.generation)return;
   if(event.error){publish(null,event.error);return;}
   try{
    const values=parseResult(event.result),results=new Map();
    batch.sources.forEach((source,index)=>{if(!Object.hasOwn(values,String(index)))throw Error('Unvollständige Inline-Abfrage');results.set(source,parseResult(values[String(index)]));});
    publish(results);
   }catch(error){publish(null,error);}
  },{type:'render_template',template:batch.template});
  if(group.active&&generation===group.generation)group.unsubscribe=unsubscribe;else unsubscribe?.();
 }catch(error){if(group.active&&generation===group.generation){group.signature=undefined;publish(null,error);}}
}
export function decodeInline(value){
 if(typeof value==='string'&&/^[\[{\"]/.test(value.trim()))try{return decodeInline(JSON.parse(value));}catch{return value;}
 if(Array.isArray(value))return value.map(decodeInline);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,decodeInline(item)]));
 return value;
}
export function watchInlineQuery(hass,query,listener){
 const connection=hass?.connection?.__dash6ActualConnection||hass?.connection;
 if(!connection?.subscribeMessage||!query?.template)return ()=>{};
 let state=connections.get(connection);if(!state){state={templates:new Map(),groups:new Map()};connections.set(connection,state);}
 if(typeof query.group==='string'&&query.group.length)return watchGroup(connection,state.groups,query.group,query.template,listener);
 const templates=state.templates;
 const template=query.template;let entry=templates.get(template);
 if(!entry){
  entry={active:true,listeners:new Set()};templates.set(template,entry);
  const publish=(result,error)=>{if(!entry.active)return;entry.result=result;entry.error=error;for(const callback of entry.listeners)callback(result,error);};
  entry.ready=Promise.resolve().then(()=>connection.subscribeMessage(event=>{
   if(event.error){publish(null,event.error);return;}
   // Canonical output already contains complete card objects. Preserve strings
   // inside definitions (notably quoted CSS grid-template-areas) unchanged.
   try{publish(parseResult(event.result));}catch(error){publish(null,error);}
  },{type:'render_template',template})).then(unsubscribe=>{if(entry.active)entry.unsubscribe=unsubscribe;else unsubscribe?.();}).catch(error=>publish(null,error));
 }
 entry.listeners.add(listener);
 if(entry.result!==undefined)listener(entry.result,entry.error);else if(entry.error)listener(null,entry.error);
 return ()=>{entry.listeners.delete(listener);if(!entry.listeners.size){entry.active=false;entry.unsubscribe?.();if(templates.get(template)===entry)templates.delete(template);}};
}

export function inlineEntities(value,output=[]){
 if(!value||typeof value!=='object')return output;
 if(value.entity&&value.type)output.push(value.entity);
 for(const child of Object.values(value))inlineEntities(child,output);
 return output;
}
export function pruneInline(value,hass,allow,drop){
 if(Array.isArray(value))return value.map(child=>pruneInline(child,hass,allow,drop)).filter(Boolean);
 if(!value||typeof value!=='object')return value;
 if(value.entity&&value.type&&(!hass?.states?.[value.entity]||hass.entities?.[value.entity]?.hidden_by||(allow&&!allow.has(value.entity))||drop?.has(value.entity)))return null;
 const result=Object.fromEntries(Object.entries(value).map(([key,child])=>[key,pruneInline(child,hass,allow,drop)]));
 if(Array.isArray(result.cards)&&!result.cards.some(card=>card.type!=='heading'))return null;
 return result;
}
