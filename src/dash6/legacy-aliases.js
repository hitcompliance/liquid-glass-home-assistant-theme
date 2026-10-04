// Retain the public DASH5 v2 card names while using the current Satin implementation.
// Remove an older standalone resource before migrating: Custom Elements cannot be redefined.
const aliases={
 'dash5-govee-light-card-v2':'dash6-govee-light-card-v2',
 'dash5-lightgroup-card-v2':'dash6-lightgroup-card-v2',
 'dash5-multi-light-card-v2':'dash6-lightgroup-card-v2',
 'dash6-multi-light-card-v2':'dash6-lightgroup-card-v2'
};
for(const [name,current] of Object.entries(aliases)){
 customElements.whenDefined(current).then(()=>{
  if(customElements.get(name))return;
  const Parent=customElements.get(current);
  customElements.define(name,class extends Parent{});
  window.customCards??=[];window.customCards.push({type:name,name:name+' (Satin)',description:'Compatibility name for the current Liquid Glass light card.',preview:true});
 });
}
