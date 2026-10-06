// Reserve a real 90px summary region before optional row modules.
(() => {
 customElements.whenDefined('dash6-lightgroup-card-v2').then(() => {
  let proto=customElements.get('dash6-lightgroup-card-v2').prototype;
  while(proto&&!Object.hasOwn(proto,'makeGraph'))proto=Object.getPrototypeOf(proto);
  if(!proto||proto._summaryGraphV3Installed)return;
  proto._summaryGraphV3Installed=true;
  const makeGraph=proto.makeGraph,render=proto.render;
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
   this._summaryGraphObserver?.disconnect();makeGraph.call(this,card,config);
   const layer=card.querySelector(':scope > .power-graph');if(!layer)return;
   const height=Math.max(90,Number(config.graph?.height)||90);
   this._summaryGraphObserver?.disconnect();
   const head=card.querySelector(':scope > .head');
   if(head){head.style.setProperty('min-height',height+'px','important');head.style.setProperty('margin-bottom','8px','important');}
   layer.style.setProperty('height',height+'px','important');
   const resizeGraph=graph=>{
    if(!graph?.setConfig||!graph._config?.definition?.apex_config)return;
    const c=graph._config;if(c.definition.apex_config.chart?.height===height)return;
    graph.setConfig({...c,definition:{...c.definition,apex_config:{...c.definition.apex_config,chart:{...c.definition.apex_config.chart,height}}},skin:{...c.skin,css:(c.skin?.css||'').replace(/(?:height|min-height|max-height):\s*80px/g,match=>match.replace('80px',height+'px'))}});
   };
   resizeGraph(this._graphCard);this._graphPromise?.then(resizeGraph);
   const innerSheet=new CSSStyleSheet();innerSheet.replaceSync(`:host .card.card .power-graph.power-graph > *{height:${height}px!important;min-height:${height}px!important}`);
   this._graphSizeSheet&& (this.shadowRoot.adoptedStyleSheets=this.shadowRoot.adoptedStyleSheets.filter(s=>s!==this._graphSizeSheet));
   this._graphSizeSheet=innerSheet;this.shadowRoot.adoptedStyleSheets=[...this.shadowRoot.adoptedStyleSheets,innerSheet];
   const position=()=>{
    const row=[...card.children].find(child=>child.matches('.controls,.scenes,.shoe-scenes,.inline-segments'));
    const end=row?row.offsetTop-8:card.clientHeight-12;
    layer.style.setProperty('bottom',`${Math.max(0,card.clientHeight-end)}px`,'important');
   };
   position();this._summaryGraphObserver=new ResizeObserver(position);this._summaryGraphObserver.observe(card);
  };
 });
})();
