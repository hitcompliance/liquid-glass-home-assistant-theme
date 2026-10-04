import {bindSatinMode,unbindSatinMode,satinSurfaceCSS} from './satin-surface.js';
export const buttonCSS = "\n/* Dark Liquid Glass buttons: material comes from the theme, motion respects accessibility. */\nbutton:not([role=radio]):not(.detail-link), [role=button]:not(ha-card):not(.detail-link), ha-icon-button, ha-button, ha-control-button {\n background:var(--dash6-button-background)!important;border:var(--dash6-button-border)!important;\n box-shadow:var(--dash6-button-shadow)!important;backdrop-filter:var(--dash6-button-filter)!important;-webkit-backdrop-filter:var(--dash6-button-filter)!important;\n border-radius:var(--dash6-button-radius,18px);color:inherit;\n transition:scale var(--dash6-button-duration,320ms) cubic-bezier(.22,1.5,.36,1),translate var(--dash6-button-duration,320ms) cubic-bezier(.22,1.5,.36,1),box-shadow 160ms ease;\n transform-origin:center; -webkit-tap-highlight-color:transparent;touch-action:manipulation;\n}\nbutton:not([role=radio]):not(.detail-link):active:not(:disabled),[role=button]:not(.detail-link):active,ha-icon-button:active,ha-button:active,ha-control-button:active {\n scale:var(--dash6-button-press-scale,.94);translate:0 var(--dash6-button-press-depth,2px);box-shadow:var(--dash6-button-pressed-shadow)!important;transition-duration:80ms;\n}\nbutton[aria-pressed=true]:not([role=radio]),button[aria-selected=true]:not([role=radio]){background:var(--dash6-button-active-background)!important}\nbutton:not(.detail-link):focus-visible,[role=button]:not(.detail-link):focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}\n@media(prefers-reduced-motion:reduce){button,[role=button],ha-icon-button,ha-button,ha-control-button{scale:1!important;translate:0!important;transition:none!important}}\n";
// Material values live in the theme. Geometry and interaction stay in each card.
export const surface = `ha-card{background:var(--dash5-inner-background)!important;border:var(--dash5-inner-border)!important;border-radius:var(--dash5-card-radius,16px)!important;box-shadow:var(--dash5-inner-shadow)!important;backdrop-filter:var(--dash5-inner-filter)!important;-webkit-backdrop-filter:var(--dash5-inner-filter)!important;color:var(--primary-text-color)}`+buttonCSS+satinSurfaceCSS;
export function materialCSS(css){
 return css.replace(/((?:^|[;{])\s*(?:background(?:-color|-image)?|box-shadow|text-shadow|backdrop-filter|-webkit-backdrop-filter|border(?:-color)?|outline(?:-color)?|color|fill|stroke)\s*:\s*)([^;}]+)/g,(all,head,value)=>{
  const important=value.includes('!important')?' !important':'';
  const plain=value.replace(/\s*!important/g,'').trim();
  if(/^(transparent|none|0|inherit|currentColor|var\(--)/.test(plain))return all;
  let hash=2166136261;for(const c of plain){hash^=c.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}
  return head+'var(--dash6-material-'+hash.toString(16)+')'+important;
 });
}

export function materialValue(property,value){
 if(typeof value!=='string'||! /^(background(?:-color|-image)?|box-shadow|text-shadow|backdrop-filter|-webkit-backdrop-filter|border(?:-color)?|outline(?:-color)?)$/.test(property)||value.includes('[[[')||value.includes('${'))return value;
 return materialCSS(property+':'+value).slice(property.length+1);
}

export function bindThemePreferences(host){unbindThemePreferences(host);bindSatinMode(host);host._themeSettingsListener=()=>window.__dash6ThemeSettings?.applyTo(host);window.addEventListener('dash6-theme-settings-changed',host._themeSettingsListener);host._themeSettingsListener();}
export function unbindThemePreferences(host){unbindSatinMode(host);if(host._themeSettingsListener)window.removeEventListener('dash6-theme-settings-changed',host._themeSettingsListener);window.__dash6ThemeSettings?.release(host);host._themeSettingsListener=null;}
