import * as T from 'three/webgpu';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function batchShip(root){
 root.updateMatrixWorld(true);const byMaterial=new Map(),source=new Set();
 root.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);source.add(o.geometry);if(!byMaterial.has(o.material))byMaterial.set(o.material,[]);byMaterial.get(o.material).push(geometry);});
 const batched=new T.Group();for(const [material,geometries]of byMaterial){const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)throw Error('Ship batching failed');material.transparent=false;material.opacity=1;material.depthWrite=true;batched.add(new T.Mesh(geometry,material));}source.forEach(g=>g.dispose());return batched;
}
const textureFields=['map','normalMap','aoMap','roughnessMap','metalnessMap'];
export function disposeShip(ship){const gs=new Set(),ms=new Set(),ts=new Set();ship.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material){ms.add(o.material);for(const k of textureFields)if(o.material[k])ts.add(o.material[k]);}});gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());ts.forEach(t=>t.dispose());}
/** Worker-to-renderer payload: transfer typed buffers, not JSON vertex arrays. */
export function packShip(root){const textures=[],textureIds=new Map(),meshes=[];root.traverse(o=>{if(!o.isMesh)return;const m=o.material,material={physical:m.isMeshPhysicalMaterial===true,color:m.color.getHex(),emissive:m.emissive.getHex(),emissiveIntensity:m.emissiveIntensity,roughness:m.roughness,metalness:m.metalness,clearcoat:m.clearcoat??0,clearcoatRoughness:m.clearcoatRoughness??0,normalScale:m.normalScale.toArray(),maps:{}};
 for(const key of textureFields){const t=m[key];if(!t)continue;if(!textureIds.has(t)){textureIds.set(t,textures.length);textures.push({data:t.image.data,width:t.image.width,height:t.image.height,mipmaps:t.mipmaps,colorSpace:t.colorSpace,wrapS:t.wrapS,wrapT:t.wrapT,minFilter:t.minFilter,magFilter:t.magFilter,anisotropy:t.anisotropy});}material.maps[key]=textureIds.get(t);}
 meshes.push({attributes:Object.fromEntries(Object.entries(o.geometry.attributes).map(([key,a])=>[key,{array:a.array,itemSize:a.itemSize,normalized:a.normalized}])),index:o.geometry.index?.array??null,material});});return{meshes,textures};}
export function shipTransfers(payload){const buffers=new Set();for(const m of payload.meshes){for(const a of Object.values(m.attributes))buffers.add(a.array.buffer);if(m.index)buffers.add(m.index.buffer);}for(const t of payload.textures){buffers.add(t.data.buffer);for(const mip of t.mipmaps)buffers.add(mip.data.buffer);}return [...buffers];}
export function unpackShip(payload){const textures=payload.textures.map(t=>{const tex=new T.DataTexture(t.data,t.width,t.height,T.RGBAFormat);for(const k of ['colorSpace','wrapS','wrapT','minFilter','magFilter','anisotropy'])tex[k]=t[k];tex.mipmaps=t.mipmaps;tex.generateMipmaps=false;tex.needsUpdate=true;return tex;}),root=new T.Group();
 for(const data of payload.meshes){const g=new T.BufferGeometry();for(const [key,a]of Object.entries(data.attributes))g.setAttribute(key,new T.BufferAttribute(a.array,a.itemSize,a.normalized));if(data.index)g.setIndex(new T.BufferAttribute(data.index,1));const {physical,normalScale,maps,...values}=data.material,m=physical?new T.MeshPhysicalMaterial():new T.MeshStandardMaterial();if(!physical){delete values.clearcoat;delete values.clearcoatRoughness;}m.setValues(values);m.normalScale.fromArray(normalScale);for(const [key,id]of Object.entries(maps))m[key]=textures[id];
 // Keep pipeline state constant through distant fades: opacity is a uniform.
 m.transparent=true;m.depthWrite=true;root.add(new T.Mesh(g,m));}
 const size=new T.Box3().setFromObject(root).getSize(new T.Vector3());root.userData.projectedExtent=Math.max(size.x,size.y);root.visible=false;return root;
}
