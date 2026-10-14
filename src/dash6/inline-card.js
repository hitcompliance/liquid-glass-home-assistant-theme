import {scopedCustomElements as customElements} from './scoped-elements.js';
import {RenderCard,mapCards} from './card-runtime.js';
import './inline-domain.js';

// A skin/material adapter around a complete inline card, with no profile lookup.
class DirectCard extends RenderCard{
 async setConfig(config){
  if(!config.card?.type)throw new Error('Eine vollständige Kartenkonfiguration ist erforderlich.');
  this._publicConfig=structuredClone(config);
  const mapped=mapCards(structuredClone(config.card));
  return super.setConfig(mapped.type==='custom:dash6-render-card'?mapped:{type:'custom:dash6-render-card',definition:mapped,skin:{css:'',classes:''}});
 }
}
customElements.define('dash6-direct-card',DirectCard);
window.customCards??=[];
window.customCards.push({type:'dash6-direct-card',name:'Liquid Glass Karte',description:'Vollständige, direkt gespeicherte Kartenkonfiguration mit Liquid-Glass-Material.',preview:true});
