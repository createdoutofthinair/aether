// Explicit pinned URLs keep the complete generation graph usable in workers.
import * as T from '../vendor-gpu/three.webgpu.js';
import {surfaceAtlas} from '../render/worker-kit/surface-atlas.js';
import {bakeSurface} from '../hull/surface.js';
import {PLANET_STYLES} from './architecture.js';
import {ARCHITECTURAL_KITS,designOptions} from './design.js';
export const CITY_ZONES=['ceramic','frame','service','stone','roof','repair','accent','identity'];
/** Buildings and ships share the surface baker, atlas packing, mip filtering,
 * semantic material zoning and opaque worker transfer; architecture uses its
 * own finish recipes rather than stretching a spacecraft texture over a city. */
export function cityMaterials(seed='FRESCO-01',wear=.35,style='garden',design={}){
 const kit=ARCHITECTURAL_KITS[designOptions(design).kit];
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
 const tiles=recipes.map((recipe,index)=>{
  const tile=bakeSurface({...recipe,seed:seed+':city:'+index,wear:wear*.19,heat:recipe.heat??0,grain:.11,markings:false},128);
  // Gravity-aligned runoff and broad finish variation, never uniform noise.
  for(let y=0;y<128;y++)for(let x=0;x<128;x++){
   const i=(y*128+x)*4,streak=Math.pow(Math.max(0,Math.sin(x*.31+index)),18)*(.2+.8*y/127)*wear;
   for(let c=0;c<3;c++)tile.color[i+c]=Math.round(tile.color[i+c]*(1-streak*.23));
   tile.surface[i+1]=Math.min(245,tile.surface[i+1]+Math.round(streak*20));
   if([0,3,4,7].includes(index))tile.surface[i+2]=0;
  }
  return tile;
 });
 const atlas=surfaceAtlas(tiles,{seed,name:'Architectural manufacturing surfaces',tileMeters:4});
 const zones=Object.fromEntries(CITY_ZONES.map((zone,index)=>[zone,{zone,index,material:atlas.material}]));
 const glass=new T.MeshStandardMaterial({name:'Architectural glazing',color:0x91b1ba,emissive:0x60838c,emissiveIntensity:.12,roughness:.3,metalness:.12,vertexColors:true});
 const glow=new T.MeshStandardMaterial({name:'Occupied rooms and wayfinding',color:0x9bada9,emissive:0xd4b58a,emissiveIntensity:.35,roughness:.5,vertexColors:true});
 const green=new T.MeshStandardMaterial({name:'Planted terraces',color:0x405c44,roughness:.94,vertexColors:true});
 return{atlas,zones,glass,glow,green,palette,all:[atlas.material,glass,glow,green]};
}
export {modularBuildingModel as buildingModel} from './architecture-model.js';
