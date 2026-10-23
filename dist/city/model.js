// Explicit pinned URLs keep the complete generation graph usable in workers.
import * as T from '../vendor-gpu/three.webgpu.js';
import {surfaceAtlas} from '../render/worker-kit/surface-atlas.js';
import {bakeCityFinish,CITY_TILE_METRES} from './surface.js';
import {PLANET_STYLES} from './architecture.js';
import {ARCHITECTURAL_KITS,designOptions} from './design.js';
export const CITY_ZONES=['ceramic','frame','service','stone','roof','repair','accent','identity'];
/** Buildings and ships share atlas packing, mip filtering,
 * semantic material zoning and opaque worker transfer; architecture uses its
 * own metre-scaled finishes and periodic guard bands. */
export function cityMaterials(seed='FRESCO-01',wear=.35,style='garden',design={}){
 const finish=designOptions(design),kit=ARCHITECTURAL_KITS[finish.kit];
 const recipes=[
  {preset:'ceramic',paint:'#bebdb0',roughness:.47,metalness:.12,panels:4},
  {preset:'alloy',substrate:'#8b999c',paintCoverage:0,roughness:.4,panels:4},
  {preset:'engine',substrate:'#384a50',paintCoverage:0,roughness:.7,heat:.05,panels:4},
  {preset:'ceramic',paint:'#8c8d82',roughness:.87,panels:2},
  {preset:'armor',paint:'#414f50',roughness:.78,panels:6},
  {preset:'armor',paint:'#9a9c8b',roughness:.57,panels:2},
  {preset:'armor',paint:'#467b83',roughness:.52,panels:3},
  {preset:'armor',paint:'#aa8250',roughness:.65,panels:5}
 ];
 const planet=(PLANET_STYLES[style]||PLANET_STYLES.garden).palette,palette=kit.colors.map((c,i)=>'#'+new T.Color(c).lerp(new T.Color(planet[i]),.18).getHexString());
 recipes.forEach((r,i)=>{if(r.paintCoverage===0)r.substrate=palette[i];else r.paint=palette[i];});
 const tiles=recipes.map((r,index)=>bakeCityFinish({seed:seed+':city:'+index,paint:palette[index],kind:index===2?'service':index===3?'mineral':'paint',roughness:[0,5,6,7].includes(index)?finish.finishRoughness:r.roughness,metalness:index===1?.65:0,wear,refined:design.refinedSurfaces===true},design.surfaceResolution===1024?1024:512));
 const atlas=surfaceAtlas(tiles,{seed,name:'Architectural manufacturing surfaces',tileMeters:CITY_TILE_METRES});
 atlas.material.normalScale.set(1,1);atlas.material.userData.citySurface={version:1,tileMeters:CITY_TILE_METRES,wear,variation:finish.panelVariation,dirt:style==='arid'?[.43,.34,.23]:style==='glacial'?[.65,.7,.72]:[.28,.3,.27]};
 const zones=Object.fromEntries(CITY_ZONES.map((zone,index)=>[zone,{zone,index,material:atlas.material}]));
 const glass=new T.MeshStandardMaterial({name:'Architectural glazing',color:0x91b1ba,emissive:0x60838c,emissiveIntensity:.12,roughness:.3,metalness:.12,vertexColors:true});
 const glow=new T.MeshStandardMaterial({name:'Occupied rooms and wayfinding',color:0x9bada9,emissive:0xd4b58a,emissiveIntensity:.35,roughness:.5,vertexColors:true});
 const green=new T.MeshStandardMaterial({name:'Planted terraces',color:0x405c44,roughness:.94,vertexColors:true});
 return{atlas,zones,glass,glow,green,palette,finishRoughness:finish.finishRoughness,all:[atlas.material,glass,glow,green]};
}
export {modularBuildingModel as buildingModel} from './architecture-model.js';
