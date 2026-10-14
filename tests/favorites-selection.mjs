import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from '../node_modules/esbuild/lib/main.js';
import {extractCatalog, filterSelectedTree, toggleSelection, selectionState,reconcileDynamicSelection} from '../src/dash6/favorites-model.js';
import {resolveInlineDomain,materializeDynamicCard} from '../src/dash6/favorites-dynamic-catalog.js';
import {watchInlineQuery} from '../src/dash6/inline-query.js';

const metadata = {dashboard: 'dash-6', view: 'room', title: 'Raum', viewOrder: 2};
const walk = (value, visit) => {
  if (!value || typeof value !== 'object') return;
  visit(value); for (const child of Object.values(value)) walk(child, visit);
};
const count = (value, predicate) => {let total = 0; walk(value, item => {if (predicate(item)) total++;}); return total;};
const sceneSource = (room = 'Raum') => ({type: 'custom:auto-entities', card_param: 'cards', show_empty: false,
  filter: {template: `{% set room="${room}" %}{{ area_entities(room) }}`},
  card: {type: 'custom:layout-card', layout_type: 'custom:grid-layout', layout: {gap: '8px', 'grid-template-columns': 'repeat(4,1fr)'}}});

test('selected descendants replace an unchecked wrapper inside a selected ancestor, preserving order and template', () => {
  const original = {type: 'custom:dash6-stack-card', title: 'Raum', cards: [
    {type: 'tile', entity: 'light.before'},
    {type: 'custom:vertical-stack-in-card', cards: [{type: 'heading', heading: 'Szenen'}, sceneSource(), {type: 'tile', entity: 'light.after'}]},
    {type: 'tile', entity: 'light.last'},
  ]};
  const catalog = extractCatalog(original, metadata), root = catalog[0], wrapper = root.children[1];
  const before = JSON.stringify(catalog);
  let selected = toggleSelection(catalog, [], root.id, true);
  selected = selected.filter(id => id !== wrapper.id && id !== wrapper.children[0].id);
  const [rendered] = filterSelectedTree(catalog, selected);
  assert.deepEqual(rendered.card.cards, [original.cards[0], sceneSource(), original.cards[1].cards[2], original.cards[2]]);
  assert.deepEqual(rendered.children.map(node => node.id), [root.children[0].id, wrapper.children[1].id, wrapper.children[2].id, root.children[2].id]);
  assert.equal(JSON.stringify(catalog), before, 'saved source snapshots are unchanged');
});

test('only selected deepest leaves survive multiple unchecked containers', () => {
  const root = extractCatalog({type: 'grid', columns: 2, cards: [{type: 'vertical-stack', cards: [
    {type: 'horizontal-stack', cards: [{type: 'tile', entity: 'light.a'}, {type: 'tile', entity: 'light.b'}]},
    {type: 'tile', entity: 'light.c'},
  ]}]}, metadata)[0];
  const a = root.children[0].children[0].children[0], c = root.children[0].children[1];
  const [rendered] = filterSelectedTree([root], [root.id, a.id, c.id]);
  assert.deepEqual(rendered.card.cards.map(card => card.entity), ['light.a', 'light.c']);
  assert.equal(rendered.card.columns, 2);
  assert.equal(count(rendered.card, card => card.type === 'vertical-stack' || card.type === 'horizontal-stack'), 0);
});

test('one promoted card fills a single-card slot; several escape as separate cards without a new wrapper', () => {
  const root = extractCatalog({type: 'custom:render', definition: {type: 'vertical-stack', cards: [{type: 'tile', entity: 'light.a'}, {type: 'tile', entity: 'light.b'}]}}, metadata)[0];
  const [a, b] = root.children[0].children;
  assert.deepEqual(filterSelectedTree([root], [root.id, a.id])[0].card.definition, a.card);
  const rendered = filterSelectedTree([root], [root.id, a.id, b.id]);
  assert.equal('definition' in rendered[0].card, false);
  assert.deepEqual(rendered.slice(1).map(node => node.card), [a.card, b.card]);
  assert.equal(count(rendered.map(node => node.card), card => card.type === 'vertical-stack'), 0);
});

