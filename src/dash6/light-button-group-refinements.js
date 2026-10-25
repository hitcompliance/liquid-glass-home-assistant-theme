import {scopedCustomElements as customElements} from './scoped-elements.js';
// Keep the scene action in the same rail while leaving the selected light mode intact.
;(()=>{
 const actionValue='__light_scenes';
 customElements.whenDefined('dash6-glass-segments').then(()=>{
  const C=customElements.get('dash6-glass-segments'),select=C.prototype.select,update=C.prototype.update,key=C.prototype.key;
  C.prototype.select=function(value){if(value===actionValue&&this._lightSceneAction){if(!this.disabled&&!this.options.find(o=>o.value===value)?.disabled)this._lightSceneAction();return;}return select.call(this,value);};
  C.prototype.update=function(){update.call(this);const button=[...this.group.querySelectorAll('button')].find((b,i)=>this.options?.[i]?.value===actionValue);if(button){button.setAttribute('role','button');button.removeAttribute('aria-checked');button.tabIndex=0;}};
  C.prototype.key=function(e,value){if(!this._lightSceneAction)return key.call(this,e,value);if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key))return;const options=this.options.filter(o=>!o.disabled&&o.value!==actionValue);if(this.disabled||!options.length)return;e.preventDefault();let i=options.findIndex(o=>o.value===value);i=e.key==='Home'?0:e.key==='End'?options.length-1:(i+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+options.length)%options.length;this.select(options[i].value);[...this.group.querySelectorAll('button')].find(b=>b.getAttribute('aria-checked')==='true')?.focus();};
 });
 const geometry=`:host([data-light-rail][data-satin][icons-only]) .group button{min-width:0;padding:4px 2px}
 :host([data-light-rail][data-satin]) .group{--light-lens-radius:var(--dash6-satin-segment-lens-radius,8px)}
 :host([data-light-rail][data-satin]) .group button{position:relative;overflow:visible}
 :host([data-light-rail][data-satin]) .group button::before{content:'';position:absolute;left:0;right:0;top:-1px;bottom:-1px;box-sizing:border-box;border-radius:var(--light-lens-radius);pointer-events:none;opacity:0;border:1px solid rgba(255,255,255,.38);background:var(--dash6-nav-lens-hover-background,rgba(255,255,255,.035));transition:opacity 140ms ease}
 @media(hover:hover){:host([data-light-rail][data-satin]) .group button:hover:not(:disabled):not(:active){outline:none!important;background:transparent!important;border-radius:var(--light-lens-radius)!important;box-shadow:none!important}
 :host([data-light-rail][data-satin]) .group button:hover:not(:disabled):not(:active)::before{opacity:1}
 :host([data-light-rail][data-satin]) .group:has(button[aria-checked=true]:hover) .glass{scale:1!important}
 :host([data-light-rail][data-satin]) .group button[aria-checked=true]:hover::before{opacity:0}}
 @media(pointer:coarse){:host([data-light-rail][data-satin]) .group button::before{top:-3px;bottom:-3px}}`;
 for(const name of ['dash6-govee-light-card-v2','dash6-lightgroup-card-v2'])customElements.whenDefined(name).then(()=>{
  let proto=customElements.get(name).prototype;while(proto&&!Object.hasOwn(proto,'render'))proto=Object.getPrototypeOf(proto);if(!proto||Object.hasOwn(proto,'_sceneRailV1'))return;proto._sceneRailV1=true;const render=proto.render;
  proto.render=function(){render.call(this);const root=this.shadowRoot,bar=root?.querySelector('dash6-glass-segments.mode-bar');if(!bar)return;
   bar.setAttribute('data-light-rail','');if(!bar.shadowRoot.querySelector('style[data-light-geometry]')){const style=document.createElement('style');style.dataset.lightGeometry='';style.textContent=geometry;bar.shadowRoot.append(style);}
   const trigger=root.querySelector('.light-extras button[aria-label="Lichteffekt auswählen"]');if(!trigger)return;
   bar._lightSceneAction=()=>this.openEffects();bar.configure({options:[...bar.options.filter(o=>o.value!==actionValue),{value:actionValue,label:'Szenen / Effekte auswählen',icon:'mdi:creation',disabled:trigger.disabled}],value:bar.value,label:'Lichtfunktion und Szenen auswählen',iconsOnly:bar.hasAttribute('icons-only'),motion:bar.getAttribute('motion')||'theme',disabled:bar.disabled});
   if(bar.hasAttribute('icons-only'))bar.style.width='140px';const extras=trigger.parentElement;trigger.remove();if(!extras.childElementCount){extras.remove();root.querySelector('.card')?.classList.remove('has-extras');}else extras.style.setProperty('--extras-count',extras.childElementCount);
  };
 });
})();
