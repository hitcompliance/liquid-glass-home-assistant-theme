// Shared severity semantics serialized into the dashboard's device-health Pills.
export function roomProblemSeverity(s) {
 if (!s || ['unknown','unavailable'].includes(s.state)) return 1;
 const a=s.attributes||{}, value=String(s.state).toLowerCase();
 if (a.device_class==='connectivity') return value==='off'?1:0;
 if (s.entity_id.startsWith('binary_sensor.') && value==='off') return 0;
 if (['0','none','no_error','no_fault','ok','normal','clear','off','false'].includes(value)) return 0;
 const declared=String(a.severity||a.fault_severity||a.error_severity||'').toLowerCase();
 if (/critical|fatal|severe|high|schwer/.test(declared)) return 2;
 if (/warning|minor|low|leicht/.test(declared)) return 1;
 const text=(s.entity_id+' '+(a.friendly_name||'')+' '+value).toLowerCase();
 if (/overheat|overtemperature|überhitz|uberhitz|overload|überlast|uberlast|overpower|overvoltage|überspann|uberspann|overcurrent|überstrom|uberstrom|battery_error|charging_error|internal_error|voltage_error|fan_error|temperature_protection|wheels_jammed|brush_jammed|lidar_blocked|bumper_stuck|robot_trapped/.test(text)) return 2;
 if (a.device_class==='battery' || /water|wasser|tank|reinigungsfl|cleaning.fluid|dust.?bin|dustbin|filter|strainer|brush|bürst|burste|dirty|dirt|schmutz|maintenance|wartung|low_battery|battery_low|configuration|konfiguration|restart|reboot|neustart|communication|kommunikation|connect|verbindung|lid_open|latch_open|mop.*missing/.test(text)) return 1;
 return 2;
}
export function roomProblemSummary(ids, states) {
 const levels=ids.map(id=>roomProblemSeverity(states[id]));
 const severe=levels.filter(n=>n===2).length, mild=levels.filter(n=>n===1).length;
 const missing=ids.filter(id=>!states[id]||['unknown','unavailable'].includes(states[id].state)).length;
 return {color:severe?'var(--red-color)':mild?'var(--amber-color)':'var(--green-color)',
  label:severe?'Geräte · '+severe+' schwere Fehler'+(mild?' · '+mild+' Hinweise':''):mild?(missing===mild?'Geräte · Status unvollständig':'Geräte · '+mild+' Hinweise'):'Geräte · OK'};
}
