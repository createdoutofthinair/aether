import * as T from '../vendor-gpu/three.webgpu.js';

// Surface subtraction against closed lofts. Unlike centroid rejection this
// splits a crossing triangle at the actual wall and interpolates every stream.
// The BSP is built once per mass, not once per window. No renderer is involved.
const EPS=1e-4;
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function plane(vertices){
 const a=vertices[0].position;
 for(let i=1;i<vertices.length-1;i++){
  const b=vertices[i].position,c=vertices[i+1].position,u=b.map((v,j)=>v-a[j]),v=c.map((v,j)=>v-a[j]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],length=Math.hypot(...n);
  if(length>1e-8){n.forEach((v,j)=>n[j]=v/length);return{n,w:dot(n,a)};}
 }
 return null;
}
function split(polygon,p,front,back,keepCoplanar=true){
 const distances=polygon.vertices.map(v=>dot(p.n,v.position)-p.w),types=distances.map(d=>d>EPS?1:d<-EPS?2:0),type=types.reduce((a,b)=>a|b,0);
 if(type===0){(dot(p.n,polygon.plane.n)>0&&keepCoplanar?front:back).push(polygon);return;}
 if(type===1){front.push(polygon);return;}if(type===2){back.push(polygon);return;}
 const f=[],b=[];
 for(let i=0;i<types.length;i++){
  const j=(i+1)%types.length,vi=polygon.vertices[i],vj=polygon.vertices[j];
  if(types[i]!==2)f.push(vi);if(types[i]!==1)b.push(vi);
  if((types[i]|types[j])===3){const t=distances[i]/(distances[i]-distances[j]),v=Object.fromEntries(Object.keys(vi).map(k=>[k,vi[k].map((n,c)=>n+(vj[k][c]-n)*t)]));f.push(v);b.push(v);}
 }
 if(f.length>=3)front.push({vertices:f,plane:polygon.plane});if(b.length>=3)back.push({vertices:b,plane:polygon.plane});
}
class Node{
 constructor(polygons){
  if(!polygons.length)return;
  this.plane=polygons[0].plane;const front=[],back=[];
  // Coplanar faces need not be retained in a solid classifier.
  for(const p of polygons){if(p.vertices.every(v=>Math.abs(dot(this.plane.n,v.position)-this.plane.w)<EPS))continue;split(p,this.plane,front,back);}
  if(front.length)this.front=new Node(front);if(back.length)this.back=new Node(back);
 }
 outside(polygons,keepCoplanar){
  return polygons.flatMap(p=>this.outsideOne(p,keepCoplanar).polygons);
 }
 outsideOne(polygon,keepCoplanar){
  if(!this.plane)return{polygons:[polygon],removed:false};
  const front=[],back=[];split(polygon,this.plane,front,back,keepCoplanar);
  const f=front.map(p=>this.front?this.front.outsideOne(p,keepCoplanar):{polygons:[p],removed:false});
  const b=back.map(p=>this.back?this.back.outsideOne(p,keepCoplanar):{polygons:[],removed:true});
  const removed=f.concat(b).some(r=>r.removed);
  // A classifier plane can cross a face without the solid crossing it. Keep
  // its original topology if no descendant actually removed surface area.
  return{polygons:removed?f.concat(b).flatMap(r=>r.polygons):[polygon],removed};
 }
}
function polygons(g){
 const attributes=Object.entries(g.attributes),out=[],index=g.index;
 for(let i=0;i<(index?.count??g.attributes.position.count);i+=3){
  const vertices=Array.from({length:3},(_,j)=>{const v=index?index.getX(i+j):i+j;return Object.fromEntries(attributes.map(([key,a])=>[key,Array.from({length:a.itemSize},(_,k)=>a.array[v*a.itemSize+k])]));}),p=plane(vertices);
  if(p)out.push({vertices,plane:p});
 }
 return out;
}
export function exteriorClipper(solids){
 const cutters=solids.map(({id,geometry})=>{geometry.computeBoundingBox();return{id,box:geometry.boundingBox.clone(),node:new Node(polygons(geometry))};});
 return function clip(g,id){
  g.computeBoundingBox();const owner=cutters.findIndex(c=>c.id===id),candidates=cutters.filter((c,i)=>i!==owner&&c.box.intersectsBox(g.boundingBox));
  if(!candidates.length)return g;
  let result=polygons(g);for(const c of candidates){result=c.node.outside(result,owner<cutters.indexOf(c));if(!result.length)break;}
  const data=Object.fromEntries(Object.keys(g.attributes).map(k=>[k,[]])),indices=[];
  for(const p of result)for(let i=1;i<p.vertices.length-1;i++){
   const triangle=[p.vertices[0],p.vertices[i],p.vertices[i+1]];if(!plane(triangle))continue;
   for(const v of triangle){indices.push(data.position.length/3);for(const k of Object.keys(data))data[k].push(...v[k]);}
  }
  const clipped=new T.BufferGeometry();for(const [key,values]of Object.entries(data))clipped.setAttribute(key,new T.Float32BufferAttribute(values,g.attributes[key].itemSize,g.attributes[key].normalized));clipped.setIndex(indices);clipped.normalizeNormals();g.dispose();return clipped;
 };
}
