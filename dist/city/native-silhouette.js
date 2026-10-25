import * as T from '../vendor-gpu/three.webgpu.js';
import {surfacePoint,facadePoint} from './grammar-surfaces.js';
import {mapCitySurface} from './surface-uv.js';
// Closed, low-cost occupied envelope; keeps lobes, courtyards and twist.
export function nativeSilhouette(ir,materials){
 const n=48,steps=12,positions=[],indices=[],uvs=[],loops=ir.surface.metrics.length;
 for(let loop=0;loop<loops;loop++){
  const start=positions.length/3;
  for(let row=0;row<=steps;row++)for(let col=0;col<=n;col++){positions.push(...surfacePoint(ir.surface,col/n,row/steps,loop));uvs.push(col/n*ir.surface.metrics[loop].length,row/steps*ir.surface.height);}
  for(let row=0;row<steps;row++)for(let col=0;col<n;col++){const a=start+row*(n+1)+col,b=a+n+1;indices.push(a,a+1,b,b,a+1,b+1);}
 }
 for(const top of [false,true]){
  const rings=Array.from({length:loops},(_,loop)=>Array.from({length:n},(_,col)=>surfacePoint(ir.surface,col/n,top?1:0,loop))),offset=positions.length/3;
  for(const p of rings.flat()){positions.push(...p);uvs.push(p[0],p[2]);}
  for(const [a,b,c]of T.ShapeUtils.triangulateShape(rings[0].map(p=>new T.Vector2(p[0],p[2])),rings.slice(1).map(r=>r.map(p=>new T.Vector2(p[0],p[2])))))indices.push(offset+a,offset+(top?c:b),offset+(top?b:c));
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();g.userData.cityMetric=true;mapCitySurface(g,materials.zones.ceramic,{variation:0});const root=new T.Group();root.add(new T.Mesh(g,materials.atlas.material));root.rotation.y=ir.rotation;return root;
}

// Mid-distance glazing follows the same curved envelope, without constructing
// recessed reveals and hardware that are subpixel at this LOD.
export function nativeMidModel(ir,materials){
 const root=nativeSilhouette(ir,materials),p=[],uv=[],indices=[];
 for(const f of ir.facades){if(f.type==='solid'||f.type==='vent'||f.type==='service')continue;
  const left=-f.width*.38,right=f.width*.38,bottom=f.height*.23,top=f.height*.82;
  for(let part=0;part<3;part++){
   const a=left+(right-left)*part/3,b=left+(right-left)*(part+1)/3,start=p.length/3;
   for(const [x,y]of [[a,bottom],[b,bottom],[b,top],[a,top]]){p.push(...facadePoint(f,x,y,.08));uv.push((x-left)/(right-left),(y-bottom)/(top-bottom));}
   indices.push(start,start+1,start+2,start,start+2,start+3);
  }
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setAttribute('uv1',g.attributes.uv.clone());g.setAttribute('color',new T.Float32BufferAttribute(new Float32Array(p.length).fill(1),3));g.setIndex(indices);g.computeVertexNormals();root.add(new T.Mesh(g,materials.glass));return root;
}
