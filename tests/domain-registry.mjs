import assert from 'node:assert/strict';
import {extractEntityReferences,buildDomainRegistry,registryExclusions,replaceDomainConfig,resolvedDomainRegistry,domainRegistrySnapshot,relatedDomainViews} from '../src/dash6/domain-registry.js';
import {roomDomainEntities,filterRoomCardTree} from '../src/dash6/domain-room-data.js';
const light={type:'custom:dash6-domain-card',area:'office',domain:'light',block_id:'light',view:'office-content',cards:[{type:'heading',heading:'Lights'},{type:'custom:light-fixture',entity:'light.office',power_entity:'sensor.office_power',energy_entity:'sensor.office_energy',segments:['light.office_white','light.office_back'],action:{target:{entity_id:['switch.office_led','switch.office_lock']}},template:"{{ states('sensor.office_temperature') }}"}],custom_cards:[{type:'custom:fixture',entity:'light.extra'}]};
const sensor={type:'custom:dash6-domain-card',area:'office',domain:'sensor',block_id:'sensor',cards:[]};
const dashboard={title:'Fixture',views:[{path:'office',cards:[{type:'custom:embedded-view-card',view:'office-content'}]},{path:'office-content',sections:[{cards:[light]},{cards:[sensor]}]},{path:'other',cards:[{...light,view:'other',cards:[{type:'tile',entity:'sensor.other'}],custom_cards:[]}]}]};
const ids=extractEntityReferences(light.cards);assert.deepEqual(ids,['light.office','light.office_back','light.office_white','sensor.office_energy','sensor.office_power','sensor.office_temperature','switch.office_led','switch.office_lock']);
assert.deepEqual(extractEntityReferences({type:'button',entity:'light.office',tap_action:{action:'perform-action',perform_action:'light.turn_on',service:'light.turn_on',target:{entity_id:'light.other'}}}),['light.office','light.other'],'service names are not entity refs');
const registry=buildDomainRegistry(dashboard,'fixture');assert.deepEqual(registry.dashboards.fixture.views['office-content'].sections.light.exclusions,[...ids,'light.extra'].sort());
// Structural wrappers must expose the domain's semantic key instead of being
// classified as a fixed card and swallowing its helper dependency declarations.
const wrappedDomain=block_id=>({type:'custom:dash6-domain-card',block_id,area:'office',domain:'light',cards:[{type:'custom:light-fixture',entity:'light.wrapped',entity_dependencies:['sensor.wrapped_power','number.wrapped_limit',{entity:'switch.wrapped_led'}]}],custom_cards:[{type:'custom:fixture',entity:'light.wrapped_extra',entity_dependencies:{temperature:'sensor.wrapped_temperature'}}]});
const direct=value=>({type:'custom:dash6-direct-card',card:value}),render=value=>({type:'custom:dash6-render-card',definition:value}),fast=value=>({type:'custom:dash6-fast-block-card',card:value});
const wrappedDashboard={views:[{path:'wrapped-room',cards:[direct(wrappedDomain('lighting-controls')),render(wrappedDomain('lighting-rendered')),fast(wrappedDomain('lighting-fast')),direct(render(fast(wrappedDomain('lighting-nested'))))]}]};
const wrappedSections=buildDomainRegistry(wrappedDashboard,'fixture').dashboards.fixture.views['wrapped-room'].sections;
assert.deepEqual(Object.keys(wrappedSections),['lighting-controls','lighting-rendered','lighting-fast','lighting-nested'],'domain block_id stays semantic through direct/render/fast wrappers');
for(const section of Object.values(wrappedSections)){
 assert.equal(section.domain,'light');assert.equal(section.area,'office');
 assert.deepEqual(section.exclusions,['light.wrapped','light.wrapped_extra','number.wrapped_limit','sensor.wrapped_power','sensor.wrapped_temperature','switch.wrapped_led'],'entity_dependencies from configured and GUI-added cards survive wrapper traversal');
}
assert.deepEqual([...registryExclusions({dashboards:{fixture:{views:{'wrapped-room':{sections:wrappedSections}}}}},'fixture',['wrapped-room'])].sort(),['light.wrapped','light.wrapped_extra','number.wrapped_limit','sensor.wrapped_power','sensor.wrapped_temperature','switch.wrapped_led'],'wrapped section dependencies join the view exclusion union');
assert.equal(registryExclusions(registry,'fixture',['office','office-content']).has('sensor.office_power'),true,'other domains see light helper exclusions');assert.equal(registryExclusions(registry,'fixture',['office-content']).has('sensor.other'),false,'room isolation');
assert.deepEqual(relatedDomainViews(dashboard,['office']),['office','office-content'],'main view discovers embedded content refs');assert.deepEqual(relatedDomainViews(dashboard,['office-content']),['office-content','office'],'content view discovers owning main');assert.deepEqual(relatedDomainViews({views:[{path:'office'},{path:'office-inhalt-5'}]},['office']),['office','office-inhalt-5'],'legacy suffix fallback');
const next={...light,custom_cards:[{type:'tile',entity:'sensor.new_helper'}]};const updated=replaceDomainConfig(dashboard,light,next,'fixture','office-content');assert.equal(updated.views[1].sections[0].cards[0].custom_cards[0].entity,'sensor.new_helper');assert.equal(updated.dash6_registry.dashboards.fixture.views['office-content'].sections.light.exclusions.includes('sensor.new_helper'),true);assert.equal(updated.dash6_registry.dashboards.fixture.views['office-content'].sections.light.exclusions.includes('light.extra'),false,'stale exclusions removed');assert.equal(dashboard.views[1].sections[0].cards[0].custom_cards[0].entity,'light.extra','draft does not mutate source');assert.throws(()=>replaceDomainConfig(dashboard,{type:'custom:dash6-domain-card',block_id:'missing'},next,'fixture','office-content'),/nicht gefunden/);
const states=Object.fromEntries(['sensor.office_power','sensor.visible','sensor.device','sensor.other','sensor.hidden','sensor.disabled','light.visible'].map(id=>[id,{entity_id:id,state:'1',attributes:{friendly_name:id}}]));
const data={areas:[{area_id:'office',name:'Office'}],devices:[{id:'device-office',area_id:'office'}],entities:[{entity_id:'sensor.office_power',area_id:'office'},{entity_id:'sensor.visible',area_id:'office'},{entity_id:'sensor.device',device_id:'device-office'},{entity_id:'sensor.other',area_id:'other'},{entity_id:'sensor.hidden',area_id:'office',hidden_by:'integration'},{entity_id:'sensor.disabled',area_id:'office',disabled_by:'user'},{entity_id:'light.visible',area_id:'office'}]};
assert.deepEqual(roomDomainEntities(data,{states,entities:{}},'office','sensor',registryExclusions(registry,'fixture',['office-content'])),['sensor.device','sensor.visible']);assert.deepEqual(roomDomainEntities(data,{states,entities:{'sensor.visible':{hidden_by:'user'}}},'Office','sensor',registryExclusions(registry,'fixture',['office-content'])),['sensor.device']);
globalThis.window={};globalThis.location={pathname:'/dash-6/office'};resolvedDomainRegistry({...dashboard,dash6_registry:{dashboards:{known:{views:{}}}}},'fixture');assert.deepEqual(Object.keys(window.__dash6DomainRegistry.dashboards).sort(),['fixture','known']);const snapshot=window.__dash6DomainRegistry;snapshot.dashboards.fixture.views={};assert.equal(Object.keys(domainRegistrySnapshot().dashboards.fixture.views).length,3,'global registry reads cannot mutate runtime data');location.pathname='/dash6-bkp-2/office';resolvedDomainRegistry(dashboard,'isolated');assert.equal('isolated' in window.__dash6DomainRegistry.dashboards,false,'isolated backup scope cannot publish into active registry');delete globalThis.window;delete globalThis.location;
console.log('Domain registry: structural wrappers, semantic keys, helper dependencies, view isolation, YAML drafts, stale cleanup and room/domain/hidden filtering passed.');

