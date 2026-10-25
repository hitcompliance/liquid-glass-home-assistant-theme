import {scopedCustomElements as customElements} from './scoped-elements.js';
// Compatibility adapter for existing configurations and frozen backup dashboards.
import {RenderCard,mapCards,create} from './card-runtime.js';
import {PROFILES,loadProfile} from './profiles-store.js';
const clone=x=>structuredClone(x);
export {create};
Object.assign(window.__dash6Cards,{profile:key=>clone(PROFILES[key]),loadProfile:async key=>clone(await loadProfile(key))});
class ProfileCard extends RenderCard{
 static async getConfigElement(){await import('./profile-editor.js');return document.createElement('dash6-profile-editor');}
 async setConfig(c){const token=(this._profileToken||0)+1;this._profileToken=token;let source;try{source=c.definition?clone(c.definition):await loadProfile(c.profile);}catch(error){if(token===this._profileToken)this._error=String(error.message||error);return;}if(token!==this._profileToken)return;let definition={...clone(source),...clone(c.overrides||{})};if(c.area){const swap=x=>typeof x==='string'?x.replace(/area_entities\((['"])[^'"]+\1\)/g,'area_entities('+JSON.stringify(c.area)+')'):Array.isArray(x)?x.map(swap):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,k==='area'&&typeof v==='string'?c.area:swap(v)])):x;definition=swap(definition);}this._publicConfig=clone(c);const mapped=mapCards(definition);if(mapped.type==='custom:dash6-render-card')return super.setConfig(mapped);return super.setConfig({type:'custom:dash6-render-card',definition:mapped,skin:{css:'',classes:''}});}
}
customElements.define('dash6-profile-card',ProfileCard);

window.customCards??=[];window.customCards.push({type:'dash6-profile-card',name:'DASH6 integrierte Karte',description:'Vorbereitete Kartenprofile mit integriertem CSS vor dem ersten sichtbaren Rendern.',preview:true});
