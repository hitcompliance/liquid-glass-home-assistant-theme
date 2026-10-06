// Shared, pre-mount material for scene and door actions. No action handlers change.
(() => {
 const group = ':host([data-satin][data-satin][data-satin]) ha-card .shoe-scenes.shoe-scenes,:host([data-satin][data-satin][data-satin]) ha-card .scene-recess.scene-recess,:host([data-satin][data-satin][data-satin]) ha-card .actions.actions';
 const sceneContainers = ':host([data-satin][data-satin][data-satin]) ha-card .scenes.scenes,:host([data-satin][data-satin][data-satin]) ha-card .scene-recess.scene-recess,:host([data-satin][data-satin][data-satin]) ha-card .shoe-scenes.shoe-scenes';
 const item = ':host([data-satin][data-satin][data-satin]) ha-card .shoe-scenes.shoe-scenes > button,:host([data-satin][data-satin][data-satin]) ha-card .scene-recess.scene-recess > button,:host([data-satin][data-satin][data-satin]) ha-card .actions.actions > button,:host([data-satin][data-satin][data-satin]) ha-card#vacuum-card#vacuum-card .actions-row.actions-row > button,:host([data-satin][data-satin][data-satin]) ha-card .footer.footer > button:not(.error-indicator)';
 const css = `
${sceneContainers}{background:transparent!important;background-image:none!important;border:0!important;outline:none!important;box-shadow:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
${group}{margin:0px!important;padding:0px!important;gap:8px!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;overflow:visible!important}
:host([data-satin][data-satin][data-satin]) ha-card .shoe-scenes{flex-wrap:nowrap!important}
${item}{position:relative!important;isolation:isolate!important;box-sizing:border-box!important;min-width:0!important;min-height:48px!important;margin:0!important;border-radius:10px!important;border:var(--dash6-satin-card-border)!important;box-shadow:none!important;backdrop-filter:none!important;scale:1!important;translate:0!important;transform:none!important;filter:none!important;transition:box-shadow 140ms ease,border-color 140ms ease!important}
:host([data-satin][data-satin][data-satin]) ha-card .shoe-scenes > .dash6-satin-group-lens,:host([data-satin][data-satin][data-satin]) ha-card .scene-recess > .dash6-satin-group-lens{display:none!important}
${item.split(',').filter(s=>!s.includes('shoe-scenes')&&!s.includes('scene-recess')).join(',')}{background:rgba(24,28,34,.32)!important;color:var(--primary-text-color)!important}
${item.split(',').map(s=>s+'[aria-pressed=true]').join(',')}{border-color:var(--lc-accent,var(--primary-color))!important}
${item.split(',').map(s=>s+'::before').join(',')}{content:''!important;position:absolute;inset:0;pointer-events:none;border-radius:inherit;background:radial-gradient(ellipse 95% 75% at var(--inset-x,32%) var(--inset-y,0%),rgba(255,255,255,var(--dash6-satin-hover-gloss,.20)),transparent 64%)!important;box-shadow:none!important;opacity:0!important;transition:opacity 180ms ease!important}
@media(hover:hover){${item.split(',').map(s=>s+':hover:not(:disabled)').join(',')}{box-shadow:inset 0 1px 0 rgba(255,255,255,.30),0 2px 4px rgba(0,0,0,.18)!important}${item.split(',').map(s=>s+':hover:not(:disabled)::before').join(',')}{opacity:1!important}}
${item.split(',').map(s=>s+':active:not(:disabled)').join(',')}{box-shadow:inset 0 7px 12px rgba(0,0,0,.90),inset 0 3px 5px rgba(0,0,0,.75),inset 0 -1px 1px rgba(255,255,255,.30)!important;border-color:transparent!important;transition-property:box-shadow!important;transition-duration:65ms!important}
${item.split(',').map(s=>s+':active::before').join(',')}{opacity:.35!important}
@media(prefers-reduced-motion:reduce){${item}{transition:none!important}}
`;
 const preserveSceneBackgrounds=root=>{for(const sheet of root.adoptedStyleSheets)for(const rule of sheet.cssRules){if(rule.selectorText?.includes('.actions')&&/shoe-scenes|scene-recess/.test(rule.selectorText)&&rule.style?.background){rule.style.removeProperty('background');rule.style.removeProperty('color');}}};
 const sheet = new CSSStyleSheet(); sheet.replaceSync(css);
 for (const name of ['dash6-shoe-cabinet-card','dash6-door-card','dash6-lightgroup-card-v2','dash6-vacuum-card','dash6-media-card']) {
  customElements.whenDefined(name).then(() => {
   const proto = customElements.get(name).prototype;
   if (Object.hasOwn(proto,'_actionButtonsV9Installed')) return;
   proto._actionButtonsV9Installed = true;
   const createRoot = proto.createRenderRoot;
   if (createRoot) proto.createRenderRoot = function () {
    const root = createRoot.call(this);
    if (!root.adoptedStyleSheets.includes(sheet)) root.adoptedStyleSheets = [...root.adoptedStyleSheets,sheet];
    preserveSceneBackgrounds(root);
    return root;
   };
   if(name==='dash6-shoe-cabinet-card'||name==='dash6-lightgroup-card-v2'){
    const render=proto.render;
    proto.render=function(){render.call(this);const buttons=this.shadowRoot?.querySelectorAll('.shoe-scenes > button,.scene-recess > button');for(const [index,scene] of (this._config?.scenes||[]).entries())if(typeof scene.fill==='string'){buttons?.[index]?.style.setProperty('--scene-fill',scene.fill);buttons?.[index]?.style.setProperty('background',scene.fill,'important');}};
   }
   const configure = proto.setConfig;
   proto.setConfig = function (config) {
    configure.call(this,config);
    if (this.shadowRoot && !this.shadowRoot.adoptedStyleSheets.includes(sheet)) this.shadowRoot.adoptedStyleSheets = [...this.shadowRoot.adoptedStyleSheets,sheet];
    if(this.shadowRoot)preserveSceneBackgrounds(this.shadowRoot);
    if (!this._insetPointerBound) {
     this._insetPointerBound = true;
     this.addEventListener('pointermove', event => {
      const button = event.composedPath().find(node => node?.localName === 'button' && node.parentElement?.matches('.shoe-scenes,.scene-recess,.actions,.actions-row,.footer'));
      if (!button) return;
      const box = button.getBoundingClientRect();
      button.style.setProperty('--inset-x', `${100*(event.clientX-box.left)/box.width}%`);
      button.style.setProperty('--inset-y', `${100*(event.clientY-box.top)/box.height}%`);
     }, {passive:true});
    }

   };
  });
 }
})();
