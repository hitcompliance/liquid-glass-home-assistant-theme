import {inDashboardScope} from './scope.js';
// HA is a SPA: window.load alone does not mean that embedded views and
// server-rendered entity lists have finished building. Ignore chart internals
// themselves, otherwise waiting for chart data would deadlock the page.
export function createReadinessGate({probe,now=()=>performance.now(),delay=ms=>new Promise(r=>setTimeout(r,ms)),quiet=1000}={}){
 let settledKey='',settledAt=0;
 return async function wait(signal){
  let previous='',stableSince=now();
  while(!signal?.aborted){
   const state=probe();
   if(state.key!==previous||state.pending){previous=state.key;stableSince=now();}
   if(!state.pending&&now()-stableSince>=quiet){
    settledKey=state.key;settledAt=now();return true;
   }
   if(!state.pending&&state.key===settledKey&&settledAt){return true;}
   await delay(100);
  }
  return false;
 };
}
const ids=new WeakMap();let nextId=0,lastProbe=-Infinity,lastState;
function probe(){
 if(performance.now()-lastProbe<80)return lastState;
 lastProbe=performance.now();
 const key=[location.pathname];let pending=document.readyState!=='complete';
 function walk(root){for(const el of root.children||[]){
  const tag=el.localName;
  // Theme/style refreshes and clock ticks do not rebuild the view.
  if(['style','script','link'].includes(tag))continue;
  if(tag==='dash6-apexcharts-card'||tag==='apexcharts-card'||tag==='mini-graph-card')continue;
  if(!ids.has(el))ids.set(el,++nextId);
  key.push(ids.get(el));
  if(el.isUpdatePending)pending=true;
  if((tag==='dash6-profile-card'||tag==='dash6-render-card')&&!el._child&&!el._error)pending=true;
  if(tag==='dash6-auto-entities'&&el._dash6InitialBuilt===false&&!el.error)pending=true;
  if(tag==='dash6-embedded-view-card'&&!el._activeViewElement&&!el._error&& !el.querySelector('.error'))pending=true;
  if(tag==='img'&&!el.complete)pending=true;
  walk(el);if(el.shadowRoot)walk(el.shadowRoot);
 }}
 walk(document);
 return lastState={key:key.join(','),pending};
}
const wait=createReadinessGate({probe});
export async function waitForViewReady(signal){
 if(typeof document==='undefined'||!inDashboardScope()||!document.querySelector('home-assistant'))return !signal?.aborted;
 const ready=await wait(signal);
 if(ready){performance.mark('dash6-view-ready');}
 return ready;
}
