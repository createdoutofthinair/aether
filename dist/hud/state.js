// Renderer-independent demo telemetry. Values are illustrative, not flight physics.
export const scenarios = {
  cruise: {name:'Orbital cruise', speed:284, altitude:42800, heading:72, pitch:2, shield:100, hull:100, fuel:86, heat:32, target:'relay', warning:''},
  approach: {name:'Surface approach', speed:78, altitude:1840, heading:116, pitch:-8, shield:100, hull:100, fuel:82, heat:43, target:'port', warning:''},
  encounter: {name:'Unknown contact', speed:196, altitude:24600, heading:248, pitch:5, shield:72, hull:100, fuel:79, heat:61, target:'unknown', warning:'CAUTION · UNIDENTIFIED CONTACT'},
  emergency: {name:'Systems emergency', speed:92, altitude:7200, heading:312, pitch:-3, shield:28, hull:64, fuel:64, heat:91, target:'port', warning:'WARNING · SHIELD CRITICAL / HIGH TEMPERATURE'}
};
export const contacts = [
  {id:'relay', name:'KEPLER RELAY', type:'Navigation beacon', distance:24.8, code:'KPL–07', symbol:'◇', x:.59,y:.37},
  {id:'port', name:'NACRE OUTPOST', type:'Surface landing site', distance:8.4, code:'NCR–01', symbol:'□', x:.47,y:.57},
  {id:'unknown', name:'UNKNOWN VESSEL', type:'Unidentified contact', distance:3.2, code:'UNK–03', symbol:'△', x:.69,y:.48}
];
export function createState(){return {scenario:'cruise', ...scenarios.cruise, time:0, throttle:62, power:[34,33,33], paused:false, mode:'NAV', selected:null, locked:false, scan:0, scanning:false, acknowledged:false};}
export function setScenario(s,id){if(!scenarios[id])return false;Object.assign(s,scenarios[id],{scenario:id,selected:null,locked:false,scan:0,scanning:false,acknowledged:false});return true;}
export function allocatePower(s,index,value){
  const v=Math.max(0,Math.min(100,Math.round(Number(value)||0)));const others=[0,1,2].filter(i=>i!==index);const rest=100-v;const total=s.power[others[0]]+s.power[others[1]];
  s.power[index]=v;s.power[others[0]]=total?Math.round(rest*s.power[others[0]]/total):Math.round(rest/2);s.power[others[1]]=rest-s.power[others[0]];
}
export function selectContact(s,id){if(!contacts.some(c=>c.id===id))return false;s.selected=id;s.locked=false;s.scan=0;s.scanning=false;return true;}
export function tick(s,dt){
  if(s.paused)return;s.time+=dt;
  const base=scenarios[s.scenario];const requestedSpeed=base.speed*s.throttle/62*(.7+s.power[0]/110);const targetSpeed=s.mode==='SCM'?Math.min(200,requestedSpeed):requestedSpeed;
  s.speed+=(targetSpeed-s.speed)*(1-Math.exp(-dt*.8));
  const targetHeat=Math.max(15,Math.min(99,base.heat+(s.throttle-62)*.22-(s.power[1]-33)*.25));
  s.heat+=(targetHeat-s.heat)*(1-Math.exp(-dt*.25));
  if(s.scanning){s.scan=Math.min(100,s.scan+dt*25);if(s.scan===100)s.scanning=false;}
}