test('Ultra external-card module retains its design when an unchecked inner wrapper has one selected child', () => {
  const root = extractCatalog({type: 'custom:ultra-card', rows: [{columns: [{modules: [
    {type: 'external_card', id: 'module', design: {padding: 8}, card_config: {type: 'vertical-stack', cards: [{type: 'tile', entity: 'light.a'}]}},
  ]}]}]}, metadata)[0];
  const leaf = root.children[0].children[0];
  const [rendered] = filterSelectedTree([root], [root.id, leaf.id]);
  assert.deepEqual(rendered.card.rows[0].columns[0].modules[0], {type: 'external_card', id: 'module', design: {padding: 8}, card_config: leaf.card});
});

// Import the real render-config function with a minimal Lit registration shim.
// No browser, subscriptions or device services are involved in these config tests.
const bundle = await build({entryPoints: [fileURLToPath(new URL('../src/dash6/favorites-gui.js', import.meta.url))], bundle: true, write: false, format: 'esm', platform: 'node', plugins: [{
  name: 'lit-config-test', setup(api) {
    api.onResolve({filter: /^lit$/}, () => ({path: 'lit', namespace: 'test'}));
    api.onLoad({filter: /.*/, namespace: 'test'}, () => ({contents: 'export class LitElement {} export const html=()=>null,css=()=>null;'}));
  },
}]});
globalThis.window ??= {};
globalThis.customElements ??= {get: () => true, define: () => {}};
const {favoritesRenderConfig,resolveProfiles} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

test('four neutral room sources render selected scenes after unchecking their frames and headings', () => {
  const sources = ['Room A', 'Room B', 'Room C', 'Room D'].flatMap((title, index) => extractCatalog({
    type: 'custom:dash6-stack-card', cards: [{type: 'heading', heading: title},
      {type: 'custom:vertical-stack-in-card', cards: [{type: 'heading', heading: 'Szenen'}, sceneSource(title)]},
      {type: 'tile', entity: `light.fixture_${index}`},
    ],
  }, {dashboard: 'test-dashboard', view: `fixture-${index}`, title, viewOrder: index}));
  const original = JSON.stringify(sources), wrappers = sources.map(node => node.children[1]);
  let selected = [];
  for (const root of sources) selected = toggleSelection(sources, selected, root.id, true);
  for (const wrapper of wrappers) {
    selected = toggleSelection(sources, selected, wrapper.id, false);
    selected = toggleSelection(sources, selected, wrapper.children[1].id, true);
    assert.equal(selected.includes(wrapper.id), false);
    assert.equal(selected.includes(wrapper.children[0].id), false);
    assert.equal(selected.includes(wrapper.children[1].children[0].id), true, 'reselecting auto-entities selects its layout child');
  }
  const rendered = favoritesRenderConfig({dashboard: 'test-dashboard', sources, selected}, {entities: {}});
  for (const wrapper of wrappers) {
    const expected = wrapper.children[1].card, matches = [];
    walk(rendered, card => {if (card.type === expected.type && JSON.stringify(card.filter) === JSON.stringify(expected.filter)) matches.push(card);});
    assert.deepEqual(matches, [expected], 'each scene template, layout and options survive exactly once');
  }
  assert.equal(count(rendered, card => card.heading === 'Szenen'), 0);
  assert.equal(count(rendered, card => card.type === 'custom:vertical-stack-in-card'), 0);
  assert.equal(JSON.stringify(sources), original);
});

test('unchecking a parent then reselecting its child renders that child without the parent', () => {
  const catalog = extractCatalog({type: 'custom:vertical-stack-in-card', cards: [
    {type: 'heading', heading: 'Szenen'}, sceneSource(),
  ]}, metadata), parent = catalog[0], auto = parent.children[1], layout = auto.children[0];
  let selected = toggleSelection(catalog, [], parent.id, true);
  selected = toggleSelection(catalog, selected, parent.id, false);
  assert.deepEqual(selected, [], 'unchecking a parent clears every descendant');
  selected = toggleSelection(catalog, selected, auto.id, true);
  assert.deepEqual(selected, [auto.id, layout.id]);
  assert.deepEqual(selectionState(parent, selected), {checked: false, partial: true});
  assert.deepEqual(selectionState(auto, selected), {checked: true, partial: false});
  const rendered = favoritesRenderConfig({sources: catalog, selected, grouping: 'none', headings: false}, {entities: {}});
  assert.deepEqual(rendered.cards, [sceneSource()]);
  assert.equal(count(rendered, card => card.type === 'custom:vertical-stack-in-card' || card.type === 'heading'), 0);
});

