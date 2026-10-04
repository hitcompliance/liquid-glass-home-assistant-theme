import {buttonCSS} from './material.js';
export function inheritSatinSidebarTheme(host,dialog){
 const theme=getComputedStyle(host);
 if(theme.getPropertyValue('--dash6-satin-enabled').trim()!=='1')return false;
 // The mobile dialog is portalled to body, outside the view's theme ancestry.
 // Carry only the effective DASH material/theme variables across that boundary.
 for(let index=0;index<theme.length;index++){
  const name=theme[index];if(name.startsWith('--dash5-')||name.startsWith('--dash6-'))dialog.style.setProperty(name,theme.getPropertyValue(name));
 }
 dialog.style.setProperty('--dash6-satin-enabled','1');dialog.setAttribute('data-dash6-satin-card','');return true;
}
export function overlay(host,hass,html){return (function(){if(this.__sidebarCards)for(const card of this.__sidebarCards)card.hass=hass;
if(!this.__sidebarBound){
 this.__sidebarBound=true;
 const openSidebar=async(event)=>{
  if(event.type==='action'&&event.detail?.action!=='tap')return;
  event.stopPropagation();if(innerWidth>=1000||document.getElementById('embedded-sidebar-modal'))return;
  const dialog=document.createElement('dialog');dialog.id='embedded-sidebar-modal';dialog.setAttribute('aria-label',(this._config?.variables?.room_title||'Wohnzimmer')+' Seitenleiste');
  dialog.innerHTML="<style>"+buttonCSS+"#embedded-sidebar-modal{position:fixed;margin:0;width:590px;max-width:calc(100vw - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px) - 16px);max-height:calc(100dvh - 16px);padding:0;border:var(--dash6-material-9aa1c302);border-radius:16px;background:var(--card-background-color);color:var(--primary-text-color);box-sizing:border-box;overflow:hidden;top:max(8px,env(safe-area-inset-top,0px));right:max(8px,env(safe-area-inset-right,0px));left:auto;bottom:auto;height:calc(100dvh - max(8px,env(safe-area-inset-top,0px)) - max(8px,env(safe-area-inset-bottom,0px)));max-height:none;}#embedded-sidebar-modal{background:var(--dash6-material-d8ececcb) !important;border:var(--dash5-inner-border)!important;box-shadow:var(--dash6-material-567ba386) !important;backdrop-filter:var(--dash6-material-e9e5d3a4) !important;-webkit-backdrop-filter:var(--dash6-material-e9e5d3a4) !important;}#embedded-sidebar-modal::backdrop{background:var(--dash6-material-3d1dc6f5)}#embedded-sidebar-modal .shell{box-sizing:border-box;max-height:100%;grid-template-rows:minmax(0,1fr);display:grid;grid-template-columns:minmax(0,1fr) 274px;height:100%;min-height:0}#embedded-sidebar-modal .sidebar-widget-scroll{box-sizing:border-box;overscroll-behavior:contain;touch-action:pan-y;-webkit-overflow-scrolling:touch;overflow-y:auto;padding:12px;min-height:0}#embedded-sidebar-modal .widgets{width:250px;display:flex;flex-direction:column;gap:var(--dash5-card-row-gap)}#embedded-sidebar-modal .widgets>*{display:block;min-width:0;flex:none}#embedded-sidebar-modal .tooltip-slot{padding:12px;font:13px/1.5 sans-serif;overflow:auto;min-height:0}#embedded-sidebar-modal .close{position:sticky;top:0;z-index:2;width:100%;min-height:48px;box-sizing:border-box;padding:12px;margin-bottom:8px;border:var(--dash6-material-9aa1c302);border-radius:16px;background:var(--secondary-background-color);color:inherit;cursor:pointer}@media(max-width:599px){#embedded-sidebar-modal{width:min(282px,calc(100vw - env(safe-area-inset-left,0px) - env(safe-area-inset-right,0px) - 16px))}#embedded-sidebar-modal .shell{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) 100px}#embedded-sidebar-modal .sidebar-widget-scroll{grid-row:1;padding:12px 16px}#embedded-sidebar-modal .tooltip-slot{grid-row:2;border-top:1px solid var(--divider-color)}}#embedded-sidebar-modal nav a{scale:1;transform-origin:center;transition:scale calc(420ms * min(1,var(--dash5-elasticity))) cubic-bezier(.22,1.4,.36,1),background 180ms ease;}#embedded-sidebar-modal nav a:active{scale:calc(1 - .03 * min(1,var(--dash5-elasticity)));transition-duration:calc(90ms * min(1,var(--dash5-elasticity)));}@media(prefers-reduced-motion:reduce){#embedded-sidebar-modal nav a,#embedded-sidebar-modal nav a:active{scale:1!important;transition:none!important;}}</style><div class=\"shell\"><div class=\"tooltip-slot\">Diagramm berühren oder mit der Maus darüberfahren, um Werte anzuzeigen.</div><div class=\"sidebar-widget-scroll\"><button class=\"close\">Seitenleiste schließen</button><div class=\"widgets\"></div></div></div>";
  inheritSatinSidebarTheme(this,dialog);
  document.body.append(dialog);
  const close=()=>{this.__sidebarCards=[];for(const id of ['sidebar-stats-tooltip','embedded-card-tooltip'])document.getElementById(id)?.remove();dialog.close();dialog.remove();};
  dialog.querySelector('.close').addEventListener('click',close);
  dialog.addEventListener('click',ev=>{if(ev.target===dialog){const r=dialog.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)close();}});
  dialog.addEventListener('cancel',ev=>{ev.preventDefault();close();});
  dialog.showModal();
  try{
   const helpers=await window.loadCardHelpers();this.__sidebarCards=[];
   for(const config of((this._config?.variables?.dash6_sidebar_profiles?await Promise.all(this._config.variables.dash6_sidebar_profiles.map(key=>window.__dash6Cards.loadProfile(key))):this._config?.variables?.sidebar_cards||[]).filter(config=>config.type!=='clock'))){if(config.type==='custom:vertical-stack-in-card'){
    const nav=document.createElement('nav');nav.setAttribute('aria-label','Raumnavigation');nav.style.cssText="border:var(--dash5-inner-border);border-radius:16px;padding:6px;background:var(--dash5-inner-background);box-shadow:var(--dash5-inner-shadow);backdrop-filter:var(--dash5-inner-filter);-webkit-backdrop-filter:var(--dash5-inner-filter)";
    for(const item of config.cards){const link=document.createElement('a');link.href=item.tap_action.navigation_path;link.style.cssText='display:flex;align-items:center;gap:10px;min-height:40px;padding:0 12px;box-sizing:border-box;color:var(--primary-text-color);text-decoration:none;border-radius:12px;font:14px/1.4 var(--paper-font-body1_-_font-family,sans-serif)';
      if(location.pathname===item.tap_action.navigation_path){link.style.background='linear-gradient(145deg,rgba(8,22,37,.50),rgba(22,47,65,.32))';link.style.border='1px solid rgba(205,234,255,.22)';link.style.boxShadow='inset 0 2px 6px rgba(2,13,25,.48),inset 0 1px 0 rgba(255,255,255,.10),0 1px 0 rgba(255,255,255,.16)';link.setAttribute('aria-current','page');}
      const icon=document.createElement('ha-icon');icon.setAttribute('icon',item.icon);icon.style.cssText='width:21px;height:21px;color:#8bc5ff;flex:none';link.append(icon,document.createTextNode(item.name));link.addEventListener('click',()=>setTimeout(close,0));link.classList.add('dash6-nav-lens');link.style.background='';link.style.boxShadow='';link.style.border='';link.style.borderRadius='';link.style.backdropFilter='none';nav.append(link);}
    const lensStyle=document.createElement('style');lensStyle.textContent=`
#embedded-sidebar-modal nav a.dash6-nav-lens{border:var(--dash6-material-5b76c695) !important;border-radius:var(--dash6-nav-lens-radius,12px)!important;background:transparent!important;box-shadow:none!important;scale:1;transition:background 150ms ease,border-color 150ms ease,box-shadow 150ms ease,scale 260ms cubic-bezier(.22,1.25,.36,1)!important}
@media(hover:hover){#embedded-sidebar-modal nav a.dash6-nav-lens:hover{background:var(--dash6-nav-lens-hover-background)!important;border:var(--dash6-nav-lens-hover-border)!important;box-shadow:var(--dash6-nav-lens-hover-shadow)!important}}
#embedded-sidebar-modal nav a.dash6-nav-lens[aria-current=page]{background:var(--dash6-nav-lens-active-background)!important;border:var(--dash6-nav-lens-active-border)!important;box-shadow:var(--dash6-nav-lens-active-shadow)!important;font-weight:600}
#embedded-sidebar-modal nav a.dash6-nav-lens:active{scale:calc(1 - .02 * min(1,var(--dash5-elasticity)));box-shadow:var(--dash6-nav-lens-pressed-shadow)!important;transition-duration:90ms!important}
#embedded-sidebar-modal nav a.dash6-nav-lens:focus-visible{outline:var(--dash6-material-5ca3765c);outline-offset:2px}
@media(prefers-reduced-motion:reduce){#embedded-sidebar-modal nav a.dash6-nav-lens{transition:none!important;scale:1!important}}
`;dialog.append(lensStyle);
    dialog.querySelector('.widgets').append(nav);continue;
   }const card=await window.__dash6Cards.create(config);card.hass=this._hass;dialog.querySelector('.widgets').append(card);this.__sidebarCards.push(card);}
  }catch(error){dialog.querySelector('.widgets').textContent='Seitenleiste konnte nicht geladen werden.';console.error(error);}
 };
 this.addEventListener('click',openSidebar,true);
 this.addEventListener('action',openSidebar,true);
}
return '';}).call(host)}
let remoteModule, remotePromise;
function deferredRemote(name,args){
 if(remoteModule)return remoteModule[name](...args);
 const host=args[0];
 remotePromise??=import('./remote-hooks.js').then(module=>remoteModule=module).catch(error=>{remotePromise=null;throw error;});
 remotePromise.then(()=>{if(host.isConnected)host.requestUpdate?.();}).catch(error=>console.warn('DASH6 Fernbedienung konnte nicht geladen werden',error.message));
 return '';
}
export const remote=(...args)=>deferredRemote('remote',args);
export const remoteMain=(...args)=>deferredRemote('remoteMain',args);
export const remoteSubview=(...args)=>deferredRemote('remoteSubview',args);
