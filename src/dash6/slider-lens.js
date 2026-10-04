import {bindThemePreferences,unbindThemePreferences} from './material.js';

// This lens previews the native range locally; it never sends device commands.
export class SliderLens extends HTMLElement {
 constructor(){super();this.attachShadow({mode:'open'}).innerHTML=`<style>
 :host{position:absolute;bottom:0;left:calc(14px + (100% - 28px)*var(--lens-fraction,0));width:26px;height:46px;transform:translateX(-50%);pointer-events:none;z-index:2;opacity:var(--dash6-slider-opacity,1)}
 .glass{position:absolute;inset:0;border-radius:var(--dash6-knob-radius,14px);overflow:hidden;border:var(--dash6-knob-border,1px solid rgba(255,255,255,.72));box-shadow:var(--dash6-knob-shadow);background:var(--dash6-knob-background);transition:scale var(--dash6-knob-duration,280ms) cubic-bezier(.22,1.5,.36,1);isolation:isolate}
 .scene{position:absolute;inset:0;background-image:var(--track);background-size:var(--lens-source-width,600px) 100%;background-position:var(--lens-position,0%) center;z-index:-1;opacity:.9}
 .gloss{position:absolute;inset:0;border-radius:inherit;background:var(--dash6-knob-gloss);box-shadow:inset 1px 0 1px rgba(255,255,255,.6),inset -1px -1px 2px rgba(255,255,255,.3)}
 :host([touching]) .glass{scale:var(--dash6-knob-touch-scale,1.25)}:host([disabled]){opacity:.4}
 :host([data-satin]){bottom:2px;left:calc(11px + (100% - 22px)*var(--lens-fraction,0));width:22px;height:38px;overflow:visible}
 :host([data-satin]) .glass{border:var(--dash6-satin-lens-border,1px solid rgba(255,255,255,.27));background:var(--dash6-satin-lens-background,linear-gradient(145deg,rgba(255,255,255,.16),rgba(255,255,255,.04)));box-shadow:var(--dash6-satin-lens-shadow,inset 0 1px 2px rgba(255,255,255,.13),inset 0 -1px 2px rgba(0,0,0,.17));transition:scale var(--dash6-satin-elastic-duration,380ms) cubic-bezier(.22,1.5,.36,1)}
 :host([data-satin]) .gloss{background:var(--dash6-satin-lens-gloss,linear-gradient(145deg,rgba(255,255,255,.14),transparent 58%));box-shadow:none}
 @media(hover:hover){:host([data-satin][hovering]:not([disabled])) .glass{scale:var(--dash6-satin-slider-hover-scale,1.045)}}
 :host([data-satin][touching]:not([disabled])){z-index:3}
 :host([data-satin][touching]:not([disabled])) .glass{scale:var(--dash6-satin-slider-press-scale,1.30);transition-duration:120ms}
 @media(pointer:coarse){:host([data-satin]){bottom:3px}}
 @media(prefers-reduced-motion:reduce){.glass{transition:none!important;scale:1!important}}
 </style><div class="glass"><div class="scene"></div><div class="gloss"></div></div>`;}
 connectedCallback(){
  this.setAttribute('aria-hidden','true');bindThemePreferences(this);
  const input=this.parentElement?.querySelector('input[type=range]');if(!input)return;this.input=input;
  this.update=()=>{
   const p=Math.max(0,Math.min(1,(Number(input.value)-Number(input.min))/(Number(input.max)-Number(input.min)||1)));
   this.style.setProperty('--lens-fraction',String(p));this.style.setProperty('--lens-position',p*100+'%');this.style.setProperty('--lens-source-width',input.getBoundingClientRect().width*1.6+'px');this.style.setProperty('--track',input.style.getPropertyValue('--track'));this.toggleAttribute('disabled',input.disabled);
   if(input.disabled){this.up();this.removeAttribute('hovering');}
  };
  this.down=e=>{if(input.disabled)return;this._pointer=e.pointerId;this.setAttribute('touching','');};
  this.up=e=>{if(e?.pointerId!==undefined&&this._pointer!==undefined&&e.pointerId!==this._pointer)return;this._pointer=undefined;this.removeAttribute('touching');};
  this.enter=e=>{if(!input.disabled&&e.pointerType!=='touch')this.setAttribute('hovering','');};
  this.leave=()=>this.removeAttribute('hovering');
  input.addEventListener('input',this.update);input.addEventListener('pointerdown',this.down);input.addEventListener('pointerenter',this.enter);input.addEventListener('pointerleave',this.leave);
  for(const e of ['pointerup','pointercancel','lostpointercapture','blur'])input.addEventListener(e,this.up);
  // Release outside the range and native capture cancellation both restore the lens.
  window.addEventListener('pointerup',this.up,true);window.addEventListener('pointercancel',this.up,true);
  this.observer=new ResizeObserver(this.update);this.observer.observe(input);
  this.attributesObserver=new MutationObserver(this.update);this.attributesObserver.observe(input,{attributes:true,attributeFilter:['disabled','min','max','style']});this.update();
 }
 disconnectedCallback(){
  unbindThemePreferences(this);this.observer?.disconnect();this.attributesObserver?.disconnect();this.up?.();this.leave?.();if(!this.input)return;
  this.input.removeEventListener('input',this.update);this.input.removeEventListener('pointerdown',this.down);this.input.removeEventListener('pointerenter',this.enter);this.input.removeEventListener('pointerleave',this.leave);
  for(const e of ['pointerup','pointercancel','lostpointercapture','blur'])this.input.removeEventListener(e,this.up);
  window.removeEventListener('pointerup',this.up,true);window.removeEventListener('pointercancel',this.up,true);this.input=null;
 }
}
customElements.define('dash6-slider-lens',SliderLens);
