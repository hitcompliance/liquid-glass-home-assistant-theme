import assert from 'node:assert/strict';
import {adbPower,tvReportedPower} from '../src/dash6/tv-status.js';
for(const [text,on] of [['mWakefulness=Awake',true],['mWakefulness=Dreaming',true],['mWakefulness=Asleep',false],['mWakefulness=Dozing',false],['Display Power: state=ON',true],['Display Power: state=OFF',false],['Display Power: state=DOZE',false],['mWakefulness=Asleep\nDisplay Power: state=ON',false],['',null],['error: disconnected',null],['mWakefulness=Awakening',null],['Display Power: state=ONLINE',null],[null,null]])assert.equal(adbPower(text),on,text);
const host={_config:{tv_entity:'media_player.tv',tv_status_command:'status'},hass:{states:{'media_player.tv':{state:'off',last_updated:'old'}}},_tvAdbStatus:{entity:'media_player.tv',command:'status',on:true,at:Date.now()}};
assert.equal(tvReportedPower(host).on,true);
host._tvAdbStatus.at-=100000;assert.equal(tvReportedPower(host).on,false,'expired ADB result cannot overrule live state');
console.log('ADB-Statusparser: Wach-/Schlafzustände, Display-Fallback, unbekannte Ausgabe und Ablauf bestanden.');
