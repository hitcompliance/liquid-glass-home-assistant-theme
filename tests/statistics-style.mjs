import {statisticsConfig} from '../src/dash6/statistics-style.js';
import assert from 'node:assert/strict';
for(const title of ['Energie · 24 h','Leistung · 24 h','Raumverbrauch · 24 h'])for(const stacked of [true,false]){
 const input={header:{title},series:[{entity:'sensor.test',transform:'return Number(x)/1000;',data_generator:'return [[start.getTime(),0],[end.getTime(),-1]];'}],apex_config:{chart:{stacked},yaxis:{min:0,max:'EVAL:function(max){return Math.max(.1,max);}'},tooltip:{custom:'EVAL:function(args){return args.series;}'}}};
 const saved=JSON.stringify(input);assert.deepEqual(statisticsConfig(input),input);assert.equal(JSON.stringify(input),saved);
}
const climate=statisticsConfig({header:{title:'Raumklima • 24 h'},yaxis:[{id:'temperature',min:15,max:35}],series:[{entity:'sensor.wohnzimmer_luftfeuchtigkeit_2',name:'Temperatur (Quelle inaktiv)',show:{legend_value:false}}]});assert.equal(climate.series[0].entity,'climate.wohnzimmer_smart_thermostat');assert.equal(climate.series[0].show.legend_value,true);assert.equal(climate.yaxis[0].min,15);assert.equal(climate.yaxis[0].max,35);
console.log('PASS: original axes, stacking, scales, zero/negative values, generators, transformations and tooltips preserved; current temperature retained.');
