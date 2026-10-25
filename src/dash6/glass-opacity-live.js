import {glassBlurPreferences} from './glass-blur.js';
import './glass-text-defaults.js';
import {glassColorPreferences} from './glass-colors.js';
import {glassOpacityControls,glassOpacityVariables} from './glass-opacity.js';
window.__dash6GlassOpacityVariables=glassOpacityVariables;
customElements.whenDefined('dash6-theme-editor-card').then(()=>{
 const controls=window.__dash6ThemeSettings?.themeControls;
 if(controls)for(const control of glassOpacityControls)if(!controls.some(x=>x.name===control.name))controls.push(control);
 const p=customElements.get('dash6-theme-editor-card').prototype;
 if(p._glassOpacityLive)return;p._glassOpacityLive=true;
 const preferences=p.preferences;
 p.preferences=function(){const style=getComputedStyle(this),read=(name,fallback)=>{const n=parseFloat(style.getPropertyValue('--'+name));return Number.isFinite(n)?Math.round(n*100):fallback;};return {...glassBlurPreferences(style),...glassColorPreferences(style),light_glass_opacity:read('dash6-light-glass-opacity',22),dark_glass_opacity:read('dash6-dark-glass-opacity',read('dash6-satin-card-opacity',70)),...preferences.call(this)};};
});
