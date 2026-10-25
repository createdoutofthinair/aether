import {GPUMaterialBaker,gpuMaterialParameters} from '../material-production/gpu.js';
import {buildingMaterialRecipe} from './building-material.js';
import {gpuFinishTextures} from './gpu-finish.js';
export async function streetGPUFinish(renderer,seed,wear){
 const recipe=buildingMaterialRecipe({seed:seed+':streets'});recipe.zones.forEach((z,i)=>{z.color=i===1?'#b2b7b2':'#646c70';z.roughness=i===1?.78:.91;z.wear=wear;});
 const result=await new GPUMaterialBaker(renderer.backend.device,{materialURL:new URL('./street-material.wgsl',import.meta.url)}).bake(recipe,256,{parameters:gpuMaterialParameters(recipe)});
 try{return {textures:await gpuFinishTextures(renderer,result)};}finally{result.dispose();}
}
