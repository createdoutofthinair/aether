import * as T from '../vendor-gpu/three.webgpu.js';
import {restoreArchitecture,compileArchitecture,architectureBounds} from './architecture.js';
import {cityMaterials,buildingModel} from './model.js';
import {batchShip,packShip,shipTransfers,disposeShip} from '../render/worker-kit/ship-assets.js';
function category(name){
 if(/entry|pressure|access/.test(name))return 'access';
 if(/plant|roof|crown|solar|garden/.test(name))return 'roof';
 if(/brace|support|spine|exoskeleton/.test(name))return 'structure';
 if(/envelope/.test(name))return 'envelope';
 if(/foundation/.test(name))return 'foundation';
 return 'facade';
}
self.onmessage=({data})=>{
 try{
  const recipe=restoreArchitecture(data.recipe),assembly=compileArchitecture(recipe),bounds=architectureBounds(assembly),materials=cityMaterials(recipe.seed,data.wear??.35,recipe.style,recipe.design),plan={architecture:recipe,variant:recipe.profile||0},lod=Math.max(0,Math.min(2,Number(data.lod)||0)),model=buildingModel(plan,lod,materials),sets=new Map(),root=new T.Group(),parts=[];
  for(const mesh of [...model.children]){const moduleId=mesh.userData.moduleId||'foundation',kind=category(mesh.name),key=moduleId+':'+kind;if(!sets.has(key))sets.set(key,{moduleId,kind,group:new T.Group()});sets.get(key).group.add(mesh);}
  for(const {moduleId,kind,group}of sets.values()){
   const batch=batchShip(group),start=root.children.length;for(const mesh of [...batch.children])root.add(mesh);parts.push({moduleId,kind,start,count:root.children.length-start});
  }
  let triangles=0,vertices=0;for(const mesh of root.children){triangles+=mesh.geometry.index.count/3;vertices+=mesh.geometry.attributes.position.count;}
  const payload=packShip(root);self.postMessage({id:data.id,recipe,assembly,bounds,parts,stats:{triangles,vertices,draws:root.children.length,materials:materials.all.length},payload},shipTransfers(payload));disposeShip(root);
 }catch(e){self.postMessage({id:data.id,error:e.stack||e.message});}
};
