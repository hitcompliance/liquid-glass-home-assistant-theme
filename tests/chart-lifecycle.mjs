import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the actual adapter against a delayed history request, as in the
// installed ApexCharts Card 2.2.3: it reads this._apexChart.axes after awaiting
// history. No browser, HA data or physical device services are involved.
const source=await readFile(new URL('../src/dash6/card-runtime.js',import.meta.url),'utf8');
const start=source.indexOf(' class Chart extends Base {');
const end=source.indexOf(" customElements.define('dash6-apexcharts-card',Chart);",start);
assert.ok(start>=0&&end>start);
let Chart;
class Base {
 connectedCallback(){}
 disconnectedCallback(){this._updating=false;}
 async _updateData(){
  this.calls++;
  await this.history;
  // Preserve the failing upstream access, rather than hiding the race in a mock.
  assert.equal(this._apexChart.axes.alive,true);
  await this._apexChart.updateOptions({});
 }
}
vm.runInNewContext(source.slice(start,end)+'\nregister(Chart);',{
 Base,register:value=>{Chart=value;},unsafeCSS:x=>x,statisticsCSS:'',
 css:()=>'',html:()=>'',AbortController,queueMicrotask,
 bindThemePreferences(){},unbindThemePreferences(){},window:{addEventListener(){},removeEventListener(){}},
});
function fixture(){
 const card=new Chart();card.isConnected=true;card.calls=0;card.updates=0;card.destroyed=0;
 card._dash6ChartReady=true;card._graphs=[{}];
 card._loaded=true;card._dataLoaded=true;
 card._apexChart={axes:{alive:true},
  async updateOptions(){card.updates++;},
  destroy(){this.axes.alive=false;card.destroyed++;},
 };
 let finish;card.history=new Promise(resolve=>{finish=resolve;});
 return {card,finish};
}
{
 const {card,finish}=fixture();const chart=card._apexChart;
 const pending=card._updateData();card.isConnected=false;card.disconnectedCallback();
 assert.equal(card._apexChart,chart,'keep instance until pending history settles');
 assert.equal(card.destroyed,0,'never destroy during a pending history request');
 finish();await pending;
 assert.equal(card.destroyed,1,'release once the detached task finishes');
 assert.equal(card._apexChart,undefined);
 assert.equal(card.updates,0,'detached chart never redraws');
 assert.equal(card._dash6DataTask,null,'settled tasks release their references');
}
{
 const {card,finish}=fixture();
 const first=card._updateData(),second=card._updateData();
 assert.equal(first,second,'overlapping updates share the pending request');
 finish();await first;
 assert.equal(card.calls,1);assert.equal(card.updates,1);assert.equal(card.destroyed,0);
}
{
 const {card,finish}=fixture();const chart=card._apexChart;
 const pending=card._updateData();card.isConnected=false;card.disconnectedCallback();
 card.isConnected=true;card.connectedCallback();finish();await pending;
 assert.equal(card._apexChart,chart,'a reattached card retains its live chart');
 assert.equal(card.destroyed,0);assert.equal(card.updates,1);
 card.isConnected=false;card.disconnectedCallback();
 assert.equal(card.destroyed,1);
}
{
 const {card,finish}=fixture();let finishInitial;
 card._dash6Loading=new Promise(resolve=>{finishInitial=resolve;});
 const pending=card._updateData();card.isConnected=false;card.disconnectedCallback();
 finish();await pending;assert.equal(card.destroyed,0,'initial rendering also owns the instance');
 finishInitial();await card._dash6Loading;card._dash6Loading=null;card._releaseCharts();
 assert.equal(card.destroyed,1);
}
console.log('PASS: pending history, detach/reconnect, overlapping updates and initial-render ownership.');
