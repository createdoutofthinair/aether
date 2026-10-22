import * as T from 'three/webgpu';
import {Fn,vec3,float,uniform} from 'three/tsl';
import {sampleNebulaLighting} from './nebula-lighting.js';
/** Analytic broad nebula lobes feed the PBR environment path: the engine samples
 * reflection direction for metals/clearcoat and normal direction for diffuse.
 * Roughness broadens and attenuates the lobes. This is approximate environment
 * lighting, not a radiosity or multi-bounce GI solver. */
export function createShipLighting(){
 const lobes=Array.from({length:4},()=>({direction:uniform(new T.Vector3(0,1,0)),color:uniform(new T.Color(0))}));
 const environment=Fn(([],builder)=>{
  const direction=builder.context.getUV(),level=builder.context.getTextureLevel();
  const blur=level.mul(level).mul(3).add(1),sharpness=float(6).div(blur);
  let radiance=vec3(.004,.006,.01);
  for(const lobe of lobes)radiance=radiance.add(lobe.color.mul(direction.dot(lobe.direction).clamp(-1,1).sub(1).mul(sharpness).exp()).div(blur));
  return radiance;
 })();
 return {environment,update(clock,position){
  const samples=sampleNebulaLighting(clock,position);
  for(let i=0;i<lobes.length;i++){lobes[i].direction.value.fromArray(samples[i].direction);lobes[i].color.value.setRGB(...samples[i].color);}
 }};
}
export function applyShipLighting(ship){
 const lighting=createShipLighting();
 for(const mesh of ship.children){
  const old=mesh.material;
  const material=(old.isMeshPhysicalMaterial?new T.MeshPhysicalNodeMaterial():new T.MeshStandardNodeMaterial()).copy(old);
  material.envNode=lighting.environment;
  mesh.material=material;old.dispose();
 }
 ship.userData.nebulaLighting=lighting;
 return lighting;
}