// Exclusion settings are local to a domain block and use registry platform and
// live device_class, never a guessed entity/friendly-name substring.
const filterData={areas:[{area_id:'bath',name:'Bath'},{area_id:'office',name:'Office'}],devices:[{id:'bath-device',area_id:'bath'}],entities:[
 {entity_id:'sensor.room_temperature',platform:'tado',device_id:'bath-device'},
 {entity_id:'sensor.generic_42',platform:'tado_hijack',area_id:'bath'},
 {entity_id:'sensor.energy',platform:'mqtt',area_id:'bath'},
 {entity_id:'sensor.power',platform:'mqtt',area_id:'bath'},
 {entity_id:'sensor.humidity',platform:'mqtt',area_id:'bath'},
 {entity_id:'sensor.tado_named_battery',platform:'mqtt',area_id:'bath'},
 {entity_id:'sensor.other_temperature',platform:'mqtt',area_id:'bath'},
 {entity_id:'binary_sensor.contact',platform:'tado',area_id:'bath'},
 {entity_id:'binary_sensor.inlet',platform:'shelly',area_id:'bath'},
 {entity_id:'binary_sensor.window',platform:'mqtt',area_id:'bath'},
 {entity_id:'binary_sensor.office_inlet',platform:'shelly',area_id:'office'}]};
