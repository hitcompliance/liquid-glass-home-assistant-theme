import assert from 'node:assert/strict';
import {fridgeDoorHistory as count} from '../src/dash6/fridge-door-history.js';
const origin=Date.parse('2026-10-23T10:00:00Z'),h=3600000;
const row=(minutes,state)=>({last_changed:new Date(origin+minutes*60000).toISOString(),state});
async function run(rows){return count({entity_id:'binary_sensor.test'},new Date(origin),new Date(origin+2*h),{callApi:async()=>[rows]});}
let points=await run([row(-60,'off'),row(1,'on'),row(2,'off'),row(40,'on'),row(41,'off'),row(61,'on'),row(62,'off')]);assert.equal(points[0][1],2);assert.equal(points[1][1],1);
points=await run([row(-60,'on'),row(2,'off'),row(61,'on')]);assert.equal(points[0][1],0);assert.equal(points[1][1],1);
points=await run([row(-60,'off'),row(1,'unknown'),row(2,'on'),row(3,'off'),row(4,'on')]);assert.equal(points[0][1],null);
assert.deepEqual(await run([]),[]);
points=await run([row(-60,'off'),row(-20,'unavailable'),row(10,'off'),row(20,'on')]);assert.equal(points[0][1],null);assert.equal(points[1][1],0);
assert.equal(points.length,2);assert.equal(points[0][0],origin+h/2);
console.log('PASS: hourly transitions, initial open seed, unavailable gap, empty history');
