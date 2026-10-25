// Repaint the native background at its actual viewport coordinates inside a clipped sample.
// URLs stay in memory; no image fetch, canvas copy, storage or image transformation.
class GlassBackgroundSample extends HTMLElement{
 connectedCallback(){
  this.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit';
  this._layer=document.createElement('div');this._layer.style.position='absolute';this.append(this._layer);
  this._schedule=()=>{if(!this._frame)this._frame=requestAnimationFrame(()=>{this._frame=0;this.refresh();});};
  this._targets=new Set([window]);
  for(let n=this;n;n=n.parentNode||n.host)if(n.addEventListener)this._targets.add(n);
  for(const target of this._targets)target.addEventListener('scroll',this._schedule,{capture:true,passive:true});
  window.addEventListener('resize',this._schedule);window.addEventListener('dash6-background-status',this._schedule);window.addEventListener('dash6-theme-settings-changed',this._schedule);
  this._resize=new ResizeObserver(this._schedule);this._resize.observe(this);this._schedule();
 }
 refresh(){
  const find=root=>{for(const e of root.querySelectorAll('*')){if(e.localName==='hui-view-background')return e;if(e.shadowRoot){const found=find(e.shadowRoot);if(found)return found;}}};
  const source=this._source?.isConnected?this._source:find(document);if(!source)return;
  if(source!==this._source){this._observer?.disconnect();this._source=source;this._observer=new MutationObserver(this._schedule);this._observer.observe(source,{attributes:true,attributeFilter:['style','class','fixed-background']});this._resize.observe(source);}
  const native=source.getBoundingClientRect(),sample=this.getBoundingClientRect(),s=getComputedStyle(source),layer=this._layer;
  Object.assign(layer.style,{left:(native.left-sample.left)+'px',top:(native.top-sample.top)+'px',width:native.width+'px',height:native.height+'px',backgroundImage:s.backgroundImage,backgroundColor:s.backgroundColor,backgroundSize:s.backgroundSize,backgroundPosition:s.backgroundPosition,backgroundRepeat:s.backgroundRepeat,backgroundOrigin:s.backgroundOrigin,backgroundClip:s.backgroundClip,opacity:s.opacity});
 }
 disconnectedCallback(){cancelAnimationFrame(this._frame);this._frame=0;this._observer?.disconnect();this._resize?.disconnect();for(const target of this._targets||[])target.removeEventListener('scroll',this._schedule,true);for(const event of ['resize','dash6-background-status','dash6-theme-settings-changed'])window.removeEventListener(event,this._schedule);this.replaceChildren();}
}
if(!customElements.get('dash6-glass-background-sample'))customElements.define('dash6-glass-background-sample',GlassBackgroundSample);
