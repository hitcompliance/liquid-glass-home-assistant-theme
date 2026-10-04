import {surface} from '../dash6/material.js';
import {html} from 'lit';
import {idsFor,defaultsFor,planCleaning,dryingMinutes} from './config.js';
import NATIVE from './native.js';
import STYLES from './styles.css';
export function initialize(card,CONFIG){
  const ids = idsFor(CONFIG);
  card._ids = ids;
  card._busy = false;
  card._error = '';
  card._draft = defaultsFor(CONFIG,card.hass?.states||{});
  card._de = () => (CONFIG.language==='auto'?(card.hass?.locale?.language || card.hass?.language || navigator.language):CONFIG.language).startsWith('de');
  const tr = (de,en) => card._de() ? de : en;
  const get = id => card.hass?.states[id];
  const valid = id => get(id) && !['unknown','unavailable'].includes(get(id).state);
  const fmt = (id,state) => {const obj=get(id);return obj ? (card.hass.formatEntityState?.(state===undefined?obj:{...obj,state}) ?? (state??obj.state)) : tr('Unbekannt','Unknown');};
  const more = id => {if(!id)return;card.shadowRoot?.querySelectorAll('dialog[open]').forEach(d=>d.close());card.dispatchEvent(new CustomEvent('hass-more-info',{detail:{entityId:id},bubbles:true,composed:true}));};
  card._perform = async operation => {
    if (card._busy) return;
    card._busy=true; card._error=''; card.requestUpdate();
    try {await operation();} catch(e) {card._error=e?.message || String(e);}
    finally {card._busy=false;card.requestUpdate();}
  };
  const call = (domain,service,data) => card.hass.callService(domain,service,data);
  card._setOption = async (id,option) => {
    if (!get(id)?.attributes.options?.includes(option)) throw new Error(tr('Nicht unterstützte Option: ','Unsupported option: ')+option);
    await call('select','select_option',{entity_id:id,option});
  };
  card._start = async (draft=defaultsFor(CONFIG,card.hass.states)) => {
    const commands=planCleaning(CONFIG,card.hass.states,draft);
    for(const [domain,service,data] of commands)await call(domain,service,data);
  };
  card._openCustom = () => {
    card._draft=defaultsFor(CONFIG,card.hass?.states||{});
    card._error='';card.requestUpdate();
    card.updateComplete.then(()=>card.shadowRoot.querySelector('.cleaning-dialog')?.showModal());
  };
  card._closeCustom = () => card.shadowRoot.querySelector('.cleaning-dialog')?.close();
  card._toggle = id => card._perform(()=>call('switch','toggle',{entity_id:id}));
  card._openDock = () => {card._dockPage='overview';card._error='';card.requestUpdate();card.updateComplete.then(()=>card.shadowRoot.querySelector('.dock-dialog').showModal());};
  card._closeDock = () => card.shadowRoot.querySelector('.dock-dialog')?.close();
  card._dockPage = 'overview';
  card._intermediateWash = () => card._perform(()=>call('switch','turn_on',{entity_id:ids.washing}));
  const svg = document.createElement('div');
  svg.className='animation-fallback';
  svg.attachShadow({mode:'open'}).innerHTML='<style>'+NATIVE.css+'</style><div class="container idle">'+NATIVE.svg+'</div>';
  const fallbackContainer=svg.shadowRoot.querySelector('.container');
  card._nativeAnimation = null;
  card._animation = stateObj => {
    if(customElements.get('ha-state-control-vacuum-status')) {
      if(!card._nativeAnimation) card._nativeAnimation=document.createElement('ha-state-control-vacuum-status');
      card._nativeAnimation.stateObj=stateObj;
      return card._nativeAnimation;
    }
    const state=['cleaning','returning','docked','paused','error'].includes(stateObj.state)?stateObj.state:'idle';
    fallbackContainer.className='container '+state;
    const kind=['cleaning','returning'].includes(state)?'active':'inactive';
    fallbackContainer.style.setProperty('--vacuum-color',`var(--state-vacuum-${state}-color,var(--state-vacuum-${kind}-color,var(--state-${kind}-color)))`);
    return svg;
  };
  const icon = (name,color) => html`<ha-icon .icon=${name} style=${color?'color:'+color:''}></ha-icon>`;
  const action = (label,name,fn,disabled=false) => html`<button type="button" class="action" ?disabled=${disabled||card._busy} @click=${fn}>${icon(name)}<span>${label}</span></button>`;
  const optionLabels = id => (get(id)?.attributes.options||[]).filter(o=>o!=='unknown');
  const stateChip = (id,label,ico,problem=false,compact=false) => {
    if(!id)return '';
    const state=get(id)?.state, known=['on','off'].includes(state);
    const color=!known?'var(--secondary-text-color)':problem?(state==='off'?'var(--green-color)':'var(--red-color)'):(state==='on'?'var(--green-color)':'var(--secondary-text-color)');
    const switchEntity=id.startsWith('switch.');
    let status=fmt(id),remaining='';
    if(id===ids.drying&&state==='on') {
      const minutes=dryingMinutes(get(ids.dryTime),CONFIG.drying_time_unit);
      if(minutes!==null){remaining=minutes>=60?Math.floor(minutes/60)+' h '+(minutes%60)+' min':minutes+' min';status=remaining;}
    }

    return html`<button type="button" class=${compact?'dock-icon-button':'chip dock-tile'} data-entity=${id} title=${label+': '+status} aria-label=${label+': '+status} aria-pressed=${switchEntity?String(state==='on'):'undefined'} ?disabled=${switchEntity&&(!known||card._busy)} @click=${()=>switchEntity?card._toggle(id):more(id)}>${icon(ico,color)}${compact?(remaining?html`<span class="dry-remaining">${remaining}</span>`:''):html`<span>${label}<small>${status}</small></span>`}</button>`;
  };
  const dockStatus = compact => html`
    ${stateChip(ids.drying,tr('Mopp-Trocknung','Mop drying'),'mdi:weather-windy',false,compact)}
    ${stateChip(ids.washing,tr('Mopp-Wäsche','Mop washing'),'mdi:waves',false,compact)}
    ${stateChip(ids.emptying,tr('Staubentleerung','Dust emptying'),'mdi:delete-empty',false,compact)}
    ${stateChip(ids.cleanWater,tr('Frischwassertank','Clean water tank'),'mdi:water-check',true,compact)}
    ${stateChip(ids.dirtyWater,tr('Schmutzwassertank','Dirty water tank'),'mdi:water-alert',true,compact)}`;
  card._renderDock = () => {
    const choosing=card._dockPage==='mode';
    const modeIcons={smart:'mdi:creation',light:'mdi:fan-speed-1',balanced:'mdi:fan-speed-2',max:'mdi:fan-speed-3'};
    return html`<dialog class="custom-dialog dock-dialog" aria-label=${tr('Basisstation','Dock')} @click=${e=>{const r=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))card._closeDock();}}>
      <div class="dialog-header"><div class="dock-heading">${choosing?html`<button type="button" class="close" aria-label=${tr('Zurück','Back')} @click=${()=>{card._dockPage='overview';card.requestUpdate();}}>${icon('mdi:arrow-left')}</button>`:html`<div class="dock-heading-icon">${icon('mdi:robot-vacuum')}</div>`}<div><div class="dialog-subtitle">${(CONFIG.name||get(ids.vacuum)?.attributes.friendly_name||tr('Staubsauger','Vacuum'))+' · '+tr('Basisstation','Dock')}</div><h2>${choosing?tr('Entleerungsmodus','Emptying mode'):tr('Basisstation','Dock')}</h2></div></div><button type="button" class="close" aria-label=${tr('Schließen','Close')} @click=${card._closeDock}>${icon('mdi:close')}</button></div>
      <div class="dialog-body">${choosing?html`<p class="dock-hint">${tr('Antippen, um den Entleerungsmodus zu ändern.','Tap to change the emptying mode.')}</p><div class="empty-mode-grid">${optionLabels(ids.emptyMode).map(v=>html`<button type="button" class="choice-tile" data-empty-mode=${v} aria-pressed=${String(get(ids.emptyMode)?.state===v)} ?disabled=${card._busy||!valid(ids.emptyMode)} @click=${()=>card._perform(async()=>{await card._setOption(ids.emptyMode,v);card._dockPage='overview';})}>${icon(modeIcons[v]||'mdi:tune')}<span>${fmt(ids.emptyMode,v)}</span>${get(ids.emptyMode)?.state===v?html`<ha-icon class="selected-mark" .icon=${'mdi:check-circle'}></ha-icon>`:''}</button>`)}</div>`:html`<div class="dock-grid">${dockStatus(false)}${ids.emptyMode?html`<button type="button" class="chip dock-tile mode-tile" @click=${()=>{card._dockPage='mode';card.requestUpdate();}}>${icon('mdi:tune-variant','var(--primary-color)')}<span>${tr('Entleerungsmodus','Emptying mode')}<small>${fmt(ids.emptyMode)}</small></span>${icon('mdi:chevron-right')}</button>`:''}</div>`}
      ${card._error?html`<p class="error" role="alert">${card._error}</p>`:''}</div>
    </dialog>`;
  };

  const choiceIcons = {
    mode:{vacuum:'mdi:vacuum',vac_and_mop:'mdi:water-sync',mop:'mdi:water'},
    intensity:{off:'mdi:water-off',slight:'mdi:water-outline',low:'mdi:water-minus',medium:'mdi:water',moderate:'mdi:water-check',high:'mdi:water-plus',extreme:'mdi:waves'},
    route:{standard:'mdi:routes',deep:'mdi:layers',deep_plus:'mdi:layers-triple',fast:'mdi:fast-forward',smart_mode:'mdi:creation',custom:'mdi:tune'},
    fan:{quiet:'mdi:volume-low',balanced:'mdi:fan-speed-1',turbo:'mdi:fan-speed-2',max:'mdi:fan-speed-3',max_plus:'mdi:fan-plus'}
  };
  card._renderCustom = () => {
    const d=card._draft;
    const choose=(key,value)=>{d[key]=value;card.requestUpdate();};
    const tile=(key,value,label,ico,selected,fn,disabled=false)=>html`<button type="button" class="choice-tile" data-param=${key} data-value=${String(value)} aria-pressed=${String(selected)} ?disabled=${disabled||card._busy} @click=${fn}>${icon(ico)}<span>${label}</span>${selected?html`<ha-icon class="selected-mark" .icon=${'mdi:check-circle'}></ha-icon>`:''}</button>`;
    const group=(key,label,values,labelFor,disabled=false)=>values.length?html`<fieldset class="choice-group"><legend>${label}</legend><div class="choice-grid">${values.map(value=>tile(key,value,labelFor(value),choiceIcons[key]?.[value]||'mdi:tune',d[key]===value,()=>choose(key,value),disabled))}</div></fieldset>`:'';
    const roomIcons={};
    
    const rooms=CONFIG.areas;
    return html`<dialog class="custom-dialog cleaning-dialog" aria-label=${tr('Reinigung starten','Start cleaning')} @click=${e=>{const r=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))card._closeCustom();}}>
      <div class="dialog-header"><div><div class="dialog-subtitle">${get(ids.vacuum)?.attributes.friendly_name||tr('Staubsauger','Vacuum')}</div><h2>${tr('Reinigung starten','Start cleaning')}</h2></div><button type="button" class="close" aria-label=${tr('Schließen','Close')} @click=${card._closeCustom}>${icon('mdi:close')}</button></div>
      <div class="dialog-body">
        ${rooms.length?html`<fieldset class="choice-group"><legend>${tr('Räume','Rooms')}<small>${tr('Mehrfachauswahl','Select multiple')}</small></legend><div class="room-grid">${rooms.map(a=>{const room=card.hass.areas?.[a.area_id],n=a.roborock_area_id;return tile('rooms',n,a.name||room?.name||a.area_id,a.icon||room?.icon||roomIcons[a.area_id]||'mdi:floor-plan',d.rooms.includes(n),()=>{d.rooms=d.rooms.includes(n)?d.rooms.filter(x=>x!==n):[...d.rooms,n];card.requestUpdate();});})}</div></fieldset>`:''}
        ${group('mode',tr('Reinigungsmodus','Cleaning mode'),optionLabels(ids.mode),v=>fmt(ids.mode,v),get(ids.mode)?.state==='unavailable')}
        ${group('intensity',tr('Wisch-Intensität','Mop intensity'),optionLabels(ids.intensity),v=>fmt(ids.intensity,v),d.mode==='vacuum'||get(ids.intensity)?.state==='unavailable')}
        ${group('route',tr('Wisch-Modus','Mop route'),optionLabels(ids.route),v=>fmt(ids.route,v),d.mode==='vacuum'||get(ids.route)?.state==='unavailable')}
        ${group('fan',tr('Saugstufe','Suction power'),(get(ids.vacuum)?.attributes.fan_speed_list||[]).filter(v=>!['off','custom','smart_mode'].includes(v)),v=>card.hass.formatEntityAttributeValue?.(get(ids.vacuum),'fan_speed',v)||v,d.mode==='mop')}
        ${rooms.length?html`<fieldset class="choice-group"><legend>${tr('Durchgänge','Cycles')}</legend><div class="choice-grid">${[1,2,3].map(v=>tile('repeat',v,v+' ×','mdi:repeat',d.repeat===v,()=>choose('repeat',v)))}</div></fieldset>`:''}
        ${card._error?html`<p class="error" role="alert">${card._error}</p>`:''}
      </div>
      <div class="dialog-actions"><span class="selection-summary">${d.rooms.length?tr(d.rooms.length===1?'1 Raum ausgewählt':d.rooms.length+' Räume ausgewählt',d.rooms.length===1?'1 room selected':d.rooms.length+' rooms selected'):(CONFIG.areas.length?tr('Bitte Räume auswählen','Select rooms to continue'):tr('Gesamte Wohnung','Whole home'))}</span>${action(tr('Reinigung starten','Start cleaning'),'mdi:play',()=>card._perform(async()=>{await card._start({...d,rooms:[...d.rooms]});card._closeCustom();}),CONFIG.areas.length>0&&!d.rooms.length)}</div>
    </dialog>`;
  };
  card.render = function() {
    if(!this.hass)return html``;if(!get(ids.vacuum))return html`<ha-card><p class="error">${tr('Entität nicht gefunden: ','Entity not found: ')}${ids.vacuum}</p></ha-card>`;
    const robot=get(ids.vacuum),st=robot.state;
    const cleaning=st==='cleaning',active=['cleaning','paused','returning'].includes(st);
    const unavailable=['unknown','unavailable'].includes(st);
    const progress=get(ids.progress),progressKnown=progress&&!['unknown','unavailable'].includes(progress.state)&&Number.isFinite(Number(progress.state));
    const current=Number(progress?.state)||0;
    const stats=CONFIG.stats[cleaning?'cleaning':'default'].filter(s=>s.entity!==ids.progress);
    const hasDock=[ids.drying,ids.washing,ids.emptying,ids.cleanWater,ids.dirtyWater,ids.emptyMode].some(Boolean);
    const supported=(bit)=>(Number(robot.attributes.supported_features||0)&bit)!==0;
    const battery=get(ids.battery);const batteryValue=battery?fmt(ids.battery):(Number.isFinite(robot.attributes.battery_level)?robot.attributes.battery_level+' %':null);
    return html`<style>${STYLES+surface}</style><ha-card>
      <header><button class="title-button" type="button" @click=${()=>more(ids.vacuum)}><ha-state-icon .hass=${this.hass} .stateObj=${robot}></ha-state-icon><strong>${CONFIG.name||robot.attributes.friendly_name||tr('Staubsauger','Vacuum')}</strong></button>${hasDock?html`<div class="dock-mini" role="group" aria-label=${tr('Basisstation Schnellsteuerung','Dock quick controls')}>${dockStatus(true)}</div>`:''}</header>
      <section class="status-panel"><div class="status-title">${fmt(ids.vacuum)}</div><div class="status-meta"><ha-relative-time .hass=${this.hass} .datetime=${robot.last_changed} capitalize></ha-relative-time>${batteryValue!==null?html`<button class="battery" @click=${()=>more(ids.battery||ids.vacuum)}>${batteryValue}${battery?html`<ha-state-icon .hass=${this.hass} .stateObj=${battery}></ha-state-icon>`:icon('mdi:battery')}</button>`:''}</div><div class="robot-animation">${card._animation(robot)}</div></section>
      ${ids.progress?html`<div class="progress-row"><span>${tr('Reinigungsfortschritt','Cleaning progress')}</span><strong>${progressKnown?current.toLocaleString(card._de()?'de-DE':'en',{maximumFractionDigits:0})+' %':'—'}</strong><progress max="100" .value=${Math.max(0,Math.min(100,current))} aria-label=${tr('Reinigungsfortschritt','Cleaning progress')}></progress></div>`:''}
      <div class=${cleaning?'stats-grid cleaning-stats':'stats-grid'} style=${'--stats-columns:'+Math.max(1,Math.min(5,stats.length))}>${stats.map(s=>{const obj=get(s.entity),n=Number(obj?.state)/(s.divide_by||1),known=obj&&!['unknown','unavailable'].includes(obj.state)&&Number.isFinite(n);const labels={'Filter':'Filter','Seitenbürste':'Side brush','Hauptbürste':'Main brush','Sensoren':'Sensors','Schmutzfänger':'Strainer','Fortschritt':'Progress','Fläche':'Area','Dauer':'Duration'};return html`<button class="stat" @click=${()=>more(s.entity)}><strong>${known?n.toLocaleString(card._de()?'de-DE':'en',{maximumFractionDigits:s.scale??0}):'—'} ${s.unit??obj?.attributes.unit_of_measurement??''}</strong><span>${tr(s.title||obj?.attributes.friendly_name||s.entity,labels[s.title]||s.title||obj?.attributes.friendly_name||s.entity)}</span></button>`;})}</div>
      <div class="actions-row primary-actions">
      ${cleaning?action(tr('Stop','Stop'),'mdi:stop',()=>card._perform(()=>call('vacuum','stop',{entity_id:ids.vacuum}))):action(st==='paused'?tr('Fortsetzen','Resume'):tr('Start','Start'),'mdi:play',()=>card._perform(()=>st==='paused'?call('vacuum','start',{entity_id:ids.vacuum}):card._start()),unavailable||st==='returning')}
      ${action(tr('Individuell','Custom'),'mdi:tune',card._openCustom,unavailable)}
      </div><div class="actions-row secondary-actions">
      ${cleaning&&supported(4)?action(tr('Pause','Pause'),'mdi:pause',()=>card._perform(()=>call('vacuum','pause',{entity_id:ids.vacuum}))):''}
      ${active&&!cleaning?action(tr('Stop','Stop'),'mdi:stop',()=>card._perform(()=>call('vacuum','stop',{entity_id:ids.vacuum}))):''}
      ${st!=='docked'&&supported(16)?action(tr('Zur Basisstation','Return to dock'),'mdi:home-import-outline',()=>card._perform(()=>call('vacuum','return_to_base',{entity_id:ids.vacuum})),unavailable||st==='returning'):''}
      ${cleaning&&ids.washing?action(tr('Mopp-Zwischenreinigung','Wash mop during cleaning'),'mdi:waves',card._intermediateWash,!valid(ids.washing)):''}
      ${supported(512)?action(tr('Lokalisieren','Locate'),'mdi:map-marker',()=>card._perform(()=>call('vacuum','locate',{entity_id:ids.vacuum})),unavailable):''}
      </div>
      ${hasDock?html`<div class="dock-launcher-wrap"><button type="button" class="dock-launcher" @click=${card._openDock}><span class="dock-launcher-icon">${icon('mdi:robot-vacuum')}</span><span><strong>${tr('Basisstation','Dock')}</strong><small>${tr('Pflege & Einstellungen','Care & settings')}</small></span>${icon('mdi:chevron-right')}</button></div>`:''}
      ${card._error?html`<p class="error" role="alert">${card._error}</p>`:''}
      </ha-card>${card._renderCustom()}${card._renderDock()}`;
  };
}
