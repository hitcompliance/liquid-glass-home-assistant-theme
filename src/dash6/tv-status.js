// Only an explicit card option enables read-only ADB status polling.
export const TV_STATUS_COMMAND='dumpsys power | grep -e "mWakefulness=" -e "Display Power"';
export function adbPower(value){
 if(typeof value!=='string')return null;
 const wake=value.match(/\bmWakefulness\s*=\s*(Awake|Dreaming|Asleep|Dozing)\b/i);
 if(wake)return /^(awake|dreaming)$/i.test(wake[1]);
 const display=value.match(/\bDisplay Power\s*:\s*state\s*=\s*(ON|OFF|DOZE|DOZE_SUSPEND)\b/i);
 return display?/^ON$/i.test(display[1]):null;
}
export function tvReportedPower(host){
 const config=host._config||{},state=host.hass?.states[config.tv_entity],adb=host._tvAdbStatus;
 if(config.tv_status_command&&adb?.entity===config.tv_entity&&adb.command===config.tv_status_command&&Date.now()-adb.at<90000)
  return {on:adb.on,known:true,stamp:'adb:'+adb.at};
 return {on:!!state&&!['off','standby','unknown','unavailable'].includes(state.state),known:!!state&&!['unknown','unavailable'].includes(state.state),stamp:state?.last_updated||state?.last_changed||state?.state};
}
const polling=new WeakMap();
export function stopTvAdbStatus(host){const p=polling.get(host);if(p)clearTimeout(p.timer);polling.delete(host);host._tvAdbStatus=null;}
export function syncTvAdbStatus(host,delay=0){
 const config=host._config||{},entity=config.tv_entity,command=config.tv_status_command;
 if(!host.isConnected||!entity||!command){stopTvAdbStatus(host);return;}
 let p=polling.get(host);const key=entity+'|'+command;
 if(p?.key===key&&!delay)return;
 if(p?.busy&&p.key===key)return;
 stopTvAdbStatus(host);p={key,timer:null,busy:false};polling.set(host,p);
 const run=async()=>{
  if(polling.get(host)!==p||!host.isConnected)return;
  p.busy=true;
  try{
   const state=host.hass?.states[entity];
   if(typeof document!=='undefined'&&document.visibilityState==='hidden')return;
   if(!state||['unknown','unavailable'].includes(state.state)){host._tvAdbStatus=null;return;}
   // HA runs this inside the device shell. Its response is also published as adb_response.
   const previous=state.attributes?.adb_response;
   const result=await host.hass.callWS({type:'call_service',domain:'androidtv',service:'adb_command',service_data:{entity_id:entity,command:String(command).replace(/^adb\s+shell\s+/i,'')},return_response:true});
   if(polling.get(host)!==p||!host.isConnected)return;
   const reply=result?.response?.[entity]?.adb_response??result?.[entity]?.adb_response;
   const current=host.hass?.states[entity]?.attributes.adb_response;
   const on=adbPower(reply??(current!==previous?current:null));
   host._tvAdbStatus=on===null?null:{entity,command,on,at:Date.now()};
  }catch{if(polling.get(host)===p)host._tvAdbStatus=null;}
  finally{p.busy=false;if(polling.get(host)===p&&host.isConnected){host.requestUpdate();p.timer=setTimeout(run,60000);}}
 };
 p.timer=setTimeout(run,delay);
}
