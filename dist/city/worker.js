import {grammarBuildingModel} from './grammar-model.js';
import {nativeSilhouette,nativeMidModel} from './native-silhouette.js';
import {buildingShadowModel} from './shadow-model.js';
import * as T from '../vendor-gpu/three.webgpu.js';
import {cityBlueprint,buildingBlueprint,PROTOTYPES} from './blueprint.js';
import {cityMaterials,buildingModel} from './model.js';
import {batchShip,packShip,shipTransfers,disposeShip} from '../render/worker-kit/ship-assets.js';
self.onmessage=({data})=>{
 try{
  if(data.type==='layout'){self.postMessage({id:data.id,layout:cityBlueprint(data.options)});return;}
  if(data.type!=='library')throw Error('Unknown city generation request');
  const materials=cityMaterials(data.seed,data.wear,data.architecture?.style,{...data.architecture?.design,deferFinish:data.gpuFinish===true}),library=new T.Group(),entries=[];
  for(let variant=0;variant<PROTOTYPES;variant++){
   const plan=buildingBlueprint(variant,data.seed,data.architecture,data.assets),lods=[];
   for(let lod=0;lod<3;lod++){
    const model=plan.native?(lod===2?nativeSilhouette(plan.native,materials):lod===1?nativeMidModel(plan.native,materials):grammarBuildingModel(plan.native,materials,{lod})):buildingModel(plan,lod,materials),batch=batchShip(model),start=library.children.length,count=batch.children.length;
    for(const mesh of [...batch.children])library.add(mesh);
    lods.push({start,count});
   }
   const shadowBatch=batchShip(plan.native?nativeSilhouette(plan.native,materials):buildingShadowModel(plan,materials)),shadow={start:library.children.length,count:shadowBatch.children.length};for(const mesh of [...shadowBatch.children])library.add(mesh);
   entries.push({plan,lods,shadow});
   self.postMessage({id:data.id,progress:variant+1,total:PROTOTYPES});
  }
  const payload=packShip(library);self.postMessage({id:data.id,entries,payload,palette:materials.palette},shipTransfers(payload));disposeShip(library);
 }catch(e){self.postMessage({id:data.id,error:e.stack||e.message});}
};
