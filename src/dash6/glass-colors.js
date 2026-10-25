import {html} from 'lit';
export const glassColorNames=['light','dark'].flatMap(m=>['tint_mode','tint','text_mode','text'].map(k=>m+'_glass_'+k));
export const glassColorTokens=['light','dark'].flatMap(m=>['tint-mode','tint','text-mode','text','text-color'].map(k=>'dash6-'+m+'-glass-'+k));
const hex=value=>/^#[\da-f]{6}$/i.test(value||'')?value:null;
export function glassColorPreferences(style){return Object.fromEntries(['light','dark'].flatMap(m=>['tint_mode','tint','text_mode','text'].map(k=>[m+'_glass_'+k,style.getPropertyValue('--dash6-'+m+'-glass-'+k.replaceAll('_','-')).trim()||({tint_mode:'theme',tint:m==='light'?'#ffffff':'#181c22',text_mode:'theme',text:'#ffffff'})[k]])));}
export function glassColorVariables(p,prior={}){
 const vars={};
 for(const m of ['light','dark']){
  for(const k of ['tint_mode','tint','text_mode','text']){const key=m+'_glass_'+k;if(p[key]!==undefined&&p[key]!==prior[key])vars['dash6-'+m+'-glass-'+k.replaceAll('_','-')]=k.endsWith('mode')?p[key]:hex(p[key])||'#ffffff';}
  const key=m+'_glass_',mode=p[key+'tint_mode'];
  if(mode&&(['tint_mode','tint','opacity'].some(k=>p[key+k]!==prior[key+k])||p.reduce_transparency!==prior.reduce_transparency)){
   const color=hex(p[key+'tint'])||(m==='light'?'#ffffff':'#181c22'),rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)).join(','),a=p.reduce_transparency?1:Math.max(0,Math.min(1,(p[key+'opacity']??(m==='light'?22:70))/100));
   const bg=mode==='none'?'transparent':`rgba(${rgb},${a})`;
   if(mode!=='theme')for(const token of m==='light'?['dash6-satin-lens-background','dash6-satin-switch-lens-background','dash6-switch-lens-background','dash6-icon-lens-background','dash6-knob-background','dash6-segment-selected']:['dash6-satin-card-background','dash6-satin-control-background','dash6-satin-switch-track-background','dash6-satin-button-background'])vars[token]=bg;
   else if(m==='dark')vars['dash6-satin-card-background']='linear-gradient(135deg,rgba(255,255,255,var(--dash6-satin-card-gloss,.14)),transparent 48%,rgba(255,255,255,.025)),rgba(24,28,34,var(--dash6-satin-card-opacity,.70))';
  }
  if(p[key+'text_mode']!==undefined&&(p[key+'text_mode']!==prior[key+'text_mode']||p[key+'text']!==prior[key+'text']))vars['dash6-'+m+'-glass-text-color']=p[key+'text_mode']==='custom'?(hex(p[key+'text'])||'#ffffff'):'var(--dash6-material-theme-primary-text-color)';
 }
 return vars;
}
export function glassColorFields(host,p,m){
 const key=m+'_glass_',label=m==='light'?'Helles Glas':'Dunkles Glas',change=patch=>host.change({...p,...patch},p);
 return html`<style>.glass-colors{display:grid;gap:10px;margin:14px 0 24px}.glass-color-row{display:flex;align-items:center;flex-wrap:wrap;gap:10px}.glass-colors label{display:flex;align-items:center;flex-wrap:wrap;gap:10px}.glass-colors select{font:inherit;min-height:40px;padding:6px;border:1px solid var(--divider-color);border-radius:8px;background:var(--secondary-background-color);color:var(--primary-text-color)}.glass-colors input[type=color]{width:52px;height:40px;padding:3px;border:1px solid var(--divider-color);border-radius:8px;cursor:pointer}.glass-colors small{font-size:12px}</style><div class="glass-colors"><label>Hintergrundfärbung<select aria-label=${label+' Hintergrundfärbung'} .value=${p[key+'tint_mode']||'theme'} @change=${e=>change({[key+'tint_mode']:e.target.value})}><option value="theme">Theme-Vorgabe</option><option value="custom">Eigene Farbe</option><option value="none">Keine Färbung</option></select><input type="color" aria-label=${label+' Hintergrundfarbe'} .value=${hex(p[key+'tint'])||(m==='light'?'#ffffff':'#181c22')} @input=${e=>change({[key+'tint']:e.target.value,[key+'tint_mode']:'custom'})}></label><label>Standard-Textfarbe<select aria-label=${label+' Textfarbe-Modus'} .value=${p[key+'text_mode']||'theme'} @change=${e=>change({[key+'text_mode']:e.target.value})}><option value="theme">Theme-Vorgabe</option><option value="custom">Eigene Farbe</option></select><input type="color" aria-label=${label+' Textfarbe'} .value=${hex(p[key+'text'])||'#ffffff'} @input=${e=>change({[key+'text']:e.target.value,[key+'text_mode']:'custom'})}></label></div>`;
}
