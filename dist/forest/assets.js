import * as T from 'three/webgpu';
import {texture,vec3,positionLocal,time,sin,attribute,mix,normalMap,vec2,float} from 'three/tsl';
export function geometry(data){const g=new T.BufferGeometry();for(const [name,key,size]of [['position','positions',3],['normal','normals',3],['uv','uvs',2]])g.setAttribute(name,new T.BufferAttribute(data[key],size));g.setIndex(new T.BufferAttribute(data.indices,1));g.computeBoundingSphere();return g;}
function tex(buffer,size,color=false){const t=new T.DataTexture(new Uint8Array(buffer),size,size);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.generateMipmaps=true;t.minFilter=T.LinearMipmapLinearFilter;t.anisotropy=4;t.needsUpdate=true;return t;}
export function makeVariant(data,{wind,debug}){
 const barkMaps=[tex(data.bark.color,256,true),tex(data.bark.normal,256),tex(data.bark.packed,256)],leafMaps=[tex(data.leaf.color,128,true),tex(data.leaf.normal,128),tex(data.leaf.packed,128)];
 const bark=new T.MeshStandardNodeMaterial({map:barkMaps[0],normalMap:barkMaps[1],roughnessMap:barkMaps[2],roughness:.95}),leaf=new T.MeshSSSNodeMaterial({map:leafMaps[0],normalMap:leafMaps[1],roughness:.65,side:T.DoubleSide});
 leaf.normalScale.set(.4,.4);leaf.thicknessColorNode=texture(leafMaps[0]).rgb.mul(.22);leaf.thicknessScaleNode=float(1.2);leaf.thicknessPowerNode=float(2);leaf.thicknessAttenuationNode=float(.6);
 const lods=data.lods.map(lod=>[geometry(lod.bark),geometry(lod.leaves)]);
 const source=new T.Group();source.add(new T.Mesh(lods[0][0],bark),new T.Mesh(lods[0][1],leaf));
 // Capture before attaching instance-only attributes and wind nodes.
 const setup=()=>{for(const [m,color]of [[bark,new T.Color(.7,.3,.12)],[leaf,new T.Color(.2,.8,.35)]]){
 const phase=attribute('forestPhase','float'),tint=attribute('forestTint','float'),h=positionLocal.y.div(data.height).clamp(0,1),sway=sin(time.mul(.8).add(phase).add(positionLocal.y.mul(.13))).mul(wind).mul(h.pow(2)).mul(.16);
 m.positionNode=positionLocal.add(vec3(sway,0,sway.mul(.4)));const level=attribute('forestLevel','float');m.colorNode=mix(texture(m.map).rgb.mul(tint),vec3(float(.9).sub(level.mul(.32)),float(.3).add(level.mul(.2)),float(.15).add(level.mul(.35))),debug);m.alphaHash=true;m.opacityNode=attribute('forestFade','float');
 }};
 return{...data,lods,barkMaterial:bark,leafMaterial:leaf,source,setup,maps:[...barkMaps,...leafMaps]};
}
export function instanceBucket(g,material,capacity){const geometry=g.clone();for(const key of ['forestFade','forestLevel','forestScale'])geometry.setAttribute(key,new T.InstancedBufferAttribute(new Float32Array(capacity),1));geometry.setAttribute('forestPhase',new T.InstancedBufferAttribute(new Float32Array(capacity),1));geometry.setAttribute('forestTint',new T.InstancedBufferAttribute(new Float32Array(capacity),1));geometry.setAttribute('forestYaw',new T.InstancedBufferAttribute(new Float32Array(capacity),1));geometry.setAttribute('forestFrame',new T.InstancedBufferAttribute(new Float32Array(capacity*4),4));const mesh=new T.InstancedMesh(geometry,material,capacity);mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);return mesh;}
