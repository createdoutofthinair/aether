import * as T from 'three/webgpu';
import {random} from './leaf-model.js';
// Metres; stable attachment frames are generated once, never per render frame.
export function generateTree({species='birch',seed=481,height=3.8,levels=3,density=2,leafScale=1,mode='tree'}={}){
 const rnd=random(seed),segments=[],attachments=[];height=Math.max(.5,Math.min(12,height));levels=Math.max(1,Math.min(4,Math.round(levels)));density=Math.max(0,Math.min(4,density));
 const up=new T.Vector3(0,1,0),profile=species==='oak'?{spread:.98,taper:.67}:species==='willow'?{spread:.72,taper:.66}:{spread:.65,taper:.69};
 const limit=6000;let branchId=0;
 function grow(start,direction,length,radius,depth,parent=-1){
  const id=branchId++,steps=5,points=[start.clone()];let dir=direction.clone().normalize();
  for(let i=1;i<=steps;i++){
   dir.x+=(rnd()-.5)*.13;dir.z+=(rnd()-.5)*.13;
   dir.y+=species==='willow'&&depth>0?-.14:.045;dir.normalize();
   const end=points.at(-1).clone().addScaledVector(dir,length/steps);segments.push({start:points.at(-1).toArray(),end:end.toArray(),r0:radius*(1-(i-1)/steps*.6),r1:radius*(1-i/steps*.6),depth,id,parent});points.push(end);
  }
  if(depth<levels){
   const children=depth===0?9:3;
   for(let i=0;i<children;i++){
    const t=depth===0?.32+i*.065:.52+i*.21,index=Math.min(steps-1,Math.floor(t*steps)),f=t*steps-index;
    const pos=points[index].clone().lerp(points[index+1],f),a=i*2.399+depth*1.7+rnd()*.5;
    const next=new T.Vector3(Math.cos(a)*profile.spread,depth===0?.65:.22+rnd()*.3,Math.sin(a)*profile.spread).addScaledVector(dir,.35).normalize();
    grow(pos,next,length*(depth===0?.48:profile.taper)*(.82+rnd()*.3),radius*(depth===0?.36:.52),depth+1,id);
   }
  }
  if(depth>=Math.max(1,levels-1)){
   const count=Math.round((depth===levels?18:6)*density);
   for(let i=0;i<count&&attachments.length<limit;i++){
    const t=.3+.7*(i+.3+rnd()*.4)/Math.max(count,1),index=Math.min(steps-1,Math.floor(t*steps)),f=t*steps-index;
    const anchor=points[index].clone().lerp(points[index+1],f),a=i*2.399+rnd()*.3;
    const tangent=points[index+1].clone().sub(points[index]).normalize(),basis=new T.Vector3().crossVectors(tangent,Math.abs(tangent.y)>.95?new T.Vector3(1,0,0):up).normalize(),other=new T.Vector3().crossVectors(tangent,basis).normalize();
    const outward=basis.multiplyScalar(Math.cos(a)).addScaledVector(other,Math.sin(a));const leafDirection=outward.addScaledVector(tangent,.45).normalize();
    const petiole=.025*leafScale*(.7+rnd()*.6),base=anchor.clone().addScaledVector(leafDirection,petiole);
    attachments.push({anchor:anchor.toArray(),base:base.toArray(),direction:leafDirection.toArray(),roll:(rnd()-.5)*1.1,scale:leafScale*(.7+rnd()*.6),branch:id});
   }
  }
 }
 grow(new T.Vector3(),mode==='branch'?new T.Vector3(.8,.45,0):up,mode==='branch'?height*.4:height,mode==='branch'?height*.008:height*.026,0);
 return{segments,attachments,height,seed,species};
}
