/** Renderer-independent inspection of the exact transferred buffers. Duplicate
 * triangles are exact within 0.1 mm; intersecting surfaces require visual QA. */
export function auditGeometry(payload){
 const seen=new Map(),issues=[],duplicates=[],bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let triangles=0,vertices=0,degenerate=0,invalid=0,badNormals=0;
 payload.meshes.forEach((mesh,meshIndex)=>{
  const p=mesh.attributes.position,n=mesh.attributes.normal,idx=mesh.index,count=p.array.length/p.itemSize;vertices+=count;
  for(let i=0;i<count;i++){
   const xyz=Array.from(p.array.slice(i*3,i*3+3));
   if(!xyz.every(Number.isFinite)){invalid++;continue;}
   xyz.forEach((v,j)=>{bounds.min[j]=Math.min(bounds.min[j],v);bounds.max[j]=Math.max(bounds.max[j],v);});
   if(n){const length=Math.hypot(...n.array.slice(i*3,i*3+3));if(!Number.isFinite(length)||Math.abs(length-1)>.02)badNormals++;}
  }
  for(const [name,a]of Object.entries(mesh.attributes))if(a.array.length/a.itemSize!==count||!a.array.every(Number.isFinite))issues.push(`Mesh ${meshIndex}: invalid ${name} stream`);
  for(let i=0;i<(idx?.length??count);i+=3){
   triangles++;const ids=[0,1,2].map(j=>idx?idx[i+j]:i+j);
   if(ids.some(id=>!Number.isInteger(id)||id<0||id>=count)){invalid++;continue;}
   const points=ids.map(id=>Array.from(p.array.slice(id*3,id*3+3))),a=points[1].map((v,j)=>v-points[0][j]),b=points[2].map((v,j)=>v-points[0][j]),area=Math.hypot(a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]);
   if(area<1e-8){degenerate++;continue;}
   const key=points.map(p=>p.map(v=>Math.round(v*1e4)).join(',')).sort().join('/'),location={mesh:meshIndex,triangle:i/3};
   if(seen.has(key))duplicates.push({...location,other:seen.get(key)});else seen.set(key,location);
  }
 });
 return{triangles,vertices,meshes:payload.meshes.length,invalid,degenerate,badNormals,duplicateTriangles:duplicates.length,duplicates,issues,bounds,ok:invalid+degenerate+badNormals+duplicates.length+issues.length===0};
}
