import assert from 'node:assert/strict';
import {normalizeUltraNativeCards} from '../src/dash6/ultra-native.js';
const native={id:'nav',type:'external_card',card_type:'vertical-stack',card_config:{type:'vertical-stack',cards:[{type:'tile',entity:'light.local'}]}},custom={id:'heading',type:'external_card',card_type:'dash6-area-header',card_config:{type:'custom:dash6-area-header',title:'Room'}};
const config={layout:{rows:[{columns:[{modules:[native,custom]}]}]}};
normalizeUltraNativeCards(config);assert.equal(native.card_type,'dash6-direct-card');assert.equal(native.card_config.card.type,'vertical-stack');assert.equal(native.card_config.card.cards[0].entity,'light.local');assert.equal(custom.card_type,'dash6-area-header');const before=structuredClone(config);normalizeUltraNativeCards(config);assert.deepEqual(config,before);console.log('Ultra native cards: native stacks wrapped once; custom cards and actions retained.');
