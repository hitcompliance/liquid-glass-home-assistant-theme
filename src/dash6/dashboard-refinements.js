// Previously live-verified DASH6 refinements, now owned by the published bundle.
;(()=>{
const CLIMATE_PATH='/dash-6/heizung-klima';
const definition=card=>card?.definition||card?.card_config||card;
const path=card=>definition(card)?.tap_action?.navigation_path;
// Only room navigation menus qualify; device groups and other stacks stay intact.
function navigationCards(cards){
 if(!Array.isArray(cards)||!cards.some(card=>path(card)==='/dash-6/home')||!cards.some(card=>path(card)==='/dash-6/surveillance'))return cards;
 const previous=cards.find(card=>path(card)===CLIMATE_PATH);
 const result=cards.filter(card=>path(card)!==CLIMATE_PATH);
 const climate=structuredClone(previous||result[result.length-1]);
 const config=definition(climate);
 config.name='Heizung & Klima';config.icon='mdi:thermostat';
 config.tap_action={...config.tap_action,action:'navigate',navigation_path:CLIMATE_PATH};
 result.push(climate);return result;
}
window.__dash6Navigation={last:navigationCards};

})();

// Decorative only: no entity reads, service calls, imports, or photo replacement.
(() => {
  const TAG = 'dash6-climate-background';
  const VIEW_PATH = 'heizung-klima';
  const FRAME_MS = 1000 / 25;
  let sequence = 0;

  class Dash6ClimateBackground extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' }).innerHTML = '<style>:host{display:block!important;height:0!important;min-height:0!important;margin:0!important;padding:0!important;overflow:hidden!important;pointer-events:none!important}</style>';
      this._id = `climate-${++sequence}`;
      this._config = { opacity: 0.85 };
      this._frame = 0;
      this._retry = 0;
      this._lastFrame = 0;
      this._time = 0;
      this._visibility = () => this._syncPlayback();
      this._navigation = () => this._mount();
      this._resize = () => {
        this._measure();
        if (!this._frame && !document.hidden) this._paint(this._reducedMotion?.matches ? 0 : this._time);
      };
      this._motion = () => this._syncPlayback();
      this._tick = timestamp => {
        this._frame = 0;
        if (!this._active()) return;
        if (timestamp - this._lastFrame >= FRAME_MS) {
          const elapsed = this._lastFrame ? Math.min(timestamp - this._lastFrame, 100) : FRAME_MS;
          this._time += elapsed / 1000;
          this._lastFrame = timestamp;
          this._paint(this._time);
        }
        this._frame = requestAnimationFrame(this._tick);
      };
      this._frost = Array.from({ length: 48 }, (_, index) => ({
        x: this._random(index + 11) * 0.52,
        y: this._random(index + 71),
        size: 8 + this._random(index + 101) * 26,
        phase: this._random(index + 151) * Math.PI * 2
      }));
      this._flames = Array.from({ length: 15 }, (_, index) => ({
        x: 0.54 + this._random(index + 201) * 0.47,
        height: 0.16 + this._random(index + 251) * 0.47,
        width: 0.025 + this._random(index + 301) * 0.045,
        phase: this._random(index + 351) * Math.PI * 2,
        speed: 0.9 + this._random(index + 401) * 1.1
      }));
      this._sparks = Array.from({ length: 38 }, (_, index) => ({
        x: 0.56 + this._random(index + 451) * 0.43,
        phase: this._random(index + 501),
        speed: 0.06 + this._random(index + 551) * 0.09,
        radius: 0.6 + this._random(index + 601) * 1.1
      }));
    }

    setConfig(config) {
      if (config?.view_path && config.view_path !== VIEW_PATH) {
        throw new Error('dash6-climate-background is scoped to heizung-klima.');
      }
      const opacity = Number(config?.opacity ?? 0.85);
      this._config = { opacity: Number.isFinite(opacity) ? Math.max(0, Math.min(1, opacity)) : 0.85 };
      if (this.isConnected) this._mount();
    }

    set hass(_hass) {
      if (this.isConnected && (!this._canvas || !this._onView())) this._mount();
    }

    getCardSize() { return 0; }
    getGridOptions() { return { rows: 0, columns: 0 }; }

    connectedCallback() {
      this.setAttribute('aria-hidden', 'true');
      this._reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this._reducedMotion.addEventListener?.('change', this._motion);
      document.addEventListener('visibilitychange', this._visibility);
      window.addEventListener('resize', this._resize, { passive: true });
      window.addEventListener('scroll', this._resize, { passive: true, capture: true });
      window.addEventListener('location-changed', this._navigation);
      window.addEventListener('popstate', this._navigation);
      this._mount();
    }

    disconnectedCallback() {
      clearTimeout(this._retry);
      this._retry = 0;
      document.removeEventListener('visibilitychange', this._visibility);
      window.removeEventListener('resize', this._resize);
      window.removeEventListener('scroll', this._resize, true);
      window.removeEventListener('location-changed', this._navigation);
      window.removeEventListener('popstate', this._navigation);
      this._reducedMotion?.removeEventListener?.('change', this._motion);
      this._unmount();
    }

    _random(seed) {
      const value = Math.sin(seed * 127.1) * 43758.5453;
      return value - Math.floor(value);
    }

    _onView() {
      return location.pathname.replace(/\/+$/, '').split('/').pop() === VIEW_PATH;
    }

    _findView() {
      let node = this;
      let fallback = null;
      while (node) {
        if (node.localName === 'hui-sections-view' && node.shadowRoot) return node;
        if (node.localName === 'hui-view' && node.shadowRoot) fallback ||= node;
        node = node.parentNode || node.getRootNode?.().host;
      }
      return fallback;
    }

    _mount() {
      clearTimeout(this._retry);
      this._retry = 0;
      if (!this.isConnected || !this._onView()) { this._unmount(); return; }
      const view = this._findView();
      if (!view) {
        this._retry = setTimeout(() => this._mount(), 250);
        return;
      }
      if (this._view === view && this._canvas?.isConnected) {
        this._measure(); this._syncPlayback(); return;
      }
      this._unmount();
      // A duplicate renderer or an editor preview must not add a second layer.
      if (view.shadowRoot.querySelector('canvas[data-dash6-climate-layer]')) return;
      this._view = view;
      this._previousScope = view.getAttribute('data-dash6-climate-view');
      view.setAttribute('data-dash6-climate-view', this._id);
      const style = document.createElement('style');
      style.dataset.dash6ClimateStyle = this._id;
      style.textContent = `
        :host([data-dash6-climate-view="${this._id}"]){isolation:isolate}
        :host([data-dash6-climate-view="${this._id}"]) > canvas[data-dash6-climate-layer]{position:fixed;display:block;pointer-events:none!important;z-index:0;overflow:hidden;contain:strict}
        :host([data-dash6-climate-view="${this._id}"]) > :is(#view,#sections,.wrapper,.sections,.container,.content,.badges,.header,hui-section,hui-section-container){position:relative;z-index:1}
      `;
      const canvas = document.createElement('canvas');
      canvas.dataset.dash6ClimateLayer = this._id;
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('role', 'presentation');
      // Insertion into the view's root keeps the effect outside card shadow roots.
      view.shadowRoot.insertBefore(style, view.shadowRoot.firstChild);
      view.shadowRoot.insertBefore(canvas, view.shadowRoot.firstChild);
      this._style = style;
      this._canvas = canvas;
      this._context = canvas.getContext('2d', { alpha: true });
      if (!this._context) { this._unmount(); return; }
      if (typeof ResizeObserver !== 'undefined') {
        this._observer = new ResizeObserver(this._resize);
        this._observer.observe(view);
      }
      this._measure();
      this._syncPlayback();
    }

    _unmount() {
      this._stop();
      this._observer?.disconnect();
      this._observer = null;
      this._canvas?.remove();
      this._style?.remove();
      if (this._view?.getAttribute('data-dash6-climate-view') === this._id) {
        if (this._previousScope === null) this._view.removeAttribute('data-dash6-climate-view');
        else this._view.setAttribute('data-dash6-climate-view', this._previousScope);
      }
      this._canvas = this._style = this._context = this._view = null;
    }

    _measure() {
      if (!this._canvas || !this._view) return;
      const rect = this._view.getBoundingClientRect();
      const left = Math.max(0, rect.left);
      const top = Math.max(0, rect.top);
      const width = Math.max(1, Math.min(rect.width, window.innerWidth - left));
      const height = Math.max(1, window.innerHeight - top);
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      Object.assign(this._canvas.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);
      if (this._canvas.width !== pixelWidth || this._canvas.height !== pixelHeight) {
        this._canvas.width = pixelWidth;
        this._canvas.height = pixelHeight;
      }
      this._width = width;
      this._height = height;
      this._ratio = ratio;
    }

    _stop() {
      if (this._frame) cancelAnimationFrame(this._frame);
      this._frame = 0;
      this._lastFrame = 0;
    }

    _active() {
      return this.isConnected && this._canvas?.isConnected && this._onView() && !document.hidden && !this._reducedMotion?.matches;
    }

    _syncPlayback() {
      this._stop();
      if (!this._canvas) return;
      this._canvas.hidden = !this._onView();
      if (document.hidden || !this._onView()) return;
      this._measure();
      this._paint(this._reducedMotion?.matches ? 0 : this._time);
      if (this._active()) this._frame = requestAnimationFrame(this._tick);
    }

    _paint(time) {
      const ctx = this._context;
      if (!ctx || !this._width || !this._height) return;
      const w = this._width, h = this._height;
      ctx.setTransform(this._ratio, 0, 0, this._ratio, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = this._config.opacity;
      ctx.globalCompositeOperation = 'source-over';
      this._paintFrost(ctx, w, h, time);
      this._paintFire(ctx, w, h, time);
      ctx.globalAlpha = 1;
    }

    _paintFrost(ctx, w, h, time) {
      const shimmer = 0.55 + 0.3 * Math.sin(time * 0.43);
      const glow = ctx.createRadialGradient(w * 0.15, h * 0.65, 0, w * 0.15, h * 0.65, Math.max(w * 0.45, h * 0.7));
      glow.addColorStop(0, `rgba(115,218,255,${0.09 + shimmer * 0.06})`);
      glow.addColorStop(0.65, 'rgba(130,222,255,0.035)');
      glow.addColorStop(1, 'rgba(130,222,255,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w * 0.55, h);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, w * 0.53, h); ctx.clip();
      for (const crystal of this._frost) {
        const drift = time * (2 + crystal.size * 0.04);
        const x = crystal.x * w + Math.sin(time * 0.17 + crystal.phase) * 11;
        const y = ((crystal.y * h - drift) % (h + 90) + h + 90) % (h + 90) - 45;
        const fade = Math.max(0, 1 - x / (w * 0.55));
        const brightness = 0.07 + (0.5 + 0.5 * Math.sin(time * 0.6 + crystal.phase)) * 0.18;
        ctx.strokeStyle = `rgba(188,240,255,${brightness * fade})`;
        ctx.lineWidth = 0.7;
        const size = crystal.size * Math.min(1, w / 950);
        ctx.beginPath();
        for (let branch = 0; branch < 5; branch++) {
          const angle = branch * Math.PI * 2 / 5 + crystal.phase;
          const dx = Math.cos(angle), dy = Math.sin(angle);
          const endX = x + dx * size, endY = y + dy * size;
          ctx.moveTo(x, y); ctx.lineTo(endX, endY);
          for (const side of [-1, 1]) {
            ctx.moveTo(x + dx * size * 0.62, y + dy * size * 0.62);
            ctx.lineTo(x + dx * size * 0.47 - dy * size * 0.2 * side, y + dy * size * 0.47 + dx * size * 0.2 * side);
          }
        }
        ctx.stroke();
      }
      // Broad, slow light sweeps give the ice a sheen without moving the photo.
      const sweep = ((time * 0.022) % 1.5 - 0.25) * w * 0.55;
      const light = ctx.createLinearGradient(sweep - w * 0.15, 0, sweep + w * 0.15, h * 0.3);
      light.addColorStop(0, 'rgba(200,245,255,0)');
      light.addColorStop(0.5, 'rgba(214,248,255,0.055)');
      light.addColorStop(1, 'rgba(200,245,255,0)');
      ctx.fillStyle = light; ctx.fillRect(0, 0, w * 0.53, h);
      ctx.restore();
    }

    _paintFire(ctx, w, h, time) {
      ctx.save();
      ctx.beginPath(); ctx.rect(w * 0.5, 0, w * 0.5, h); ctx.clip();
      const glow = ctx.createRadialGradient(w * 0.84, h * 1.06, 0, w * 0.84, h * 1.06, h * 0.85);
      glow.addColorStop(0, 'rgba(255,125,18,0.27)');
      glow.addColorStop(0.42, 'rgba(255,63,8,0.075)');
      glow.addColorStop(1, 'rgba(255,70,0,0)');
      ctx.fillStyle = glow; ctx.fillRect(w * 0.5, 0, w * 0.5, h);
      for (const flame of this._flames) {
        const wave = time * flame.speed + flame.phase;
        const base = flame.x * w;
        const width = flame.width * w;
        const height = flame.height * h * (0.84 + 0.16 * Math.sin(wave * 1.9));
        const sway = Math.sin(wave * 1.3) * width * 0.8;
        for (let layer = 0; layer < 2; layer++) {
          const scale = layer ? 0.54 : 1;
          const flameHeight = height * scale;
          const flameWidth = width * scale;
          const tipX = base + sway;
          const tipY = h - flameHeight;
          const fill = ctx.createLinearGradient(base, h, tipX, tipY);
          fill.addColorStop(0, layer ? 'rgba(255,222,120,0.22)' : 'rgba(255,125,18,0.14)');
          fill.addColorStop(0.4, layer ? 'rgba(255,182,63,0.16)' : 'rgba(255,79,10,0.19)');
          fill.addColorStop(0.8, 'rgba(255,111,25,0.09)');
          fill.addColorStop(1, 'rgba(255,162,48,0)');
          ctx.fillStyle = fill;
          ctx.beginPath();
          ctx.moveTo(base - flameWidth, h + 12);
          ctx.bezierCurveTo(base - flameWidth * 1.1, h - flameHeight * 0.37, base + sway - flameWidth * 0.8, h - flameHeight * 0.63, tipX, tipY);
          ctx.bezierCurveTo(base + sway + flameWidth * 0.28, h - flameHeight * 0.46, base + flameWidth * 1.2, h - flameHeight * 0.28, base + flameWidth, h + 12);
          ctx.closePath(); ctx.fill();
        }
      }
      for (const spark of this._sparks) {
        const age = (spark.phase + time * spark.speed) % 1;
        const x = spark.x * w + Math.sin(time * 0.7 + spark.phase * 18) * 13 + age * 18;
        const y = h * (1.04 - age * 0.89);
        const alpha = Math.sin(age * Math.PI) * 0.65;
        ctx.strokeStyle = `rgba(255,192,79,${alpha})`;
        ctx.lineWidth = spark.radius;
        ctx.beginPath(); ctx.moveTo(x, y + 3 + age * 4); ctx.lineTo(x + 0.8, y); ctx.stroke();
      }
      ctx.restore();
    }
  }

  if (!customElements.get(TAG)) customElements.define(TAG, Dash6ClimateBackground);
})();

