import {BACKGROUND_LEVELS,normalizeBackgroundLevel,prepareBackgroundVariants,imageURLs} from './background-image-variants.js';
const assetRoot=new URL(import.meta.url.includes('/chunks/')?'../':'./',import.meta.url);
const style=document.createElement('style');style.dataset.dash6Background='portable';
style.textContent=`:root{--dash6-wohnzimmer-background:url("${new URL('backgrounds/living-room.jpg',assetRoot).href}")}`;
document.head.append(style);
const hosts=new Map();let scheduled=false,current={state:'original',downloads:[]};
export const backgroundVariantStatus=()=>current;
function status(value){current=value;window.dispatchEvent(new Event('dash6-background-status'));}
const enabled=()=>/^\/(dash-6|liquid-glass-demo)(\/|$)/.test(location.pathname);
function level(host){return enabled()?normalizeBackgroundLevel(getComputedStyle(host).getPropertyValue('--dash6-background-image-variant').trim()):'original';}
function nativeImage(record){const host=record.host;if(record.background){host.style.setProperty('background',record.background,record.backgroundPriority);}else if(record.original){host.style.setProperty('background-image',record.original,record.priority);}else host.style.removeProperty('background-image');}
function release(record){
 if(record.applied&&record.host.style.backgroundImage===record.applied){nativeImage(record);}
 record.applied='';for(const url of record.urls||[])URL.revokeObjectURL(url);record.urls=[];
}
async function refresh(host){
 const record=hosts.get(host);if(!record)return;
 if(!host.isConnected){record.ticket++;release(record);hosts.delete(host);return;}
 const selected=level(host);
 // Synchronously reveal the native image before reading it; no intermediate frame is painted.
 if(record.applied&&host.style.backgroundImage===record.applied){nativeImage(record);}
 else{record.original=host.style.backgroundImage;record.priority=host.style.getPropertyPriority('background-image');record.background=host.style.getPropertyValue('background');record.backgroundPriority=host.style.getPropertyPriority('background');}
 const background=getComputedStyle(host).backgroundImage,images=imageURLs(background);
 if(record.applied)host.style.setProperty('background-image',record.applied,'important');
 const fingerprint=selected+'|'+background;
 if(record.fingerprint===fingerprint)return;record.fingerprint=fingerprint;
 const ticket=++record.ticket;
 if(selected==='original'){release(record);if(enabled())status({state:'original',downloads:[]});return;}
 if(!images.length){release(record);status({state:'empty',downloads:[]});return;}
 status({state:'working',downloads:[]});
 try{
  const results=await Promise.all(images.map(image=>prepareBackgroundVariants(image.url,assetRoot)));
  if(ticket!==record.ticket||!host.isConnected||selected!==level(host))return;
  let output=background;const urls=[];
  for(let i=images.length-1;i>=0;i--){const url=URL.createObjectURL(results[i].variants[selected]);urls.push(url);output=output.slice(0,images[i].start)+`url("${url}")`+output.slice(images[i].end);}
  release(record);record.urls=urls;record.applied=output;host.style.setProperty('background-image',output,'important');record.applied=host.style.backgroundImage;
  const downloads=BACKGROUND_LEVELS.slice(1).map(item=>{const url=URL.createObjectURL(results[0].variants[item.value]);record.urls.push(url);return {label:item.label,url,file:`dash6-hintergrund-${item.value}.${results[0].variants[item.value].type==='image/webp'?'webp':'png'}`};});
  status({state:'ready',label:BACKGROUND_LEVELS.find(x=>x.value===selected).label,width:results[0].width,height:results[0].height,persistent:results.every(r=>r.persistent||r.cached),downloads});
 }catch{if(ticket===record.ticket){release(record);record.fingerprint='';status({state:'error',downloads:[]});}}
}
function attach(host){if(!hosts.has(host))hosts.set(host,{host,ticket:0,urls:[]});schedule();}
function scan(root=document){for(const element of root.querySelectorAll('*')){if(element.localName==='hui-view-background')attach(element);if(element.shadowRoot)scan(element.shadowRoot);}}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;for(const host of hosts.keys())void refresh(host);});}
customElements.whenDefined('hui-view-background').then(()=>{
 const prototype=customElements.get('hui-view-background').prototype;
 for(const method of ['connectedCallback','updated','disconnectedCallback']){
  const previous=prototype[method];prototype[method]=function(...args){const result=previous?.apply(this,args);if(method==='disconnectedCallback'){const r=hosts.get(this);if(r){r.ticket++;release(r);hosts.delete(this);}}else attach(this);return result;};
 }
 scan();
});
for(const event of ['dash6-theme-settings-changed','location-changed','popstate'])window.addEventListener(event,()=>{scan();schedule();});
