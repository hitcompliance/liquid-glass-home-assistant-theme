import assert from 'node:assert/strict';
import {inlineDomainGridDefinition} from '../src/dash6/inline-domain-definition.js';
import {roomDomainCards} from '../src/dash6/domain-room-data.js';
const config={area:'office',domain:'scene',columns:5,combine:true,grid_layout:{'grid-auto-flow':'row','grid-template-columns':'repeat(5,minmax(0,1fr))',mediaquery:{'(max-width: 1199px)':{'grid-template-columns':'repeat(4,minmax(0,1fr))'},'(max-width: 899px)':{'grid-template-columns':'repeat(3,minmax(0,1fr))'},'(max-width: 599px)':{'grid-template-columns':'repeat(2,minmax(0,1fr))'}}},dynamic_card:{type:'tile',name:'Preserved name',dash6_css:{class:'dash6-existing'},tap_action:{action:'perform-action',perform_action:'scene.turn_on',target:{entity_id:'this.entity_id'}}}};
const now=Date.parse('2026-10-14T12:00:00Z'),hass={states:{'scene.old':{state:'2026-10-13T12:00:00Z'},'scene.first':{state:'2026-10-14T10:00:00Z'},'scene.latest':{state:'2026-10-14T11:00:00Z'},'scene.unknown':{state:'unknown'}}};
const cards=roomDomainCards(config,Object.keys(hass.states),hass,now);
assert.ok(cards.every(card=>card.dash6_active===undefined),'activation timestamps do not define active scenes');
assert.equal(cards[2].dash6_css.class,'dash6-existing dash6-scene-64');assert.equal(cards[2].name,'Preserved name');assert.equal(cards[2].tap_action.target.entity_id,'scene.latest');assert.equal(config.dynamic_card.tap_action.target.entity_id,'this.entity_id','source options unchanged');
const direct=roomDomainCards({...config,dynamic_card:{type:'tile',tap_action:{action:'more-info'}}},['scene.old'],hass,now)[0];assert.equal(direct.tap_action.perform_action,'scene.turn_on');

const definition=inlineDomainGridDefinition(config,[],cards),layout=definition.cards[0].layout;
assert.equal(definition.cards[0].layout_type,'custom:dash6-scene-flex-layout');assert.equal(layout.display,undefined);assert.equal(layout['flex-wrap'],'wrap');assert.equal(layout['--dash6-scene-min-width'],'150px');assert.equal(layout.gap,'8px');assert.equal(layout.mediaquery,undefined);assert.equal(layout['grid-template-columns'],undefined);
assert.deepEqual(inlineDomainGridDefinition({...config,columns:10,mobile_columns:1},[],cards).cards[0].layout,layout,'column settings do not force scene counts');
const named=roomDomainCards({...config,dynamic_card:{type:'tile'}},['scene.a','scene.b'],{areas:{office:{name:'Büro'}},states:{'scene.a':{attributes:{friendly_name:'BÜRO - Konzentration'},state:'unknown'},'scene.b':{attributes:{friendly_name:'Entspannen · Büro'},state:'unknown'}}},now);
assert.deepEqual(named.map(card=>card.name),['Konzentration','Entspannen']);
console.log('Scene domain: flexible wrapping, 150px basis, cleaned area names, preserved actions and activation passed.');

const covers=[{type:'tile',entity:'cover.first'},{type:'tile',entity:'cover.second'}];
const pair=inlineDomainGridDefinition({...config,domain:'cover'},[{type:'grid',columns:2,cards:covers}],[]).cards[0];
assert.equal(pair.layout_type,'custom:dash6-cover-pair-layout');
assert.deepEqual(pair.cards,covers,'wrapped cover grid is flattened so each cover occupies its own responsive cell');