test('fresh direct definitions retain legacy expanded profile hierarchy IDs',async()=>{
 const definition={type:'custom:vertical-stack-in-card',cards:[{type:'heading',heading:'Devices'},{type:'tile',entity:'switch.neutral'}]};
 const view=card=>({path:'room',title:'Room',cards:[{type:'custom:ultra-card',rows:[{columns:[{modules:[{type:'external_card',id:'module',card_config:card}]}]}]}]});
 const legacy=view({type:'custom:dash6-profile-card',profile:'neutral-fixture'}),direct=view({type:'custom:dash6-direct-card',card:definition});
 const before=[JSON.stringify(legacy),JSON.stringify(direct)];window.__dash6Cards={loadProfile:async()=>structuredClone(definition)};
 const oldCatalog=extractCatalog(await resolveProfiles(legacy),metadata,{view:true}),newCatalog=extractCatalog(await resolveProfiles(direct),metadata,{view:true});
 const ids=nodes=>nodes.flatMap(node=>[node.id,...ids(node.children)]);assert.deepEqual(ids(newCatalog),ids(oldCatalog));assert.deepEqual(newCatalog,oldCatalog);
 assert.deepEqual([JSON.stringify(legacy),JSON.stringify(direct)],before,'source configurations stay unchanged');
});

const known={type:'tile',entity:'switch.known'};
const domainSource=()=>({type:'custom:dash6-domain-card',cards:[{type:'custom:vertical-stack-in-card',cards:[{type:'heading',heading:'Devices'},known]}],known_entity_ids:['switch.known'],combine:true,columns:2,mobile_columns:1,mobile_breakpoint:700,edge_alignment:'flush',query:{template:'{{ fixture_cards | to_json }}',group:'neutral-inline-group',index:0,canonical:true}});
const domainHass=()=>({states:Object.fromEntries(['known','extra','hidden'].map(name=>['switch.'+name,{state:'on',attributes:{}}])),entities:{'switch.hidden':{hidden_by:'user'}}});
const definitions=()=>[known,{type:'tile',entity:'switch.extra',styles:{grid:[{'grid-template-areas':'"i"'}]}},{type:'tile',entity:'switch.hidden'}];

test('inline domain known children use the same synthetic hierarchy as legacy room slots',async()=>{
 const input=domainSource(),before=JSON.stringify(input),resolved=await resolveProfiles(input);
 const expected={type:'custom:dash6-render-card',definition:{type:'vertical-stack',cards:input.cards}};
 const paths=nodes=>nodes.flatMap(node=>[node.absolutePath,...paths(node.children)]);
 assert.deepEqual(paths(extractCatalog(resolved,metadata)),paths(extractCatalog(expected,metadata)));
 assert.deepEqual(resolved._favorites_inline_source,input);assert.equal(JSON.stringify(input),before);
});

test('on-demand grouped inline materialization preserves canonical CSS, filtering and shared grid optics',async()=>{
 const source=domainSource(),resolved=resolveInlineDomain(source),hass=domainHass();let subscriptions=0,unsubscribed=0;
 hass.connection={subscribeMessage:async(callback,message)=>{subscriptions++;assert.ok(message.template.includes('__dash6_inline_query_0'));setTimeout(()=>callback({result:JSON.stringify({'0':JSON.stringify([definitions()])})}),0);return()=>unsubscribed++;}};
 const before=JSON.stringify(source),materialized=await materializeDynamicCard(resolved,hass,{timeoutMs:200});assert.equal(materialized.status,'ready');
 const frame=materialized.card.definition;assert.equal(frame.type,'custom:dash6-domain-grid');assert.equal(frame.headings[0].heading,'Devices');
 assert.deepEqual(frame.grid.cards.map(card=>card.entity),['switch.known','switch.extra']);assert.equal(frame.grid.cards[1].styles.grid[0]['grid-template-areas'],'"i"');
 assert.equal(frame.grid.layout['grid-template-columns'],'repeat(2,minmax(0,1fr))');assert.equal(frame.grid.layout.mediaquery['(max-width: 699px)']['grid-template-columns'],'repeat(1,minmax(0,1fr))');
 assert.equal(subscriptions,1);assert.equal(unsubscribed,1);assert.equal(JSON.stringify(source),before);assert.equal('_favorites_inline_source' in materialized.card,false,'snapshot is static after explicit discovery');
});