;(()=>{customElements.whenDefined('dash6-glass-switch').then(()=>{const C=customElements.get('dash6-glass-switch');C.finalize();const sheet=new CSSStyleSheet();sheet.replaceSync("/* Off means unlit: dim icon and lens edges rather than a neutral white glow. */\n button.off .icon,:host([data-satin]) button.off .icon{color:var(--dash6-switch-off-icon-color,rgba(187,197,210,.52));filter:none}\n :host button.off .light,:host([data-satin]) button.off .light{opacity:0}\n :host button.off .rim,:host([data-satin]) button.off .rim{border-color:var(--dash6-switch-off-rim-color,rgba(220,231,244,.10));box-shadow:none}\n :host button.off .bowl,:host([data-satin]) button.off .bowl{border-color:var(--dash6-switch-off-border-color,rgba(220,231,244,.14));background:var(--dash6-switch-off-lens-background,linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.015)));box-shadow:inset 0 1px 1px rgba(255,255,255,.07),0 2px 4px rgba(0,0,0,.24)}\n :host button.off .shine,:host([data-satin]) button.off .shine{opacity:var(--dash6-switch-off-gloss,.18)}");C.elementStyles=[...(C.elementStyles||[]),sheet];});})();

;(()=>{customElements.whenDefined('dash6-stack-card').then(()=>{customElements.get('dash6-stack-card').prototype.getCardSize=async function(){const cards=this._cards?.length?this._cards:(this._config?.cards||[]);const sizes=await Promise.all(cards.map(async c=>{const size=await c.getCardSize?.();return Number.isFinite(size)&&size>=0?size:3;}));return Math.max(1,sizes.reduce((sum,size)=>sum+size,0));};});})();

