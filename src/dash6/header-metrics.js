// Power and energy share the header; only their display is rounded.
(() => {
 const sheet=new CSSStyleSheet();sheet.replaceSync(`
:host .card .head.head{grid-template-columns:88px minmax(0,1fr) auto!important;align-items:start!important}
:host .card .header-side{display:flex;align-items:flex-start;justify-self:end;gap:8px;min-width:0}
:host .card .head .metrics.metrics{display:flex;flex-direction:column;align-items:flex-end;justify-content:center;min-height:36px;margin:0!important;padding:0!important;line-height:18px;font-size:13px;white-space:nowrap;grid-column:auto!important}
`);
 customElements.whenDefined('dash6-lightgroup-card-v2').then(()=>{
  let p=customElements.get('dash6-lightgroup-card-v2').prototype;
  while(p&&!Object.hasOwn(p,'render'))p=Object.getPrototypeOf(p);
  const render=p.render;
  p.render=function(){render.call(this);if(this._dragging)return;const card=this.shadowRoot?.querySelector('ha-card.card'),head=card?.querySelector('.head'),metrics=card?.querySelector('.metrics');if(!metrics||!head)return;
   if(!this.shadowRoot.adoptedStyleSheets.includes(sheet))this.shadowRoot.adoptedStyleSheets=[...this.shadowRoot.adoptedStyleSheets,sheet];
   metrics.replaceChildren();const c=this._renderConfig||this._config;
   for(const id of [c.power_entity,c.energy_entity]){const state=this._hass?.states[id],value=Number(state?.state);if(!state||!Number.isFinite(value))continue;const line=document.createElement('span');line.textContent=`${Math.round(value)} ${state.attributes.unit_of_measurement||''}`.trim();metrics.append(line);}
   const side=document.createElement('div');side.className='header-side';const extras=head.querySelector('.light-extras');if(extras)side.append(extras);side.append(metrics);head.append(side);
  };
 });
})();
