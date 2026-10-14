import {dashboardContext,replaceDomainConfig} from './domain-registry.js';
export const domainEditMode=()=>new URLSearchParams(globalThis.location?.search||'').get('edit')==='1';
const button=(label,action)=>{const node=document.createElement('button');node.textContent=label;node.type='button';node.addEventListener('click',action);return node;};
export function removeDomainCogPortal(card){
 card._cogPortal?.remove();card._cogPortal=null;card._cogResize?.disconnect();card._cogResize=null;
 if(card._cogMove){window.removeEventListener('scroll',card._cogMove,true);window.removeEventListener('resize',card._cogMove);window.visualViewport?.removeEventListener('resize',card._cogMove);window.visualViewport?.removeEventListener('scroll',card._cogMove);card._cogMove=null;}
 if(card._cogFrame){cancelAnimationFrame(card._cogFrame);card._cogFrame=null;}
 const gear=card.shadowRoot.querySelector('.domain-cog');if(gear)gear.style.removeProperty('visibility');
}
export function syncDomainCogPortal(card){
 const gear=card.shadowRoot.querySelector('.domain-cog');if(!card.isConnected||!domainEditMode()){removeDomainCogPortal(card);return;}
 let ancestor=card,overlay=null;
 while(ancestor){if(ancestor.localName==='hui-card-edit-mode'){overlay=ancestor.shadowRoot?.querySelector('.card-overlay');if(overlay)break;}ancestor=ancestor.parentElement||ancestor.getRootNode?.().host;}
 if(!overlay?.isConnected){removeDomainCogPortal(card);return;}
 if(card._cogPortal?.parentElement!==overlay){
  removeDomainCogPortal(card);const portal=gear.cloneNode(true);portal.className='dash6-domain-cog-portal';portal.hidden=false;
  const computed=getComputedStyle(gear);for(const key of ['color','background','border','border-radius'])portal.style.setProperty(key,computed.getPropertyValue(key),'important');
  for(const [key,value]of Object.entries({position:'absolute',display:'grid','place-items':'center',margin:'0',padding:'0',cursor:'pointer','pointer-events':'auto','touch-action':'manipulation','z-index':'2'}))portal.style.setProperty(key,value,'important');
  portal.querySelector('ha-icon')?.style.setProperty('--mdc-icon-size','22px');portal.addEventListener('pointerdown',event=>event.stopPropagation());portal.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openDomainSettings(card).catch(error=>card._error(error));});
  overlay.append(portal);card._cogPortal=portal;
  const position=()=>{card._cogFrame=null;if(!portal.isConnected||!gear.isConnected)return;const target=gear.getBoundingClientRect(),bounds=overlay.getBoundingClientRect();for(const [key,value]of Object.entries({left:target.left-bounds.left,top:target.top-bounds.top,width:target.width,height:target.height}))portal.style.setProperty(key,value+'px','important');};
  card._cogMove=()=>{if(!card._cogFrame)card._cogFrame=requestAnimationFrame(position);};
  window.addEventListener('scroll',card._cogMove,true);window.addEventListener('resize',card._cogMove);window.visualViewport?.addEventListener('resize',card._cogMove);window.visualViewport?.addEventListener('scroll',card._cogMove);
  if(typeof ResizeObserver==='function'){card._cogResize=new ResizeObserver(card._cogMove);for(const target of [card,gear,overlay])card._cogResize.observe(target);}
  position();
 }
 gear.style.visibility='hidden';card._cogMove?.();
}
export async function openDomainSettings(card){
 if(card._domainDialog?.isConnected||!domainEditMode())return;
 await import('./domain-editor.js');
 const context=dashboardContext(card,card._config);
 const dialog=document.createElement('dialog');dialog.className='domain-settings';dialog.setAttribute('aria-label','Abschnitt konfigurieren');
 const title=document.createElement('h2');title.textContent=(card._config.heading||card._config.domain||'Abschnitt')+' konfigurieren';
 const editor=document.createElement('dash6-domain-editor');editor.hass=card.hass;editor.setConfig(card._config);
 let draft=structuredClone(card._config),saving=false;
 editor.addEventListener('config-changed',event=>{event.stopPropagation();draft=structuredClone(event.detail.config);status.textContent='Entwurf geändert. Speichern übernimmt Karten und Ausschlüsse ins Dashboard.';});
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Änderungen werden gemeinsam in der Dashboard-Konfiguration gespeichert.';
 const close=()=>{if(saving)return;dialog.close();dialog.remove();card._domainDialog=null;};
 const cancel=button('Abbrechen',close);
 const save=button('Speichern',async()=>{
  if(saving)return;saving=true;save.disabled=cancel.disabled=true;
  try{
   // Lovelace's supported frontend save hook is the same one its own editors
   // use. Never call HA REST/WebSocket writes or use user-profile patches here.
   const fresh=dashboardContext(card,card._config),lovelace=fresh.lovelace;
   if(typeof lovelace?.saveConfig!=='function'||lovelace.mode==='yaml')throw Error('Dieser Dashboard-Editor kann die Konfiguration nicht speichern. Bitte den nativen Dashboard-Editor öffnen.');
   const next=replaceDomainConfig(fresh.config,card._config,draft,fresh.dashboardName,card._config.view||fresh.viewNames[0]);
   await lovelace.saveConfig(next);card.setConfig(draft);window.dispatchEvent(new Event('dash6-domain-registry-changed'));saving=false;close();
  }catch(error){saving=false;save.disabled=cancel.disabled=false;status.textContent='Speichern fehlgeschlagen: '+(error.message||String(error));}
 });
 const footer=document.createElement('footer');footer.append(cancel,save);dialog.append(title,editor,status,footer);card.shadowRoot.append(dialog);card._domainDialog=dialog;
 dialog.addEventListener('cancel',event=>{event.preventDefault();close();});dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
 dialog.showModal();
 return context;
}
