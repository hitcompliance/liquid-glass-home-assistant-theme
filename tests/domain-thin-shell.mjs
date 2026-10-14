import assert from 'node:assert/strict';
import {inlineDomainGridDefinition} from '../src/dash6/inline-domain-definition.js';
const card={type:'tile',entity:'switch.fixture'},base={type:'custom:dash6-stack-card',mode:'keep_geometry',horizontal:false,dash6_css:{class:'dash6-existing dash6-rounded'},cards:[card]};
const noHeader=inlineDomainGridDefinition({cards:[base],combine:true,columns:1},[base],[]);
assert.equal(noHeader.dash6_css.class,'dash6-existing dash6-rounded dash6-thin-glass');assert.equal(noHeader.mode,'keep_geometry');assert.equal(noHeader.horizontal,false);assert.equal(noHeader.cards[0].cards[0].entity,'switch.fixture');assert.equal('card_mod' in noHeader,false);assert.equal('style' in noHeader.dash6_css,false,'marker does not introduce inline CSS');assert.equal(base.dash6_css.class,'dash6-existing dash6-rounded','source classes unchanged');
const withHeader={...base,cards:[{type:'heading',heading:'Fixture'},card]};const populated=inlineDomainGridDefinition({cards:[withHeader],combine:true},[withHeader],[]);assert.equal(populated.dash6_css.class.includes('dash6-thin-glass'),true);assert.equal(populated.cards[0].type,'heading');
const empty=inlineDomainGridDefinition({cards:[withHeader],keep_empty:true},[],[]);assert.equal(empty.dash6_css.class.includes('dash6-thin-glass'),true);assert.equal(empty.cards[0].type,'heading');
const flush=inlineDomainGridDefinition({cards:[base],edge_alignment:'flush'},[base],[]);assert.equal(flush.dash6_css.class,'dash6-thin-glass');assert.equal(flush.type,'custom:dash6-domain-grid');
console.log('Domain outer shells retain thin-glass marker, existing classes and base geometry with or without headings.');
