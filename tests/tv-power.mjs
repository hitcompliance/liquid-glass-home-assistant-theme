import assert from 'node:assert/strict';
import {tvPowerAction} from '../src/dash6/tv-power.js';
const config={tv_entity:'media_player.tv',tv_remote:'remote.tv',tv_power_on_button:'button.refresh',tv_power_off_button:'button.power'};
for(const remoteState of ['on','off'])for(const on of [true,false])assert.deepEqual(tvPowerAction({'remote.tv':{state:remoteState}},config,on),{domain:'remote',service:on?'turn_on':'turn_off',entity_id:'remote.tv'});
for(const remoteState of ['unknown','unavailable',undefined])for(const on of [true,false]){
 const states={'button.refresh':{state:'unknown'},'button.power':{state:'2026-10-21T00:00:00Z'},...(remoteState?{'remote.tv':{state:remoteState}}:{})};
 assert.deepEqual(tvPowerAction(states,config,on),{domain:'button',service:'press',entity_id:on?'button.refresh':'button.power'});
}
assert.equal(tvPowerAction({'remote.tv':{state:'unavailable'},'button.power':{state:'unavailable'}},config,false),null);
assert.equal(tvPowerAction({},config,true),null);
assert.deepEqual(tvPowerAction({'media_player.tv':{state:'off'}},{tv_entity:'media_player.tv'},true),{domain:'media_player',service:'turn_on',entity_id:'media_player.tv'});
console.log('TV-Power: Remote, beide Fallbacks, Fehlerzustände und bisherige Karten geprüft; keine Dienste ausgeführt.');
