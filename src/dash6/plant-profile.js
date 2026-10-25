// Numeric ranges for BLE probes are configuration, never a fertilizer diagnosis.
export const PLANT_METRICS = [
 {key:'moisture',label:'Bodenfeuchte',icon:'mdi:water-percent',unit:'%',color:'#81c8ff',min:25,max:60,scale:[0,100],basis:'Richtwert · Substrat kalibrieren',low:'Boden prüfen',high:'Sehr feucht',digits:0},
 {key:'temperature',label:'Temperatur',icon:'mdi:thermometer',unit:'°C',color:'#ffbe88',min:20,max:30,scale:[0,45],basis:'Soja · Wachstumsbereich',low:'Zu kühl',high:'Zu warm',digits:1},
 {key:'illuminance',label:'Licht',icon:'mdi:white-balance-sunny',unit:'lx',color:'#f3db87',min:15000,max:null,scale:[0,60000],basis:'Tageslicht-Richtwert',low:'Wenig Licht',high:'',digits:0},
 {key:'conductivity',label:'Bodenfruchtbarkeit',icon:'mdi:sprout-outline',unit:'µS/cm',color:'#c3b3fa',min:350,max:2000,scale:[0,2500],basis:'EC-Indikator · Start-Richtwert',low:'EC-Indikator niedrig',high:'EC-Indikator erhöht',digits:0}
];
export function numericState(state){
 const s=state?.state;
 return s!==undefined&&s!==null&&String(s).trim()!==''&&Number.isFinite(Number(s))?Number(s):null;
}
export function plantReading(metric,state,{now=Date.now(),staleHours=6,night=false}={}){
 const value=numericState(state),reported=Date.parse(state?.last_reported||state?.last_updated||''),stale=Number.isFinite(reported)&&now-reported>staleHours*3600000;
 if(value===null)return {value,kind:'missing',text:'Kein Messwert',delta:null,stale:false};
 if(stale)return {value,kind:'stale',text:'Wert veraltet',delta:null,stale:true};
 if(metric.key==='illuminance'&&night)return {value,kind:'night',text:'Nachtruhe',delta:null,stale:false};
 if(metric.min===null&&metric.max===null)return {value,kind:'neutral',text:'Referenz offen',delta:null,stale:false};
 const delta=metric.min!==null&&value<metric.min?value-metric.min:metric.max!==null&&value>metric.max?value-metric.max:0;
 return {value,delta,kind:delta===0?'good':'attention',text:delta===0?'Im Zielbereich':delta<0?metric.low:metric.high,stale:false};
}

// A direct probe measures bulk conductivity, not N/P/K or a fertility percentage.
// Bounds are a configurable screening heuristic, not a validated soybean optimum.
export function fertilityAdvice(ec,moisture,temperature,ecMetric,moistureMetric,temperatureMetric){
 const valid=r=>r&&r.value!==null&&!['missing','stale'].includes(r.kind);
 if(!valid(ec))return {kind:'neutral',title:'Düngebedarf offen',detail:'Kein aktueller EC-Messwert. Auf frische Sensordaten warten.'};
 if(ecMetric.max!==null&&ec.value>ecMetric.max)return {kind:'attention',title:'Nicht weiter düngen',detail:'EC über dem eingestellten Prüfbereich. Eine erhöhte Salzbelastung ist möglich; Substrat prüfen.'};
 if(!valid(moisture))return {kind:'neutral',title:'Düngebedarf offen',detail:'Ohne aktuelle Bodenfeuchte lässt sich der EC-Indikator nicht sinnvoll einordnen.'};
 if(moistureMetric.min!==null&&moisture.value<moistureMetric.min)return {kind:'attention',title:'Noch nicht düngen',detail:'Das Substrat wirkt trocken. Zuerst Feuchte und Sensorkontakt prüfen; niedrige Leitfähigkeit kann durch Trockenheit entstehen.'};
 if(moistureMetric.max!==null&&moisture.value>moistureMetric.max)return {kind:'attention',title:'Düngung zurückstellen',detail:'Die Substratfeuchte liegt über dem Richtbereich. Erst Wasserhaushalt und Drainage prüfen.'};
 if(!valid(temperature))return {kind:'neutral',title:'Düngebedarf offen',detail:'Die Temperaturmessung fehlt oder ist veraltet.'};
 if((temperatureMetric.min!==null&&temperature.value<temperatureMetric.min)||(temperatureMetric.max!==null&&temperature.value>temperatureMetric.max))return {kind:'attention',title:'Düngung zurückstellen',detail:'Die Temperatur liegt außerhalb des Wachstumsbereichs. Erst die Wachstumsbedingungen prüfen.'};
 if(ecMetric.min===null&&ecMetric.max===null)return {kind:'neutral',title:'Düngebedarf offen',detail:'Für dieses Substrat ist noch kein EC-Prüfbereich eingestellt.'};
 if(ecMetric.min!==null&&ec.value<ecMetric.min)return {kind:'attention',title:'Düngung prüfen',detail:'EC niedrig bei passender Bodenfeuchte. Nährstoffmangel ist möglich; Bedarf vor einer Düngergabe bestätigen.'};
 return {kind:'good',title:'Kein Düngehinweis',detail:'EC liegt im eingestellten Prüfbereich. Aus diesem Indikator ergibt sich aktuell kein Hinweis zum Nachdüngen.'};
}
