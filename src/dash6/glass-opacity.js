import {glassBlurControls,glassBlurTokens,glassBlurVariables} from './glass-blur.js';
import {glassColorVariables,glassColorTokens} from './glass-colors.js';
// Material alpha only: never fade text, controls or whole card hosts.
const number=(name,label)=>({name,label,selector:{number:{min:0,max:100,step:1,unit_of_measurement:'%',mode:'slider'}}});
export const glassOpacityControls=[...glassBlurControls,number('light_glass_opacity','Deckkraft · helles Glas'),number('dark_glass_opacity','Deckkraft · dunkles Glas')];
export const glassOpacityTokens=[...glassBlurTokens,...glassColorTokens,'dash6-satin-card-background','dash6-light-glass-opacity','dash6-dark-glass-opacity','dash6-satin-lens-background','dash6-satin-switch-lens-background','dash6-satin-control-background','dash6-satin-switch-track-background','dash6-satin-button-background','dash6-knob-background','dash6-segment-selected'];
const percent=(value,fallback)=>Number.isFinite(Number(value))?Math.max(0,Math.min(100,Number(value))):fallback;
const alpha=(value,base,anchor)=>Math.round((value<=anchor?base*value/anchor:base+(1-base)*(value-anchor)/(100-anchor))*10000)/10000;
export function glassOpacityVariables(p,prior={}){
 const vars={'dash5-thin-background':'var(--dash6-satin-lens-background)'},changed=key=>p[key]!==undefined&&p[key]!==prior[key],reduce=changed('reduce_transparency');
 if(changed('light_glass_tint_mode')||changed('light_glass_opacity')||(reduce&&p.light_glass_opacity!==undefined)){
  const value=p.reduce_transparency?100:percent(p.light_glass_opacity,22),a=base=>alpha(value,base,22);
  vars['dash6-light-glass-opacity']=String(value/100);
  vars['dash6-satin-lens-background']=`linear-gradient(145deg,rgba(255,255,255,${a(.22)}),rgba(207,222,234,${a(.07)}) 54%,rgba(255,255,255,${a(.12)}))`;
  vars['dash6-satin-switch-lens-background']=`linear-gradient(145deg,rgba(239,246,252,${a(.30)}),rgba(199,216,230,${a(.10)}) 55%,rgba(235,246,255,${a(.18)}))`;
  vars['dash6-switch-lens-background']='var(--dash6-satin-switch-lens-background)';
  vars['dash6-knob-background']='var(--dash6-satin-lens-background)';vars['dash6-segment-selected']='var(--dash6-satin-lens-background)';
  vars['dash6-icon-lens-background']=vars['dash6-satin-lens-background'];
 }
 if(changed('dark_glass_tint_mode')||changed('dark_glass_opacity')||(reduce&&p.dark_glass_opacity!==undefined)){
  const value=p.reduce_transparency?100:percent(p.dark_glass_opacity,70),a=base=>alpha(value,base,70);
  vars['dash6-dark-glass-opacity']=String(value/100);vars['dash6-satin-card-opacity']=String(value/100);
  vars['dash6-satin-control-background']=`linear-gradient(180deg,rgba(0,0,0,${a(.13)}),rgba(0,0,0,${a(.045)})),rgba(17,21,27,${a(.38)})`;
  vars['dash6-satin-switch-track-background']=`radial-gradient(ellipse at 35% 0%,rgba(255,255,255,${a(.13)}),transparent 65%),linear-gradient(180deg,rgba(69,76,85,${a(.52)}),rgba(22,27,35,${a(.63)}))`;
  vars['dash6-satin-button-background']=`linear-gradient(140deg,rgba(255,255,255,${a(.07)}),rgba(255,255,255,${a(.025)})),rgba(26,29,36,${a(.54)})`;
  vars['dash6-button-opacity']=String(a(.66));
  vars['dash5-inner-background']='var(--dash6-satin-card-background)';
 }
 return {...vars,...glassColorVariables(p,prior),...glassBlurVariables(p,prior)};
}
