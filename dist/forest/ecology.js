// Pure deterministic ecology, ground and projected-size LOD policy.
import {random} from '../nature/leaf-model.js';
export const SPECIES=['birch','oak','willow'];
export const VARIANTS=9;
export function groundHeight(x,z){return Math.sin(x*.014)*Math.cos(z*.019)*3+Math.sin((x+z)*.037)*.55;}
export function habitat(x,z,seed){return{moisture:.5+.5*Math.sin(x*.021+Math.sin(z*.015)+seed*.001),light:.5+.5*Math.cos(z*.024-x*.009+seed*.003)};}
export function scatterForest({seed=481,count=2500,extent=360}={}){
 const rnd=random(seed),trees=[],cells=new Map(),minSpacing=2.6,step=minSpacing,limit=Math.min(12000,Math.max(0,Math.round(count))),size=Math.max(80,Math.min(800,extent));
 for(let attempt=0;trees.length<limit&&attempt<limit*45;attempt++){
 const x=(rnd()-.5)*size,z=(rnd()-.5)*size,{moisture,light}=habitat(x,z,seed),patch=.5+.5*Math.sin(x*.033+Math.sin(z*.026)*1.8+seed*.001),trail=Math.abs(z-Math.sin(x*.018)*15);
 if(trail<3.5||patch<.16||rnd()>.45+patch*.55)continue;
 const ix=Math.floor(x/step),iz=Math.floor(z/step);let crowded=false;for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(const t of cells.get(`${ix+a},${iz+b}`)||[])if(Math.hypot(t.x-x,t.z-z)<minSpacing)crowded=true;if(crowded)continue;
 const chance=rnd(),species=moisture>.73&&chance<.7?2:light>.6&&chance<.62?0:1,age=rnd(),variant=species*3+Math.min(2,Math.floor(age*3)),scale=.62+age*.72+rnd()*.2;
 const tree={id:trees.length,x,z,y:groundHeight(x,z),yaw:rnd()*Math.PI*2,scale,width:.85+rnd()*.3,variant,tint:.88+rnd()*.22,phase:rnd()*Math.PI*2};trees.push(tree);const key=`${ix},${iz}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push(tree);
 }return{seed,count:trees.length,extent:size,trees};
}
export function projectedPixels(height,distance,viewportHeight,fov=55){return height*viewportHeight/(2*Math.tan(fov*Math.PI/360)*Math.max(1,distance));}
export function selectTreeLOD(pixels,previous=-1,impostors=true){const cuts=impostors?[240,100,36]:[240,100,0];if(previous>=0&&previous<=3){const lo=previous<3?cuts[previous]*.88:0,hi=previous>0?cuts[previous-1]*1.12:Infinity;if(pixels>=lo&&pixels<=hi)return previous;}return pixels>=cuts[0]?0:pixels>=cuts[1]?1:pixels>=cuts[2]?2:3;}
export function impostorFrame(dx,dy,dz,yaw){const az=((Math.atan2(dx,dz)-yaw)/(2*Math.PI)%1+1)%1*8,el=Math.atan2(Math.max(0,dy),Math.hypot(dx,dz)),row=Math.max(0,Math.min(2,Math.round(el/(Math.PI/4))));return{a:Math.floor(az)%8,b:(Math.floor(az)+1)%8,row,blend:az-Math.floor(az)};}
