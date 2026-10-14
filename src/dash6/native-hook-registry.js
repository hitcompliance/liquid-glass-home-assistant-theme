/** Scope only our native prototype extensions; native/upstream implementations remain shared. */
export function createScopedRegistry(registry, enabled, ownPrefixes=['dash6-','dash5-']) {
 const constructors=new WeakMap(),prototypes=new WeakMap();
 function prototype(target) {
  if(prototypes.has(target))return prototypes.get(target);
  const flags=new Map();
  const proxy=new Proxy(Object.create(target),{
   get(object,key,receiver){
    if(flags.has(key))return flags.get(key);
    const value=Reflect.get(target,key,receiver);
    // Installation flags belong to this copy, so another scope does not skip its hook.
    if(receiver===proxy&&typeof key==='string'&&key.startsWith('_')&&typeof value==='boolean')return undefined;
    return value;
   },
   set(object,key,value,receiver){
    // Inherited native setters and instance fields retain the actual receiver.
    if(receiver!==proxy)return Reflect.set(target,key,value,receiver);
    if(typeof value!=='function'){flags.set(key,value);return Reflect.set(object,key,value,object);}
    const previous=Reflect.get(target,key,target);
    const scoped=function(...args){return enabled(this)?value.apply(this,args):previous?.apply(this,args);};
    return Reflect.set(target,key,scoped,target);
   }
  });prototypes.set(target,proxy);return proxy;
 }
 function constructor(target){
  if(constructors.has(target))return constructors.get(target);
  // A normal constructible bridge avoids Proxy's non-configurable prototype invariant.
  function Bridge(...args){return Reflect.construct(target,args,new.target===Bridge?target:new.target);}
  Object.setPrototypeOf(Bridge,target);Bridge.prototype=prototype(target.prototype);
  constructors.set(target,Bridge);return Bridge;
 }
 return {
  get(name){const value=registry.get(name);return !value||ownPrefixes.some(prefix=>name.startsWith(prefix))?value:constructor(value);},
  whenDefined:name=>registry.whenDefined(name),define:(...args)=>registry.define(...args),upgrade:value=>registry.upgrade(value)
 };
}
