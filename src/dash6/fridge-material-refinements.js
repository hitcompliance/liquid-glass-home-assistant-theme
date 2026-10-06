// Refrigerator-specific content shares the standard IKEA/theme card surface.
(() => {
 const legacy={
  '--dash6-satin-card-background':'linear-gradient(140deg,rgba(255,255,255,.11),transparent 55%),rgba(16,20,26,.84)',
  '--dash6-satin-card-border':'1px solid rgba(238,245,255,.34)',
  '--dash6-satin-card-shadow':'inset 0 2px 2px rgba(255,255,255,.22),inset 0 -3px 4px rgba(0,0,0,.65),0 12px 25px rgba(0,0,0,.4)',
  '--dash6-satin-card-filter':'blur(18px) saturate(1.3)'
 };
 customElements.whenDefined('button-card').then(()=>{
  const p=customElements.get('button-card').prototype;if(p._fridgeSharedMaterial)return;p._fridgeSharedMaterial=true;const old=p.updated;
  p.updated=function(...args){const result=old?.apply(this,args);
   if(this._config?.satin_fridge!==true&&this._config?.custom_fields?.door_status===undefined)return result;
   // Only retire overrides introduced by our earlier fridge refinement.
   for(const [key,value]of Object.entries(legacy))if(this.style.getPropertyValue(key).trim()===value)this.style.removeProperty(key);
   const root=this.shadowRoot;root?.querySelector('#fridge-thick-style')?.remove();
   if(root&&!root.querySelector('#fridge-values-style')){const s=document.createElement('style');s.id='fridge-values-style';s.textContent=':host #values#values{padding-right:12px!important;box-sizing:border-box}';root.append(s);}
   return result;
  };
 });
})();
