import * as T from '../vendor-gpu/three.webgpu.js';
import {seedHash} from '../hull/surface.js';
/** UV0 is metres, UV1 is (finish, deposition, roughness offset, variation). Neither is clamped.
 * Reuse the existing two UV streams so city instancing stays within 8 buffers. */
export function mapCitySurface(g,surface,{tint=1,seed='',name='',roughnessBias=0,variation:amount=.035}={}){
 const uv=g.attributes.uv,p=g.attributes.position,n=g.attributes.normal,scale=g.userData.cityPatchScale,origin=g.userData.cityPatchOrigin||[0,0],metric=g.userData.cityMetric;
 g.computeBoundingBox();const top=g.boundingBox.max.y,colors=new Float32Array(p.count*3),zones=new Float32Array(p.count*4),variation=1+((seedHash(seed)%1000)/999-.5)*amount;
 for(let i=0;i<p.count;i++){
  if(scale)uv.setXY(i,uv.getX(i)*scale[0]+origin[0],uv.getY(i)*scale[1]+origin[1]);
  else if(!metric){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));uv.setXY(i,nx>ny&&nx>nz?p.getZ(i):p.getX(i),ny>nz&&ny>=nx?p.getZ(i):p.getY(i));}
  const up=Math.max(0,n.getY(i)),ledge=/floor-edge|roof|sill|mechanical|foundation/.test(name)?.45:0;
  zones[i*4]=surface.index;zones[i*4+2]=roughnessBias;zones[i*4+3]=amount;zones[i*4+1]=Math.min(1,up*.35+ledge+(top<3?.2:0));
  colors.fill(tint*variation,i*3,i*3+3);
 }
 g.setAttribute('uv1',new T.BufferAttribute(zones,4));g.setAttribute('color',new T.BufferAttribute(colors,3));return g;
}
