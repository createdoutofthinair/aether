export const FLIGHT_INTERVAL=24;
export const FLIGHT_LIFETIME=46;
export const FORMATION_OFFSETS=Object.freeze([
 Object.freeze({x:0,y:18,z:38}),
 Object.freeze({x:-24,y:14,z:60}),
 Object.freeze({x:24,y:14,z:60})
]);
/** Overlapping waves fly parallel. Only distant ships fade (200–300 metres),
 * after their close pass; bounded lifetimes keep at most two formations alive. */
export function flightState(index,clock,slot=0){
 const age=clock-(10+index*FLIGHT_INTERVAL),offset=FORMATION_OFFSETS[slot];
 if(!offset)throw Error('Unknown formation slot');
 const z=offset.z-age*8,t=Math.max(0,Math.min(1,(-z-200)/100));
 return {index:index*3+slot,formation:index,slot,active:index>=0&&age>=0&&age<FLIGHT_LIFETIME,
  opacity:1-t*t*(3-2*t),seed:'CREDITS-FLEET-V3-'+index+'-'+slot,scale:1.15,x:offset.x,y:offset.y*(index%2?-1:1),z};
}
export function activeFlights(clock){const latest=Math.floor((clock-10)/FLIGHT_INTERVAL),flights=[];for(let index=Math.max(0,latest-1);index<=latest;index++)for(let slot=0;slot<3;slot++){const f=flightState(index,clock,slot);if(f.active&&f.opacity>0)flights.push(f);}return flights;}
