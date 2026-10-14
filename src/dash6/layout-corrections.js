import {scopedCustomElements as customElements} from './scoped-elements.js';
import {inDashboardScope} from './scope.js';
import {satinNavigationHost} from './satin-groups.js';
// One thermostat surface and an inset navigation lens. No device actions.
(() => {
 const enabled=h=>getComputedStyle(h).getPropertyValue('--dash6-satin-enabled').trim()==='1';
 const nested=h=>{for(let n=h.getRootNode().host;n;n=n.getRootNode?.().host)if(n.localName==='dash6-thermostat-card')return true;return false;};
 function apply(h){if(!inDashboardScope()||!h.shadowRoot)return;
 // Keep the native scroller; a vertical mouse wheel also reaches hidden views.
 if(satinNavigationHost(h)&&!h._dash6NativeNavigationWheel){const nav=h.shadowRoot.querySelector('.nav');if(nav){h._dash6NativeNavigationWheel=true;nav.addEventListener('wheel',e=>{if(!inDashboardScope()||!satinNavigationHost(h)||!enabled(h)||!h.hasAttribute('data-dash6-satin-navigation')||e.ctrlKey||Math.abs(e.deltaX)>=Math.abs(e.deltaY)||nav.scrollWidth<=nav.clientWidth)return;const delta=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?nav.clientWidth:1),before=nav.scrollLeft;nav.scrollLeft+=delta;if(nav.scrollLeft!==before)e.preventDefault();},{passive:false});}}
 h.toggleAttribute('data-satin-layout-fix',h.localName==='hui-thermostat-card'&&enabled(h));if(h.localName==='hui-thermostat-card')h.toggleAttribute('data-satin-nested-thermostat',nested(h));if(h.shadowRoot.querySelector('#dash6-native-layout-correction-v3'))return;const s=document.createElement('style');s.id='dash6-native-layout-correction-v3';s.textContent=`
:host(hui-thermostat-card[data-satin-layout-fix][data-satin-nested-thermostat][data-satin-layout-fix][data-satin-layout-fix]) ha-card{background:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-radius:0!important}
:host(ha-tab-group[data-dash6-satin-navigation]){--track-width:0px!important;--indicator-color:transparent!important;--track-color:transparent!important}
:host(ha-tab-group[data-dash6-satin-navigation]) ::slotted(ha-tab-group-tab[active]){border-block-end:0!important;margin-block-end:0!important}
:host(ha-tab-group[data-dash6-satin-navigation]) .tabs[data-dash6-satin-group]{height:48px!important;min-height:48px!important;padding:3px!important;align-items:center!important;overflow:visible!important}
:host(ha-tab-group[data-dash6-satin-navigation]) .tabs .dash6-satin-group-lens{max-height:40px!important;top:0!important;translate:0 -1px!important}
:host(ha-tab-group-tab[data-dash6-satin-navigation-item]){height:42px!important;min-height:42px!important}
:host(ha-tab-group-tab[data-dash6-satin-navigation-item]) .tab{height:42px!important;box-sizing:border-box!important;border-bottom:0!important;box-shadow:none!important}
:host(ha-tab-group-tab[data-dash6-satin-navigation-item]) .tab::after,:host(ha-tab-group-tab[data-dash6-satin-navigation-item]) .tab::before{display:none!important}
`;h.shadowRoot.append(s);}
 for(const name of ['hui-thermostat-card','ha-tab-group','ha-tab-group-tab'])customElements.whenDefined(name).then(()=>{const p=customElements.get(name).prototype;if(p._dash6NativeLayoutCorrectionV3)return;p._dash6NativeLayoutCorrectionV3=true;const old=p.updated;p.updated=function(...args){const r=old?.apply(this,args);apply(this);return r;};});
 function scan(root){for(const e of root.querySelectorAll('*')){if(['hui-thermostat-card','ha-tab-group','ha-tab-group-tab'].includes(e.localName))apply(e);if(e.shadowRoot)scan(e.shadowRoot);}}
 scan(document);
})();
