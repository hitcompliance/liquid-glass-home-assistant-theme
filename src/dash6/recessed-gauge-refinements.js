// Recessed thermostat tracks; glass handles retain their native drag behavior.
(() => {
 const menuCSS=`:host dialog{background:linear-gradient(135deg,rgba(249,251,253,.67),rgba(220,230,240,.51))!important;box-shadow:inset 0 1px 2px rgba(255,255,255,.85),0 22px 46px rgba(0,0,0,.58),0 5px 14px rgba(0,0,0,.35)!important;backdrop-filter:blur(18px) saturate(1.2)!important;-webkit-backdrop-filter:blur(18px) saturate(1.2)!important}:host dialog button.preset-menu-row.preset-menu-row.preset-menu-row.preset-menu-row.preset-menu-row,:host dialog button.preset-menu-row.preset-menu-row.preset-menu-row.preset-menu-row.preset-menu-row:active{scale:1!important;translate:0!important;transform:none!important;transition:none!important}`;
 customElements.whenDefined('dash6-thermostat-card').then(()=>{
  const p=customElements.get('dash6-thermostat-card').prototype;if(p._recessedPreset)return;p._recessedPreset=true;const old=p.updated;
  p.updated=function(...args){const result=old.apply(this,args),root=this.shadowRoot;if(!root)return result;
   if(!root.querySelector('#recessed-preset-css')){const s=document.createElement('style');s.id='recessed-preset-css';s.textContent=menuCSS;root.append(s);}
   const d=root.querySelector('dialog');if(d&&!d._satinOutsideClose){d._satinOutsideClose=true;d.addEventListener('click',e=>{if(!d.open)return;const r=d.getBoundingClientRect();const outside=e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;if(outside&&e.target===d){e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();d.close();}else if(e.target===d){e.stopImmediatePropagation();}},true);}
   return result;
  };
 });
 const ns='http://www.w3.org/2000/svg';
 const add=(parent,name,attrs)=>{const node=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,v);parent.append(node);return node;};
 function recess(host){
  const f=host.shadowRoot?.querySelector('defs[data-sculpted-gauge] filter[id$="-arc"]');if(!f||f.hasAttribute('data-recessed-track'))return;
  const spec=f.querySelector('feSpecularLighting'),clip=f.querySelector('feComposite[result=shine]');f.setAttribute('data-recessed-track','');f.replaceChildren();
  // Subtract the track silhouette from each flood, shift it, blur, then clip
  // back into the track. The upper dark wall and lower light wall imply depth.
  for(const [name,color,opacity,dx,dy,blur]of [['wall','#000','.82','1','3','2.2'],['rim','#fff','.48','-1','-2','1.1']]){
   add(f,'feFlood',{'flood-color':color,'flood-opacity':opacity,result:name+'-paint'});
   add(f,'feComposite',{in:name+'-paint',in2:'SourceAlpha',operator:'out',result:name+'-void'});
   add(f,'feOffset',{in:name+'-void',dx,dy,result:name+'-shift'});
   add(f,'feGaussianBlur',{in:name+'-shift',stdDeviation:blur,result:name+'-soft'});
   add(f,'feComposite',{in:name+'-soft',in2:'SourceAlpha',operator:'in',result:name});
  }
  if(spec&&clip){f.append(spec,clip);}const merge=add(f,'feMerge',{});for(const input of ['SourceGraphic','wall','rim',...(spec?['shine']:[])])add(merge,'feMergeNode',{in:input});
 }
 customElements.whenDefined('ha-control-circular-slider').then(()=>{
  const p=customElements.get('ha-control-circular-slider').prototype;if(p._recessedTrack)return;p._recessedTrack=true;const old=p.updated;
  p.updated=function(...args){const result=old?.apply(this,args);recess(this);return result;};
 });
})();
