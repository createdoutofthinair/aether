import {bakeBuildingMaterial,buildingMaterialRecipe} from '../city/building-material.js';
import {filteredMips} from '../hull/surface.js';
import {MAPS,encodeMaterialPack} from './pack.js';
export function bakeCPU(recipe,size=256,progress=()=>{}){
 const r=buildingMaterialRecipe(recipe),tiles=[],start=performance.now();for(let i=0;i<8;i++){tiles.push(bakeBuildingMaterial(r,i,size));progress((i+1)/8);}const synthesisMs=performance.now()-start,filterStart=performance.now(),chains=tiles.map(filteredMips),levels=[];
 for(let i=0;chains[0][i]?.width>=8;i++){const n=chains[0][i].width,out={width:n*4,height:n*2};for(const id of MAPS){out[id]=new Uint8Array(out.width*out.height*4);for(let z=0;z<8;z++)for(let y=0;y<n;y++)out[id].set(chains[z][i][id].subarray(y*n*4,(y+1)*n*4),((Math.floor(z/4)*n+y)*out.width+(z%4)*n)*4);}levels.push(out);}
 const mipMs=performance.now()-filterStart,packStart=performance.now(),bytes=encodeMaterialPack({recipe:r,levels,producer:'cpu'});return{bytes,timings:{synthesisMs,mipMs,packMs:performance.now()-packStart,totalMs:performance.now()-start}};
}
