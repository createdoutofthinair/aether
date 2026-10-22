import {random} from '../ships/blueprint.js';
export const FLIGHT_INTERVAL=18;
/** A repeatable flight schedule; positions depend on playback time, never wall time. */
export function flightState(index,clock,aspect=1){
 const r=random('aether-credits-flight-v1:'+index),side=r()<.5?-1:1,duration=20+r()*5;
 const t=(clock-(10+index*FLIGHT_INTERVAL))/duration;
 const lane=(r()<.5?-1:1)*(.55+r()*.22),depth=85+r()*35;
 return {active:index>=0&&t>=0&&t<=1,t,side,duration,seed:'CREDITS-'+Math.floor(r()*1e8),scale:.95+r()*.4,
  x:side*(1.35-2.7*t),y:lane+Math.sign(lane)*Math.sin(Math.max(0,Math.min(1,t))*Math.PI)*.08,z:-depth+(depth-32)*t,
  opacity:Math.min(1,Math.max(0,t*8),Math.max(0,(1-t)*8)),aspect};
}
export function activeFlights(clock,aspect=1){const latest=Math.floor((clock-10)/FLIGHT_INTERVAL);return [latest-1,latest].filter(i=>i>=0).map(i=>({index:i,...flightState(i,clock,aspect)})).filter(s=>s.active);}
