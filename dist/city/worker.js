import * as T from '../vendor-gpu/three.webgpu.js';
import {cityBlueprint,buildingBlueprint,PROTOTYPES} from './blueprint.js';
import {cityMaterials,buildingModel} from './model.js';
import {batchShip,packShip,shipTransfers,disposeShip} from '../render/worker-kit/ship-assets.js';
self.onmessage=({data})=>{
 try{
  if(data.type==='layout'){self.postMessage({id:data.id,layout:cityBlueprint(data.options)});return;}
  if(data.type!=='library')throw Error('Unknown city generation request');
  const materials=cityMaterials(data.seed,data.wear,data.architecture?.style),library=new T.Group(),entries=[];
  for(let variant=0;variant<PROTOTYPES;variant++){
   const plan=buildingBlueprint(variant,data.seed,data.architecture),lods=[];
   for(let lod=0;lod<3;lod++){
    const model=buildingModel(plan,lod,materials),batch=batchShip(model),start=library.children.length,count=batch.children.length;
    for(const mesh of [...batch.children])library.add(mesh);
    lods.push({start,count});
   }
   entries.push({plan,lods});
   self.postMessage({id:data.id,progress:variant+1,total:PROTOTYPES});
  }
  const payload=packShip(library);self.postMessage({id:data.id,entries,payload},shipTransfers(payload));disposeShip(library);
 }catch(e){self.postMessage({id:data.id,error:e.stack||e.message});}
};
