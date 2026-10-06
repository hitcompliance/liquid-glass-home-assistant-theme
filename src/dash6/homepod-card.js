// Reusable HomePod card. Keep HA artwork, transport and the shared Satin slider.
class HomePodCard extends HTMLElement {
  static async getConfigElement() {
    if(!customElements.get('dash6-config-editor'))await customElements.get('dash6-media-card').getConfigElement();
    const editor=document.createElement('dash6-config-editor');
    editor.schema=[{name:'entity',label:'HomePod',selector:{entity:{domain:'media_player'}}},{name:'homepod_remote_entity',label:'HomePod-Verbindung',selector:{entity:{domain:'remote'}}},{name:'name',label:'Anzeigename',selector:{text:{}}}];
    editor.defaults={entity:'',homepod_remote_entity:'',name:''};
    return editor;
  }
  static getStubConfig(){return {type:'custom:dash6-homepod-card',entity:''};}
  constructor(){super();this.attachShadow({mode:'open'});}
  setConfig(config){
    if(!config.entity?.startsWith('media_player.'))throw new Error('Eine HomePod-Media-Entity ist erforderlich.');
    this._config=structuredClone(config);
    void this._updateCard();
  }
  set hass(value){this._hass=value;if(this._card)this._card.hass=value;}
  get hass(){return this._hass;}
  async _updateCard(){
    if(!customElements.get('hui-media-control-card')){
      const helpers=await window.loadCardHelpers();
      helpers.createCardElement({type:'media-control',entity:this._config.entity});
    }
    await customElements.whenDefined('hui-media-control-card');
    if(!this._config)return;
    if(!this._card){
      const style=document.createElement('style');style.textContent=':host{display:block;min-width:0}hui-media-control-card{display:block;min-width:0}';
      this._card=document.createElement('hui-media-control-card');this.shadowRoot.append(style,this._card);
    }
    this._card.setConfig({...this._config,type:'media-control',homepod:true});
    if(this._hass)this._card.hass=this._hass;
  }
  getCardSize(){return this._card?.getCardSize?.()??3;}
}
if(!customElements.get('dash6-homepod-card'))customElements.define('dash6-homepod-card',HomePodCard);
window.customCards=window.customCards||[];
window.customCards.push({type:'dash6-homepod-card',name:'DASH6 HomePod',description:'HomePod mit Verbindungsschalter, Wiedergabe und Liquid-Glass-Lautstärke',preview:true});
