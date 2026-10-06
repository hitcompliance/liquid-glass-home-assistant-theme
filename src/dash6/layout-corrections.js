// One thermostat surface and an inset navigation lens. No device actions.
(() => {
 const enabled=h=>getComputedStyle(h).getPropertyValue('--dash6-satin-enabled').trim()==='1';
 const nested=h=>{for(let n=h.getRootNode().host;n;n=n.getRootNode?.().host)if(n.localName==='dash6-thermostat-card')return true;return false;};
 function apply(h){if(!h.shadowRoot)return;h.toggleAttribute('data-satin-layout-fix',enabled(h));if(h.localName==='hui-thermostat-card')h.toggleAttribute('data-satin-nested-thermostat',nested(h));if(h.shadowRoot.querySelector('#satin-layout-correction-v2'))return;const s=document.createElement('style');s.id='satin-layout-correction-v2';s.textContent=`
:host(hui-thermostat-card[data-satin-layout-fix][data-satin-nested-thermostat][data-satin-layout-fix][data-satin-layout-fix]) ha-card{background:transparent!important;background-image:none!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important;border-radius:0!important}
:host(ha-tab-group[data-satin-layout-fix]){--track-width:0px!important;--indicator-color:transparent!important;--track-color:transparent!important}
:host(ha-tab-group[data-satin-layout-fix]) ::slotted(ha-tab-group-tab[active]){border-block-end:0!important;margin-block-end:0!important}
:host(ha-tab-group[data-satin-layout-fix]) .tabs[data-dash6-satin-group]{height:48px!important;min-height:48px!important;padding:3px!important;align-items:center!important;overflow:hidden!important}
:host(ha-tab-group[data-satin-layout-fix]) .tabs .dash6-satin-group-lens{max-height:40px!important;top:0!important;translate:0 -1px!important}
:host(ha-tab-group-tab[data-satin-layout-fix]){height:42px!important;min-height:42px!important}
:host(ha-tab-group-tab[data-satin-layout-fix]) .tab{height:42px!important;box-sizing:border-box!important;border-bottom:0!important;box-shadow:none!important}
:host(ha-tab-group-tab[data-satin-layout-fix]) .tab::after,:host(ha-tab-group-tab[data-satin-layout-fix]) .tab::before{display:none!important}
`;h.shadowRoot.append(s);}
 for(const name of ['hui-thermostat-card','ha-tab-group','ha-tab-group-tab'])customElements.whenDefined(name).then(()=>{const p=customElements.get(name).prototype;if(p._satinLayoutCorrectionV2)return;p._satinLayoutCorrectionV2=true;const old=p.updated;p.updated=function(...args){const r=old?.apply(this,args);apply(this);return r;};});
 function scan(root){for(const e of root.querySelectorAll('*')){if(['hui-thermostat-card','ha-tab-group','ha-tab-group-tab'].includes(e.localName))apply(e);if(e.shadowRoot)scan(e.shadowRoot);}}
 scan(document);
})();
