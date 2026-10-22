export const FLIGHT_INTERVAL=46;
export const FLIGHT_DURATION=38;
export const FORMATION_OFFSETS=Object.freeze([
 Object.freeze({x:0,y:9,z:-50}),
 Object.freeze({x:-12,y:7,z:-32}),
 Object.freeze({x:12,y:7,z:-32})
]);
/** Fixed world-space lanes: parallel motion away from the camera, projected by
 * the perspective camera itself. Never compensate screen coordinates for depth. */
export function flightState(index,clock,slot=0){
 const age=clock-(10+index*FLIGHT_INTERVAL),offset=FORMATION_OFFSETS[slot];
 if(!offset)throw Error('Unknown formation slot');
 return {index:index*3+slot,formation:index,slot,active:index>=0&&age>=0&&age<=FLIGHT_DURATION,
  seed:'CREDITS-FORMATION-'+index,scale:1.15,x:offset.x,y:offset.y,z:offset.z-age*2,
  opacity:Math.min(1,Math.max(0,age/2),Math.max(0,(FLIGHT_DURATION-age)/6))};
}
export function activeFlights(clock){const index=Math.floor((clock-10)/FLIGHT_INTERVAL);return index<0?[]:FORMATION_OFFSETS.map((_,slot)=>flightState(index,clock,slot)).filter(f=>f.active);}
