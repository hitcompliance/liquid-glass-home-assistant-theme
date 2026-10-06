// Keep the native media browser action; present it as the last transport button.
(() => {
 const managed=card=>{if(card._satinMediaHeader)return true;for(let n=card;n;n=n.assignedSlot||n.parentNode||n.host)if(['dash6-homepod-card','dash6-appletv-card','dash6-media-card'].includes(n.localName))return true;return false;};
 function sync(card){
  const root=card?.shadowRoot;if(!root)return;
  const original=root.querySelector('.browse-media'),existing=root.querySelector('.satin-browse-transport');
  const active=managed(card)&&getComputedStyle(card).getPropertyValue('--dash6-satin-enabled').trim()==='1';
  const row=root.querySelector('.dash6-pod-transport')||root.querySelector('.controls .start');
  card.toggleAttribute('data-satin-browse-row',active);
  if(active&&!root.querySelector('#satin-browse-row-css')){const s=document.createElement('style');s.id='satin-browse-row-css';s.textContent=':host([data-satin-browse-row]) .browse-media{display:none!important}:host([data-satin-browse-row]) .player{padding-top:var(--dash6-media-player-padding-top,0px)!important}';root.append(s);}
  if(!active||!original||!row){existing?.remove();if(original?._satinBrowseA11y){const saved=original._satinBrowseA11y;for(const [k,v]of Object.entries(saved))v===null?original.removeAttribute(k):original.setAttribute(k,v);delete original._satinBrowseA11y;}return;}
  original._satinBrowseA11y??={'aria-hidden':original.getAttribute('aria-hidden'),tabindex:original.getAttribute('tabindex')};original.setAttribute('aria-hidden','true');original.setAttribute('tabindex','-1');
  const pod=row.classList.contains('dash6-pod-transport'),tag=pod?'button':original.localName;let browse=existing;
  if(browse&&browse.localName!==tag){browse.remove();browse=null;}
  if(!browse){browse=document.createElement(tag);browse.className='satin-browse-transport';browse.dataset.action='browse_media';browse.setAttribute('action','browse_media');if(pod){browse.type='button';const icon=document.createElement('ha-icon');icon.setAttribute('icon','mdi:play-box-multiple');browse.append(icon);}browse.addEventListener('click',e=>{e.stopPropagation();const current=card.shadowRoot?.querySelector('.browse-media');if(!browse.disabled&&current&&!current.disabled)current.click();});}
  const label=original.label||original.getAttribute('aria-label')||card.hass?.localize?.('ui.card.media_player.browse_media')||'Medien durchsuchen';browse.setAttribute('aria-label',label);browse.title=label;
  if(!pod){browse.label=label;if(original.path)browse.path=original.path;if(original.icon)browse.icon=original.icon;}
  const state=(card.hass||card._hass)?.states[card._config?.entity];browse.disabled=!!original.disabled||['unknown','unavailable'].includes(state?.state);
  if(row.lastElementChild!==browse)row.append(browse);
 }
 customElements.whenDefined('hui-media-control-card').then(()=>{const p=customElements.get('hui-media-control-card').prototype;if(p._satinBrowseTransport)return;p._satinBrowseTransport=true;const old=p.updated;p.updated=function(...args){const result=old?.apply(this,args);sync(this);return result;};});
 customElements.whenDefined('dash6-media-card').then(()=>{const p=customElements.get('dash6-media-card').prototype;if(p._satinPlayerPadding)return;p._satinPlayerPadding=true;const old=p.updated;p.updated=async function(...args){await old.apply(this,args);const root=this.shadowRoot;if(root&&!root.querySelector('#satin-player-padding-css')){const s=document.createElement('style');s.id='satin-player-padding-css';s.textContent='.player{padding-top:var(--dash6-media-player-padding-top,0px)!important}';root.append(s);}sync(this._native);};});
})();
