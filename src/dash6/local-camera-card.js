import {LitElement,html,css} from 'lit';
import {surface,bindThemePreferences,unbindThemePreferences} from './material.js';
import {errorIndicator,reportError} from './error-indicator.js';

class LocalCameraCard extends LitElement {
 static properties={hass:{attribute:false},_config:{state:true},_stream:{state:true},_busy:{state:true},_devices:{state:true},_device:{state:true},_error:{state:true}};
 static styles=css`:host{display:block;min-width:0}ha-card{overflow:hidden}header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px}h2{font-size:18px;font-weight:600;margin:0}.preview{position:relative;aspect-ratio:16/9;display:grid;place-items:center;background:rgba(0,0,0,.22);overflow:hidden}video{width:100%;height:100%;object-fit:contain;display:block}.placeholder{display:grid;justify-items:center;gap:10px;color:var(--secondary-text-color)}.placeholder ha-icon{--mdc-icon-size:42px}.controls{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px}.controls button{min-height:44px;padding:8px 14px;color:var(--primary-text-color);cursor:pointer}.controls button:disabled{opacity:.5;cursor:wait}select{max-width:100%;min-height:44px;padding:8px;border-radius:12px;background:var(--dash6-control-background);color:var(--primary-text-color);border:var(--dash5-inner-border)}p{margin:0;padding:0 16px 14px;color:var(--secondary-text-color);font-size:13px;line-height:1.5}.live{color:var(--success-color)}`;
 setConfig(config){this._config=config;}
 static getConfigElement(){const editor=document.createElement('dash6-basic-editor');editor.schema=[{name:'name',label:'Name',selector:{text:{}}},{name:'facing_mode',label:'Bevorzugte Kamera',selector:{select:{options:[{value:'user',label:'Frontkamera / Onboard'},{value:'environment',label:'Rückkamera'}]}}}];return editor;}
 connectedCallback(){super.connectedCallback();bindThemePreferences(this);this._visibility=()=>{if(document.visibilityState==='hidden')this.stop();};document.addEventListener('visibilitychange',this._visibility);this._path=location.pathname;this._route=()=>{if(location.pathname!==this._path)this.stop();};window.addEventListener('location-changed',this._route);window.addEventListener('popstate',this._route);}
 disconnectedCallback(){this.stop();document.removeEventListener('visibilitychange',this._visibility);window.removeEventListener('location-changed',this._route);window.removeEventListener('popstate',this._route);unbindThemePreferences(this);super.disconnectedCallback();}
 async start(deviceId){
  if(this._busy)return;
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia){reportError(this,new Error('Die Gerätekamera benötigt HTTPS und einen Browser mit Kamera-Unterstützung. Bitte eine HTTPS-Adresse deiner Home-Assistant-Instanz verwenden.'));return;}
  this.stop();const token=this._requestToken;this._busy=true;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:deviceId?{deviceId:{exact:deviceId}}:{facingMode:{ideal:this._config?.facing_mode||'user'},width:{ideal:1280},height:{ideal:720}}});
   if(token!==this._requestToken||!this.isConnected){stream.getTracks().forEach(track=>track.stop());return;}
   this._stream=stream;this._error='';this._device=stream.getVideoTracks()[0]?.getSettings?.().deviceId||deviceId||'';
   stream.getVideoTracks().forEach(track=>track.addEventListener('ended',()=>{if(this._stream===stream)this.stop();},{once:true}));
   await this.updateComplete;const video=this.shadowRoot.querySelector('video');if(video&&this._stream===stream){video.srcObject=stream;await video.play();}
   try{this._devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput');}catch{this._devices=[];}
  }catch(error){if(token===this._requestToken){this.stop();const message={NotAllowedError:'Der Kamerazugriff wurde nicht erlaubt.',NotFoundError:'Auf diesem Gerät wurde keine Kamera gefunden.',NotReadableError:'Die Kamera ist bereits belegt oder kann nicht geöffnet werden.',OverconstrainedError:'Die ausgewählte Kamera ist nicht verfügbar.'}[error.name]||error.message;reportError(this,new Error(message));}}
  finally{if(token===this._requestToken)this._busy=false;}
 }
 stop(){this._requestToken=(this._requestToken||0)+1;this._stream?.getTracks().forEach(track=>track.stop());this._stream=null;this._busy=false;const video=this.shadowRoot?.querySelector('video');if(video)video.srcObject=null;}
 getCardSize(){return 5;}
 render(){return html`<style>${surface}</style><ha-card><header><h2>${this._config?.name||'Kamera dieses Geräts'}</h2>${this._stream?html`<span class="live">● Aktiv</span>`:''}${errorIndicator(this)}</header><div class="preview">${this._stream?html`<video autoplay muted playsinline aria-label="Lokales Kamerabild"></video>`:html`<div class="placeholder"><ha-icon icon="mdi:camera-off-outline"></ha-icon><span>Kamera ausgeschaltet</span></div>`}</div><div class="controls"><button ?disabled=${this._busy} @click=${()=>this._stream?this.stop():this.start()}>${this._busy?'Kamera wird geöffnet …':this._stream?'Kamera ausschalten':'Kamera einschalten'}</button>${this._devices?.length>1?html`<select aria-label="Gerätekamera auswählen" .value=${this._device||''} ?disabled=${this._busy} @change=${e=>this.start(e.target.value)}>${this._devices.map((device,i)=>html`<option value=${device.deviceId}>${device.label||'Kamera '+(i+1)}</option>`)}</select>`:''}</div><p>Lokales Bild dieses Browsers · ohne Mikrofon. Beim Verlassen der Ansicht oder Wechseln in den Hintergrund wird die Kamera ausgeschaltet.</p></ha-card>`;}
}
customElements.define('dash6-local-camera-card',LocalCameraCard);
window.customCards??=[];window.customCards.push({type:'dash6-local-camera-card',name:'DASH6 Gerätekamera',description:'Lokale Onboard-/Webcam-Vorschau mit ausdrücklichem Start, ohne Übertragung und ohne Mikrofon.',preview:true});
