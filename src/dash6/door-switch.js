// Door status uses the same switch element as the IKEA cards.
(() => {
 const switchSheet=new CSSStyleSheet();switchSheet.replaceSync(`
:host([data-door-state]){--sw-ink:var(--door-ink)!important}
:host([data-door-state]) .readout{visibility:hidden}
:host([data-door-state=unlocked]) button.off .light{opacity:1!important}
:host([data-door-state=unlocked]) button.off .track::before{opacity:.71!important}
:host([data-door-state=unlocked]) button.off .icon{color:color-mix(in srgb,var(--door-ink) 26%,#fff)!important;filter:drop-shadow(0 0 3px var(--door-ink))!important}
`);
 const cardSheet=new CSSStyleSheet();cardSheet.replaceSync(`:host ha-card .head{grid-template-columns:88px minmax(0,1fr) auto;cursor:default}:host ha-card .head.entrance{grid-template-columns:48px minmax(0,1fr) auto}:host ha-card .head>.text{background:transparent!important;border:0!important;box-shadow:none!important;padding:0;text-align:left;color:inherit;font:inherit;cursor:pointer}:host ha-card .head>dash6-glass-switch{--dash6-satin-switch-track-top:0px}`);
 customElements.whenDefined('dash6-door-card').then(()=>{
  const p=customElements.get('dash6-door-card').prototype;
  p.doorSwitchModel=function(){
   const c=this._config,states=this.hass?.states||{};
   const id=c.kind==='entrance'?(c.lock_state_entity||(c.cancel_entities||[]).find(id=>id.startsWith('lock.'))):c.entity;
   const state=states[id]?.state,known=['locked','unlocked'].includes(state);
   return {on:state==='locked',available:known&&!this._busy,locked:false,group:false,mixed:false,dimmable:false,brightness:100,color:state==='locked'?'var(--dash6-door-locked-color,#42d778)':'var(--dash6-door-unlocked-color,#ff4c5c)',satinColor:state==='locked'?'var(--dash6-door-locked-color,#42d778)':'var(--dash6-door-unlocked-color,#ff4c5c)',supportsColor:true,name:c.name||'Tür',doorState:known?state:'neutral'};
  };
  const updated=p.updated;
  p.updated=function(changed){
   updated?.call(this,changed);
   if(!this.shadowRoot.adoptedStyleSheets.includes(cardSheet))this.shadowRoot.adoptedStyleSheets=[...this.shadowRoot.adoptedStyleSheets,cardSheet];
   const sw=this.shadowRoot.querySelector('dash6-glass-switch');if(!sw)return;
   const v=this.doorSwitchModel();sw.dataset.doorState=v.doorState;sw.style.setProperty('--door-ink',v.color);
   sw.updateComplete.then(()=>{if(!sw.shadowRoot.adoptedStyleSheets.includes(switchSheet))sw.shadowRoot.adoptedStyleSheets=[...sw.shadowRoot.adoptedStyleSheets,switchSheet];const b=sw.shadowRoot.querySelector('button');if(b)b.setAttribute('aria-label',this._config.kind==='entrance'?'Haustür öffnen':v.on?'Wohnungstür aufschließen':'Wohnungstür abschließen');});
  };
 });
})();
