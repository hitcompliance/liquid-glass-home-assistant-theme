/*! Liquid Glass Cards 2.4.4 | MIT; Vacuum Dock/HA animation Apache-2.0; Lit BSD-3-Clause | See licenses/ and THIRD-PARTY-LICENSES.md */
import{b as H,c,e as B}from"./chunks/chunk-YGWW5SI2.js";import{f as Z,i as K,j as O}from"./chunks/chunk-EHDFFGOR.js";var W="custom:vacuum-dock-card",C=[["battery","sensor","Batterie","Battery"],["progress","sensor","Reinigungsfortschritt","Cleaning progress"],["cleaning_mode","select","Reinigungsmodus","Cleaning mode"],["mop_intensity","select","Wisch-Intensit\xE4t","Mop intensity"],["mop_route","select","Wisch-Modus","Mop route"],["mop_drying","switch","Mopp-Trocknung","Mop drying"],["mop_washing","switch","Mopp-W\xE4sche","Mop washing"],["dust_emptying","switch","Staubentleerung","Dust emptying"],["drying_remaining","sensor","Trocknungsrestzeit","Drying time remaining"],["clean_water","binary_sensor","Frischwassertank","Clean water tank"],["dirty_water","binary_sensor","Schmutzwassertank","Dirty water tank"],["emptying_mode","select","Entleerungsmodus","Emptying mode"]],L={battery:"battery",progress:"progress",mode:"cleaning_mode",intensity:"mop_intensity",route:"mop_route",drying:"mop_drying",washing:"mop_washing",emptying:"dust_emptying",dryTime:"drying_remaining",cleanWater:"clean_water",dirtyWater:"dirty_water",emptyMode:"emptying_mode"},q=t=>t&&typeof t=="object"&&!Array.isArray(t),I=(t,i)=>typeof t=="string"&&new RegExp("^"+i+"\\.[a-z0-9_]+$").test(t);function N(t){if(!q(t)||!I(t.entity,"vacuum"))throw Error("entity: vacuum.* is required");for(let e of["entities","defaults","stats"])if(t[e]!==void 0&&!q(t[e]))throw Error(e+": expected an object");let i=structuredClone(t);if(i.type=W,i.entities??={},i.defaults??={},i.stats={default:[],cleaning:[],...i.stats},i.areas??=[],i.language??="auto",i.drying_time_unit??="auto",!["auto","de","en"].includes(i.language))throw Error("language: auto, de or en");if(!["auto","s","min","h"].includes(i.drying_time_unit))throw Error("drying_time_unit: auto, s, min or h");for(let[e,o]of C)if(i.entities[e]===""&&delete i.entities[e],i.entities[e]!==void 0&&!I(i.entities[e],o))throw Error("entities."+e+": expected "+o+".*");for(let e of Object.keys(i.entities))if(!C.some(o=>o[0]===e))throw Error("Unknown entity mapping: "+e);for(let e of Object.keys(i.defaults))if(!["mode","intensity","route","fan","repeat"].includes(e))throw Error("Unknown default: "+e);if(i.defaults.repeat!==void 0&&(!Number.isInteger(i.defaults.repeat)||i.defaults.repeat<1||i.defaults.repeat>3))throw Error("defaults.repeat: integer 1\u20133");for(let e of["mode","intensity","route","fan"])if(i.defaults[e]!==void 0&&(typeof i.defaults[e]!="string"||!i.defaults[e]))throw Error("defaults."+e+": expected a nonempty option string");if(!Array.isArray(i.areas))throw Error("areas: expected array");let n=new Set;for(let e of i.areas){if(!q(e)||!Number.isInteger(e.roborock_area_id)||e.roborock_area_id<1||n.has(e.roborock_area_id))throw Error("areas: unique positive integer roborock_area_id required");if(!e.area_id&&!e.name)throw Error("areas: area_id or name required");n.add(e.roborock_area_id)}for(let e of["default","cleaning"]){if(!Array.isArray(i.stats[e]))throw Error("stats."+e+": expected array");for(let o of i.stats[e]){if(!q(o)||!I(o.entity,"sensor"))throw Error("stats: expected sensor.*");if(o.divide_by!==void 0&&(!Number.isFinite(o.divide_by)||o.divide_by<=0))throw Error("stats.divide_by: positive number");if(o.scale!==void 0&&(!Number.isInteger(o.scale)||o.scale<0||o.scale>5))throw Error("stats.scale: integer 0\u20135")}}return i}function P(t){return{vacuum:t.entity,...Object.fromEntries(Object.entries(L).map(([i,n])=>[i,t.entities[n]]))}}function T(t,i){let n=P(t),e={repeat:t.defaults.repeat??1,rooms:[]};for(let[o,r]of Object.entries({mode:"vac_and_mop",intensity:"moderate",route:"standard",fan:"balanced"})){let s=i[o==="fan"?t.entity:n[o]],d=o==="fan"?s?.attributes.fan_speed_list:s?.attributes.options;e[o]=t.defaults[o]??(d?.includes(r)?r:d?.includes(o==="fan"?s.attributes.fan_speed:s.state)?o==="fan"?s.attributes.fan_speed:s.state:d?.find(g=>!["unknown","custom","smart_mode","off"].includes(g)))}return e}function X(t,i,n){let e=P(t),o=[];if(!i[t.entity]||["unavailable","unknown"].includes(i[t.entity].state))throw Error("Vacuum unavailable");for(let[s,d]of Object.entries({mode:e.mode,intensity:e.intensity,route:e.route}))if(d){if(!i[d]||["unavailable","unknown"].includes(i[d].state)||!i[d].attributes.options?.includes(n[s]))throw Error("Unsupported or unavailable option: "+s);o.push(["select","select_option",{entity_id:d,option:n[s]}])}if(!Number.isInteger(n.repeat)||n.repeat<1||n.repeat>3)throw Error("Cycles must be 1\u20133");let r=n.rooms??[];if(!Array.isArray(r)||new Set(r).size!==r.length||r.some(s=>!t.areas.some(d=>d.roborock_area_id===s)))throw Error("Invalid room selection");if(n.fan!==void 0&&n.mode!=="mop"){if(!i[t.entity].attributes.fan_speed_list?.includes(n.fan))throw Error("Unsupported fan speed");o.push(["vacuum","set_fan_speed",{entity_id:t.entity,fan_speed:n.fan}])}return r.length?o.push(["vacuum","send_command",{entity_id:t.entity,command:"app_segment_clean",params:[{segments:r,repeat:n.repeat}]}]):o.push(["vacuum","start",{entity_id:t.entity}]),o}function J(t,i="auto"){if(!t||["unknown","unavailable"].includes(t.state)||!Number.isFinite(Number(t.state)))return null;let n=i==="auto"?t.attributes.unit_of_measurement:i,e={s:1/60,sec:1/60,min:1,h:60}[n];return e===void 0?null:Math.max(0,Math.ceil(Number(t.state)*e))}var U={svg:`<svg
          viewBox="0 0 240 240"
          xmlns="http://www.w3.org/2000/svg"
          class="vacuum-svg"
        >
          <!-- Soft background glow -->
          <circle
            cx="120"
            cy="120"
            r="110"
            class="glow"
            fill="var(--vacuum-color)"
            opacity="0.06"
          />

          <!-- Robot body group -->
          <g class="vacuum-body-rotate">
            <g class="vacuum-body">
              <!-- Side brush (front-right, rendered before body so body covers half) -->
              <g class="brush brush-right">
                <g class="brush-spokes">
                  <line
                    x1="174"
                    y1="76"
                    x2="174"
                    y2="64"
                    stroke="var(--vacuum-color)"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    opacity="0.5"
                  />
                  <line
                    x1="174"
                    y1="76"
                    x2="174"
                    y2="88"
                    stroke="var(--vacuum-color)"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    opacity="0.5"
                  />
                  <line
                    x1="174"
                    y1="76"
                    x2="162"
                    y2="76"
                    stroke="var(--vacuum-color)"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    opacity="0.5"
                  />
                  <line
                    x1="174"
                    y1="76"
                    x2="186"
                    y2="76"
                    stroke="var(--vacuum-color)"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    opacity="0.5"
                  />
                </g>
                <circle
                  cx="174"
                  cy="76"
                  r="2"
                  fill="var(--vacuum-color)"
                  opacity="0.5"
                />
              </g>

              <!-- Outer body shell -->
              <circle
                cx="120"
                cy="120"
                r="72"
                fill="var(--card-background-color, #fff)"
                stroke="var(--vacuum-color)"
                stroke-width="2"
              />

              <!-- Inner body ring -->
              <circle
                cx="120"
                cy="120"
                r="66"
                fill="none"
                stroke="var(--vacuum-color)"
                stroke-width="0.8"
                opacity="0.2"
              />

              <!-- Bumper arc (front half, prominent) -->
              <path
                d="M 60 94 A 68 68 0 0 1 180 94"
                fill="none"
                stroke="var(--vacuum-color)"
                stroke-width="3"
                stroke-linecap="round"
                class="bumper"
              />

              <!-- Direction indicator lines (navigation feel) -->
              <g class="nav-lines" opacity="0.15">
                <line
                  x1="120"
                  y1="56"
                  x2="120"
                  y2="74"
                  stroke="var(--vacuum-color)"
                  stroke-width="1.5"
                />
                <line
                  x1="88"
                  y1="63"
                  x2="96"
                  y2="78"
                  stroke="var(--vacuum-color)"
                  stroke-width="1.5"
                />
                <line
                  x1="152"
                  y1="63"
                  x2="144"
                  y2="78"
                  stroke="var(--vacuum-color)"
                  stroke-width="1.5"
                />
              </g>

              <!-- LIDAR turret (static) -->
              <circle
                cx="120"
                cy="108"
                r="14"
                fill="var(--card-background-color, #fff)"
                stroke="var(--vacuum-color)"
                stroke-width="2"
                class="lidar-housing"
              />
              <circle
                cx="120"
                cy="108"
                r="9"
                fill="none"
                stroke="var(--vacuum-color)"
                stroke-width="0.8"
                opacity="0.25"
              />

              <!-- Power button area (center) -->
              <circle
                cx="120"
                cy="140"
                r="8"
                fill="var(--vacuum-color)"
                opacity="0.08"
                class="power-ring"
              />
              <circle
                cx="120"
                cy="140"
                r="4"
                fill="var(--vacuum-color)"
                opacity="0.25"
                class="power-dot"
              />
            </g>
          </g>

          <!-- Dust particles (cleaning state) - sucked toward vacuum -->
          <g class="particles">
            <circle
              class="particle p1"
              cx="120"
              cy="120"
              r="2"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p2"
              cx="120"
              cy="120"
              r="1.5"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p3"
              cx="120"
              cy="120"
              r="1.5"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p4"
              cx="120"
              cy="120"
              r="2"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p5"
              cx="120"
              cy="120"
              r="1.5"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p6"
              cx="120"
              cy="120"
              r="1.5"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p7"
              cx="120"
              cy="120"
              r="1"
              fill="var(--vacuum-color)"
            />
            <circle
              class="particle p8"
              cx="120"
              cy="120"
              r="1"
              fill="var(--vacuum-color)"
            />
          </g>

          <!-- Dock station (docked state) -->
          <g class="dock-indicator">
            <!-- Dock base plate -->
            <rect
              x="76"
              y="188"
              width="88"
              height="28"
              rx="8"
              fill="var(--card-background-color, #fff)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
            />
          </g>

          <!-- Return arrow (returning state) -->
          <g class="return-path">
            <polygon
              points="120,220 110,206 130,206"
              fill="var(--vacuum-color)"
              stroke="var(--vacuum-color)"
              stroke-width="2"
              stroke-linejoin="round"
              opacity="0.55"
            />
          </g>
        </svg>`,css:`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .container {
      width: 200px;
      height: 200px;
      position: relative;
    }

    .vacuum-svg {
      width: 100%;
      height: 100%;
    }

    /* -- Hide state-specific elements by default -- */
    .particles,
    .dock-indicator,
    .return-path {
      opacity: 0;
      transition: opacity 400ms ease;
    }

    /* ======================== */
    /* CLEANING                 */
    /* ======================== */
    .cleaning .vacuum-body {
      animation: vacuum-wander 12s ease-in-out infinite;
      transform-origin: 120px 120px;
    }

    .cleaning .brush-right .brush-spokes {
      animation: brush-spin 0.6s linear infinite;
      transform-origin: 174px 76px;
    }

    .cleaning .particles {
      opacity: 1;
    }

    .cleaning .particle {
      animation: particle-suck 2.4s ease-in infinite;
      transform-origin: 120px 120px;
    }

    .cleaning .p1 {
      animation-delay: 0s;
    }
    .cleaning .p2 {
      animation-delay: -0.3s;
    }
    .cleaning .p3 {
      animation-delay: -0.6s;
    }
    .cleaning .p4 {
      animation-delay: -0.9s;
    }
    .cleaning .p5 {
      animation-delay: -1.2s;
    }
    .cleaning .p6 {
      animation-delay: -1.5s;
    }
    .cleaning .p7 {
      animation-delay: -1.8s;
    }
    .cleaning .p8 {
      animation-delay: -2.1s;
    }

    .cleaning .p1 {
      --particle-x: -90px;
      --particle-y: -25px;
    }
    .cleaning .p2 {
      --particle-x: 90px;
      --particle-y: 20px;
    }
    .cleaning .p3 {
      --particle-x: -85px;
      --particle-y: 40px;
    }
    .cleaning .p4 {
      --particle-x: 85px;
      --particle-y: -35px;
    }
    .cleaning .p5 {
      --particle-x: -65px;
      --particle-y: 70px;
    }
    .cleaning .p6 {
      --particle-x: 70px;
      --particle-y: -65px;
    }
    .cleaning .p7 {
      --particle-x: -75px;
      --particle-y: -55px;
    }
    .cleaning .p8 {
      --particle-x: 80px;
      --particle-y: 55px;
    }

    .cleaning .nav-lines {
      animation: nav-pulse 2s ease-in-out infinite;
    }

    /* ======================== */
    /* RETURNING                */
    /* ======================== */
    .vacuum-body-rotate {
      transform-origin: 120px 120px;
      transform: rotate(0deg);
      transition: transform 600ms ease-in-out;
    }

    .returning .vacuum-body-rotate {
      transform: rotate(180deg);
    }

    .returning .vacuum-body {
      animation: returning-drift 3s ease-in-out infinite;
    }

    .returning .return-path {
      opacity: 1;
      animation: return-arrow 1.6s ease-in-out infinite;
      transform-origin: 120px 210px;
    }

    .returning .brush-right {
      opacity: 0.4;
    }

    /* ======================== */
    /* DOCKED                   */
    /* ======================== */
    .docked .dock-indicator {
      opacity: 1;
    }

    .docked .vacuum-body {
      opacity: 0.75;
    }

    .docked .glow {
      animation: docked-glow 4s ease-in-out infinite;
    }

    .docked .power-ring {
      animation: charge-pulse 2.5s ease-in-out infinite;
    }

    .docked .brush-right {
      opacity: 0.5;
    }

    /* ======================== */
    /* ERROR                    */
    /* ======================== */
    .error .glow {
      animation: error-glow 1.8s ease-in-out infinite;
    }

    /* ======================== */
    /* IDLE                     */
    /* ======================== */
    .idle .vacuum-body {
      opacity: 0.65;
    }

    .idle .brush-right {
      opacity: 0.4;
    }

    /* ============================== */
    /* KEYFRAME ANIMATIONS            */
    /* ============================== */

    @keyframes vacuum-wander {
      0% {
        transform: rotate(0deg) translate(0, 0);
      }
      15% {
        transform: rotate(0deg) translate(0, -30px);
      }
      25% {
        transform: rotate(0deg) translate(0, 0);
      }
      32% {
        transform: rotate(-18deg) translate(0, 0);
      }
      47% {
        transform: rotate(-18deg) translate(0, -28px);
      }
      57% {
        transform: rotate(-18deg) translate(0, 0);
      }
      63% {
        transform: rotate(12deg) translate(0, 0);
      }
      78% {
        transform: rotate(12deg) translate(0, -25px);
      }
      88% {
        transform: rotate(12deg) translate(0, 0);
      }
      95% {
        transform: rotate(0deg) translate(0, 0);
      }
      100% {
        transform: rotate(0deg) translate(0, 0);
      }
    }

    @keyframes brush-spin {
      to {
        transform: rotate(360deg);
      }
    }

    @keyframes particle-suck {
      0% {
        opacity: 0;
        transform: translate(var(--particle-x), var(--particle-y)) scale(1.2);
      }
      25% {
        opacity: 0.8;
      }
      80% {
        opacity: 0;
        transform: translate(
            calc(var(--particle-x) * 0.82),
            calc(var(--particle-y) * 0.82)
          )
          scale(0.6);
      }
      100% {
        opacity: 0;
        transform: translate(
            calc(var(--particle-x) * 0.82),
            calc(var(--particle-y) * 0.82)
          )
          scale(0.6);
      }
    }

    @keyframes nav-pulse {
      0%,
      100% {
        opacity: 0.15;
      }
      50% {
        opacity: 0.35;
      }
    }

    @keyframes returning-drift {
      0%,
      100% {
        transform: translateY(-6px);
      }
      50% {
        transform: translateY(4px);
      }
    }

    @keyframes return-arrow {
      0%,
      100% {
        transform: translateY(-6px);
        opacity: 0.3;
      }
      50% {
        transform: translateY(4px);
        opacity: 0.85;
      }
    }

    @keyframes docked-glow {
      0%,
      100% {
        opacity: 0.06;
      }
      50% {
        opacity: 0.14;
      }
    }

    @keyframes charge-pulse {
      0%,
      100% {
        opacity: 0.08;
      }
      50% {
        opacity: 0.25;
      }
    }

    @keyframes error-glow {
      0%,
      100% {
        opacity: 0.08;
      }
      50% {
        opacity: 0.35;
      }
    }

    /* Respect prefers-reduced-motion */
    @media (prefers-reduced-motion: reduce) {
      .cleaning .vacuum-body,
      .cleaning .brush-right .brush-spokes,
      .cleaning .particle,
      .cleaning .nav-lines,
      .returning .vacuum-body,
      .returning .return-path,
      .docked .glow,
      .docked .power-ring,
      .error .glow {
        animation: none;
      }
      .vacuum-body-rotate {
        transition: none;
      }
    }
  `};var Q=`:host { display:block; }
ha-card {display:block;border:1px solid var(--divider-color);border-radius:16px;overflow:hidden;color:var(--primary-text-color);background:var(--ha-card-background,var(--card-background-color));}
* {box-sizing:border-box;}
button,select,input {font:inherit;}
button {cursor:pointer;color:inherit;background:none;border:0;}
button:disabled {opacity:.45;cursor:default;}
button:focus-visible,select:focus-visible,input:focus-visible {outline:2px solid var(--primary-color);outline-offset:2px;}
header {display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px;}
.title-button {display:flex;align-items:center;gap:10px;text-align:left;padding:0;}
.title-button ha-state-icon {width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--secondary-background-color);}
header .action {font-size:12px;}
ha-icon {--mdc-icon-size:22px;flex:none;}
.status-panel {padding:8px 20px 0;}
.status-title {font-size:32px;line-height:1.2;font-weight:400;}
.status-meta {display:flex;justify-content:space-between;align-items:center;margin-top:8px;color:var(--secondary-text-color);font-size:14px;}
.battery {display:flex;align-items:center;gap:6px;font-size:14px;color:var(--secondary-text-color);}
.battery ha-state-icon {--mdc-icon-size:18px;}
.robot-animation {display:flex;justify-content:center;margin:0 auto;min-height:200px;}
.progress-row {display:grid;grid-template-columns:1fr auto;gap:6px;padding:0 16px 12px;font-size:12px;}
progress {grid-column:1/-1;width:100%;height:5px;border:0;border-radius:8px;overflow:hidden;accent-color:var(--primary-color);}
progress::-webkit-progress-bar {background:var(--divider-color);}
progress::-webkit-progress-value {background:var(--primary-color);}
.stats-grid {display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) minmax(0,1.25fr);border-top:1px solid var(--divider-color);border-bottom:1px solid var(--divider-color);}
.stat {padding:10px 4px;display:flex;flex-direction:column;gap:3px;min-width:0;}
.stat+ .stat {border-left:1px solid var(--divider-color);}
.stat strong {font-size:16px;font-weight:400;}
.stat span {white-space:normal;overflow-wrap:anywhere;font-size:12px;color:var(--secondary-text-color);}
.actions-row {display:flex;flex-wrap:wrap;gap:8px;padding:12px;}
.action {display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px;border-radius:12px;background:var(--secondary-background-color);font-size:13px;min-height:36px;}
.action:hover:not(:disabled),.chip:hover:not(:disabled) {background:var(--divider-color);}
.dock {padding:0 12px 12px;}
.dock-title {font-size:13px;color:var(--secondary-text-color);padding:4px 0 8px;}
.dock-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:8px;}
.chip {display:flex;align-items:center;gap:8px;text-align:left;border:1px solid var(--divider-color);border-radius:16px;padding:10px;min-width:0;}
.chip span {font-size:12px;white-space:normal;overflow-wrap:anywhere;}
.chip small {display:block;margin-top:3px;color:var(--secondary-text-color);font-size:11px;}
.select-field {display:flex;flex-direction:column;gap:5px;font-size:12px;color:var(--secondary-text-color);min-width:0;}
select {width:100%;min-height:38px;border:1px solid var(--divider-color);border-radius:12px;padding:6px 10px;background:var(--card-background-color);color:var(--primary-text-color);}
.custom-dialog {width:min(920px,calc(100vw - 24px));max-width:none;max-height:calc(100dvh - 32px);margin:auto;padding:0;border:1px solid var(--divider-color);border-radius:16px;background:var(--card-background-color,#202020);color:var(--primary-text-color);overflow:hidden;box-shadow:0 12px 48px #0009;}
.custom-dialog[open] {display:flex;flex-direction:column;}
.custom-dialog::backdrop {background:#0008;}
.dialog-header {display:flex;align-items:center;gap:12px;justify-content:space-between;padding:20px 24px;flex:none;border-bottom:1px solid var(--divider-color);}
.dialog-header h2 {font-size:24px;font-weight:500;margin:2px 0 0;}
.dialog-subtitle {font-size:14px;color:var(--secondary-text-color);}
.close {display:grid;place-items:center;min-width:48px;min-height:48px;border-radius:50%;}
.dialog-body {min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:20px 24px;scrollbar-gutter:stable;}
.choice-group {margin:0 0 24px;border:0;padding:0;min-width:0;}
.choice-group:last-child {margin-bottom:0;}
.choice-group legend {margin-bottom:12px;padding:0;font-size:16px;font-weight:500;}
.choice-group legend small {margin-left:12px;font-weight:400;font-size:12px;color:var(--secondary-text-color);}
.choice-grid,.room-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;}
.room-grid {grid-template-columns:repeat(4,minmax(0,1fr));}
.choice-tile {position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:90px;min-width:0;padding:16px 8px;border:1px solid var(--divider-color);border-radius:16px;font-size:14px;line-height:1.3;text-align:center;touch-action:manipulation;}
.choice-tile>ha-icon {--mdc-icon-size:28px;color:var(--secondary-text-color);}
.choice-tile>span {max-width:100%;white-space:normal;overflow-wrap:anywhere;}
.room-grid .choice-tile {min-height:140px;font-size:17px;gap:16px;}
.room-grid .choice-tile>ha-icon {--mdc-icon-size:38px;}
.choice-tile:hover:not(:disabled) {background:var(--secondary-background-color);}
.choice-tile[aria-pressed="true"] {border-color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 14%,transparent);box-shadow:inset 0 0 0 1px var(--primary-color);}
.choice-tile[aria-pressed="true"]>ha-icon {color:var(--primary-color);}
.choice-tile>ha-icon.selected-mark {position:absolute;top:7px;right:7px;--mdc-icon-size:17px;}
.dialog-actions {display:flex;align-items:center;justify-content:space-between;gap:12px;flex:none;padding:16px 24px;border-top:1px solid var(--divider-color);}
.selection-summary {font-size:13px;color:var(--secondary-text-color);}
.dialog-actions .action {min-height:48px;padding:12px 20px;border-radius:24px;font-size:15px;background:var(--primary-color);color:var(--text-primary-color,#fff);}
.dialog-actions .action:disabled {background:var(--secondary-background-color);color:var(--secondary-text-color);}
@media(max-width:600px) {.dialog-header{padding:12px 16px;}.dialog-header h2{font-size:21px;}.dialog-body{padding:16px;scrollbar-gutter:auto;}.room-grid{grid-template-columns:repeat(2,minmax(0,1fr));}.room-grid .choice-tile{min-height:114px;font-size:15px;gap:12px;}.choice-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;}.choice-tile{font-size:12px;min-height:90px;padding:14px 6px;}.dialog-actions{padding:12px 16px;flex-wrap:wrap;}.dialog-actions .action{width:100%;}.selection-summary{width:100%;text-align:center;}.choice-group legend small{display:block;margin:4px 0 0;}}
.error {color:var(--error-color,#ef5350);font-size:13px;margin:8px 12px;white-space:normal;}
@media(max-width:450px) {header {align-items:flex-start;}header .action span {max-width:95px;}.status-title {font-size:28px;}.stats-grid {grid-template-columns:repeat(2,minmax(0,1fr));}.stat:nth-child(3),.stat:nth-child(5){border-left:0;}.stat:nth-child(5){grid-column:1/-1;}.stat:nth-child(n+3){border-top:1px solid var(--divider-color);}}

.cleaning-stats {grid-template-columns:repeat(2,minmax(0,1fr));}

/* Dock controls: quiet status toolbar, spacious touch dialog. */
header {flex-wrap:wrap;gap:10px;}
.title-button {flex:1 0 104px;min-height:44px;}
.title-button strong {font-size:14px;}
.dock-mini {display:inline-flex;align-items:stretch;flex:none;margin-left:auto;max-width:100%;border:1px solid var(--divider-color);border-radius:16px;background:var(--secondary-background-color);overflow:hidden;}
.dock-icon-button {display:flex;align-items:center;justify-content:center;gap:5px;min-width:40px;min-height:44px;padding:6px;touch-action:manipulation;}
.dock-icon-button+ .dock-icon-button {border-left:1px solid var(--divider-color);}
.dock-icon-button ha-icon {--mdc-icon-size:20px;}
.dock-icon-button:hover:not(:disabled) {background:var(--divider-color);}
.dry-remaining {font-size:11px;white-space:nowrap;font-variant-numeric:tabular-nums;}
.primary-actions {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));padding:12px 12px 8px;}
.primary-actions .action {min-height:48px;border-radius:16px;border:1px solid var(--divider-color);font-size:14px;}
.primary-actions .action:first-child {color:var(--primary-color);background:color-mix(in srgb,var(--primary-color) 12%,transparent);border-color:color-mix(in srgb,var(--primary-color) 40%,var(--divider-color));}
.secondary-actions {padding:0 12px 12px;}
.secondary-actions .action {min-height:44px;border:1px solid var(--divider-color);border-radius:16px;flex:1 1 auto;}
.dock-launcher-wrap {padding:0 12px 12px;}
.dock-launcher {width:100%;display:flex;align-items:center;gap:12px;text-align:left;min-height:72px;padding:12px 14px;border:1px solid var(--divider-color);border-radius:16px;background:var(--secondary-background-color);touch-action:manipulation;}
.dock-launcher>span:nth-child(2) {flex:1;}
.dock-launcher strong {font-size:14px;font-weight:500;}
.dock-launcher small {display:block;color:var(--secondary-text-color);font-size:12px;margin-top:4px;}
.dock-launcher-icon,.dock-heading-icon {display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:color-mix(in srgb,var(--primary-color) 12%,transparent);color:var(--primary-color);}
.dock-launcher>ha-icon {color:var(--secondary-text-color);}
.dock-launcher:hover {border-color:var(--primary-color);}
.dock-dialog {width:min(680px,calc(100vw - 24px));}
.dock-heading {display:flex;align-items:center;gap:12px;min-width:0;}
.dock-dialog .dialog-body {padding:20px;}
.dock-dialog .dock-grid {grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0;}
.dock-tile {position:relative;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;min-height:140px;padding:20px 10px;touch-action:manipulation;background:var(--secondary-background-color);}
.dock-tile>ha-icon {--mdc-icon-size:30px;}
.dock-tile span {font-size:14px;}
.dock-tile small {font-size:13px;margin-top:8px;}
.dock-tile[aria-pressed="true"] {border-color:color-mix(in srgb,var(--green-color) 65%,var(--divider-color));}
.mode-tile>ha-icon:last-child {position:absolute;right:8px;top:8px;--mdc-icon-size:18px;color:var(--secondary-text-color);}
.empty-mode-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
.empty-mode-grid .choice-tile {min-height:120px;font-size:16px;}
.dock-hint {font-size:14px;color:var(--secondary-text-color);white-space:normal;margin:0 0 16px;}
@media(max-width:600px) {.dock-dialog .dock-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}.dock-dialog .dialog-body{padding:16px;}.dock-tile{min-height:128px;padding:16px 8px;}.dock-tile span{font-size:13px;}.dock-heading-icon{display:none;}.dock-dialog .dialog-header h2{font-size:20px;}}

.stats-grid{grid-template-columns:repeat(var(--stats-columns,5),minmax(0,1fr))}.stat span{hyphens:auto}.stat:nth-child(5){grid-column:auto}@media(max-width:450px){.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.stat:last-child:nth-child(odd){grid-column:1/-1}}
`;function G(t,i){let n=P(i);t._ids=n,t._busy=!1,t._error="",t._draft=T(i,t.hass?.states||{}),t._de=()=>(i.language==="auto"?t.hass?.locale?.language||t.hass?.language||navigator.language:i.language).startsWith("de");let e=(a,l)=>t._de()?a:l,o=a=>t.hass?.states[a],r=a=>o(a)&&!["unknown","unavailable"].includes(o(a).state),s=(a,l)=>{let p=o(a);return p?t.hass.formatEntityState?.(l===void 0?p:{...p,state:l})??l??p.state:e("Unbekannt","Unknown")},d=a=>{a&&(t.shadowRoot?.querySelectorAll("dialog[open]").forEach(l=>l.close()),t.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:a},bubbles:!0,composed:!0})))};t._perform=async a=>{if(!t._busy){t._busy=!0,t._error="",t.requestUpdate();try{await a()}catch(l){t._error=l?.message||String(l)}finally{t._busy=!1,t.requestUpdate()}}};let g=(a,l,p)=>t.hass.callService(a,l,p);t._setOption=async(a,l)=>{if(!o(a)?.attributes.options?.includes(l))throw new Error(e("Nicht unterst\xFCtzte Option: ","Unsupported option: ")+l);await g("select","select_option",{entity_id:a,option:l})},t._start=async(a=T(i,t.hass.states))=>{let l=X(i,t.hass.states,a);for(let[p,m,v]of l)await g(p,m,v)},t._openCustom=()=>{t._draft=T(i,t.hass?.states||{}),t._error="",t.requestUpdate(),t.updateComplete.then(()=>t.shadowRoot.querySelector(".cleaning-dialog")?.showModal())},t._closeCustom=()=>t.shadowRoot.querySelector(".cleaning-dialog")?.close(),t._toggle=a=>t._perform(()=>g("switch","toggle",{entity_id:a})),t._openDock=()=>{t._dockPage="overview",t._error="",t.requestUpdate(),t.updateComplete.then(()=>t.shadowRoot.querySelector(".dock-dialog").showModal())},t._closeDock=()=>t.shadowRoot.querySelector(".dock-dialog")?.close(),t._dockPage="overview",t._intermediateWash=()=>t._perform(()=>g("switch","turn_on",{entity_id:n.washing}));let S=document.createElement("div");S.className="animation-fallback",S.attachShadow({mode:"open"}).innerHTML="<style>"+U.css+'</style><div class="container idle">'+U.svg+"</div>";let k=S.shadowRoot.querySelector(".container");t._nativeAnimation=null,t._animation=a=>{if(customElements.get("ha-state-control-vacuum-status"))return t._nativeAnimation||(t._nativeAnimation=document.createElement("ha-state-control-vacuum-status")),t._nativeAnimation.stateObj=a,t._nativeAnimation;let l=["cleaning","returning","docked","paused","error"].includes(a.state)?a.state:"idle";k.className="container "+l;let p=["cleaning","returning"].includes(l)?"active":"inactive";return k.style.setProperty("--vacuum-color",`var(--state-vacuum-${l}-color,var(--state-vacuum-${p}-color,var(--state-${p}-color)))`),S};let x=(a,l)=>c`<ha-icon .icon=${a} style=${l?"color:"+l:""}></ha-icon>`,z=(a,l,p,m=!1)=>c`<button type="button" class="action" ?disabled=${m||t._busy} @click=${p}>${x(l)}<span>${a}</span></button>`,R=a=>(o(a)?.attributes.options||[]).filter(l=>l!=="unknown"),E=(a,l,p,m=!1,v=!1)=>{if(!a)return"";let f=o(a)?.state,u=["on","off"].includes(f),h=u?m?f==="off"?"var(--green-color)":"var(--red-color)":f==="on"?"var(--green-color)":"var(--secondary-text-color)":"var(--secondary-text-color)",y=a.startsWith("switch."),w=s(a),$="";if(a===n.drying&&f==="on"){let b=J(o(n.dryTime),i.drying_time_unit);b!==null&&($=b>=60?Math.floor(b/60)+" h "+b%60+" min":b+" min",w=$)}return c`<button type="button" class=${v?"dock-icon-button":"chip dock-tile"} data-entity=${a} title=${l+": "+w} aria-label=${l+": "+w} aria-pressed=${y?String(f==="on"):"undefined"} ?disabled=${y&&(!u||t._busy)} @click=${()=>y?t._toggle(a):d(a)}>${x(p,h)}${v?$?c`<span class="dry-remaining">${$}</span>`:"":c`<span>${l}<small>${w}</small></span>`}</button>`},D=a=>c`
    ${E(n.drying,e("Mopp-Trocknung","Mop drying"),"mdi:weather-windy",!1,a)}
    ${E(n.washing,e("Mopp-W\xE4sche","Mop washing"),"mdi:waves",!1,a)}
    ${E(n.emptying,e("Staubentleerung","Dust emptying"),"mdi:delete-empty",!1,a)}
    ${E(n.cleanWater,e("Frischwassertank","Clean water tank"),"mdi:water-check",!0,a)}
    ${E(n.dirtyWater,e("Schmutzwassertank","Dirty water tank"),"mdi:water-alert",!0,a)}`;t._renderDock=()=>{let a=t._dockPage==="mode",l={smart:"mdi:creation",light:"mdi:fan-speed-1",balanced:"mdi:fan-speed-2",max:"mdi:fan-speed-3"};return c`<dialog class="custom-dialog dock-dialog" aria-label=${e("Basisstation","Dock")} @click=${p=>{let m=p.currentTarget.getBoundingClientRect();p.target===p.currentTarget&&(p.clientX<m.left||p.clientX>m.right||p.clientY<m.top||p.clientY>m.bottom)&&t._closeDock()}}>
      <div class="dialog-header"><div class="dock-heading">${a?c`<button type="button" class="close" aria-label=${e("Zur\xFCck","Back")} @click=${()=>{t._dockPage="overview",t.requestUpdate()}}>${x("mdi:arrow-left")}</button>`:c`<div class="dock-heading-icon">${x("mdi:robot-vacuum")}</div>`}<div><div class="dialog-subtitle">${(i.name||o(n.vacuum)?.attributes.friendly_name||e("Staubsauger","Vacuum"))+" \xB7 "+e("Basisstation","Dock")}</div><h2>${a?e("Entleerungsmodus","Emptying mode"):e("Basisstation","Dock")}</h2></div></div><button type="button" class="close" aria-label=${e("Schlie\xDFen","Close")} @click=${t._closeDock}>${x("mdi:close")}</button></div>
      <div class="dialog-body">${a?c`<p class="dock-hint">${e("Antippen, um den Entleerungsmodus zu \xE4ndern.","Tap to change the emptying mode.")}</p><div class="empty-mode-grid">${R(n.emptyMode).map(p=>c`<button type="button" class="choice-tile" data-empty-mode=${p} aria-pressed=${String(o(n.emptyMode)?.state===p)} ?disabled=${t._busy||!r(n.emptyMode)} @click=${()=>t._perform(async()=>{await t._setOption(n.emptyMode,p),t._dockPage="overview"})}>${x(l[p]||"mdi:tune")}<span>${s(n.emptyMode,p)}</span>${o(n.emptyMode)?.state===p?c`<ha-icon class="selected-mark" .icon=${"mdi:check-circle"}></ha-icon>`:""}</button>`)}</div>`:c`<div class="dock-grid">${D(!1)}${n.emptyMode?c`<button type="button" class="chip dock-tile mode-tile" @click=${()=>{t._dockPage="mode",t.requestUpdate()}}>${x("mdi:tune-variant","var(--primary-color)")}<span>${e("Entleerungsmodus","Emptying mode")}<small>${s(n.emptyMode)}</small></span>${x("mdi:chevron-right")}</button>`:""}</div>`}
      ${t._error?c`<p class="error" role="alert">${t._error}</p>`:""}</div>
    </dialog>`};let A={mode:{vacuum:"mdi:vacuum",vac_and_mop:"mdi:water-sync",mop:"mdi:water"},intensity:{off:"mdi:water-off",slight:"mdi:water-outline",low:"mdi:water-minus",medium:"mdi:water",moderate:"mdi:water-check",high:"mdi:water-plus",extreme:"mdi:waves"},route:{standard:"mdi:routes",deep:"mdi:layers",deep_plus:"mdi:layers-triple",fast:"mdi:fast-forward",smart_mode:"mdi:creation",custom:"mdi:tune"},fan:{quiet:"mdi:volume-low",balanced:"mdi:fan-speed-1",turbo:"mdi:fan-speed-2",max:"mdi:fan-speed-3",max_plus:"mdi:fan-plus"}};t._renderCustom=()=>{let a=t._draft,l=(u,h)=>{a[u]=h,t.requestUpdate()},p=(u,h,y,w,$,b,j=!1)=>c`<button type="button" class="choice-tile" data-param=${u} data-value=${String(h)} aria-pressed=${String($)} ?disabled=${j||t._busy} @click=${b}>${x(w)}<span>${y}</span>${$?c`<ha-icon class="selected-mark" .icon=${"mdi:check-circle"}></ha-icon>`:""}</button>`,m=(u,h,y,w,$=!1)=>y.length?c`<fieldset class="choice-group"><legend>${h}</legend><div class="choice-grid">${y.map(b=>p(u,b,w(b),A[u]?.[b]||"mdi:tune",a[u]===b,()=>l(u,b),$))}</div></fieldset>`:"",v={},f=i.areas;return c`<dialog class="custom-dialog cleaning-dialog" aria-label=${e("Reinigung starten","Start cleaning")} @click=${u=>{let h=u.currentTarget.getBoundingClientRect();u.target===u.currentTarget&&(u.clientX<h.left||u.clientX>h.right||u.clientY<h.top||u.clientY>h.bottom)&&t._closeCustom()}}>
      <div class="dialog-header"><div><div class="dialog-subtitle">${o(n.vacuum)?.attributes.friendly_name||e("Staubsauger","Vacuum")}</div><h2>${e("Reinigung starten","Start cleaning")}</h2></div><button type="button" class="close" aria-label=${e("Schlie\xDFen","Close")} @click=${t._closeCustom}>${x("mdi:close")}</button></div>
      <div class="dialog-body">
        ${f.length?c`<fieldset class="choice-group"><legend>${e("R\xE4ume","Rooms")}<small>${e("Mehrfachauswahl","Select multiple")}</small></legend><div class="room-grid">${f.map(u=>{let h=t.hass.areas?.[u.area_id],y=u.roborock_area_id;return p("rooms",y,u.name||h?.name||u.area_id,u.icon||h?.icon||v[u.area_id]||"mdi:floor-plan",a.rooms.includes(y),()=>{a.rooms=a.rooms.includes(y)?a.rooms.filter(w=>w!==y):[...a.rooms,y],t.requestUpdate()})})}</div></fieldset>`:""}
        ${m("mode",e("Reinigungsmodus","Cleaning mode"),R(n.mode),u=>s(n.mode,u),o(n.mode)?.state==="unavailable")}
        ${m("intensity",e("Wisch-Intensit\xE4t","Mop intensity"),R(n.intensity),u=>s(n.intensity,u),a.mode==="vacuum"||o(n.intensity)?.state==="unavailable")}
        ${m("route",e("Wisch-Modus","Mop route"),R(n.route),u=>s(n.route,u),a.mode==="vacuum"||o(n.route)?.state==="unavailable")}
        ${m("fan",e("Saugstufe","Suction power"),(o(n.vacuum)?.attributes.fan_speed_list||[]).filter(u=>!["off","custom","smart_mode"].includes(u)),u=>t.hass.formatEntityAttributeValue?.(o(n.vacuum),"fan_speed",u)||u,a.mode==="mop")}
        ${f.length?c`<fieldset class="choice-group"><legend>${e("Durchg\xE4nge","Cycles")}</legend><div class="choice-grid">${[1,2,3].map(u=>p("repeat",u,u+" \xD7","mdi:repeat",a.repeat===u,()=>l("repeat",u)))}</div></fieldset>`:""}
        ${t._error?c`<p class="error" role="alert">${t._error}</p>`:""}
      </div>
      <div class="dialog-actions"><span class="selection-summary">${a.rooms.length?e(a.rooms.length===1?"1 Raum ausgew\xE4hlt":a.rooms.length+" R\xE4ume ausgew\xE4hlt",a.rooms.length===1?"1 room selected":a.rooms.length+" rooms selected"):i.areas.length?e("Bitte R\xE4ume ausw\xE4hlen","Select rooms to continue"):e("Gesamte Wohnung","Whole home")}</span>${z(e("Reinigung starten","Start cleaning"),"mdi:play",()=>t._perform(async()=>{await t._start({...a,rooms:[...a.rooms]}),t._closeCustom()}),i.areas.length>0&&!a.rooms.length)}</div>
    </dialog>`},t.render=function(){if(!this.hass)return c``;if(!o(n.vacuum))return c`<ha-card><p class="error">${e("Entit\xE4t nicht gefunden: ","Entity not found: ")}${n.vacuum}</p></ha-card>`;let a=o(n.vacuum),l=a.state,p=l==="cleaning",m=["cleaning","paused","returning"].includes(l),v=["unknown","unavailable"].includes(l),f=o(n.progress),u=f&&!["unknown","unavailable"].includes(f.state)&&Number.isFinite(Number(f.state)),h=Number(f?.state)||0,y=i.stats[p?"cleaning":"default"].filter(_=>_.entity!==n.progress),w=[n.drying,n.washing,n.emptying,n.cleanWater,n.dirtyWater,n.emptyMode].some(Boolean),$=_=>(Number(a.attributes.supported_features||0)&_)!==0,b=o(n.battery),j=b?s(n.battery):Number.isFinite(a.attributes.battery_level)?a.attributes.battery_level+" %":null;return c`<style>${Q+Z}</style><ha-card>
      <header><button class="title-button" type="button" @click=${()=>d(n.vacuum)}><ha-state-icon .hass=${this.hass} .stateObj=${a}></ha-state-icon><strong>${i.name||a.attributes.friendly_name||e("Staubsauger","Vacuum")}</strong></button>${w?c`<div class="dock-mini" role="group" aria-label=${e("Basisstation Schnellsteuerung","Dock quick controls")}>${D(!0)}</div>`:""}</header>
      <section class="status-panel"><div class="status-title">${s(n.vacuum)}</div><div class="status-meta"><ha-relative-time .hass=${this.hass} .datetime=${a.last_changed} capitalize></ha-relative-time>${j!==null?c`<button class="battery" @click=${()=>d(n.battery||n.vacuum)}>${j}${b?c`<ha-state-icon .hass=${this.hass} .stateObj=${b}></ha-state-icon>`:x("mdi:battery")}</button>`:""}</div><div class="robot-animation">${t._animation(a)}</div></section>
      ${n.progress?c`<div class="progress-row"><span>${e("Reinigungsfortschritt","Cleaning progress")}</span><strong>${u?h.toLocaleString(t._de()?"de-DE":"en",{maximumFractionDigits:0})+" %":"\u2014"}</strong><progress max="100" .value=${Math.max(0,Math.min(100,h))} aria-label=${e("Reinigungsfortschritt","Cleaning progress")}></progress></div>`:""}
      <div class=${p?"stats-grid cleaning-stats":"stats-grid"} style=${"--stats-columns:"+Math.max(1,Math.min(5,y.length))}>${y.map(_=>{let M=o(_.entity),V=Number(M?.state)/(_.divide_by||1),ne=M&&!["unknown","unavailable"].includes(M.state)&&Number.isFinite(V),ie={Filter:"Filter",Seitenb\u00FCrste:"Side brush",Hauptb\u00FCrste:"Main brush",Sensoren:"Sensors",Schmutzf\u00E4nger:"Strainer",Fortschritt:"Progress",Fl\u00E4che:"Area",Dauer:"Duration"};return c`<button class="stat" @click=${()=>d(_.entity)}><strong>${ne?V.toLocaleString(t._de()?"de-DE":"en",{maximumFractionDigits:_.scale??0}):"\u2014"} ${_.unit??M?.attributes.unit_of_measurement??""}</strong><span>${e(_.title||M?.attributes.friendly_name||_.entity,ie[_.title]||_.title||M?.attributes.friendly_name||_.entity)}</span></button>`})}</div>
      <div class="actions-row primary-actions">
      ${p?z(e("Stop","Stop"),"mdi:stop",()=>t._perform(()=>g("vacuum","stop",{entity_id:n.vacuum}))):z(l==="paused"?e("Fortsetzen","Resume"):e("Start","Start"),"mdi:play",()=>t._perform(()=>l==="paused"?g("vacuum","start",{entity_id:n.vacuum}):t._start()),v||l==="returning")}
      ${z(e("Individuell","Custom"),"mdi:tune",t._openCustom,v)}
      </div><div class="actions-row secondary-actions">
      ${p&&$(4)?z(e("Pause","Pause"),"mdi:pause",()=>t._perform(()=>g("vacuum","pause",{entity_id:n.vacuum}))):""}
      ${m&&!p?z(e("Stop","Stop"),"mdi:stop",()=>t._perform(()=>g("vacuum","stop",{entity_id:n.vacuum}))):""}
      ${l!=="docked"&&$(16)?z(e("Zur Basisstation","Return to dock"),"mdi:home-import-outline",()=>t._perform(()=>g("vacuum","return_to_base",{entity_id:n.vacuum})),v||l==="returning"):""}
      ${p&&n.washing?z(e("Mopp-Zwischenreinigung","Wash mop during cleaning"),"mdi:waves",t._intermediateWash,!r(n.washing)):""}
      ${$(512)?z(e("Lokalisieren","Locate"),"mdi:map-marker",()=>t._perform(()=>g("vacuum","locate",{entity_id:n.vacuum})),v):""}
      </div>
      ${w?c`<div class="dock-launcher-wrap"><button type="button" class="dock-launcher" @click=${t._openDock}><span class="dock-launcher-icon">${x("mdi:robot-vacuum")}</span><span><strong>${e("Basisstation","Dock")}</strong><small>${e("Pflege & Einstellungen","Care & settings")}</small></span>${x("mdi:chevron-right")}</button></div>`:""}
      ${t._error?c`<p class="error" role="alert">${t._error}</p>`:""}
      </ha-card>${t._renderCustom()}${t._renderDock()}`}}var ae={default:[["Filter","Filter",/(?:^|_)(?:filter_time_left|filter_remaining|filter_verbleibend)$/],["Seitenb\xFCrste","Side brush",/(?:^|_)(?:side_brush_time_left|side_brush_remaining|seitenburste_verbleibend)$/],["Hauptb\xFCrste","Main brush",/(?:^|_)(?:main_brush_time_left|main_brush_remaining|hauptburste_verbleibend)$/],["Sensoren","Sensors",/(?:^|_)(?:sensor_time_left|sensor_time_remaining|sensoren_verbleibend|sensor_verbleibend)$/],["Schmutzf\xE4nger","Strainer",/(?:^|_)(?:strainer_time_left|strainer_remaining|schmutzfanger_verbleibend)$/,"dock"]],cleaning:[["Reinigungsfortschritt","Cleaning progress",/(?:^|_)(?:cleaning_progress|reinigungsfortschritt)$/],["Reinigungsfl\xE4che","Cleaning area",/(?:^|_)(?:cleaning_area|reinigungsflache)$/],["Reinigungszeit","Cleaning time",/(?:^|_)(?:cleaning_time|reinigungszeit)$/]]},ee=t=>String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");function te({group:t,registry:i,states:n,robot:e,dock:o,existing:r=[],german:s=!1}){let d=[...r],g=new Set(r.map(k=>k.entity)),S=0;for(let[k,x,z,R]of ae[t]||[]){let E=R==="dock"&&o||e,D=i.filter(m=>!/(?:^|_)(?:total|last|gesamt|letzte|letzter|letztes)(?:_|$)/.test(ee(m.translation_key||m.entity_id.slice(7)))&&m.device_id===E&&!m.disabled_by&&m.entity_id.startsWith("sensor.")&&[m.translation_key,m.entity_id.slice(7),m.original_name,m.name,n[m.entity_id]?.attributes?.friendly_name].some(v=>z.test(ee(v))));if(D.some(m=>g.has(m.entity_id)))continue;if(D.length>1){S++;continue}if(D.length!==1)continue;let A=D[0].entity_id,a={entity:A,title:s?k:x,scale:1},l=n[A]?.attributes?.unit_of_measurement;if(t==="default"||k==="Reinigungszeit"){let m=t==="default"?"h":"min",v={s:1,sec:1,min:60,h:3600}[l];if(v){a.unit=m;let f=(m==="h"?3600:60)/v;f!==1&&(a.divide_by=f)}}d.push(a),g.add(A)}return{rows:d,added:d.length-r.length,ambiguous:S}}var F=class extends B{static properties={hass:{attribute:!1},_config:{state:!0},_step:{state:!0},_notice:{state:!0},_dockDevice:{state:!0}};constructor(){super(),this._config={type:W,entities:{},areas:[],stats:{default:[],cleaning:[]},defaults:{}},this._step=0,this._notice="",this._dockDevice=""}setConfig(i){this._config={...structuredClone(i),entities:{...i.entities},defaults:{...i.defaults},areas:i.areas||[],stats:{default:[],cleaning:[],...i.stats}}}tr(i,n){return(this._config.language==="auto"||!this._config.language?this.hass?.locale?.language||"en":this._config.language).startsWith("de")?i:n}change(i,n){let e=structuredClone(this._config),o=e;for(let r of i.slice(0,-1))o=o[r]??={};n===""||n===void 0?delete o[i.at(-1)]:o[i.at(-1)]=n,this._config=e,this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:e},bubbles:!0,composed:!0}))}select(i,n,e,o){return c`<label><span>${i}</span><select .value=${n??""} @change=${r=>o(r.target.value)}><option value="">${this.tr("Nicht zugeordnet / automatisch","Not mapped / automatic")}</option>${n&&!e.some(r=>r.value===n)?c`<option .value=${n} selected>${n} (${this.tr("nicht verf\xFCgbar","unavailable")})</option>`:""}${e.map(r=>c`<option .value=${r.value} ?selected=${r.value===n}>${r.label}</option>`)}</select></label>`}field(i,n,e="text"){let o=i.reduce((r,s)=>r?.[s],this._config);return c`<label><span>${n}</span><input type=${e} .value=${String(o??"")} @change=${r=>this.change(i,r.target.value===""?"":e==="number"?Number(r.target.value):r.target.value)}></label>`}pick(i,n,e){let o=i.reduce((s,d)=>s?.[d],this._config),r=Object.values(this.hass?.states||{}).filter(s=>s.entity_id.startsWith(e+".")).sort((s,d)=>(s.attributes.friendly_name||s.entity_id).localeCompare(d.attributes.friendly_name||d.entity_id)).map(s=>({value:s.entity_id,label:(s.attributes.friendly_name||s.entity_id)+" \xB7 "+s.entity_id}));return this.select(n,o,r,s=>this.change(i,s))}async suggest(){try{let i=await this.hass.callWS({type:"config/entity_registry/list"}),n=i.find(s=>s.entity_id===this._config.entity)?.device_id;if(!n){this._notice=this.tr("Kein Ger\xE4t zur Vacuum-Entit\xE4t gefunden. Bitte manuell zuordnen.","No device found for the vacuum. Map entities manually.");return}let e={battery:/battery|batterie/,progress:/cleaning_progress|reinigungsfortschritt/,cleaning_mode:/cleaning_mode|reinigungsmodus/,mop_intensity:/mop_intensity|wisch_intensitat|mop_water_flow/,mop_route:/mop_mode|mop_route|wisch_modus/,mop_drying:/mop_drying|mopp_trocknung/,mop_washing:/mop_washing|moppwasche/,dust_emptying:/dust_emptying|staubentleerung/,drying_remaining:/mop_drying_remaining|verbleibende_zeit_zum_trocknen/,clean_water:/clean_water_tank|frischwassertank/,dirty_water:/dirty_water_tank|schmutzwassertank/,emptying_mode:/emptying_mode|entleerungsmodus/},o={...this._config.entities},r=0;for(let[s,d]of C){if(o[s])continue;let g=["battery","progress","cleaning_mode","mop_intensity","mop_route"].includes(s)?n:this._dockDevice||n,S=i.filter(k=>k.device_id===g&&!k.disabled_by&&k.entity_id.startsWith(d+".")&&e[s].test(k.entity_id+" "+(k.translation_key||"")));S.length===1&&(o[s]=S[0].entity_id,r++)}this.change(["entities"],o),this._notice=this.tr(r+" eindeutige Zuordnungen erg\xE4nzt. Bitte pr\xFCfen; vorhandene Zuordnungen wurden beibehalten.",r+" unambiguous mappings added. Please review; existing mappings were preserved.")}catch{this._notice=this.tr("Ger\xE4teregister nicht lesbar. Alle Entit\xE4ten k\xF6nnen manuell ausgew\xE4hlt werden.","Device registry unavailable. All entities can be selected manually.")}}async suggestStatistics(i){try{let n=await this.hass.callWS({type:"config/entity_registry/list"}),e=n.find(g=>g.entity_id===this._config.entity)?.device_id;if(!e){this._notice=this.tr("Kein Ger\xE4t zur Vacuum-Entit\xE4t gefunden. Bitte manuell zuordnen.","No device found for the vacuum. Map entities manually.");return}let o=["mop_drying","mop_washing","dust_emptying","clean_water","dirty_water","emptying_mode"].map(g=>n.find(S=>S.entity_id===this._config.entities[g])?.device_id).filter(Boolean),r=[...new Set(o)],s=this._dockDevice||(r.length===1?r[0]:void 0),d=te({group:i,registry:n,states:this.hass.states||{},robot:e,dock:s,existing:this._config.stats[i],german:this.tr("de","en")==="de"});d.added&&this.change(["stats",i],d.rows),this._notice=this.tr(`${d.added} Sensoren erg\xE4nzt; ${d.ambiguous} mehrdeutige Treffer ausgelassen. Vorhandene Zeilen bleiben erhalten. Bitte Zuordnung und Einheiten pr\xFCfen.`,`${d.added} sensors added; ${d.ambiguous} ambiguous matches skipped. Existing rows were preserved. Please review mappings and units.`)}catch{this._notice=this.tr("Ger\xE4teregister nicht lesbar. Bitte Sensoren manuell zuordnen.","Device registry unavailable. Map sensors manually.")}}render(){if(!this.hass)return c``;let i=[this.tr("Roboter","Robot"),this.tr("Basisstation","Dock"),this.tr("Wartung","Statistics"),this.tr("R\xE4ume","Rooms"),this.tr("Standardwerte","Defaults")],n="";try{N(this._config)}catch(e){n=e.message}return c`<div class="intro"><strong>Vacuum Dock Card</strong><p>${this.tr("Ordne deine Entit\xE4ten zu. Nicht ben\xF6tigte Funktionen bleiben leer und werden ausgeblendet.","Map your entities. Leave unused functions empty to hide them.")}</p></div><nav>${i.map((e,o)=>c`<button aria-pressed=${String(o===this._step)} @click=${()=>this._step=o}>${o+1}. ${e}</button>`)}</nav>
 ${this._step===0?c`<div class="fields">${this.pick(["entity"],this.tr("Staubsauger (Pflicht)","Vacuum (required)"),"vacuum")}${this.field(["name"],this.tr("Kartenname (optional)","Card name (optional)"))}${this.select(this.tr("Sprache","Language"),this._config.language||"auto",["auto","de","en"].map(e=>({value:e,label:e})),e=>this.change(["language"],e||"auto"))}${C.slice(0,5).map(([e,o,r,s])=>this.pick(["entities",e],this.tr(r,s),o))}</div><button class="assist" ?disabled=${!this._config.entity} @click=${this.suggest}>${this.tr("Passende Entit\xE4ten vorschlagen","Suggest matching entities")}</button>`:""}
 ${this._step===1?c`<div class="fields">${this.select(this.tr("Dock-Ger\xE4t f\xFCr Zuordnungsvorschl\xE4ge","Dock device for suggestions"),this._dockDevice,Object.values(this.hass.devices||{}).map(e=>({value:e.id,label:e.name_by_user||e.name||e.id})),e=>this._dockDevice=e)}${C.slice(5).map(([e,o,r,s])=>this.pick(["entities",e],this.tr(r,s),o))}${this.select(this.tr("Einheit der Trocknungsrestzeit","Drying time unit"),this._config.drying_time_unit||"auto",["auto","s","min","h"].map(e=>({value:e,label:e})),e=>this.change(["drying_time_unit"],e||"auto"))}</div><button class="assist" ?disabled=${!this._config.entity} @click=${this.suggest}>${this.tr("Passende Entit\xE4ten vorschlagen","Suggest matching entities")}</button>`:""}
 ${this._step===2?c`${["default","cleaning"].map(e=>c`<h3>${e==="default"?this.tr("Wartungsrestzeiten","Maintenance remaining"):this.tr("W\xE4hrend der Reinigung","During cleaning")}</h3><button class="assist" ?disabled=${!this._config.entity} @click=${()=>this.suggestStatistics(e)}>${e==="default"?this.tr("Wartungssensoren vorschlagen","Suggest maintenance sensors"):this.tr("Reinigungssensoren vorschlagen","Suggest cleaning sensors")}</button>${this._config.stats[e].map((o,r)=>c`<section class="row"><div class="fields">${this.pick(["stats",e,r,"entity"],this.tr("Sensor","Sensor"),"sensor")}${this.field(["stats",e,r,"title"],this.tr("Beschriftung","Label"))}${this.field(["stats",e,r,"unit"],this.tr("Einheit (leer = Sensor)","Unit (empty = sensor)"))}${this.field(["stats",e,r,"scale"],this.tr("Nachkommastellen (0\u20135)","Decimal places (0\u20135)"),"number")}${this.field(["stats",e,r,"divide_by"],this.tr("Teilen durch (optional)","Divide by (optional)"),"number")}</div><button @click=${()=>this.change(["stats",e],this._config.stats[e].filter((s,d)=>d!==r))}>${this.tr("Entfernen","Remove")}</button></section>`)}<button @click=${()=>this.change(["stats",e],[...this._config.stats[e],{entity:"",scale:1}])}>+ ${this.tr("Sensor hinzuf\xFCgen","Add sensor")}</button>`)}`:""}
 ${this._step===3?c`<p>${this.tr("Roborock-Segment-IDs geh\xF6ren zur aktuell aktiven Karte des Roboters. HA-Bereiche und Roborock-IDs sind nicht identisch. Die Nummern m\xFCssen aus deiner Roborock-Karte stammen.","Roborock segment IDs belong to the active robot map. HA areas and Roborock IDs are not identical. Use IDs from your own robot map.")}</p>${this._config.areas.map((e,o)=>c`<section class="row"><div class="fields">${this.select(this.tr("HA-Bereich","HA area"),e.area_id,Object.values(this.hass.areas||{}).map(r=>({value:r.area_id,label:r.name})),r=>this.change(["areas",o,"area_id"],r))}${this.field(["areas",o,"name"],this.tr("Name (optional bei HA-Bereich)","Name (optional with HA area)"))}${this.field(["areas",o,"roborock_area_id"],this.tr("Roborock-Segment-ID","Roborock segment ID"),"number")}${this.field(["areas",o,"icon"],"Icon (mdi:...)")}</div><button @click=${()=>this.change(["areas"],this._config.areas.filter((r,s)=>s!==o))}>${this.tr("Entfernen","Remove")}</button></section>`)}<button @click=${()=>this.change(["areas"],[...this._config.areas,{name:"",roborock_area_id:null}])}>+ ${this.tr("Raum hinzuf\xFCgen","Add room")}</button>`:""}
 ${this._step===4?c`<p>${this.tr("Leer = unterst\xFCtzten Standard automatisch w\xE4hlen. moderate bedeutet M\xE4\xDFig; medium bedeutet Mittel. Durchg\xE4nge gelten nur f\xFCr Raumreinigung.","Empty = choose a supported default automatically. moderate is distinct from medium. Cycles apply only to room cleaning.")}</p><div class="fields">${["mode","intensity","route","fan"].map(e=>{let o=e==="fan"?this._config.entity:this._config.entities[L[e]],r=this.hass.states[o],s=e==="fan"?r?.attributes.fan_speed_list:r?.attributes.options;return this.select({mode:this.tr("Reinigungsmodus","Cleaning mode"),intensity:this.tr("Wisch-Intensit\xE4t","Mop intensity"),route:this.tr("Wisch-Modus","Mop route"),fan:this.tr("Saugstufe","Fan speed")}[e],this._config.defaults[e],(s||[]).map(d=>({value:d,label:e==="fan"?this.hass.formatEntityAttributeValue?.(r,"fan_speed",d)||d:this.hass.formatEntityState?.({...r,state:d})||d})),d=>this.change(["defaults",e],d))})}${this.select(this.tr("Durchg\xE4nge","Cycles"),String(this._config.defaults.repeat||1),[1,2,3].map(e=>({value:String(e),label:e+" \xD7"})),e=>this.change(["defaults","repeat"],Number(e)||1))}</div>`:""}
 ${this._notice?c`<p class="notice" role="status">${this._notice}</p>`:""}${n?c`<p class="error" role="status">${n}</p>`:""}<footer><button ?disabled=${this._step===0} @click=${()=>this._step--}>${this.tr("Zur\xFCck","Back")}</button><span>${this._step+1} / 5</span><button ?disabled=${this._step===4} @click=${()=>this._step++}>${this.tr("Weiter","Next")}</button></footer>`}static styles=H`:host{display:block;color:var(--primary-text-color);font-family:inherit}*{box-sizing:border-box}.intro p,p{font-size:13px;line-height:1.6;color:var(--secondary-text-color)}nav{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}button{min-height:44px;padding:10px 14px;border:1px solid var(--divider-color,#555);border-radius:14px;background:var(--secondary-background-color,#292929);color:inherit;font:inherit;font-size:13px;cursor:pointer}button[aria-pressed=true],.assist{border-color:var(--primary-color);color:var(--primary-color)}button:disabled{opacity:.4;cursor:default}.fields{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}label{display:flex;flex-direction:column;gap:6px;font-size:13px;min-width:0}input,select{width:100%;min-height:48px;border:1px solid var(--divider-color,#555);border-radius:12px;padding:10px;background:var(--card-background-color,#222);color:inherit;font:inherit}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}.assist{margin-top:16px}.row{padding:14px;border:1px solid var(--divider-color,#555);border-radius:16px;margin:12px 0}.row>button{margin-top:12px}.error{color:var(--error-color,#e55)}.notice{padding:12px;border:1px solid var(--divider-color);border-radius:12px}footer{display:flex;justify-content:space-between;align-items:center;margin-top:20px;font-size:13px}h3{font-size:15px;font-weight:500}`};customElements.get("vacuum-dock-card-editor")||customElements.define("vacuum-dock-card-editor",F);var Y=class extends B{static properties={hass:{attribute:!1}};static getConfigElement(){return document.createElement("vacuum-dock-card-editor")}static getStubConfig(i,n=[]){return{type:W,entity:n.find(e=>e.startsWith("vacuum."))||Object.keys(i?.states||{}).find(e=>e.startsWith("vacuum."))||""}}setConfig(i){let n=N(i);this.shadowRoot?.querySelectorAll("dialog[open]").forEach(e=>e.close()),this._config=n,G(this,n),this.requestUpdate()}getCardSize(){return 10}getGridOptions(){return{columns:12,min_columns:6}}render(){return c``}connectedCallback(){super.connectedCallback(),K(this)}disconnectedCallback(){O(this),super.disconnectedCallback(),this.shadowRoot?.querySelectorAll("dialog[open]").forEach(i=>i.close())}updated(){this.setAttribute("lang",this._de?.()?"de":"en")}};customElements.get("vacuum-dock-card")||customElements.define("vacuum-dock-card",Y);window.customCards=window.customCards||[];window.customCards.some(t=>t.type==="vacuum-dock-card")||window.customCards.push({type:"vacuum-dock-card",name:"Vacuum Dock Card",description:"Touch-friendly vacuum and dock controls with a visual setup assistant.",preview:!0});export{Y as VacuumDockCard};
