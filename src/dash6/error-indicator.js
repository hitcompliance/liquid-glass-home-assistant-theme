// The deadline belongs to the error occurrence, never to a card re-render.
export class ErrorNotice {
  constructor({timer=(fn,ms)=>setTimeout(fn,ms),clearTimer=handle=>clearTimeout(handle),now=Date.now,onChange=()=>{}}={}){Object.assign(this,{timer,clearTimer,now,onChange});this.message='';this.deadline=0;}
  show(error){this.clearTimer(this.handle);this.message=String(error?.message||error||'Unbekannter Fehler');this.deadline=this.now()+60000;this.handle=this.timer(()=>this.dismiss(),60000);this.handle?.unref?.();this.onChange();}
  dismiss(){this.clearTimer(this.handle);this.message='';this.deadline=0;this.onChange();}
}
const Base=globalThis.HTMLElement||class{};
export class ErrorIndicator extends Base {
 constructor(){super();if(!this.attachShadow)return;this.attachShadow({mode:'open'});this.notice=new ErrorNotice({onChange:()=>this.sync()});this.shadowRoot.innerHTML=`<style>
 :host{display:inline-flex;flex:none}:host([hidden]){display:none!important}
 button{font:inherit;cursor:pointer;touch-action:manipulation}.badge{width:44px;height:44px;min-width:44px;padding:0;background:transparent;border:0;border-radius:8px;color:#ff453a;font-size:28px;font-weight:750;line-height:1;box-shadow:none;filter:none;backdrop-filter:none;transform:none;transition:none}
 .badge:hover{outline:1px solid currentColor}.badge:focus-visible{outline:2px solid currentColor;outline-offset:2px}
 dialog{color:var(--primary-text-color,#fff);background:var(--card-background-color,#25272c);border:1px solid var(--divider-color,#64666b);border-radius:20px;padding:24px;width:min(480px,calc(100vw - 32px));box-sizing:border-box;max-height:calc(100dvh - 32px);overflow:auto;box-shadow:0 16px 48px #0008}
 dialog::backdrop{background:#0008}h2{font:600 20px system-ui;margin:0 0 16px}p{white-space:pre-wrap;overflow-wrap:anywhere;font:16px/1.5 system-ui;margin:0 0 24px}.confirm{display:block;margin-left:auto;min-height:44px;padding:8px 18px;border:1px solid var(--divider-color,#777);border-radius:12px;background:var(--dash6-button-background,#34373c);color:inherit}
 </style><button class="badge" type="button" aria-label="Fehlerdetails öffnen" title="Fehlerdetails öffnen">!</button><dialog aria-labelledby="error-title"><h2 id="error-title">Fehler</h2><p></p><button type="button" class="confirm">Bestätigen</button></dialog>`;
 this.dialog=this.shadowRoot.querySelector('dialog');this.shadowRoot.querySelector('.badge').onclick=e=>{e.stopPropagation();if(this.notice.message&&!this.dialog.open)this.dialog.showModal();};this.shadowRoot.querySelector('.confirm').onclick=e=>{e.stopPropagation();this.notice.dismiss();};this.dialog.addEventListener('click',e=>{e.stopPropagation();if(e.target===this.dialog){const r=this.dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)this.dialog.close();}});
 }
 show(error){this.notice.show(error);}
 sync(){this.hidden=!this.notice.message;this.shadowRoot.querySelector('p').textContent=this.notice.message;if(!this.notice.message&&this.dialog.open)this.dialog.close();}
 connectedCallback(){this.sync();if(this._wasOpen&&this.notice.message&&!this.dialog.open)this.dialog.showModal();this._wasOpen=false;}
 disconnectedCallback(){this._wasOpen=Boolean(this.dialog?.open);if(this._wasOpen)this.dialog.close();}
}
if(globalThis.customElements&&!customElements.get('dash6-error-indicator'))customElements.define('dash6-error-indicator',ErrorIndicator);
const indicators=new WeakMap();
export function errorIndicator(owner){let indicator=indicators.get(owner);if(!indicator){indicator=document.createElement('dash6-error-indicator');indicator.hidden=true;indicators.set(owner,indicator);}return indicator;}
export function reportError(owner,error){errorIndicator(owner).show(error);}
