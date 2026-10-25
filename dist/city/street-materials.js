import * as T from 'three/webgpu';
import {climateWeather} from './environment-model.js';
import {surfaceAtlas} from '../render/surface-atlas.js';
import {bakeCityFinish,CITY_TILE_METRES} from './surface.js';
import {citySurfaceNodes} from './surface-nodes.js';
/** One small shared atlas for the entire street network, world-projected so
 * instancing and segment length cannot stretch aggregate or paving joints. */
export function streetMaterials(seed,wear=.35,style='garden',finish=null){
 let atlas;if(finish){const t=finish.textures;atlas={material:new T.MeshStandardNodeMaterial({map:t.color,normalMap:t.normal,roughnessMap:t.surface,metalnessMap:t.surface,aoMap:t.surface,roughness:1,metalness:1})};}else{const asphalt=bakeCityFinish({seed:seed+':asphalt',kind:'asphalt',paint:'#646c70',roughness:.91,wear},256),paving=bakeCityFinish({seed:seed+':paving',kind:'paving',paint:'#b2b7b2',roughness:.78,wear},256),tiles=[asphalt,paving,...Array(6).fill(asphalt)],baked=surfaceAtlas(tiles,{seed,name:'Street finishes',tileMeters:CITY_TILE_METRES});atlas=baked;}
 const dirt=style==='arid'?[.43,.34,.23]:[.28,.3,.27],materials=[];
 for(const [name,zone]of [['road',0],['stone',1],['paint',0],['patch',0]]){
  const material=new T.MeshStandardNodeMaterial().copy(atlas.material);material.name='Street '+name;material.vertexColors=false;material.userData.citySurface={version:1,tileMeters:CITY_TILE_METRES,wear,dirt,surfacePanels:[[0,0],[4,4],...Array(6).fill([0,0])],buildingWeather:climateWeather(style),world:true,road:name==='road',zone};
  if(name==='patch')material.color.set('#b0b6b7');
  if(name==='paint')material.color.set('#e5dfc1').multiplyScalar(2.1);
  citySurfaceNodes(material);materials.push(material);
 }
 return{road:materials[0],stone:materials[1],paint:materials[2],patch:materials[3],dispose(){materials.forEach(m=>m.dispose());atlas.material.dispose();if(finish)Object.values(finish.textures).forEach(t=>t.dispose());else for(const t of atlas.material.userData.textures||[])t.dispose();}};
}
