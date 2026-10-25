export function materialThemeText(element){
 let scope=document.documentElement;
 for(let n=element;n;n=n.parentNode||n.host)if(['hui-view-container','hui-root','ha-panel-lovelace'].includes(n.localName)){scope=n;break;}
 const style=getComputedStyle(scope),fallback=getComputedStyle(document.documentElement);
 return {primary:style.getPropertyValue('--primary-text-color').trim()||fallback.getPropertyValue('--primary-text-color').trim()||'#ffffff',secondary:style.getPropertyValue('--secondary-text-color').trim()||fallback.getPropertyValue('--secondary-text-color').trim()||'#b0b8c0'};
}
