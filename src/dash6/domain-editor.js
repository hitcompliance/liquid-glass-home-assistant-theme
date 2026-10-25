import {scopedCustomElements as customElements} from './scoped-elements.js';
import {LitElement,html,css} from 'lit';
import './external-editor.js';
import {extractEntityReferences,domainCards,domainRegistrySnapshot} from './domain-registry.js';
import {watchDomainRoom,localRoomData} from './domain-room-data.js';
const copy=value=>structuredClone(value);
export class DomainEditor extends LitElement{
 static properties={hass:{attribute:false},_config:{state:true},_selected:{state:true},_error:{state:true},_formArea:{state:true}};
 static styles=css`:host{display:block;min-width:0}p{color:var(--secondary-text-color)}.cards,.add,.tools{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}button,select{min-height:44px;max-width:100%;border-radius:10px;border:1px solid var(--divider-color);background:var(--card-background-color);color:var(--primary-text-color);padding:8px;cursor:pointer}button[aria-pressed=true]{background:var(--primary-color);color:var(--text-primary-color)}select{flex:1}.error{color:var(--error-color)}.ids{font-size:12px;overflow-wrap:anywhere}`;
 setConfig(config){this._config=copy(config);this._selected=null;this._error='';this._resolveArea();}
 connectedCallback(){super.connectedCallback();this._watchAreas();}
 disconnectedCallback(){super.disconnectedCallback();this._stopAreas?.();this._stopAreas=null;this._areaConnection=null;this._areaData=null;}
 _resolveArea(){
  const area=this._config?.area,areas=[...(this._areaData?.areas||[]),...localRoomData(this.hass).areas],entry=areas.find(value=>value.area_id===area||value.id===area)||areas.find(value=>value.name===area);
  // Only the selector's display value is normalized. The source YAML remains
  // untouched until a user changes a form field and explicitly saves the draft.
  this._formArea=entry?.area_id||entry?.id||area;
 }
 _watchAreas(){
  if(!this.hass||!this.isConnected)return;const connection=this.hass.connection?.__dash6ActualConnection||this.hass.connection;
  if(this._stopAreas&&connection===this._areaConnection){this._resolveArea();return;}
  this._stopAreas?.();this._areaData=null;this._areaConnection=connection;
  this._stopAreas=watchDomainRoom(this.hass,(data,error)=>{if(error)return;this._areaData=data;this._resolveArea();});
 }
 emit(config){this._config=copy(config);this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:copy(this._config)},bubbles:true,composed:true}));}
 change(patch){this.emit({...this._config,...copy(patch)});}
 entries(){
  const rows=[];
  const visit=(value,path)=>{if(!value||typeof value!=='object')return;if(value.type&&value.type!=='heading'){
   if(Array.isArray(value.cards)&&['vertical-stack','horizontal-stack','grid','custom:vertical-stack-in-card','custom:dash6-stack-card'].includes(value.type)){value.cards.forEach((card,index)=>visit(card,[...path,'cards',index]));return;}
   rows.push({card:value,path});return;
  }};
  for(const group of ['cards','custom_cards'])(this._config?.[group]||[]).forEach((card,index)=>visit(card,[group,index]));return rows;
 }
 replace(path,card,remove=false){const config=copy(this._config);let target=config;for(const key of path.slice(0,-1))target=target[key];if(remove)target.splice(path.at(-1),1);else target[path.at(-1)]=copy(card);this.change(config);if(remove)this._selected=null;}
 templates(){return [...(this._config?.templates||[]),{name:'Native Kachel',card:{type:'tile'}},{name:'Native Mediensteuerung',card:{type:'media-control'}},{name:'Thermostat',card:{type:'thermostat'}},...(window.customCards||[]).filter(card=>card.type!=='dash6-domain-card'&&card.type!=='dash6-domain-grid').map(card=>({name:card.name||card.type,type:card.type}))];}
 async add(index){
  const template=this.templates()[Number(index)];if(!template)return;
  try{
   let card=template.card&&copy(template.card);
   if(!card){const type=template.type.startsWith('custom:')?template.type:'custom:'+template.type,tag=type.replace('custom:',''),Constructor=customElements.get(tag);card=copy(await Constructor?.getStubConfig?.(this.hass)||{type});card.type=type;}
   const cards=[...(this._config.custom_cards||[]),card];this.change({custom_cards:cards});this._selected=['custom_cards',cards.length-1];this._error='';
  }catch(error){this._error=error.message||String(error);}
 }
 async select(path){
  this._selected=path;await this.updateComplete;
  const row=this.entries().find(row=>JSON.stringify(row.path)===JSON.stringify(path)),editor=this.renderRoot.querySelector('dash6-external-editor');if(row&&editor){editor.hass=this.hass;editor.setConfig(row.card);}
 }
 updated(changes){if(changes.has('hass'))this._watchAreas();if(changes.has('_config'))this._resolveArea();const editor=this.renderRoot.querySelector('dash6-external-editor');if(editor){editor.hass=this.hass;const row=this.entries().find(row=>JSON.stringify(row.path)===JSON.stringify(this._selected));if(row&&editor.__domainKey!==JSON.stringify(row.card)){editor.__domainKey=JSON.stringify(row.card);editor.setConfig(row.card);}}}
 render(){
  const c=this._config;if(!c)return html``;
  const selected=this.entries().find(row=>JSON.stringify(row.path)===JSON.stringify(this._selected));
  return html`<ha-form .hass=${this.hass} .data=${{columns:2,show_heading:true,auto_entities:true,heading:'',...c,area:this._formArea??c.area}} .schema=${[{name:'heading',label:'Abschnittsüberschrift',selector:{text:{}}},{name:'show_heading',label:'Überschrift anzeigen (auch bei leerem Abschnitt)',selector:{boolean:{}}},{name:'area',label:'Raum / Bereich',selector:{area:{}}},{name:'domain',label:'Domain (z. B. light, sensor, switch)',selector:{text:{}}},{name:'auto_entities',label:'Weitere passende Raum-Entities dynamisch anzeigen',selector:{boolean:{}}},{name:'columns',label:'Spalten',selector:{number:{min:1,max:10,mode:'box'}}},{name:'exclude_integrations',label:'Integrationen ausschließen (Kennung)',selector:{select:{multiple:true,custom_value:true,options:['tado','tado_hijack']}}},{name:'exclude_device_classes',label:'Geräteklassen ausschließen',selector:{select:{multiple:true,custom_value:true,options:['energy','power','humidity','temperature','battery']}}},{name:'exclude_entities',label:'Einzelne Entities nur aus diesem Abschnitt ausschließen',selector:{entity:{multiple:true}}}]} .computeLabel=${field=>field.label} @value-changed=${event=>{event.stopPropagation();this.change(event.detail.value);}}></ha-form>
  <p>Eigene Karten stehen vor der dynamischen Liste. Deren Haupt- und Hilfs-Entities werden automatisch in allen Domain-Listen dieser Raumansicht ausgeschlossen.</p>
  <div class="cards">${this.entries().map((row,index)=>html`<button aria-pressed=${JSON.stringify(row.path)===JSON.stringify(this._selected)} @click=${()=>this.select(row.path)}>${row.card.name||row.card.title||row.card.entity||row.card.type} · ${index+1}</button>`)}</div>
  <div class="add"><select aria-label="Kartenvorlage">${this.templates().map((template,index)=>html`<option value=${index}>${template.name}</option>`)}</select><button @click=${event=>this.add(event.currentTarget.parentElement.querySelector('select').value)}>Karte hinzufügen</button></div>
  ${selected?html`<dash6-external-editor @config-changed=${event=>{event.stopPropagation();this.replace(selected.path,event.detail.config);}}></dash6-external-editor><div class="tools"><button @click=${()=>this.replace(selected.path,null,true)}>Karte entfernen</button></div>`:''}
  ${this._error?html`<p role="alert" class="error">${this._error}</p>`:''}
  <details><summary>Automatische Ausschlüsse (${extractEntityReferences(domainCards(c)).length})</summary><p class="ids">${extractEntityReferences(domainCards(c)).join(', ')||'Keine konfigurierten Entities'}</p></details>
  <details><summary>Globale Dashboard-Ausschlüsse</summary>${Object.entries(domainRegistrySnapshot().dashboards).map(([dashboard,entry])=>html`<details><summary>${dashboard}</summary>${Object.entries(entry.views||{}).map(([view,value])=>html`<details><summary>${value.title||view} · ${view}</summary>${Object.entries(value.sections||{}).map(([section,block])=>html`<details><summary>${section}</summary><p class="ids">${(block.exclusions||[]).join(', ')||'Keine Ausschlüsse'}</p></details>`)}</details>`)}</details>`)}</details>
  <details><summary>Vollständige Abschnittskonfiguration</summary><dash6-config-editor .hass=${this.hass} ._config=${c} @config-changed=${event=>{event.stopPropagation();this.emit(event.detail.config);}}></dash6-config-editor></details>`;
 }
}
customElements.define('dash6-domain-editor',DomainEditor);
