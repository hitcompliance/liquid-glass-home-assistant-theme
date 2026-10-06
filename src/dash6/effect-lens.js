// Momentary effect lens uses the same material as the combo-slider selection.
(() => {
 const selector=':host([data-satin][data-satin][data-satin]) ha-card .effect-trigger,:host([data-satin][data-satin][data-satin]) ha-card .light-extras button[aria-label="Lichteffekt auswählen"]';
 const states=suffix=>selector.split(',').map(s=>s+suffix).join(',');
 const sheet=new CSSStyleSheet();sheet.replaceSync(`
 ${selector}{position:relative!important;isolation:isolate;overflow:visible!important}
 ${states(':active:not(:disabled)')}{scale:1!important;translate:0!important;transform:none!important;filter:none!important}
 ${states('::after')}{content:'';position:absolute;inset:1px;pointer-events:none;border-radius:var(--dash6-satin-segment-lens-radius,8px);border:var(--dash6-satin-lens-border,1px solid rgba(255,255,255,.27));background:var(--dash6-satin-lens-gloss),var(--dash6-satin-lens-background);box-shadow:var(--dash6-satin-lens-shadow);opacity:0;z-index:1;transition:opacity 100ms ease}
 ${states(':active:not(:disabled)::after')}{opacity:1}
 ${states(' > ha-icon')}{position:relative;z-index:2}
 @media(prefers-reduced-motion:reduce){${states('::after')}{transition:none}}
 `);
 for(const name of ['dash6-govee-light-card-v2','dash6-lightgroup-card-v2'])customElements.whenDefined(name).then(()=>{
  let proto=customElements.get(name).prototype;while(proto&&!Object.hasOwn(proto,'render'))proto=Object.getPrototypeOf(proto);
  if(!proto||Object.hasOwn(proto,'_effectLensV1'))return;proto._effectLensV1=true;const render=proto.render;
  proto.render=function(){render.call(this);if(!this.shadowRoot.adoptedStyleSheets.includes(sheet))this.shadowRoot.adoptedStyleSheets=[...this.shadowRoot.adoptedStyleSheets,sheet];};
 });
})();
