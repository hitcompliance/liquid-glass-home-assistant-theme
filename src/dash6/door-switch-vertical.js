// Native vertical geometry: icons never rotate with the track.
(() => {
 const sheet=new CSSStyleSheet();sheet.replaceSync(`
:host([data-door-state][data-door-state]){width:44px!important;height:63px!important;--sw-travel:26px}
:host([data-door-state]) button{width:44px!important;height:63px!important}
:host([data-door-state]) .track{inset:0 auto auto 3.5px!important;width:37px!important;height:63px!important;border-radius:19px!important}
:host([data-door-state]) .lens{top:2.75px!important;left:6.25px!important;width:31.5px!important;height:31.5px!important;translate:0 0!important;transform:none!important}
:host([data-door-state]) button.off .lens{translate:0 26px!important}
:host([data-door-state]) .icon{transform:none!important;rotate:0deg!important}
:host([data-door-state]) button:active:not(:disabled) .lens,:host([data-door-state]) button.squeezing .lens{transform:scale(.86,1.1)!important}
`);
 const cardSheet=new CSSStyleSheet();cardSheet.replaceSync(':host ha-card .head:not(.entrance){grid-template-columns:44px minmax(0,1fr) auto!important}');
 customElements.whenDefined('dash6-door-card').then(()=>{
  const p=customElements.get('dash6-door-card').prototype,updated=p.updated;
  p.updated=function(changed){updated?.call(this,changed);if(!this.shadowRoot.adoptedStyleSheets.includes(cardSheet))this.shadowRoot.adoptedStyleSheets=[...this.shadowRoot.adoptedStyleSheets,cardSheet];const sw=this.shadowRoot.querySelector('dash6-glass-switch');sw?.updateComplete.then(()=>{if(!sw.shadowRoot.adoptedStyleSheets.includes(sheet))sw.shadowRoot.adoptedStyleSheets=[...sw.shadowRoot.adoptedStyleSheets,sheet]});};
 });
})();
