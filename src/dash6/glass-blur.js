export const glassBlurControls=['light','dark'].map(m=>({name:m+'_glass_blur',label:'Unschärfe · '+(m==='light'?'helles':'dunkles')+' Glas',selector:{number:{min:0,max:40,step:1,unit_of_measurement:'px',mode:'slider'}}}));
export const glassBlurTokens=['dash6-light-glass-blur','dash6-dark-glass-blur','dash5-thin-filter','dash6-satin-lens-filter','dash6-satin-switch-lens-filter','dash6-switch-lens-filter','dash5-icon-filter','dash6-satin-card-filter','dash6-satin-control-filter','dash6-satin-frost','dash5-inner-filter','dash6-button-filter','dash6-button-blur'];
export function glassBlurPreferences(style){
 const read=(token,fallback)=>{const n=parseFloat(style.getPropertyValue('--'+token));return Number.isFinite(n)?n:fallback;};
 const thin=Number(style.getPropertyValue('--dash5-thin-filter').match(/blur\(([\d.]+)px\)/)?.[1]??3);
 return {light_glass_blur:read('dash6-light-glass-blur',thin),dark_glass_blur:read('dash6-dark-glass-blur',read('dash6-satin-frost',8))};
}
export function glassBlurVariables(p,prior={}){
 const vars={};
 for(const m of ['light','dark']){const key=m+'_glass_blur';if(p[key]===undefined||(p[key]===prior[key]&&p.reduce_transparency===prior.reduce_transparency))continue;const n=Number(p[key]);if(!Number.isFinite(n))continue;const px=(p.reduce_transparency?0:Math.max(0,Math.min(40,n)))+'px';vars['dash6-'+m+'-glass-blur']=px;
  if(m==='light'){vars['dash5-thin-filter']=`blur(${px}) saturate(1.18)`;vars['dash6-satin-lens-filter']=`blur(${px}) saturate(1.12)`;vars['dash6-satin-switch-lens-filter']=`blur(${px}) saturate(1.35) contrast(1.12)`;vars['dash6-switch-lens-filter']='var(--dash6-satin-switch-lens-filter)';vars['dash5-icon-filter']=`blur(${px}) saturate(1.25)`;}
  else{vars['dash6-satin-frost']=px;vars['dash6-satin-card-filter']=`blur(${px}) saturate(1.08)`;vars['dash6-satin-control-filter']=`blur(${px}) saturate(1.04)`;vars['dash5-inner-filter']='var(--dash6-satin-card-filter)';vars['dash6-button-blur']=px;vars['dash6-button-filter']=`blur(${px}) saturate(1.25)`;}
 }
 return vars;
}