const filterHass={states:Object.fromEntries(filterData.entities.map(e=>[e.entity_id,{state:'unknown',attributes:{friendly_name:e.entity_id,device_class:({'sensor.energy':'energy','sensor.power':'power','sensor.humidity':'humidity','sensor.tado_named_battery':'battery','sensor.other_temperature':'temperature'})[e.entity_id]}}])),entities:{}};
const general={exclude_integrations:['tado','tado_hijack'],exclude_device_classes:['energy','power','humidity']};
assert.deepEqual(roomDomainEntities(filterData,filterHass,'bath','sensor',new Set(),general),['sensor.other_temperature','sensor.tado_named_battery']);
assert.equal(roomDomainEntities(filterData,filterHass,'bath','sensor').length,7,'unconfigured blocks retain all existing visible entities');
assert.deepEqual(roomDomainEntities(filterData,filterHass,'Bath','binary_sensor',new Set(),{exclude_integrations:general.exclude_integrations,exclude_entities:['binary_sensor.inlet']}),['binary_sensor.window']);
assert.deepEqual(roomDomainEntities(filterData,filterHass,'Office','binary_sensor',new Set(),{exclude_integrations:general.exclude_integrations}),['binary_sensor.office_inlet'],'room-local inlet exclusion does not leak');
filterData.entities.push({entity_id:'sensor.new_registry_sensor',platform:'tado_hijack',area_id:'bath'});filterHass.states['sensor.new_registry_sensor']={state:'1',attributes:{}};
assert.equal(roomDomainEntities(filterData,filterHass,'bath','sensor',new Set(),general).includes('sensor.new_registry_sensor'),false,'new integration entities remain dynamically excluded');
filterHass.states['sensor.other_temperature'].attributes.device_class='humidity';assert.equal(roomDomainEntities(filterData,filterHass,'bath','sensor',new Set(),general).includes('sensor.other_temperature'),false,'device_class changes are reflected');
console.log('Domain exclusion settings: integrations, sensor classes, future additions, unknown states and room-local entity isolation passed.');

const legacyTree=[{type:'grid',title:'Sensoren',cards:[{type:'tile',entity:'sensor.generic_42'},{type:'tile',entity:'sensor.power'},{type:'tile',entity:'sensor.tado_named_battery'}]},{type:'grid',title:'Kontakte und Zustände',cards:[{type:'tile',entity:'binary_sensor.contact'},{type:'tile',entity:'binary_sensor.window'}]}];
const legacyFiltered=filterRoomCardTree(legacyTree,filterHass,filterData,{sensor:general,binary_sensor:{exclude_integrations:general.exclude_integrations}});
assert.deepEqual(legacyFiltered.map(c=>c.cards.map(x=>x.entity)),[['sensor.tado_named_battery'],['binary_sensor.window']]);assert.equal(legacyTree[0].cards.length,3,'legacy input is immutable');assert.deepEqual(filterRoomCardTree([{type:'vertical-stack',cards:[{type:'heading',heading:'Sensoren'},{type:'tile',entity:'sensor.generic_42'}]}],filterHass,filterData,{sensor:general}),[],'empty legacy groups disappear');
console.log('Legacy mixed-domain slots: same integration/class settings, preserved grids and empty pruning passed.');

const sidebarThermostat='climate.office_tado';
const sidebarDashboard={views:[{path:'office',cards:[{type:'custom:button-card',variables:{sidebar_cards:[{type:'custom:auto-entities',filter:{template:`{{ states('${sidebarThermostat}') }}`}}]}},{type:'custom:embedded-view-card',view:'office-inhalt'}]},{path:'office-inhalt',cards:[{type:'custom:dash6-domain-card',domain:'climate',area:'office',cards:[]}]}]};
const sidebarRegistry=buildDomainRegistry(sidebarDashboard,'fixture');
assert.equal(registryExclusions(sidebarRegistry,'fixture',relatedDomainViews(sidebarDashboard,['office-inhalt'])).has(sidebarThermostat),false,'read-only sidebar chart copies must not hide the room thermostat control');
console.log('Sidebar chart references do not claim thermostat controls.');

const favoritesIsolation={views:[{path:'kitchen',cards:[{type:'custom:embedded-view-card',view:'kitchen-inhalt'}]},{path:'kitchen-inhalt',cards:[]},{path:'favorites',cards:[{type:'custom:dash6-favorites-card',sources:[{card:{type:'custom:embedded-view-card',view:'kitchen-inhalt'},children:[{card:{type:'tile',entity:'scene.kitchen_night'}}]}]}]}]};
const relatedKitchen=relatedDomainViews(favoritesIsolation,['kitchen']);
assert.deepEqual(relatedKitchen,['kitchen','kitchen-inhalt']);
assert.equal(registryExclusions(buildDomainRegistry(favoritesIsolation,'fixture'),'fixture',relatedKitchen).has('scene.kitchen_night'),false,'favorites snapshots cannot suppress the live room scene');
console.log('Favorites snapshots do not connect room exclusion groups or hide scenes.');
