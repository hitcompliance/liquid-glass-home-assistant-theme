/*! Liquid Glass Cards 2.4.8 | MIT; Vacuum Dock/HA animation Apache-2.0; Lit BSD-3-Clause | See licenses/ and THIRD-PARTY-LICENSES.md */
var g=`ha-card {
  border: var(--dash5-card-border);
  border-radius: var(--dash5-card-radius);
  background: var(--dash5-card-background);
  box-shadow: var(--dash5-card-shadow);
  backdrop-filter: var(--dash5-card-filter);
  -webkit-backdrop-filter: var(--dash5-card-filter);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}
:host(dash6-stack-card) ha-card {
  background: var(--dash5-thin-background);
  border: var(--dash5-thin-border);
  box-shadow: var(--dash5-thin-shadow);
  backdrop-filter: var(--dash5-thin-filter);
  -webkit-backdrop-filter: var(--dash5-thin-filter);
}
/* Structural wrappers and chart canvases must not become nested glass. */
:host(ultra-card) ha-card,
:host(hui-heading-card) ha-card,
:host(embedded-view-card) ha-card,
:host(mini-graph-card) ha-card {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
/* Explicit per-card classes affect the surface only, never inner controls. */
:host(.dash5-glass) ha-card,
:host ha-card.dash5-glass {
  background: var(--dash5-inner-background) !important;
  border: var(--dash5-inner-border) !important;
  box-shadow: var(--dash5-inner-shadow) !important;
  backdrop-filter: var(--dash5-inner-filter) !important;
  -webkit-backdrop-filter: var(--dash5-inner-filter) !important;
}
:host(.dash5-thin) ha-card,
:host ha-card.dash5-thin {
  background: var(--dash5-thin-background) !important;
  border: var(--dash5-thin-border) !important;
  box-shadow: var(--dash5-thin-shadow) !important;
  backdrop-filter: var(--dash5-thin-filter) !important;
  -webkit-backdrop-filter: var(--dash5-thin-filter) !important;
}
/* Use on a dedicated outer wrapper when its content supplies its own spacing. */
:host(.dash5-thin-flush) ha-card,
:host ha-card.dash5-thin-flush {
  background: var(--dash5-thin-background) !important;
  border: var(--dash5-thin-border) !important;
  box-shadow: var(--dash5-thin-shadow) !important;
  backdrop-filter: var(--dash5-thin-filter) !important;
  -webkit-backdrop-filter: var(--dash5-thin-filter) !important;
  padding: 0px !important;
  padding-top: 0px !important;
}
:host(.dash5-transparent) ha-card,
:host ha-card.dash5-transparent {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:host(hui-heading-card) .title {
  color: var(--dash5-heading-color) !important;
  font-size: 24px !important;
  font-weight: 700 !important;
  letter-spacing: -.35px;
  line-height: 32px !important;
  text-shadow: var(--dash5-card-heading-shadow) !important;
}
/* Apply only to dedicated pill cards, never to sliders or action buttons. */
:host(.dash5-pill) ha-card,
:host ha-card.dash5-pill {
  display: flex !important;
  align-items: center !important;
  box-sizing: border-box !important;
  height: var(--dash5-pill-height) !important;
  min-height: var(--dash5-pill-height) !important;
  max-height: var(--dash5-pill-height) !important;
  padding: 0 11px !important;
  border-radius: 999px !important;
  overflow: hidden;
}
:host(.dash5-pill) ha-card #container,
:host ha-card.dash5-pill #container {
  display: grid !important;
  box-sizing: border-box !important;
  height: 100% !important;
  min-height: 0 !important;
  max-height: 100% !important;
  grid-template-rows: minmax(0, 1fr) !important;
  grid-auto-rows: 0 !important;
  row-gap: 0 !important;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  align-content: center !important;
  align-items: center !important;
}
:host(.dash5-pill) ha-card #img-cell,
:host ha-card.dash5-pill #img-cell {
  width: 20px !important;
  height: 20px !important;
  align-self: center !important;
}
:host(.dash5-pill) ha-card #icon,
:host ha-card.dash5-pill #icon {
  --mdc-icon-size: 18px;
  width: 18px !important;
  height: 18px !important;
}
:host(.dash5-pill) ha-card #name,
:host ha-card.dash5-pill #name {
  font-size: 12px !important;
  line-height: 18px !important;
  align-self: center !important;
}
:host(.dash5-pill-row) ha-card,
:host ha-card.dash5-pill-row {
  display: var(--dash5-pill-row-display) !important;
  flex-flow: var(--dash5-pill-row-flow) !important;
  align-content: start;
  align-items: center;
  gap: var(--dash5-pill-gap) !important;
}
/* A dedicated stack/row container can switch from 8px to 16px by token. */
:host(.dash5-card-row) ha-card,
:host ha-card.dash5-card-row {
  row-gap: var(--dash5-card-row-gap) !important;
}
/* Navigation links share the parent glass frame; only hover/active fill. */
:host(.dash5-navigation-link) ha-card,
:host ha-card.dash5-navigation-link {
  background: var(--dash5-nav-item-background, transparent) !important;
  border: var(--dash5-nav-item-border, 0) !important;
  box-shadow: var(--dash5-nav-item-shadow, none) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}
:host(.dash5-navigation-link):hover ha-card,
:host ha-card.dash5-navigation-link:hover {
  background: var(--dash5-nav-item-hover-background, var(--dash5-nav-hover-background)) !important;
}
:host(.dash5-navigation-link.active) ha-card,
:host(.dash5-navigation-link.dash5-navigation-active) ha-card,
:host(.dash5-navigation-link[aria-current="page"]) ha-card,
:host ha-card.dash5-navigation-link.active,
:host ha-card.dash5-navigation-link.dash5-navigation-active,
:host ha-card.dash5-navigation-link[aria-current="page"] {
  background: var(--dash5-nav-item-background, var(--dash5-nav-active-background)) !important;
  border: var(--dash5-nav-item-border, var(--dash5-nav-active-border)) !important;
  box-shadow: var(--dash5-nav-item-shadow, var(--dash5-nav-active-shadow)) !important;
}
/* Explicit heading-card opt-in. Custom shadow roots need their own bridge. */
:host(.dash5-card-header) ha-card,
:host ha-card.dash5-card-header {
  background: var(--dash5-header-background) !important;
  border: var(--dash5-header-border) !important;
  box-shadow: var(--dash5-header-shadow) !important;
  backdrop-filter: var(--dash5-header-filter) !important;
  -webkit-backdrop-filter: var(--dash5-header-filter) !important;
  border-radius: var(--dash5-card-radius) !important;
}
/* Button-card device headers: visible title/icon frame, existing grid intact. */
:host(.dash5-device-card) ha-card #name,
:host ha-card.dash5-device-card #name {
  color: var(--dash5-heading-color);
  font-weight: 700;
  text-shadow: var(--dash5-card-heading-shadow);
}
:host(.dash5-device-card) ha-card #img-cell,
:host ha-card.dash5-device-card #img-cell {
  border-radius: 999px;
  outline: var(--dash6-material-ccf35c8a);
  box-shadow: var(--dash6-material-23c7e0b6);
}
/* IKEA/fan button-cards use custom_fields title/status, not #name. */
:host(button-card) ha-card:has(#title):has(#status) #title {
  color: var(--dash5-heading-color);
  font-size: 16px;
  font-weight: 700;
  line-height: 20px;
  text-shadow: var(--dash5-card-heading-shadow);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:host(button-card) ha-card:has(#title):has(#status) #status {
  font-size: 13px;
  line-height: 16px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* Installed DASH5 light cards expose these header nodes in their shadow root. */
:host(dash6-govee-light-card-v2) .head,
:host(dash6-multi-light-card-v2) .head {
  display: flex;
  align-items: center;
  min-width: 0;
}
:host(dash6-govee-light-card-v2) .head .grow,
:host(dash6-multi-light-card-v2) .head .grow {
  min-width: 0;
}
:host(dash6-govee-light-card-v2) .head .name,
:host(dash6-multi-light-card-v2) .head .name {
  color: var(--dash5-heading-color);
  font-size: 17px;
  font-weight: 650;
  line-height: 22px;
  text-shadow: var(--dash5-card-heading-shadow);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:host(dash6-govee-light-card-v2) .head .status,
:host(dash6-multi-light-card-v2) .head .status {
  font-size: 13px;
  line-height: 18px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
:host(dash6-govee-light-card-v2) .head .power,
:host(dash6-multi-light-card-v2) .head .power {
  border: var(--dash5-icon-border);
  box-shadow: var(--lamp-glow, 0 0 transparent), var(--dash5-icon-shadow);
  backdrop-filter: var(--dash5-icon-filter);
  -webkit-backdrop-filter: var(--dash5-icon-filter);
}
/* Elastic feedback is limited to interactive surfaces, never sliders. */
:host(.dash5-pill) ha-card,
:host ha-card.dash5-pill,
:host(.dash5-navigation-link) ha-card,
:host ha-card.dash5-navigation-link {
  scale: 1;
  transition: box-shadow .22s ease, background .22s ease,
    transform .22s ease, border-color 180ms ease,
    scale calc(420ms * clamp(0, var(--dash5-elasticity,1), 3)) cubic-bezier(.22,1.4,.36,1) !important;
}
:host(.dash5-pill) ha-card:active,
:host ha-card.dash5-pill:active,
:host(.dash5-navigation-link) ha-card:active,
:host ha-card.dash5-navigation-link:active {
  scale: calc(1 - .03 * clamp(0, var(--dash5-elasticity,1), 3));
  transition-duration: .22s, .22s, .22s, 180ms,
    calc(90ms * clamp(0, var(--dash5-elasticity,1), 3)) !important;
  transition-timing-function: ease, ease, ease, ease, ease-out !important;
}
:host(dash6-govee-light-card-v2) .power,
:host(dash6-multi-light-card-v2) .power,
:host(dash6-govee-light-card-v2) .mode-bar button,
:host(dash6-multi-light-card-v2) .mode-bar button,
:host(dash6-govee-light-card-v2) .effect-trigger,
:host(dash6-multi-light-card-v2) .effect-trigger {
  scale: 1;
  transition-property: background-color, border-color, box-shadow, transform, scale;
  transition-duration: 180ms, 180ms, 180ms, 180ms,
    calc(420ms * clamp(0, var(--dash5-elasticity,1), 3));
  transition-timing-function: ease, ease, ease, ease,
    cubic-bezier(.22,1.4,.36,1);
}
:host(dash6-govee-light-card-v2) .power:active:not(:disabled),
:host(dash6-multi-light-card-v2) .power:active:not(:disabled),
:host(dash6-govee-light-card-v2) .mode-bar button:active:not(:disabled),
:host(dash6-multi-light-card-v2) .mode-bar button:active:not(:disabled),
:host(dash6-govee-light-card-v2) .effect-trigger:active:not(:disabled),
:host(dash6-multi-light-card-v2) .effect-trigger:active:not(:disabled) {
  scale: calc(1 - .03 * clamp(0, var(--dash5-elasticity,1), 3));
  transition-duration: 180ms, 180ms, 180ms, 180ms,
    calc(90ms * clamp(0, var(--dash5-elasticity,1), 3));
  transition-timing-function: ease, ease, ease, ease, ease-out;
}
@media (prefers-reduced-motion: reduce) {
  ha-card { transition: none !important; }
  :host(.dash5-pill) ha-card,
  :host ha-card.dash5-pill,
  :host(.dash5-navigation-link) ha-card,
  :host ha-card.dash5-navigation-link,
  :host(dash6-govee-light-card-v2) .power,
  :host(dash6-multi-light-card-v2) .power,
  :host(dash6-govee-light-card-v2) .mode-bar button,
  :host(dash6-multi-light-card-v2) .mode-bar button,
  :host(dash6-govee-light-card-v2) .effect-trigger,
  :host(dash6-multi-light-card-v2) .effect-trigger {
    scale: 1 !important;
    transition: none !important;
  }
}

@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}

@media(prefers-reduced-transparency:reduce){ha-card{background:var(--dash6-solid-surface)!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}}

/* Scoped material geometry: explicit glass retains its frame even in nested stacks. */
:host(dash6-stack-card) ha-card,
:host(.dash5-glass) ha-card, :host ha-card.dash5-glass,
:host(.dash5-thin) ha-card, :host ha-card.dash5-thin,
:host(.dash5-thin-flush) ha-card, :host ha-card.dash5-thin-flush {
 border-radius:var(--dash5-card-radius,16px)!important;
 background-clip:padding-box!important;box-sizing:border-box!important;
}
:host(dash6-stack-card) ha-card {
 background:var(--dash5-thin-background)!important;border:var(--dash5-thin-border)!important;
 box-shadow:var(--dash5-thin-shadow)!important;backdrop-filter:var(--dash5-thin-filter)!important;
 -webkit-backdrop-filter:var(--dash5-thin-filter)!important;
}
:host(hui-vertical-stack-card) #root,
:host(dash6-stack-card) #root {
 display:flex!important;flex-direction:column!important;gap:max(8px,var(--dash6-entity-gap,8px))!important;
}
:host(hui-horizontal-stack-card) #root {
 display:flex!important;gap:max(8px,var(--dash6-entity-gap,8px))!important;
}
:host(hui-grid-card) #root {
 gap:max(8px,var(--dash6-entity-gap,8px))!important;
}
:host(hui-vertical-stack-card) #root>*, :host(hui-horizontal-stack-card) #root>*,
:host(dash6-stack-card) #root>* {margin:0!important;min-width:0;}
@media(hover:hover) and (prefers-reduced-motion:no-preference) {
 :host(.dash5-pill) ha-card:hover, :host(.dash5-navigation-link) ha-card:hover {
  scale:calc(1 + .012 * clamp(0,var(--dash5-elasticity,1),3));
 }
}

:host(dash6-stack-card) .stack{gap:max(8px,var(--dash6-entity-gap,8px))!important} :host(dash6-stack-card) .stack>*{margin:0!important}

:host(dash6-stack-card){margin:0!important} :host(dash6-stack-card) .stack.navigation{gap:0!important}

/* Home room tiles: room header and status-card rows share the theme raster. */
:host(button-card) #container[style*="room"][style*="pills"]{row-gap:var(--dash5-card-row-gap,8px)!important}

/* Domain heading spacing is part of the first render, including dynamic blocks. */
:host(hui-heading-card) ha-card {padding-top:4px!important;padding-bottom:0px!important}

/* Thin wrappers close flush with their content. */
:host(dash6-stack-card) ha-card,
:host(.dash5-thin) ha-card, :host ha-card.dash5-thin,
:host(.dash5-thin-flush) ha-card, :host ha-card.dash5-thin-flush {
 padding-top:0px!important;
 padding-bottom:0px!important;
}

/* Dark Liquid Glass buttons: material comes from the theme, motion respects accessibility. */
button:not([role=radio]):not(.detail-link), [role=button]:not(ha-card):not(.detail-link), ha-icon-button, ha-button, ha-control-button {
 background:var(--dash6-button-background)!important;border:var(--dash6-button-border)!important;
 box-shadow:var(--dash6-button-shadow)!important;backdrop-filter:var(--dash6-button-filter)!important;-webkit-backdrop-filter:var(--dash6-button-filter)!important;
 border-radius:var(--dash6-button-radius,18px);color:inherit;
 transition:scale var(--dash6-button-duration,320ms) cubic-bezier(.22,1.5,.36,1),translate var(--dash6-button-duration,320ms) cubic-bezier(.22,1.5,.36,1),box-shadow 160ms ease;
 transform-origin:center; -webkit-tap-highlight-color:transparent;touch-action:manipulation;
}
button:not([role=radio]):not(.detail-link):active:not(:disabled),[role=button]:not(.detail-link):active,ha-icon-button:active,ha-button:active,ha-control-button:active {
 scale:var(--dash6-button-press-scale,.94);translate:0 var(--dash6-button-press-depth,2px);box-shadow:var(--dash6-button-pressed-shadow)!important;transition-duration:80ms;
}
button[aria-pressed=true]:not([role=radio]),button[aria-selected=true]:not([role=radio]){background:var(--dash6-button-active-background)!important}
button:not(.detail-link):focus-visible,[role=button]:not(.detail-link):focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
@media(prefers-reduced-motion:reduce){button,[role=button],ha-icon-button,ha-button,ha-control-button{scale:1!important;translate:0!important;transition:none!important}}

/* Section tabs: ordinary headings, material inherited from the active theme. */
:host(hui-heading-card.dash6-section-tab){display:block!important;width:fit-content!important;max-width:100%!important;padding:0!important;margin:0!important}
:host(hui-heading-card.dash6-section-tab) ha-card{
 width:fit-content!important;max-width:100%!important;box-sizing:border-box!important;
 padding:6px 16px 7px!important;min-height:45px!important;
 background:transparent!important;
 border:1px solid transparent!important;border-bottom:0!important;
 border-radius:var(--dash5-card-radius,16px) var(--dash5-card-radius,16px) 0 0!important;
 box-shadow:none!important;
 backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
 scale:1!important;translate:0!important;transform:none!important;transition:none!important;cursor:default!important;
}
:host(hui-heading-card.dash6-section-tab) .container{padding:0!important;gap:8px!important}
:host(hui-heading-card.dash6-section-tab) .content{flex:0 1 auto!important;min-width:0!important}
:host(hui-heading-card.dash6-section-tab) .title,:host(hui-heading-card.dash6-section-tab) p{
 margin:0!important;padding:0!important;line-height:32px!important;font-size:24px!important;
 white-space:normal!important;overflow-wrap:anywhere!important;
 font-family:var(--dash6-section-heading-font-family,-apple-system,BlinkMacSystemFont,sans-serif)!important;
 font-size:var(--dash6-section-heading-font-size,22px)!important;font-weight:var(--dash6-section-heading-font-weight,600)!important;
 letter-spacing:var(--dash6-section-heading-letter-spacing,-.02em)!important;line-height:30px!important;
 color:var(--dash6-section-heading-color,var(--primary-text-color))!important;-webkit-text-fill-color:var(--dash6-section-heading-color,var(--primary-text-color))!important;
 text-shadow:var(--dash6-section-heading-shadow,0 1px 2px rgba(0,0,0,.35))!important;
}

/* Native weather: a framed current-weather header inside a thin forecast surface. */
:host(hui-weather-forecast-card.dash6-weather-split) ha-card{
 background:var(--dash5-thin-background)!important;border:var(--dash5-thin-border)!important;border-radius:var(--dash5-card-radius,16px)!important;
 box-shadow:var(--dash5-thin-shadow)!important;backdrop-filter:var(--dash5-thin-filter)!important;-webkit-backdrop-filter:var(--dash5-thin-filter)!important;
 padding:0!important;overflow:visible!important;
}
:host(hui-weather-forecast-card.dash6-weather-split) .content{
 box-sizing:border-box!important;height:var(--dash6-area-header-height,94px)!important;min-height:var(--dash6-area-header-height,94px)!important;
 margin:calc(-1 * var(--dash6-weather-border,1px)) calc(-1 * var(--dash6-weather-border,1px)) 0!important;
 width:calc(100% + 2 * var(--dash6-weather-border,1px))!important;padding:12px 14px!important;display:flex!important;align-items:center!important;gap:12px!important;
 background:var(--dash5-inner-background)!important;border:var(--dash5-inner-border)!important;border-radius:var(--dash5-card-radius,16px)!important;
 box-shadow:var(--dash5-inner-shadow)!important;backdrop-filter:var(--dash5-inner-filter)!important;-webkit-backdrop-filter:var(--dash5-inner-filter)!important;
}
:host(hui-weather-forecast-card.dash6-weather-split) .content .icon-image{flex:0 0 48px!important;width:48px!important;height:48px!important;margin:0!important}
:host(hui-weather-forecast-card.dash6-weather-split) .content .info{display:flex!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;flex:1!important;min-width:0!important;gap:2px!important}
:host(hui-weather-forecast-card.dash6-weather-split) .content .name-state,:host(hui-weather-forecast-card.dash6-weather-split) .content .temp-attribute{display:block!important;width:auto!important;text-align:left!important;min-width:0!important}
:host(hui-weather-forecast-card.dash6-weather-split) .content .state{font-size:16px!important;line-height:20px!important;white-space:normal!important}
:host(hui-weather-forecast-card.dash6-weather-split) .content .temp{font-size:26px!important;line-height:30px!important;font-weight:500!important}
:host(hui-weather-forecast-card.dash6-weather-split) .content .name,:host(hui-weather-forecast-card.dash6-weather-split) .content .attribute{display:none!important}
:host(hui-weather-forecast-card.dash6-weather-split) .forecast{display:flex!important;justify-content:space-evenly!important;align-items:flex-start!important;gap:0!important;padding:12px 6px 8px!important;margin:0!important;box-sizing:border-box!important}
:host(hui-weather-forecast-card.dash6-weather-split) .forecast-item{flex:1 1 0!important;min-width:0!important;width:auto!important;padding:0!important;text-align:center!important;gap:4px!important}
:host(hui-weather-forecast-card.dash6-weather-split) .forecast-image-icon{width:30px!important;height:30px!important;margin:2px auto!important}
:host(hui-weather-forecast-card.dash6-weather-split) .forecast-item-label,:host(hui-weather-forecast-card.dash6-weather-split) .forecast .temp{font-size:11px!important;line-height:15px!important}
@media(max-width:599px){:host(hui-weather-forecast-card.dash6-weather-split) .content{height:var(--dash6-area-header-mobile-height,76px)!important;min-height:var(--dash6-area-header-mobile-height,76px)!important;padding:8px 12px!important}}
@media(min-width:1000px){:host(hui-weather-forecast-card.dash6-sidebar-weather){margin-top:8px!important}}

/* DASH6 navigation lens: only opted-in Home/Wohnzimmer links. */
:host(.dash6-nav-lens) ha-card{
 border-radius:var(--dash6-nav-lens-radius,12px)!important;
 border:1px solid transparent!important;background:transparent!important;box-shadow:none!important;
 backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
 scale:1!important;transform:none!important;box-sizing:border-box!important;
 transition:background 150ms ease,border-color 150ms ease,box-shadow 150ms ease,scale 260ms cubic-bezier(.22,1.25,.36,1)!important;
}
:host(.dash6-nav-lens) #name,:host(.dash6-nav-lens) ha-icon{transition:color 150ms ease!important}
@media(hover:hover){
 :host(.dash6-nav-lens) ha-card:hover{background:var(--dash6-nav-lens-hover-background)!important;border:var(--dash6-nav-lens-hover-border)!important;box-shadow:var(--dash6-nav-lens-hover-shadow)!important;scale:1!important}
 :host(.dash6-nav-lens) ha-card:hover #name{color:var(--primary-text-color)!important}
}
:host(.dash6-nav-lens[data-nav-active="true"]) ha-card,
:host(.dash6-nav-lens[data-nav-active="true"]) ha-card:hover{
 background:var(--dash6-nav-lens-active-background)!important;border:var(--dash6-nav-lens-active-border)!important;box-shadow:var(--dash6-nav-lens-active-shadow)!important;
}
:host(.dash6-nav-lens[data-nav-active="true"]) #name{font-weight:600!important;color:var(--primary-text-color)!important}
:host(.dash6-nav-lens[data-nav-active="true"]) ha-icon{color:var(--dash6-nav-lens-icon-color,#8bc5ff)!important}
:host(.dash6-nav-lens) ha-card:active,
:host(.dash6-nav-lens[data-nav-active="true"]) ha-card:active{
 scale:calc(1 - .02 * min(1,var(--dash5-elasticity,1)))!important;box-shadow:var(--dash6-nav-lens-pressed-shadow)!important;transition-duration:90ms!important;
}
:host(.dash6-nav-lens) ha-card:focus-visible{outline:2px solid var(--primary-color)!important;outline-offset:2px!important}
@media(prefers-reduced-motion:reduce){:host(.dash6-nav-lens) ha-card{transition:none!important;scale:1!important}:host(.dash6-nav-lens) ha-card:active{scale:1!important}}

/* Optical icon lenses: a smoke-gray idle body, colored only by the main light. */
:host(dash6-govee-light-card-v2) .head .power,
:host(dash6-multi-light-card-v2) .head .power{
 background:var(--dash6-icon-lens-background)!important;border:var(--dash6-icon-lens-border)!important;
 border-radius:var(--dash6-icon-lens-radius,14px)!important;box-shadow:var(--dash6-icon-lens-shadow)!important;
 color:var(--dash6-icon-lens-white,rgba(248,249,251,.94))!important;
 backdrop-filter:var(--dash5-icon-filter)!important;-webkit-backdrop-filter:var(--dash5-icon-filter)!important;
}
:host(dash6-govee-light-card-v2) .head .power:not(.light-on) ha-icon,
:host(dash6-multi-light-card-v2) .head .power:not(.light-on) ha-icon{filter:drop-shadow(0 1px 1px rgba(0,0,0,.28))!important}
:host(dash6-govee-light-card-v2) .head .power.light-on,
:host(dash6-multi-light-card-v2) .head .power.light-on{
 background:radial-gradient(ellipse at 50% 58%,color-mix(in srgb,var(--light-glow-color) 45%,transparent),transparent 90%),var(--dash6-icon-lens-background)!important;
 border-color:color-mix(in srgb,var(--light-glow-color) 55%,rgba(255,255,255,.6))!important;color:var(--light-glow-color)!important;
 box-shadow:var(--dash6-icon-lens-shadow),inset 0 0 13px color-mix(in srgb,var(--light-glow-color) 38%,transparent),0 0 10px color-mix(in srgb,var(--light-glow-color) 36%,transparent),0 0 20px color-mix(in srgb,var(--light-glow-color) 18%,transparent)!important;
}

:host(.dash6-card-icon-lens) #img-cell{background:var(--dash6-icon-lens-background)!important;border:var(--dash6-icon-lens-border)!important;box-shadow:var(--dash6-icon-lens-shadow)!important;backdrop-filter:var(--dash5-icon-filter)!important;-webkit-backdrop-filter:var(--dash5-icon-filter)!important}

/* Switch icon lenses follow the main switch only; dock/child-lock states do not illuminate them. */
:host(.dash6-card-icon-lens[data-main-domain="switch"]) #icon{color:var(--dash6-icon-lens-white,rgba(248,249,251,.94))!important;filter:drop-shadow(0 1px 1px rgba(0,0,0,.28))!important}
:host(.dash6-card-icon-lens[data-main-domain="switch"][data-main-state="on"]){--dash6-switch-glow:var(--state-switch-active-color,var(--primary-color))}
:host(.dash6-card-icon-lens[data-main-domain="switch"][data-main-state="on"]) #img-cell{
 background:radial-gradient(ellipse at 50% 58%,color-mix(in srgb,var(--dash6-switch-glow) 45%,transparent),transparent 90%),var(--dash6-icon-lens-background)!important;
 border-color:color-mix(in srgb,var(--dash6-switch-glow) 55%,rgba(255,255,255,.6))!important;
 box-shadow:var(--dash6-icon-lens-shadow),inset 0 0 13px color-mix(in srgb,var(--dash6-switch-glow) 38%,transparent),0 0 10px color-mix(in srgb,var(--dash6-switch-glow) 36%,transparent)!important;
}
:host(.dash6-card-icon-lens[data-main-domain="switch"][data-main-state="on"]) #icon{color:var(--dash6-switch-glow)!important;filter:drop-shadow(0 0 4px var(--dash6-switch-glow))!important}

/* The lens border is part of its fixed dimensions, rather than cropped by the icon host. */
:host(.dash6-card-icon-lens[data-main-domain="switch"]) #img-cell{box-sizing:border-box!important}
:host(.dash6-card-icon-lens[data-main-domain="switch"]) ha-card{overflow:visible!important}

/* Native media surfaces retain theme corners even inside structural stacks. */
:host(hui-media-control-card) ha-card{border-radius:var(--dash5-card-radius,16px)!important;overflow:hidden!important}

/* The staged Satin variant keeps thin wrappers flush and all sliders recessed. */
:host([data-satin].dash5-thin) ha-card,
:host([data-satin].dash5-thin-flush) ha-card,
:host(dash6-stack-card[data-satin]) ha-card {
 padding-top:0px!important;
 padding-bottom:0px!important;
}
:host([data-satin]) .slider,
:host([data-satin]) input[type=range].slider {
 box-shadow:var(--dash6-satin-control-shadow)!important;
 border:var(--dash6-satin-control-border)!important;
 background-image:var(--dash6-satin-slider-gloss),var(--track)!important;
}
`;var i=class{constructor({timer:a=(o,h)=>setTimeout(o,h),clearTimer:r=o=>clearTimeout(o),now:s=Date.now,onChange:d=()=>{}}={}){Object.assign(this,{timer:a,clearTimer:r,now:s,onChange:d}),this.message="",this.deadline=0}show(a){this.clearTimer(this.handle),this.message=String(a?.message||a||"Unbekannter Fehler"),this.deadline=this.now()+6e4,this.handle=this.timer(()=>this.dismiss(),6e4),this.handle?.unref?.(),this.onChange()}dismiss(){this.clearTimer(this.handle),this.message="",this.deadline=0,this.onChange()}},l=globalThis.HTMLElement||class{},e=class extends l{constructor(){super(),this.attachShadow&&(this.attachShadow({mode:"open"}),this.notice=new i({onChange:()=>this.sync()}),this.shadowRoot.innerHTML=`<style>
 :host{display:inline-flex;flex:none}:host([hidden]){display:none!important}
 button{font:inherit;cursor:pointer;touch-action:manipulation}.badge{width:44px;height:44px;min-width:44px;padding:0;background:transparent;border:0;border-radius:8px;color:#ff453a;font-size:28px;font-weight:750;line-height:1;box-shadow:none;filter:none;backdrop-filter:none;transform:none;transition:none}
 .badge:hover{outline:1px solid currentColor}.badge:focus-visible{outline:2px solid currentColor;outline-offset:2px}
 dialog{color:var(--primary-text-color,#fff);background:var(--card-background-color,#25272c);border:1px solid var(--divider-color,#64666b);border-radius:20px;padding:24px;width:min(480px,calc(100vw - 32px));box-sizing:border-box;max-height:calc(100dvh - 32px);overflow:auto;box-shadow:0 16px 48px #0008}
 dialog::backdrop{background:#0008}h2{font:600 20px system-ui;margin:0 0 16px}p{white-space:pre-wrap;overflow-wrap:anywhere;font:16px/1.5 system-ui;margin:0 0 24px}.confirm{display:block;margin-left:auto;min-height:44px;padding:8px 18px;border:1px solid var(--divider-color,#777);border-radius:12px;background:var(--dash6-button-background,#34373c);color:inherit}
 </style><button class="badge" type="button" aria-label="Fehlerdetails \xF6ffnen" title="Fehlerdetails \xF6ffnen">!</button><dialog aria-labelledby="error-title"><h2 id="error-title">Fehler</h2><p></p><button type="button" class="confirm">Best\xE4tigen</button></dialog>`,this.dialog=this.shadowRoot.querySelector("dialog"),this.shadowRoot.querySelector(".badge").onclick=a=>{a.stopPropagation(),this.notice.message&&!this.dialog.open&&this.dialog.showModal()},this.shadowRoot.querySelector(".confirm").onclick=a=>{a.stopPropagation(),this.notice.dismiss()},this.dialog.addEventListener("click",a=>{if(a.stopPropagation(),a.target===this.dialog){let r=this.dialog.getBoundingClientRect();(a.clientX<r.left||a.clientX>r.right||a.clientY<r.top||a.clientY>r.bottom)&&this.dialog.close()}}))}show(a){this.notice.show(a)}sync(){this.hidden=!this.notice.message,this.shadowRoot.querySelector("p").textContent=this.notice.message,!this.notice.message&&this.dialog.open&&this.dialog.close()}connectedCallback(){this.sync(),this._wasOpen&&this.notice.message&&!this.dialog.open&&this.dialog.showModal(),this._wasOpen=!1}disconnectedCallback(){this._wasOpen=!!this.dialog?.open,this._wasOpen&&this.dialog.close()}};globalThis.customElements&&!customElements.get("dash6-error-indicator")&&customElements.define("dash6-error-indicator",e);var n=new WeakMap;function p(t){let a=n.get(t);return a||(a=document.createElement("dash6-error-indicator"),a.hidden=!0,n.set(t,a)),a}function b(t,a){p(t).show(a)}export{g as a,p as b,b as c};
