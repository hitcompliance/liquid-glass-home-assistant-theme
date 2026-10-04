// Registry results can precede the entity's appearance in hass.states.
export function pruneVisibleEntities(value,states={}){
 if(Array.isArray(value))return value.map(x=>pruneVisibleEntities(x,states)).filter(x=>x!==null);
 if(!value||typeof value!=='object')return value;
 if(value.type==='tile'&&value.entity&&!states[value.entity])return null;
 const result=Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pruneVisibleEntities(v,states)]));
 if(result.cards){
  const first=result.cards[0];
  if(first?.type==='heading'&&first.heading==='Sensoren'&&!result.cards.slice(1).some(hasVisibleEntity))return null;
  if(Array.isArray(value.cards)&&value.cards.length&&!result.cards.length)return null;
 }
 return result;
 function hasVisibleEntity(x){if(Array.isArray(x))return x.some(hasVisibleEntity);if(!x||typeof x!=='object')return false;if(x.entity&&states[x.entity])return true;return Object.values(x).some(hasVisibleEntity);}
}
