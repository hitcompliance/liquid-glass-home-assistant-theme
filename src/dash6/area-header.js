import {LitElement,html,css} from 'lit';
import {bindThemePreferences,unbindThemePreferences} from './material.js';
class AreaHeader extends LitElement{
 static properties={hass:{attribute:false},_config:{state:true},_now:{state:true}};
 static styles=css`:host{display:block;min-width:0}ha-card{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 18px;height:var(--dash6-area-header-height,94px);min-height:var(--dash6-area-header-height,94px);box-sizing:border-box;background:var(--dash5-inner-background);border:var(--dash5-inner-border);border-radius:var(--dash5-card-radius,16px)!important;box-shadow:var(--dash5-inner-shadow);backdrop-filter:var(--dash5-inner-filter);-webkit-backdrop-filter:var(--dash5-inner-filter)}h1,time{margin:0;font-size:42px;font-weight:600;line-height:1.08;letter-spacing:-.025em}h1{min-width:0;overflow-wrap:anywhere}.clock{text-align:right;flex:none}time{display:block;font-variant-numeric:tabular-nums}small{display:block;font-size:14px;line-height:19px;margin-top:3px;color:var(--secondary-text-color)}@media(max-width:599px){ha-card{height:var(--dash6-area-header-mobile-height,76px);min-height:var(--dash6-area-header-mobile-height,76px);padding:12px 54px 12px 14px;gap:10px}h1{font-size:28px}time{font-size:28px}small{font-size:11px;line-height:15px}}`;
 setConfig(c){this._config=c;}
 static getConfigElement(){const e=document.createElement('dash6-basic-editor');e.schema=[{name:'title',label:'Bereichsname',selector:{text:{}}},{name:'time_zone',label:'Zeitzone',selector:{text:{}}},{name:'show_clock',label:'Uhr und Datum anzeigen',selector:{boolean:{}}}];return e;}
 connectedCallback(){super.connectedCallback();bindThemePreferences(this);this._now=new Date();this._timer=setInterval(()=>this._now=new Date(),1000);}
 disconnectedCallback(){clearInterval(this._timer);unbindThemePreferences(this);super.disconnectedCallback();}
 getCardSize(){return 1;}
 render(){const date=this._now||new Date(),locale=this.hass?.locale?.language||'de',options={timeZone:this._config?.time_zone||'Europe/Berlin'};return html`<ha-card><h1>${this._config?.title||'Wohnzimmer'}</h1>${this._config?.show_clock!==false?html`<div class="clock"><time>${new Intl.DateTimeFormat(locale,{...options,hour:'2-digit',minute:'2-digit',hour12:false}).format(date)}</time><small>${new Intl.DateTimeFormat(locale,{...options,weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'}).format(date)}</small></div>`:''}</ha-card>`;}
}
customElements.define('dash6-area-header',AreaHeader);
window.customCards??=[];window.customCards.push({type:'dash6-area-header',name:'DASH6 Bereichsheader',description:'Bereichsname mit rechtsbündiger Uhr und Datum.',preview:true});