test('Favorites discovery reuses an already active grouped template and leaves its subscription intact',async()=>{
 const source=domainSource(),hass=domainHass();let callback,subscriptions=0,unsubscribed=0;
 hass.connection={subscribeMessage:async(fn)=>{callback=fn;subscriptions++;return()=>unsubscribed++;}};
 const stop=watchInlineQuery(hass,source.query,()=>{});await new Promise(resolve=>setTimeout(resolve,20));callback({result:JSON.stringify({'0':JSON.stringify([definitions()])})});
 const result=await materializeDynamicCard(resolveInlineDomain(source),hass,{timeoutMs:100});assert.equal(result.status,'ready');assert.equal(subscriptions,1);assert.equal(unsubscribed,0);stop();assert.equal(unsubscribed,1);
});

test('dynamic expansion preserves excluded known children and a checked parent without mutating snapshots',()=>{
 const previous=extractCatalog(resolveInlineDomain(domainSource()),metadata)[0],snapshot=JSON.stringify(previous);
 const leaves=[];walk(previous,node=>{if(node.card?.entity==='switch.known')leaves.push(node);});const knownNode=leaves[0];
 let selected=toggleSelection([previous],[],previous.id,true);selected=toggleSelection([previous],selected,knownNode.id,false);
 const next=extractCatalog({type:'custom:dash6-render-card',definition:{type:'custom:dash6-domain-grid',headings:[{type:'heading',heading:'Devices'}],grid:{type:'custom:layout-card',cards:[known,{type:'tile',entity:'switch.extra'}]}}},metadata,{idPrefix:'dynamic:'})[0];
 const reconciled=reconcileDynamicSelection(previous,next,selected);assert.equal(reconciled.node.id,previous.id);assert.ok(reconciled.selected.includes(previous.id));assert.equal(reconciled.selected.includes(knownNode.id),false);
 const rendered=favoritesRenderConfig({sources:[reconciled.node],selected:reconciled.selected,grouping:'none',headings:true},domainHass());
 assert.equal(count(rendered,card=>card.entity==='switch.known'),0);assert.equal(count(rendered,card=>card.entity==='switch.extra'),1);assert.equal(JSON.stringify(previous),snapshot);
 const partial=reconcileDynamicSelection(previous,next,[knownNode.id]);assert.ok(partial.selected.includes(knownNode.id));assert.equal(partial.selected.includes(previous.id),false);
 const onlyKnown=favoritesRenderConfig({sources:[partial.node],selected:partial.selected,grouping:'none',headings:false},domainHass());assert.deepEqual(onlyKnown.cards,[known]);
});

test('stored legacy selections render byte-identically after resolving an unrelated fresh inline catalog',async()=>{
 const sources=extractCatalog({type:'custom:dash6-stack-card',cards:[{type:'heading',heading:'Existing'},{type:'tile',entity:'switch.known'},sceneSource('Neutral')]},metadata);
 const selected=toggleSelection(sources,[],sources[0].id,true),config={sources,selected,grouping:'none',headings:true},before=JSON.stringify(config);
 const rendered=JSON.stringify(favoritesRenderConfig(config,domainHass()));await resolveProfiles({views:[{path:'room',cards:[domainSource(),{type:'custom:dash6-direct-card',card:{type:'tile',entity:'switch.extra'}}]}]});
 assert.equal(JSON.stringify(config),before);assert.equal(JSON.stringify(favoritesRenderConfig(config,domainHass())),rendered);
});
