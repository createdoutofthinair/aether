import * as T from 'three/webgpu';
import {bakeSurface,filteredMips,recipe} from './surface.js';
export function surfaceTextures(maps,levels=filteredMips(maps)){
 const textures={};for(const key of ['color','normal','surface','masks']){const t=new T.DataTexture(maps[key],maps.size,maps.size,T.RGBAFormat);t.colorSpace=key==='color'?T.SRGBColorSpace:T.NoColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.magFilter=T.LinearFilter;t.minFilter=T.LinearMipmapLinearFilter;t.generateMipmaps=false;t.mipmaps=levels.map(l=>({data:l[key],width:l.width,height:l.height}));t.anisotropy=4;t.needsUpdate=true;textures[key]=t;}return textures;
}
export function hullMaterial(maps,levels,{channel='pbr'}={}){
 const tex=surfaceTextures(maps,levels);let m;
 if(channel==='pbr'){m=new T.MeshStandardMaterial({map:tex.color,normalMap:tex.normal,aoMap:tex.surface,roughnessMap:tex.surface,metalnessMap:tex.surface,roughness:1,metalness:1});m.normalScale.set(.8,.8);}
 else{let t=tex[channel];if(!t){const component={ao:0,roughness:1,metallic:2,height:3,paint:0,wear:1,seams:2,heat:3}[channel]??0,source=['paint','wear','seams','heat'].includes(channel)?maps.masks:maps.surface,data=new Uint8Array(maps.size*maps.size*4);for(let i=0;i<data.length;i+=4)data.set([source[i+component],source[i+component],source[i+component],255],i);t=new T.DataTexture(data,maps.size,maps.size);t.needsUpdate=true;t.wrapS=t.wrapT=T.RepeatWrapping;tex.debug=t;}m=new T.MeshBasicMaterial({map:t,toneMapped:false});}
 m.userData.hull=true;m.userData.textures=Object.values(tex);m.userData.recipe=maps.recipe;m.addEventListener('dispose',()=>Object.values(tex).forEach(t=>t.dispose()));return m;
}
// Called once per ship, never per frame. Small shared maps keep credit flybys cheap.
export function seededHull(seed,{finish='silver',roughness=.48,size=128}={}){return hullMaterial(bakeSurface(recipe({seed,preset:'armor',paint:finish==='dark'?'#3b4651':'#b6bfc5',roughness:Math.max(.3,roughness)}),size));}
// Keep texel scale in metres. Cylinder UVs wrap their circumference and length;
// planar faces choose their own tangent axes. UV1 duplicates UV for AO sampling.
export function metricUV(geometry,tile=2){
 const uv=geometry.attributes.uv,pos=geometry.attributes.position,norm=geometry.attributes.normal;if(!uv||!pos)return geometry;
 const p=geometry.parameters||{};
 if(geometry.type==='CylinderGeometry'){const circumference=2*Math.PI*Math.max(p.radiusTop,p.radiusBottom);for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*circumference/tile,uv.getY(i)*p.height/tile);}
 else if(geometry.type==='SphereGeometry'){for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*2*Math.PI*p.radius/tile,uv.getY(i)*Math.PI*p.radius/tile);}
 else if(geometry.type!=='TorusGeometry')for(let i=0;i<uv.count;i++){const nx=Math.abs(norm.getX(i)),ny=Math.abs(norm.getY(i)),nz=Math.abs(norm.getZ(i));const a=nx>ny&&nx>nz?pos.getZ(i):pos.getX(i),b=ny>nz&&ny>=nx?pos.getZ(i):pos.getY(i);uv.setXY(i,a/tile,b/tile);}
 uv.needsUpdate=true;geometry.setAttribute('uv1',uv.clone());return geometry;
}
