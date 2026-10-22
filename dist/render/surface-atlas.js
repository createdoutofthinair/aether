import * as T from 'three/webgpu';
import {filteredMips} from '../hull/surface.js';
import {hullMaterial} from '../hull/material.js';
/** Shared manufacturing finish pipeline: linear data maps, sRGB albedo,
 * independently filtered cells, UV guards and normal variance roughness. */
export function surfaceAtlas(tiles,{seed='',name='Manufactured surfaces',tileMeters=2}={}){
 if(tiles.length!==8)throw Error('A manufacturing atlas requires eight semantic finish zones');
 const chains=tiles.map(filteredMips),levels=[];
 for(let level=0;level<chains[0].length&&chains[0][level].width>=8;level++){
  const n=chains[0][level].width,out={width:n*4,height:n*2};
  for(const key of ['color','normal','surface','masks'])out[key]=new Uint8Array(out.width*out.height*4);
  for(let z=0;z<8;z++)for(const key of ['color','normal','surface','masks'])for(let y=0;y<n;y++)out[key].set(chains[z][level][key].subarray(y*n*4,(y+1)*n*4),((Math.floor(z/4)*n+y)*out.width+(z%4)*n)*4);
  levels.push(out);
 }
 const maps={...levels[0],size:levels[0].width,recipe:{tileMeters,seed:String(seed),preset:name}},material=hullMaterial(maps,levels);
 material.name=name;material.vertexColors=true;material.normalScale.set(.6,.6);
 for(const t of material.userData.textures)t.wrapS=t.wrapT=T.ClampToEdgeWrapping;
 return{material,levels,tiles,size:tiles[0].size};
}
export function mapSurface(geometry,surface,{tint=1}={}){
 const clamp=v=>Math.max(0,Math.min(1,v)),uv=geometry.attributes.uv,slot=surface.index,col=slot%4,row=Math.floor(slot/4),rect=surface.rect||[0,0,1,1];
 for(let i=0;i<uv.count;i++)uv.setXY(i,(col+.125+(rect[0]+clamp(uv.getX(i))*rect[2])*.75)/4,(row+.125+(rect[1]+clamp(uv.getY(i))*rect[3])*.75)/2);
 geometry.setAttribute('uv1',uv.clone());const color=new Float32Array(geometry.attributes.position.count*3);color.fill(tint);geometry.setAttribute('color',new T.BufferAttribute(color,3));return geometry;
}
