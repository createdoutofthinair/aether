import * as T from 'three/webgpu';
import {texture,attribute,mix,vec3,float} from 'three/tsl';
import {unpackShip} from '../render/ship-assets.js';
import {windowNodes} from './window-nodes.js';
import {transitionMask} from '../forest/coverage.js';
/** Restore geometry once; canonical materials and textures are shared by all
 * prototypes, their LODs and every instanced placement in the city. */
export function restoreLibrary(data,{debug}){
 const source=unpackShip(data.payload),canonical=new Map(),maps=new Set();
 for(const mesh of source.children){
  const original=mesh.material,key=original.name;
  if(!canonical.has(key)){
   const m=new T.MeshStandardNodeMaterial().copy(original);m.transparent=false;m.depthWrite=true;m.maskNode=transitionMask();
   const base=m.map?texture(m.map).rgb.mul(vec3(m.color.r,m.color.g,m.color.b)):vec3(m.color.r,m.color.g,m.color.b),level=attribute('forestLevel','float');
   m.colorNode=mix(base,vec3(float(.92).sub(level.mul(.22)),float(.29).add(level.mul(.2)),float(.14).add(level.mul(.25))),debug);
   windowNodes(m);canonical.set(key,m);for(const field of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[field])maps.add(m[field]);
  }
  mesh.material=canonical.get(key);original.dispose();
 }
 const variants=data.entries.map(entry=>{
  const lods=entry.lods.map(({start,count})=>source.children.slice(start,start+count)),capture=new T.Group();
  // Capture the medium asset, which keeps primary masses, roof silhouettes,
  // access geometry and facade zoning without near-field fasteners.
  for(const m of lods[1])capture.add(new T.Mesh(m.geometry,m.material));
  const box=new T.Box3().setFromObject(capture),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
  const shadow=entry.shadow?source.children.slice(entry.shadow.start,entry.shadow.start+entry.shadow.count):lods[2];
  return{plan:entry.plan,lods,shadow,capture,center,height:size.y,radius:size.length()/2,atlas:null,impostor:null};
 });
 return{source,variants,materials:[...canonical.values()],maps:[...maps],dispose(){const geometries=new Set(source.children.map(m=>m.geometry));geometries.forEach(g=>g.dispose());canonical.forEach(m=>m.dispose());maps.forEach(t=>t.dispose());}};
}
