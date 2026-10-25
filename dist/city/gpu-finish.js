import * as T from 'three/webgpu';
import {GPUMaterialBaker} from '../material-production/gpu.js';
import {buildingMaterialRecipe} from './building-material.js';
// GPU compute -> prepared mip buffers -> resident textures, without readback.
export async function cityGPUFinish(renderer,{seed,wear,palette,size=1024}){
 const recipe=buildingMaterialRecipe({seed,resolution:size});
 recipe.zones.forEach((z,i)=>{z.color=palette[i];z.wear=wear;});
 const start=performance.now(),result=await new GPUMaterialBaker(renderer.backend.device).bake(recipe,size),textures={};
 try{
 for(const id of ['color','normal','surface']){
  const levels=result.levels.map(l=>({width:l.width,height:l.height,data:new Uint8Array(l.width*l.height*4)})),first=levels[0],t=new T.DataTexture(first.data,first.width,first.height,T.RGBAFormat);
  t.colorSpace=id==='color'?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.ClampToEdgeWrapping;t.generateMipmaps=false;t.mipmaps=levels;t.minFilter=T.LinearMipmapLinearFilter;t.magFilter=T.LinearFilter;t.anisotropy=4;t.needsUpdate=true;textures[id]=t;await renderer.initTexture(t);
 }
 const encoder=renderer.backend.device.createCommandEncoder();
 for(const id of ['color','normal','surface'])for(let i=0;i<result.levels.length;i++){
  const l=result.levels[i],texture=renderer.backend.get(textures[id]).texture;
  if(!texture)throw Error('Pinned WebGPU material texture handle unavailable');
  if(l.width*4%256===0)encoder.copyBufferToTexture({buffer:l.buffers[id],bytesPerRow:l.width*4,rowsPerImage:l.height},{texture,mipLevel:i},{width:l.width,height:l.height});
  else for(let y=0;y<l.height;y++)encoder.copyBufferToTexture({buffer:l.buffers[id],offset:y*l.width*4},{texture,mipLevel:i,origin:{x:0,y,z:0}},{width:l.width,height:1});
 }
 renderer.backend.device.queue.submit([encoder.finish()]);await renderer.backend.device.queue.onSubmittedWorkDone();return {textures,recipe,size,milliseconds:performance.now()-start};
 }catch(e){Object.values(textures).forEach(t=>t.dispose());throw e;}finally{result.dispose();}
}
