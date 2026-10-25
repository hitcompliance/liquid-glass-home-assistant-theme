// Shared across card copies and temporary DOM rebuilds; never changes HA state.
export class FanClickState {
 constructor({now=Date.now,timer=setTimeout,clear=clearTimeout,grace=8000}={}){
  this.now=now;this.timer=timer;this.clear=clear;this.grace=grace;this.pending=new Map();this.listeners=new Set();this.sequence=0;
 }
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(){for(const fn of this.listeners)fn();}
 finish(entity,seq){const entry=this.pending.get(entity);if(!entry||entry.seq!==seq)return;this.clear(entry.timeout);this.pending.delete(entity);this.emit();}
 begin({entity,on,powerEntity,refreshEntity,hass,clickedAt=this.now(),onRefreshError=()=>{}}){
  const old=this.pending.get(entity);if(old)this.clear(old.timeout);
  const seq=++this.sequence,entry={seq,on,baseline:hass?.states?.[entity]};this.pending.set(entity,entry);
  entry.timeout=this.timer(()=>this.finish(entity,seq),this.grace);
  // Each accepted click owns its update, independently of subsequent clicks,
  // confirmation, service errors or the card disappearing from the view.
  this.timer(()=>{try{Promise.resolve(refreshEntity?hass.callService('button','press',{entity_id:refreshEntity}):hass.callService('homeassistant','update_entity',{entity_id:powerEntity})).catch(onRefreshError);}catch(error){onRefreshError(error);}},Math.max(0,clickedAt+3000-this.now()));
  this.emit();return seq;
 }
 visual(entity,raw,hass){
  const entry=this.pending.get(entity);if(!entry)return raw;
  const reported=hass?.states?.[entity],actual=reported?.state;
  // A rapid opposite click can target a state HA still reports from before
  // either command. That old value is not a new device acknowledgement.
  if(reported!==entry.baseline&&actual===(entry.on?'on':'off')){this.finish(entity,entry.seq);return {...raw,on:entry.on};}
  return {...raw,on:entry.on};
 }
}
