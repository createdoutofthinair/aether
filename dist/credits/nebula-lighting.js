import {presets} from '../nebula/renderer.js?v=volume-perf-8';
// Matches the volume renderer's encounter spacing, centres and palette order.
export const NEBULA_TRAVEL_SPEED=.85;
export const NEBULA_SPACING=64;
export const NEBULA_PALETTES=Object.values(presets).map(p=>[p.colorA,p.colorB].map(hex=>[1,3,5].map(i=>(parseInt(hex.slice(i,i+2),16)/255)**2.2)));
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
/** Two nearest clouds, two coloured lobes each. Compact support makes slot
 * changes continuous, including restart/seek; no readback or volume render. */
export function sampleNebulaLighting(clock,position){
 const travel=clock*NEBULA_TRAVEL_SPEED,base=Math.floor((travel-40-position.z)/NEBULA_SPACING),samples=[];
 for(let id=base;id<=base+1;id++){
  const kind=((id%6)+6)%6,angle=-.28+Math.sin(id*1.8)*.24;
  const cx=Math.sin(id*2.4)*2.1,cy=-Math.cos(id*1.7)*.65,cz=travel-id*NEBULA_SPACING-40;
  const distance=Math.hypot(cx-position.x,cy-position.y,cz-position.z);
  const strength=(1-smooth((distance-40)/24))/(1+(distance/24)**2)*1.4;
  // Volume kinds 2 and 3 are vertical/split; rotate their emitting regions.
  const axis=kind===2||kind===3?0:Math.PI/2;
  for(let side=0;side<2;side++){
   const sign=side?1:-1,ox=Math.sin(axis+angle)*6*sign,oy=Math.cos(axis+angle)*3*sign;
   const dx=cx+ox-position.x,dy=cy+oy-position.y,dz=cz-position.z,length=Math.hypot(dx,dy,dz)||1;
   samples.push({direction:[dx/length,dy/length,dz/length],color:NEBULA_PALETTES[kind][side].map(c=>c*strength),strength});
  }
 }
 return samples;
}
