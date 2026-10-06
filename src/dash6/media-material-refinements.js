// Media shells inherit the same transparent material and pointer gloss as IKEA cards.
(() => {
 const legacy=`--dash6-satin-card-background:linear-gradient(140deg,rgba(255,255,255,.11),transparent 55%),rgba(16,20,26,.84);--dash6-satin-card-border:1px solid rgba(238,245,255,.34);--dash6-satin-card-shadow:inset 0 2px 2px rgba(255,255,255,.22),inset 0 -3px 4px rgba(0,0,0,.65),0 12px 25px rgba(0,0,0,.4);--dash6-satin-card-filter:blur(18px) saturate(1.3)`;
 const css=`
:host [data-dash6-media-surface][data-dash6-media-surface]{
 background:radial-gradient(ellipse 95% 75% at var(--dash6-satin-pointer-x,32%) var(--dash6-satin-pointer-y,0%),rgba(255,255,255,calc(var(--dash6-satin-hover-gloss,.20) * var(--dash6-satin-hovered,0))),transparent 64%),var(--dash6-satin-card-background)!important;
 border:var(--dash6-satin-card-border)!important;border-bottom-color:var(--dash6-satin-card-bottom-edge,rgba(255,255,255,.045))!important;
 box-shadow:var(--dash6-satin-card-shadow)!important;backdrop-filter:var(--dash6-satin-card-filter)!important;-webkit-backdrop-filter:var(--dash6-satin-card-filter)!important;
 border-radius:var(--dash5-card-radius,16px)!important;background-clip:padding-box!important;
 transition:box-shadow var(--dash6-satin-gloss-duration,180ms) ease,border-color var(--dash6-satin-gloss-duration,180ms) ease!important;
}
[data-dash6-satin-surface].dash5-thin-flush{padding-top:0px!important;padding-bottom:0px!important}
`;
 function sync(host){
  if(!host.shadowRoot)return;
  for(const item of legacy.split(';')){const i=item.indexOf(':');const key=item.slice(0,i);if(host.style.getPropertyValue(key).trim()===item.slice(i+1))host.style.removeProperty(key);}
  let style=host.shadowRoot.querySelector('#media-shared-surface');
  if(!style){style=document.createElement('style');style.id='media-shared-surface';style.textContent=css;host.shadowRoot.append(style);}
  const shell=host.shadowRoot.querySelector('.satin-homepod-shell')||host.shadowRoot.querySelector('ha-card');
  if(!shell)return;
  shell.toggleAttribute('data-dash6-media-surface',getComputedStyle(host).getPropertyValue('--dash6-satin-enabled').trim()==='1');
  if(!shell._satinMediaPointer){shell._satinMediaPointer=true;
   shell.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||!shell.hasAttribute('data-dash6-media-surface'))return;const r=shell.getBoundingClientRect();if(!r.width||!r.height)return;shell.style.setProperty('--dash6-satin-pointer-x',Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100))+'%');shell.style.setProperty('--dash6-satin-pointer-y',Math.max(0,Math.min(100,(event.clientY-r.top)/r.height*100))+'%');shell.style.setProperty('--dash6-satin-hovered','1');});
   const reset=()=>shell.style.setProperty('--dash6-satin-hovered','0');shell.addEventListener('pointerleave',reset);shell.addEventListener('pointercancel',reset);
  }
 }
 customElements.whenDefined('dash6-homepod-card').then(()=>{const p=customElements.get('dash6-homepod-card').prototype;if(p._mediaSharedMaterial)return;p._mediaSharedMaterial=true;const old=p._updateCard;p._updateCard=async function(...args){await old.apply(this,args);sync(this);};});
 customElements.whenDefined('dash6-media-card').then(()=>{const p=customElements.get('dash6-media-card').prototype;if(p._mediaSharedMaterial)return;p._mediaSharedMaterial=true;const old=p.updated;p.updated=async function(...args){await old.apply(this,args);sync(this);};});
 const refresh=()=>{function visit(root){for(const node of root.querySelectorAll('*')){if(['dash6-homepod-card','dash6-media-card','dash6-appletv-card'].includes(node.localName))sync(node);if(node.shadowRoot)visit(node.shadowRoot);}}visit(document);};
 for(const event of ['dash6-theme-settings-changed','theme-changed','location-changed'])window.addEventListener(event,refresh);
})();
