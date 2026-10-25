import {scopedCustomElements as customElements} from './scoped-elements.js';
// Match the approved Favorites reference, including readable white-scene text.
export function shoeSceneReference(host){
 for(const button of host.shadowRoot?.querySelectorAll('.shoe-scenes > button')||[]){
  const name=button.getAttribute('aria-label');
  const fill=name==='Bunt'?'radial-gradient(at 35% 0%,rgba(255,255,255,.19),transparent 65%),linear-gradient(110deg,rgb(135,48,73),rgb(128,99,57) 25%,rgb(35,88,62) 50%,rgb(35,77,117) 85%)':name==='Weiß'?'radial-gradient(at 35% 0%,rgba(255,255,255,.314),transparent 65%),linear-gradient(110deg,rgb(243,243,237),rgb(228,223,206) 55%,rgb(198,188,156))':null;
  if(fill){button.style.setProperty('background',fill,'important');button.style.setProperty('--scene-fill',fill);button.style.setProperty('color',name==='Weiß'?'rgb(36,40,44)':'rgb(247,248,250)','important');}
 }
}
customElements.whenDefined('dash6-shoe-cabinet-card').then(()=>{const p=customElements.get('dash6-shoe-cabinet-card').prototype;if(p._shoeSceneReference)return;p._shoeSceneReference=true;const render=p.render;p.render=function(...a){const result=render.apply(this,a);shoeSceneReference(this);return result;};});
