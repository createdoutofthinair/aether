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
 const lighting=createShipLighting(),converted=new Map();
 ship.traverse(mesh=>{
  if(!mesh.isMesh)return;
  const old=mesh.material;
  if(converted.has(old)){mesh.material=converted.get(old);return;}
  // The atlas is shared by many unbatched studio parts. Copy each material once.
  // Texture ownership transfers to the viewer/pool; don't dispose hull textures.
  const data=old.userData;old.userData={};
  const material=old.isMeshPhysicalMaterial?new T.MeshPhysicalNodeMaterial():new T.MeshStandardNodeMaterial();
  try{material.copy(old);}finally{old.userData=data;}material.userData=data;
  material.envNode=lighting.environment;
  mesh.material=material;converted.set(old,material);if(!data.hull)old.dispose();
 });
 ship.userData.nebulaLighting=lighting;
 return lighting;
}