;(()=>{customElements.whenDefined('dash6-stack-card').then(()=>{customElements.get('dash6-stack-card').prototype.getCardSize=function(){const height=this.getBoundingClientRect().height;return Number.isFinite(height)&&height>0?Math.max(1,Math.ceil(height/50)):Math.max(1,(this._config?.cards?.length||1)*3);};});})();
;(()=>{const sheet=new CSSStyleSheet();sheet.replaceSync("@media(hover:hover){:host([data-satin][data-satin][data-satin][data-satin]) .card .power:hover:not(:disabled):not(:active),:host([data-satin][data-satin][data-satin][data-satin]) .card .mode-bar button:hover:not(:disabled):not(:active),:host([data-satin][data-satin][data-satin][data-satin]) .card .toggle-actions button:hover:not(:disabled):not(:active),:host([data-satin][data-satin][data-satin][data-satin]) .card>.effect-trigger:hover:not(:disabled):not(:active),:host([data-satin][data-satin][data-satin][data-satin]) .card .light-extras button:hover:not(:disabled):not(:active){background:var(--dash6-nav-lens-hover-background)!important;border:var(--dash6-nav-lens-hover-border)!important;border-radius:var(--dash6-nav-lens-radius,12px)!important;box-shadow:var(--dash6-nav-lens-hover-shadow)!important}}");for(const name of ["dash6-govee-light-card-v2","dash6-lightgroup-card-v2"])customElements.whenDefined(name).then(()=>{let proto=customElements.get(name).prototype;while(proto&&!Object.hasOwn(proto,"render"))proto=Object.getPrototypeOf(proto);if(!proto||Object.hasOwn(proto,"_effectHoverV1"))return;proto._effectHoverV1=true;const render=proto.render;proto.render=function(){render.call(this);if(this.shadowRoot&&!this.shadowRoot.adoptedStyleSheets.includes(sheet))this.shadowRoot.adoptedStyleSheets=[...this.shadowRoot.adoptedStyleSheets,sheet];};});})();
// Favorites layouts initialize before the browser captures lifecycle callbacks.
customElements.whenDefined('masonry-layout').then(()=>{
 const Base=customElements.get('masonry-layout');
 const sheet=new CSSStyleSheet();
 sheet.replaceSync('.column{display:flex;flex-direction:column;gap:8px;padding-inline:4px;box-sizing:border-box}.column>*{margin:0!important;min-width:0;flex:none}');
 class FavoritesMasonry extends Base {
  static styles=[Base.styles,sheet];
  connectedCallback(){
   super.connectedCallback();
   if(this._config)return;
   const parent=this.getRootNode().host,config=parent?._config;
   if(config?.layout_type?.includes('dash6-favorites-masonry')){
    this.setConfig({type:this.localName,layout:config.layout,cards:config.cards});
    this.cards=parent._cards||[];
   }
  }
 }
 if(!customElements.get('dash6-favorites-masonry-layout'))customElements.define('dash6-favorites-masonry-layout',FavoritesMasonry);
 if(!customElements.get('dash6-favorites-masonry'))customElements.define('dash6-favorites-masonry',class extends FavoritesMasonry{});
});
;(()=>{const sheet=new CSSStyleSheet();sheet.replaceSync("@media(hover:hover){:host([data-satin][data-satin][data-satin][data-satin]) .card .power:hover:not(:disabled):not(:active),:host([data-satin][data-satin][data-satin][data-satin]) .card .mode-bar button:hover:not(:disabled):not(:active),:host([data-satin][data-satin][data-satin][data-satin]) .card .toggle-actions button:hover:not(:disabled):not(:active),:host([data-satin][data-satin][data-satin][data-satin]) .card>.effect-trigger:hover:not(:disabled):not(:active),:host([data-satin][data-satin][data-satin][data-satin]) .card .light-extras button:hover:not(:disabled):not(:active){background:var(--dash6-nav-lens-hover-background,rgba(255,255,255,.035))!important;border:var(--dash6-nav-lens-hover-border,1px solid rgba(255,255,255,.38))!important;border-radius:var(--dash6-nav-lens-radius,12px)!important;box-shadow:var(--dash6-nav-lens-hover-shadow,inset 0 1px 0 rgba(255,255,255,.10),0 2px 5px rgba(0,0,0,.18))!important}}");for(const name of ["dash6-govee-light-card-v2","dash6-lightgroup-card-v2"])customElements.whenDefined(name).then(()=>{let proto=customElements.get(name).prototype;while(proto&&!Object.hasOwn(proto,"render"))proto=Object.getPrototypeOf(proto);if(!proto||Object.hasOwn(proto,"_effectHoverV2"))return;proto._effectHoverV2=true;const render=proto.render;proto.render=function(){render.call(this);if(this.shadowRoot&&!this.shadowRoot.adoptedStyleSheets.includes(sheet))this.shadowRoot.adoptedStyleSheets=[...this.shadowRoot.adoptedStyleSheets,sheet];};});})();
;customElements.whenDefined('dash6-glass-segments').then(()=>{const C=customElements.get('dash6-glass-segments'),connect=C.prototype.connectedCallback;C.prototype.connectedCallback=function(){connect.call(this);const light=['dash6-govee-light-card-v2','dash6-lightgroup-card-v2'].includes(this.getRootNode().host?.localName);this.toggleAttribute('data-light-modes',light);if(light&&!this.shadowRoot.querySelector('style[data-light-hover]')){const style=document.createElement('style');style.dataset.lightHover='';style.textContent="@media(hover:hover){:host([data-light-modes][data-satin]) .group button:hover:not(:disabled):not(:active){outline:1px solid rgba(255,255,255,.38);outline-offset:-1px;border-radius:var(--dash6-nav-lens-radius,12px);background:var(--dash6-nav-lens-hover-background,rgba(255,255,255,.035))}}";this.shadowRoot.append(style);}};});
;customElements.whenDefined('dash6-glass-segments').then(()=>{const C=customElements.get('dash6-glass-segments'),configure=C.prototype.configure;const init=e=>{const light=e.group?.getAttribute('aria-label')==='Lichtfunktion auswählen';e.toggleAttribute('data-light-modes',light);if(light&&!e.shadowRoot.querySelector('style[data-light-hover]')){const style=document.createElement('style');style.dataset.lightHover='';style.textContent="@media(hover:hover){:host([data-light-modes][data-satin]) .group button:hover:not(:disabled):not(:active){outline:1px solid rgba(255,255,255,.38);outline-offset:-1px;border-radius:var(--dash6-nav-lens-radius,12px);background:var(--dash6-nav-lens-hover-background,rgba(255,255,255,.035))}}";e.shadowRoot.append(style);}};C.prototype.configure=function(...args){const value=configure.apply(this,args);init(this);return value};const scan=r=>{for(const e of r.querySelectorAll('*')){if(e.localName==='dash6-glass-segments')init(e);if(e.shadowRoot)scan(e.shadowRoot)}};scan(document);});
