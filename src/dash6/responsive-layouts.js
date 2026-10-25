const {customElements} = globalThis;
import {installNativeResponsiveSections} from './sections-responsive.js';
import {inLayoutScope} from './layout-scope.js';
installNativeResponsiveSections();

// Stack content-card containers below 700px. Device controls and pill adapters
// retain their own layouts; desktop configurations remain authoritative.
const css = `@media(max-width:699px){
:host([data-liquid-glass-content-layout]) #root{
 grid-template-columns:minmax(0,1fr)!important;
 grid-template-areas:none!important;
}
:host([data-liquid-glass-content-layout]) #root>*{
 grid-column:1 / -1!important;grid-row:auto!important;grid-area:auto!important;
 min-width:0!important;max-width:100%!important;
}
:host([data-liquid-glass-content-layout]) .content{
 grid-template-columns:minmax(0,1fr)!important;
}
:host([data-liquid-glass-content-layout]) .content>.section{
 grid-column:1 / -1!important;grid-row:auto!important;
 min-width:0!important;max-width:100%!important;
}
:host([data-liquid-glass-content-layout]) #columns{
 display:flex!important;flex-direction:column!important;
 align-items:stretch!important;gap:8px!important;
}
:host([data-liquid-glass-content-layout]) #columns>.column{
 width:100%!important;max-width:100%!important;min-width:0!important;
 flex:none!important;box-sizing:border-box!important;
}
}`;

for (const name of ['hui-grid-card', 'grid-layout', 'hui-masonry-view', 'masonry-layout']) {
 customElements.whenDefined(name).then(() => {
  const proto = customElements.get(name).prototype;
  if (Object.hasOwn(proto, '_dash6ContentLayout700')) return;
  proto._dash6ContentLayout700 = true;
  const bindings = new WeakMap();
  const sync = host => {
   // grid-layout subclasses include compact pill layouts. Never flatten those.
   if (host.localName !== name || !host.shadowRoot) return;
   const enabled = inLayoutScope(host) && getComputedStyle(host).getPropertyValue('--dash6-satin-enabled').trim() === '1';
   host.toggleAttribute('data-liquid-glass-content-layout', enabled);
   host.removeAttribute('data-dash6-content-layout');
   host.shadowRoot.querySelectorAll('style[data-dash6-content-layout]').forEach(style => style.remove());
   if (!enabled) {
    host.shadowRoot.querySelector('style[data-liquid-glass-content-layout]')?.remove();
    return;
   }
   if (!host.shadowRoot.querySelector('style[data-liquid-glass-content-layout]')) {
    const style = document.createElement('style');
    style.dataset.liquidGlassContentLayout = '';
    style.textContent = css;
    host.shadowRoot.append(style);
   }
  };
  for (const method of ['connectedCallback', 'updated', 'disconnectedCallback']) {
   const previous = proto[method];
   proto[method] = function (...args) {
    const result = previous?.apply(this, args);
    if (this.localName !== name) return result;
    if (method === 'disconnectedCallback') {
     bindings.get(this)?.();bindings.delete(this);return result;
    }
    if (!bindings.has(this)) {
     let frame = 0;
     const schedule = () => {if (!frame) frame = requestAnimationFrame(() => {frame = 0;if (this.isConnected) sync(this);});};
     const events = ['location-changed','popstate','theme-changed'];
     for (const event of events) window.addEventListener(event,schedule);
     bindings.set(this,() => {cancelAnimationFrame(frame);for (const event of events) window.removeEventListener(event,schedule);});
    }
    sync(this);
    if (method === 'connectedCallback') this.updateComplete?.then(() => sync(this));
    return result;
   };
  }
 });
}
