import {bindGraphSurface} from './graph-surface.js';
import {scopedCustomElements as customElements} from './scoped-elements.js';
// Background graphs follow the whole card without participating in layout.
(() => {
 customElements.whenDefined('dash6-lightgroup-card-v2').then(() => {
  let proto=customElements.get('dash6-lightgroup-card-v2').prototype;
  while(proto&&!Object.hasOwn(proto,'makeGraph'))proto=Object.getPrototypeOf(proto);
  if(!proto||proto._summaryGraphV3Installed)return;
  proto._summaryGraphV3Installed=true;
  const makeGraph=proto.makeGraph,render=proto.render,disconnect=proto.disconnectedCallback;
  proto.disconnectedCallback=function(){this._graphSurface?.dispose();this._graphSurface=null;return disconnect?.call(this);};
  proto.render=function(){
   render.call(this);
   // A legacy mod-card wrapper must not stack a second opaque surface.
   const wrapper=this.parentElement;
   if(wrapper?.localName==='ha-card'&&wrapper.getRootNode().host?.localName==='mod-card'){
    for(const [key,value] of Object.entries({background:'transparent',border:'0',boxShadow:'none',backdropFilter:'none',padding:'0'}))wrapper.style.setProperty(key.replace(/[A-Z]/g,m=>'-'+m.toLowerCase()),value,'important');
    wrapper.removeAttribute('data-dash6-satin-surface');
   }
  };
  proto.makeGraph=function(card,config){
   this._graphSurface?.dispose();makeGraph.call(this,card,config);
   const layer=card.querySelector(':scope > .power-graph');if(!layer)return;
   card.style.minHeight=`${config.graph?.min_height??config.graph?.height??100}px`;
   this._graphSurface=bindGraphSurface(this,config.graph,card);
  };
 });
})();
