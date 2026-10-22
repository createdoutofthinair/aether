import {add,sub,mul,dot,cross,length,normalize,lerp,basis,sample,tangent,radiusAt,clamp} from './growth-math.js?v=growth-v3';
function curve(b,t){const f=clamp(t)*(b.points.length-1),i=Math.min(b.points.length-2,Math.floor(f)),u=f-i,p0=b.points[Math.max(0,i-1)],p1=b.points[i],p2=b.points[i+1],p3=b.points[Math.min(b.points.length-1,i+2)];return p1.map((_,k)=>.5*((2*p1[k])+(-p0[k]+p2[k])*u+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*u*u+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*u*u*u));}
function curveTangent(b,t){return normalize(sub(curve(b,Math.min(1,t+.001)),curve(b,Math.max(0,t-.001))));}
// One indexed skin: continuous sweep rings and shared parent-hole collar vertices.
// UV seams deliberately duplicate vertices; normals are reconciled geometrically.
export function buildBranchMesh(tree,{detail=0,tileSize=.5,trunkOnly=false}={}){
 const positions=[],uvs=[],ages=[],scars=[],indices=[],made=new Map(),patchSize=detail===2?2:4,collarSides=patchSize*4;
 const selected=trunkOnly?tree.branches.filter(b=>b.depth===0):tree.branches;
 function vertex(p,u,v,age,scar=0){const id=positions.length/3;positions.push(...p);uvs.push(u,v);ages.push(age);scars.push(scar);return id;}
 function point(id){return positions.slice(id*3,id*3+3);}
 function tri(a,b,c){if(a===b||b===c||c===a)return;indices.push(a,b,c);}
 function strip(a,b,n){for(let i=0;i<n;i++){const j=(i+1)%n;tri(a[i],a[j],b[i]);tri(a[j],b[j],b[i]);}}
 for(const branch of selected){
  const parent=made.get(branch.parent),parentBranch=tree.branches[branch.parent];
  const ownPatch=parent?.patches.find(x=>x.id===branch.id);
  const startT=parent?Math.min(.32,Math.max(.008,radiusAt(parentBranch,branch.attachT)*1.4/branch.length)):0;
  const radial=parent?collarSides:detail===0?24:detail===1?16:8;
  const children=trunkOnly?[]:branch.children.map(id=>tree.branches[id]).sort((a,b)=>a.attachT-b.attachT);
  const patches=children.map((child,i)=>{const distance=Math.min(child.attachT-(children[i-1]?.attachT??startT),(children[i+1]?.attachT??1)-child.attachT),half=Math.min(.07,Math.max(.001,radiusAt(branch,child.attachT)*1.2/branch.length),distance*.32);return{id:child.id,t:child.attachT,lo:Math.max(startT+.0001,child.attachT-half),hi:Math.min(.999,child.attachT+half)};}).filter(p=>p.hi>p.lo&&p.t>startT+.002);
  // All child bases remain before their first lateral bud; fallback is guarded below.
  const rows=Math.max(8,Math.ceil(branch.length/tree.height*(detail===0?72:detail===1?40:20)));let ts=Array.from({length:rows+1},(_,i)=>startT+(1-startT)*i/rows);
  ts=ts.filter(t=>!patches.some(p=>t>p.lo-1e-7&&t<p.hi+1e-7));
  for(const p of patches)for(let i=0;i<=patchSize;i++)ts.push(p.lo+(p.hi-p.lo)*i/patchSize);
  ts.push(startT,1);ts=[...new Set(ts.map(t=>Math.round(t*1e8)/1e8))].sort((a,b)=>a-b);
  const rings=[],frames=[];let previous,arc=parent?parent.arcAt(branch.attachT):0,last=curve(branch,startT),arcValues=[];
  const repeats=Math.max(1,Math.round(2*Math.PI*branch.radii[0]/tileSize));
  for(const t of ts){const center=curve(branch,t),f=basis(curveTangent(branch,t),previous);previous=f.n;frames.push(f);arc+=length(sub(center,last));last=center;arcValues.push(arc);const ring=[];
   for(let k=0;k<=radial;k++){const angle=k/radial*Math.PI*2;let radius=radiusAt(branch,t);if(branch.depth===0)radius*=1+Math.exp(-t*18)*(.25+.1*Math.cos(angle*5+tree.seed));let scar=0;for(const s of branch.scars||[]){const da=Math.atan2(Math.sin(angle-s.angle),Math.cos(angle-s.angle)),dt=(t-s.t)*branch.length/Math.max(radius,.001),distance=Math.sqrt(da*da*2+dt*dt*.7);scar=Math.max(scar,Math.exp(-distance*distance*7)*s.strength);radius*=1+.10*Math.exp(-(((distance-.45)*5)**2))*s.strength;}const p=add(center,mul(add(mul(f.n,Math.cos(angle)),mul(f.b,Math.sin(angle))),radius));ring.push(vertex(p,k/radial*repeats,arc/tileSize,branch.age,scar));}rings.push(ring);
  }
  for(const p of patches){p.row=ts.findIndex(t=>Math.abs(t-p.lo)<1e-7);const middle=Math.min(ts.length-1,p.row+patchSize/2),f=frames[middle],child=tree.branches[p.id],out=sub(sample(child,.1),sample(branch,p.t)),angle=Math.atan2(dot(out,f.b),dot(out,f.n));let center=Math.round(((angle/(Math.PI*2)+1)%1)*radial);center=Math.max(patchSize/2,Math.min(radial-patchSize/2-1,center));p.col=center-patchSize/2;}
  for(let j=0;j<rings.length-1;j++)for(let k=0;k<radial;k++){if(patches.some(p=>j>=p.row&&j<p.row+patchSize&&k>=p.col&&k<p.col+patchSize))continue;const a=rings[j][k],b=rings[j][k+1],c=rings[j+1][k],d=rings[j+1][k+1];tri(a,b,c);tri(b,d,c);}
  // Find the exact parent opening; turn its perimeter into a smooth collar.
  if(parent&&ownPatch){const boundary=[],j=ownPatch.row,k=ownPatch.col;
   for(let i=0;i<patchSize;i++)boundary.push(parent.rings[j][k+i]);
   for(let i=0;i<patchSize;i++)boundary.push(parent.rings[j+i][k+patchSize]);
   for(let i=0;i<patchSize;i++)boundary.push(parent.rings[j+patchSize][k+patchSize-i]);
   for(let i=0;i<patchSize;i++)boundary.push(parent.rings[j+patchSize-i][k]);
   const target=rings[0].slice(0,radial),frame=frames[0],center=curve(branch,startT);
   let orientation=[0,0,0];for(let i=0;i<boundary.length;i++)orientation=add(orientation,cross(sub(point(boundary[i]),center),sub(point(boundary[(i+1)%boundary.length]),center)));if(dot(orientation,frame.t)<0)boundary.reverse();
   // Align the boundary's first point to the circle's corresponding angular phase.
   let best=0,bestD=Infinity;for(let shift=0;shift<radial;shift++){let d=0;for(let i=0;i<radial;i++)d+=length(sub(point(boundary[(i+shift)%radial]),point(target[i])));if(d<bestD){bestD=d;best=shift;}}
   const source=Array.from({length:radial},(_,i)=>boundary[(i+best)%radial]);let prev=source;
   for(let layer=1;layer<=3;layer++){const t=layer/4,ring=source.map((id,i)=>{const q=target[i],a=point(id),b=point(q),pos=lerp(a,b,t);const lift=Math.sin(t*Math.PI)*radiusAt(branch,0)*.08;const v=normalize(sub(pos,lerp(sample(parentBranch,branch.attachT),center,t)));return vertex(add(pos,mul(v,lift)),uvs[id*2]*(1-t)+uvs[q*2]*t,uvs[id*2+1]*(1-t)+uvs[q*2+1]*t,branch.age*(t)+parentBranch.age*(1-t));});strip(prev,ring,radial);prev=ring;}strip(prev,target,radial);
  }else{const ring=rings[0],center=vertex(curve(branch,startT),.5,arcValues[0]/tileSize,branch.age);for(let k=0;k<radial;k++)tri(center,ring[k+1],ring[k]);}
  const tipRing=rings.at(-1),tipCenter=vertex(curve(branch,1),.5,arc/tileSize,branch.age);for(let k=0;k<radial;k++)tri(tipCenter,tipRing[k],tipRing[k+1]);
  made.set(branch.id,{rings,patches,arcAt:t=>{const f=clamp(t)*(arcValues.length-1),i=Math.min(arcValues.length-2,Math.floor(f));return arcValues[i]*(1-(f-i))+arcValues[i+1]*(f-i);}});
 }
 // Geometric normal averaging also joins duplicate UV-seam vertices.
 const normal=new Float32Array(positions.length),groups=new Map();
 for(let i=0;i<indices.length;i+=3){const [a,b,c]=indices.slice(i,i+3),n=cross(sub(point(b),point(a)),sub(point(c),point(a)));for(const id of [a,b,c])for(let k=0;k<3;k++)normal[id*3+k]+=n[k];}
 for(let i=0;i<positions.length/3;i++){const key=point(i).map(v=>Math.round(v*1e7)).join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(i);}
 for(const ids of groups.values()){let n=[0,0,0];for(const id of ids)n=add(n,Array.from(normal.slice(id*3,id*3+3)));n=normalize(n);if(length(n)<.5)n=[0,1,0];for(const id of ids)normal.set(n,id*3);}
 return{positions:new Float32Array(positions),normals:normal,uvs:new Float32Array(uvs),ages:new Float32Array(ages),scars:new Float32Array(scars),indices:new Uint32Array(indices),junctions:[...made.values()].reduce((n,b)=>n+b.patches.length,0)};
}
