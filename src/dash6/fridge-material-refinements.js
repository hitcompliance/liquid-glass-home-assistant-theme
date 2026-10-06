// Refrigerator-specific content shares the standard IKEA/theme card surface.
(() => {
 const surfaceCSS=`
[data-dash6-satin-surface],#embedded-sidebar-modal[data-dash6-satin-surface]{
 background:radial-gradient(ellipse 95% 75% at var(--dash6-satin-pointer-x,32%) var(--dash6-satin-pointer-y,0%),rgba(255,255,255,calc(var(--dash6-satin-hover-gloss,.20) * var(--dash6-satin-hovered,0))),transparent 64%),var(--dash6-satin-card-background)!important;
 border:var(--dash6-satin-card-border)!important;border-bottom-color:var(--dash6-satin-card-bottom-edge,rgba(255,255,255,.045))!important;
 box-shadow:var(--dash6-satin-card-shadow)!important;backdrop-filter:var(--dash6-satin-card-filter)!important;-webkit-backdrop-filter:var(--dash6-satin-card-filter)!important;
 border-radius:var(--dash5-card-radius,16px)!important;background-clip:padding-box!important;
 transition:box-shadow var(--dash6-satin-gloss-duration,180ms) ease,border-color var(--dash6-satin-gloss-duration,180ms) ease!important;
}
[data-dash6-satin-surface].dash5-thin-flush{padding-top:0px!important;padding-bottom:0px!important}
`;
 const legacy={
  '--dash6-satin-card-background':'linear-gradient(140deg,rgba(255,255,255,.11),transparent 55%),rgba(16,20,26,.84)',
  '--dash6-satin-card-border':'1px solid rgba(238,245,255,.34)',
  '--dash6-satin-card-shadow':'inset 0 2px 2px rgba(255,255,255,.22),inset 0 -3px 4px rgba(0,0,0,.65),0 12px 25px rgba(0,0,0,.4)',
  '--dash6-satin-card-filter':'blur(18px) saturate(1.3)'
 };
 customElements.whenDefined('button-card').then(()=>{
  const p=customElements.get('button-card').prototype;if(p._fridgeSharedMaterialV2)return;p._fridgeSharedMaterialV2=true;const old=p.updated;
  p.updated=function(...args){const result=old?.apply(this,args);
   if(this._config?.satin_fridge!==true&&this._config?.custom_fields?.door_status===undefined)return result;
   // Only retire overrides introduced by our earlier fridge refinement.
   for(const [key,value]of Object.entries(legacy))if(this.style.getPropertyValue(key).trim()===value)this.style.removeProperty(key);
   const root=this.shadowRoot;root?.querySelector('#fridge-thick-style')?.remove();
   const card=root?.querySelector('ha-card');
   if(card){card.toggleAttribute('data-dash6-satin-surface',getComputedStyle(this).getPropertyValue('--dash6-satin-enabled').trim()==='1');
    if(!root.querySelector('#fridge-shared-surface')){const style=document.createElement('style');style.id='fridge-shared-surface';style.textContent=surfaceCSS;root.append(style);}
    if(!card._fridgeGloss){card._fridgeGloss=true;card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect();card.style.setProperty('--dash6-satin-hovered','1');card.style.setProperty('--dash6-satin-pointer-x',`${100*(e.clientX-r.left)/r.width}%`);card.style.setProperty('--dash6-satin-pointer-y',`${100*(e.clientY-r.top)/r.height}%`);});card.addEventListener('pointerleave',()=>card.style.setProperty('--dash6-satin-hovered','0'));}
   }
   if(root&&!root.querySelector('#fridge-values-style')){const s=document.createElement('style');s.id='fridge-values-style';s.textContent=':host #values#values{padding-right:12px!important;box-sizing:border-box}';root.append(s);}
   return result;
  };
 });
})();
