export const FLIGHT_INTERVAL=140;
export const FORMATION_OFFSETS=Object.freeze([
 Object.freeze({x:0,y:18,z:38}),
 Object.freeze({x:-24,y:14,z:60}),
 Object.freeze({x:24,y:14,z:60})
]);
/** Ships start behind the camera and pass into its frustum. No opacity or
 * timed disappearance: distance alone reduces their projected size. */
export function flightState(index,clock,slot=0){
 const age=clock-(10+index*FLIGHT_INTERVAL),offset=FORMATION_OFFSETS[slot];
 if(!offset)throw Error('Unknown formation slot');
 return {index:index*3+slot,formation:index,slot,active:index>=0&&age>=0,
  seed:'CREDITS-FLEET-V3-'+index+'-'+slot,scale:1.15,x:offset.x,y:offset.y*(index%2?-1:1),z:offset.z-age*8};
}
export function activeFlights(clock){const latest=Math.floor((clock-10)/FLIGHT_INTERVAL),flights=[];for(let index=0;index<=latest;index++)for(let slot=0;slot<3;slot++)flights.push(flightState(index,clock,slot));return flights;}
