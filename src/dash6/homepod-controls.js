import {inDashboardScope} from './scope.js';
// Keep the native HomePod card and its artwork; add transport and a glass volume row.
(() => {

 const track='linear-gradient(to right,rgba(255,255,255,0),rgba(255,255,255,1))';
 const sheet=new CSSStyleSheet();sheet.replaceSync(`
 :host([data-dash6-homepod]){display:block;min-width:0}
 :host([data-dash6-homepod]) ha-card{border-radius:16px!important;overflow:hidden!important}
 :host([data-dash6-homepod]) ha-card[data-pod-no-cover]{background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important}
 :host([data-dash6-homepod]) .no-image .color-block,:host([data-dash6-homepod]) .no-image .no-img,:host([data-dash6-homepod]) .no-image .color-gradient{background:transparent!important;background-image:none!important}
 :host([data-dash6-homepod]) .controls .start ha-icon-button[action^="media_"]{display:none!important}
 .dash6-pod-transport{display:flex;gap:8px;padding:0 12px 12px}
 .dash6-pod-transport button{flex:1;min-width:0;min-height:44px;border:var(--dash6-satin-card-border,1px solid rgba(255,255,255,.15));border-radius:10px;background:rgba(24,28,34,.32);color:var(--primary-text-color);cursor:pointer;touch-action:manipulation}
 .dash6-pod-transport button:disabled{opacity:.4;cursor:default}.dash6-pod-transport button:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
 .dash6-pod-transport button:active:not(:disabled){box-shadow:inset 0 7px 12px rgba(0,0,0,.9),inset 0 -1px 1px rgba(255,255,255,.3)}
 @media(hover:hover){.dash6-pod-transport button:hover:not(:disabled){background:linear-gradient(145deg,rgba(255,255,255,.14),transparent 65%),rgba(24,28,34,.32)}}
 .dash6-pod-volume{margin:8px 12px 0;min-width:0;opacity:1}.dash6-pod-volume[data-off]{opacity:.5}
 .dash6-pod-label{display:none;justify-content:space-between;align-items:center;gap:8px;font:13px/20px var(--paper-font-body1_-_font-family,system-ui)}
 .dash6-pod-range{position:relative;margin-top:0;min-width:0;--dash6-slider-opacity:1}
 .dash6-pod-range input{appearance:none;-webkit-appearance:none;display:block;box-sizing:border-box;width:100%;height:42px;margin:0;border:0;border-radius:11px;cursor:ew-resize;touch-action:pan-y;background:var(--dash6-satin-slider-gloss),var(--track);box-shadow:var(--dash6-satin-control-shadow);color:inherit}
 .dash6-pod-range input::-webkit-slider-runnable-track{height:42px;background:transparent;border-radius:11px}
 .dash6-pod-range input::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:22px;height:42px;background:transparent;border:0;box-shadow:none}
 .dash6-pod-range input::-moz-range-track{height:42px;background:transparent}.dash6-pod-range input::-moz-range-thumb{width:22px;height:38px;background:transparent;border:0;box-shadow:none}
 .dash6-pod-range input:focus-visible{outline:2px solid var(--primary-color);outline-offset:2px}
 .dash6-pod-error{font:13px/20px system-ui;color:var(--error-color);margin-top:4px}.dash6-pod-error:empty{display:none}
 @media(pointer:coarse){.dash6-pod-range input,.dash6-pod-range input::-webkit-slider-runnable-track,.dash6-pod-range input::-webkit-slider-thumb{height:44px}}
 `);
 const inScope=()=>inDashboardScope();
 customElements.whenDefined('hui-media-control-card').then(()=>{
  const proto=customElements.get('hui-media-control-card').prototype;if(proto._homePodControlsV1)return;proto._homePodControlsV1=true;
  const updated=proto.updated,disconnect=proto.disconnectedCallback;
  const sync=function(){
   const id=this._config?.entity,hass=this.hass||this._hass,root=this.shadowRoot;
   if(!root)return;
   if(!inScope()||getComputedStyle(this).getPropertyValue('--dash6-satin-enabled').trim()!=='1'||!/homepod/i.test(id+' '+(hass?.states[id]?.attributes.friendly_name||''))){this._podCancel?.();const old=root.querySelector('ha-card');if(old?.hasAttribute('data-pod-no-cover')){old.removeAttribute('data-pod-no-cover');old.style.removeProperty('background');}root.querySelector('.dash6-pod-transport')?.remove();root.querySelector('.dash6-pod-volume')?.remove();this.removeAttribute('data-dash6-homepod');return;}
   const card=root.querySelector('ha-card'),state=hass?.states[id];if(!card||!state)return;
   this.setAttribute('data-dash6-homepod','');
   if(!root.adoptedStyleSheets.includes(sheet))root.adoptedStyleSheets=[...root.adoptedStyleSheets,sheet];
   const hasCover=!!state.attributes.entity_picture;
   card.toggleAttribute('data-pod-no-cover',!hasCover);
   if(!hasCover){card.style.setProperty('background','transparent','important');card.removeAttribute('data-dash6-satin-surface');}else card.style.removeProperty('background');
   let transport=root.querySelector('.dash6-pod-transport');
   if(!transport){
    transport=document.createElement('div');transport.className='dash6-pod-transport';transport.setAttribute('role','group');transport.setAttribute('aria-label','HomePod Wiedergabe');
    for(const [action,label,glyph]of [['media_previous_track','Zurück','mdi:skip-previous'],['media_play_pause','Wiedergabe','mdi:play'],['media_next_track','Vor','mdi:skip-next']]){
     const b=document.createElement('button');b.type='button';b.dataset.action=action;b.setAttribute('aria-label',label);b.title=label;const icon=document.createElement('ha-icon');icon.setAttribute('icon',glyph);b.append(icon);b.onclick=event=>{event.stopPropagation();this._podService(action);};transport.append(b);
    }
    card.append(transport);
   }
   const unavailable=['unknown','unavailable'].includes(state.state),off=['off','standby'].includes(state.state),playing=state.state==='playing';
   for(const b of transport.children)b.disabled=unavailable||off&&b.dataset.action!=='media_play_pause';
   const play=transport.querySelector('[data-action="media_play_pause"]');play.setAttribute('aria-label',playing?'Pause':'Wiedergabe');play.title=playing?'Pause':'Wiedergabe';play.firstChild.setAttribute('icon',playing?'mdi:pause':'mdi:play');
   let volume=root.querySelector('.dash6-pod-volume');
   if(!volume){
    volume=document.createElement('section');volume.className='dash6-pod-volume';volume.setAttribute('aria-label','HomePod Lautstärke');
    const label=document.createElement('div');label.className='dash6-pod-label';const text=document.createElement('span');text.textContent='Lautstärke';const output=document.createElement('output');label.append(text,output);
    const range=document.createElement('div');range.className='dash6-pod-range';range.style.setProperty('--track',track);
    const input=document.createElement('input');input.type='range';input.min='0';input.max='100';input.step='1';input.setAttribute('aria-label','Lautstärke');input.style.setProperty('--track',track);
    const lens=document.createElement('dash6-slider-lens');range.append(input,lens);volume.append(label,range);const error=document.createElement('div');error.className='dash6-pod-error';error.setAttribute('role','alert');volume.append(error);root.append(volume);
    const display=()=>{output.textContent=input.value+' %';input.setAttribute('aria-valuetext',output.textContent);};
    const commit=()=>{const value=Number(input.value)/100;this._podLastVolume=value;this._podService('volume_set',{volume_level:value});};
    const cancel=()=>{if(!this._podDragging)return;input.value=this._podStart;display();input.dispatchEvent(new Event('input'));this._podDragging=false;this._podCanceled=true;clean();};
    const clean=()=>{window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',cancel,true);};
    const up=event=>{if(event.pointerId!==this._podPointer)return;requestAnimationFrame(()=>{if(!this._podDragging)return;const changed=input.value!==this._podStart;this._podDragging=false;clean();if(changed)commit();});};
    input.addEventListener('pointerdown',event=>{if(input.disabled||event.button!==0)return;this._podDragging=true;this._podCanceled=false;this._podPointer=event.pointerId;this._podStart=input.value;window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',cancel,true);});
    input.addEventListener('keydown',()=>{this._podCanceled=false;});input.addEventListener('input',display);input.addEventListener('change',()=>{if(!this._podDragging&&!this._podCanceled)commit();});input.addEventListener('blur',()=>{cancel();this._podCanceled=false;});this._podCancel=cancel;
   }
   volume.toggleAttribute('data-off',off);const input=volume.querySelector('input'),output=volume.querySelector('output');input.disabled=unavailable;
   const raw=state.attributes.volume_level,known=typeof raw==='number'&&Number.isFinite(raw);if(known)this._podLastVolume=Math.max(0,Math.min(1,raw));
   if(!this._podDragging){const value=this._podLastVolume;input.value=String(Math.round((value??0)*100));output.textContent=value===undefined?'—':input.value+' %';input.setAttribute('aria-valuetext',value===undefined?'Nicht verfügbar':output.textContent);volume.querySelector('dash6-slider-lens').update?.();}
  };
  proto._podService=async function(action,data={}){try{this.shadowRoot.querySelector('.dash6-pod-error').textContent='';await (this.hass||this._hass).callService('media_player',action,{entity_id:this._config.entity,...data});}catch(error){this.shadowRoot.querySelector('.dash6-pod-error').textContent=error.message||String(error);}};
  proto.updated=function(...args){const result=updated?.apply(this,args);sync.call(this);return result;};
  proto.disconnectedCallback=function(...args){this._podCancel?.();return disconnect?.apply(this,args);};
 });
})();
