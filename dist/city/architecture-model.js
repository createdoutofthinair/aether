import * as T from '../vendor-gpu/three.webgpu.js';
import {mapSurface} from '../render/worker-kit/surface-atlas.js';
import {compileArchitecture,volumeLoop} from './architecture.js';
import {random} from '../ships/blueprint.js';
import {mergeVertices} from '../render/worker-kit/BufferGeometryUtils.js';
import {RoundedBoxGeometry} from '../render/worker-kit/RoundedBoxGeometry.js';

function geometry(positions,uvs,indices){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));
 // Earcut can emit collinear bridge triangles between concentric hole loops.
 // Discard them in the final Float32 domain before normal calculation.
 const p=g.attributes.position,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),valid=[];
 for(let i=0;i<indices.length;i+=3){a.fromBufferAttribute(p,indices[i]);b.fromBufferAttribute(p,indices[i+1]);c.fromBufferAttribute(p,indices[i+2]);if(b.sub(a).cross(c.sub(a)).lengthSq()>1e-14)valid.push(indices[i],indices[i+1],indices[i+2]);}
 g.setIndex(valid);g.computeVertexNormals();return g;
}
/** Closed loft, including hole walls and triangulated roof/floor. Caps have
 * independent vertices so their normals never round over the facade edge. */
export function loftGeometry(volume,segments=48){
 const rings=volume.levels.map(l=>volumeLoop(volume,l,segments)),positions=[],uvs=[],indices=[];
 const loops=r=>[r.outer,...r.holes];
 for(let k=0;k<loops(rings[0]).length;k++){
  const n=loops(rings[0])[k].length,start=positions.length/3;
  for(let row=0;row<rings.length;row++){
   const loop=loops(rings[row])[k];let distance=0;
   for(let i=0;i<=n;i++){const p=loop[i%n];if(i)distance+=Math.hypot(p.x-loop[(i-1)%n].x,p.z-loop[(i-1)%n].z);positions.push(p.x,p.y,p.z);uvs.push(distance/Math.max(1,volume.shape.rx*6),p.y/Math.max(1,volume.levels.at(-1).y));}
  }
  for(let row=0;row<rings.length-1;row++)for(let i=0;i<n;i++){const a=start+row*(n+1)+i,b=a+n+1;indices.push(a,b,a+1,b,b+1,a+1);}
 }
 for(const [ring,top]of [[rings[0],false],[rings.at(-1),true]]){
  const outline=ring.outer.map(p=>new T.Vector2(p.x,p.z)),holes=ring.holes.map(loop=>loop.map(p=>new T.Vector2(p.x,p.z))),flat=[...ring.outer,...ring.holes.flat()],offset=positions.length/3;
  for(const p of flat){positions.push(p.x,p.y,p.z);uvs.push(.5+(p.x-(volume.x||0))/(volume.shape.rx*2.5),.5+(p.z-(volume.z||0))/(volume.shape.rz*2.5));}
  for(const [a,b,c]of T.ShapeUtils.triangulateShape(outline,holes))indices.push(offset+a,offset+(top?c:b),offset+(top?b:c));
 }
 return geometry(positions,uvs,indices);
}
function atHeight(volume,y){
 const levels=volume.levels;let i=0;while(i<levels.length-2&&levels[i+1].y<y)i++;
 const a=levels[i],b=levels[i+1],t=T.MathUtils.clamp((y-a.y)/Math.max(.001,b.y-a.y),0,1);
 return {y,scale:T.MathUtils.lerp(a.scale,b.scale,t),twist:T.MathUtils.lerp(a.twist,b.twist,t)};
}
// Fit bays by arc length, rather than cramming extra windows onto the short
// edges of a polygon. The normalized intervals are reused at every mesh LOD.
function bayIntervals(loop,width){
 const lengths=[0];for(let i=0;i<loop.length;i++)lengths.push(lengths.at(-1)+Math.hypot(loop[(i+1)%loop.length].x-loop[i].x,loop[(i+1)%loop.length].z-loop[i].z));
 const perimeter=lengths.at(-1),count=Math.max(6,Math.round(perimeter/width));return{lengths,perimeter,count};
}
function sample(loop,metric,t){
 const distance=Math.min(.9999999,Math.max(0,t))*metric.perimeter;let i=0;while(i<loop.length-1&&metric.lengths[i+1]<distance)i++;
 const a=loop[i],b=loop[(i+1)%loop.length],f=(distance-metric.lengths[i])/Math.max(.00001,metric.lengths[i+1]-metric.lengths[i]);return new T.Vector3(T.MathUtils.lerp(a.x,b.x,f),a.y,T.MathUtils.lerp(a.z,b.z,f));
}
function facadePatch(volume,loopIndex,metric,a,b,lower,upper){
 const toU=t=>{const distance=t*metric.perimeter;let i=0;while(i<metric.lengths.length-2&&metric.lengths[i+1]<distance)i++;return i+(distance-metric.lengths[i])/Math.max(.00001,metric.lengths[i+1]-metric.lengths[i]);},u0=toU(a),u1=toU(b),rows=volume.levels.map(l=>{const r=volumeLoop(volume,l,48);return[r.outer,...r.holes][loopIndex];}),positions=[],uvs=[],indices=[];
 const clip=(polygon,key,value,greater)=>{
  const out=[];for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],inside=greater?p[key]>=value:p[key]<=value,next=greater?q[key]>=value:q[key]<=value;
   if(inside)out.push(p);if(inside!==next){const t=(value-p[key])/(q[key]-p[key]);out.push({u:T.MathUtils.lerp(p.u,q.u,t),y:T.MathUtils.lerp(p.y,q.y,t),point:p.point.clone().lerp(q.point,t)});}}
  return out;
 };
 // Clip each actual envelope triangle in (contour parameter, elevation).
 // A single broad quad cuts through a curved/twisted wall and gets occluded.
 // These patches lie on exactly the same planes as the opaque skin.
 for(let row=0;row<rows.length-1;row++){
  const y0=volume.levels[row].y,y1=volume.levels[row+1].y;if(y1<lower||y0>upper)continue;
  for(let i=Math.floor(u0);i<Math.ceil(u1);i++){
   const n=rows[row].length,j=(i+1)%n,vertex=(r,index,u)=>{const p=rows[r][index];return{u,y:p.y,point:new T.Vector3(p.x,p.y,p.z)};},p=vertex(row,i,i),q=vertex(row+1,i,i),r=vertex(row,j,i+1),s=vertex(row+1,j,i+1);
   for(const triangle of [[p,q,r],[q,s,r]]){
    let polygon=triangle;for(const [key,value,greater]of [['u',u0,true],['u',u1,false],['y',lower,true],['y',upper,false]]){polygon=clip(polygon,key,value,greater);if(polygon.length<3)break;}
    if(polygon.length<3)continue;const normal=triangle[1].point.clone().sub(triangle[0].point).cross(triangle[2].point.clone().sub(triangle[0].point)).normalize(),start=positions.length/3;
    for(const p of polygon){positions.push(...p.point.clone().addScaledVector(normal,.07).toArray());uvs.push((p.u-u0)/(u1-u0),(p.y-lower)/(upper-lower));}
    for(let k=1;k<polygon.length-1;k++)indices.push(start,start+k,start+k+1);
   }
  }
 }
 return geometry(positions,uvs,indices);
}
export function modularBuildingModel(plan,lod,materials){
 const recipe=plan.architecture,assembly=compileArchitecture(recipe),root=new T.Group(),z=materials.zones,segments=[64,40,24][lod];
 function add(g,material,name,tint=1){
  if(material.zone)mapSurface(g,material,{tint});else{const c=new Float32Array(g.attributes.position.count*3);c.fill(tint);g.setAttribute('color',new T.BufferAttribute(c,3));g.setAttribute('uv1',g.attributes.uv.clone());}
  const m=new T.Mesh(g,material.material||material);m.name=name;root.add(m);return m;
 }
 function box(name,x,y,zz,bw,bh,bd,material=z.frame,yaw=0){const bevel=lod===0&&Math.min(bw,bh,bd)>.7,g=bevel?mergeVertices(new RoundedBoxGeometry(bw,bh,bd,1,Math.min(.16,bw*.06,bh*.06,bd*.06))):new T.BoxGeometry(bw,bh,bd),m=add(g,material,name);m.position.set(x,y,zz);m.rotation.y=yaw;return m;}
 function beam(name,a,b,radius,material=z.frame){const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av),m=add(new T.CylinderGeometry(radius,radius,delta.length(),[8,6,4][lod]),material,name);m.position.copy(av).add(bv).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;}

 const baseKind=['crescent','ring','dome','shell','petal','saucer','canopy','arcology'].includes(recipe.family)?'ellipse':'softbox';
 const base={shape:{kind:baseKind,rx:recipe.width*.51,rz:recipe.depth*.51,curve:recipe.shape.curve},levels:[{y:recipe.foundation>5?recipe.foundation-.9:0,scale:1},{y:recipe.foundation,scale:1}]};
 add(loftGeometry(base,segments),z.stone,'foundation');
 assembly.supports.forEach((s,i)=>beam('support-'+i,s.a,s.b,s.radius));
 for(const bridge of assembly.bridges){const a=new T.Vector3(...bridge.a),b=new T.Vector3(...bridge.b),mid=a.clone().add(b).multiplyScalar(.5),yaw=-Math.atan2(b.z-a.z,b.x-a.x),length=a.distanceTo(b);box('skybridge',mid.x,mid.y,mid.z,length,bridge.height,bridge.width,z.frame,yaw);box('bridge-glazing',mid.x,mid.y+.2,mid.z,length*.96,bridge.height*.65,bridge.width+.08,materials.glass,yaw);}
 for(const volume of assembly.volumes){
  const bottom=volume.levels[0].y,top=volume.levels.at(-1).y,roof=volume.levels.at(-1);
  // Keep the canonical contour for concave envelopes. Coarsening a petal can
  // put its chord in front of a window that was correctly outside the skin.
  add(loftGeometry(volume,48),z.ceramic,volume.id+':envelope');
  // Every complete floor owns a stable bay population at every LOD. Geometry
  // simplification removes reveals and fins, never whole illuminated floors.
  const floorCount=Math.max(1,Math.floor((top-bottom)/recipe.floorHeight)),floorHeight=(top-bottom)/floorCount;
  for(let floor=0;floor<floorCount;floor++){
   const lower=bottom+floor*floorHeight+.85,upper=Math.min(top-.18,lower+floorHeight*recipe.facade.glazing);
   if(upper<=lower)continue;
   const ref=volumeLoop(volume,atHeight(volume,(lower+upper)/2),48),lo=volumeLoop(volume,atHeight(volume,lower),48),hi=volumeLoop(volume,atHeight(volume,upper),48);
   const loopSet=r=>[r.outer,...r.holes];
   for(let li=0;li<loopSet(ref).length;li++){
    const loop=loopSet(ref)[li],metric=bayIntervals(loop,recipe.facade.bayWidth),low=loopSet(lo)[li],high=loopSet(hi)[li],lowMetric=bayIntervals(low,recipe.facade.bayWidth),highMetric=bayIntervals(high,recipe.facade.bayWidth);
    for(let bay=0;bay<metric.count;bay++){
     const a=(bay+.12)/metric.count,b=(bay+.88)/metric.count,p=sample(low,lowMetric,a),q=sample(low,lowMetric,b),r=sample(high,highMetric,b),s=sample(high,highMetric,a),tangent=q.clone().sub(p),normal=new T.Vector3(tangent.z,0,-tangent.x).normalize();
     for(const v of [p,q,r,s])v.addScaledVector(normal,.065);
     const occupied=random(`${recipe.seed}:${plan.variant}:${volume.id}:${floor}:${bay}:${li}`)()<recipe.facade.occupancy,mat=occupied?materials.glow:materials.glass,tint=.65+random(`${recipe.seed}:bay:${bay}:${floor}:${li}`)()*.35;
     add(facadePatch(volume,li,metric,a,b,lower,upper),mat,'facade-bay',tint);
     if(lod===0){
      const center=p.clone().add(q).multiplyScalar(.5),yaw=-Math.atan2(tangent.z,tangent.x),width=p.distanceTo(q),height=upper-lower;
      // Physical sills/reveals and solar brows cast real local shadows.
      box('sill',center.x,lower-.1,center.z,width+.2,.18,.42,z.frame,yaw);
      box('solar-brow',center.x+normal.x*recipe.facade.shade*.55,upper+.12,center.z+normal.z*recipe.facade.shade*.55,width+.3,.2,.45+recipe.facade.shade*1.5,z.ceramic,yaw);
      if(bay%2===0){const edge=p.clone().add(s).multiplyScalar(.5);box('bay-reveal',edge.x,edge.y,edge.z,.15,height+.2,.3+recipe.facade.skin,z.frame,yaw);}
      if(occupied&&bay%3===0){const mid=p.clone().add(q).add(r).add(s).multiplyScalar(.25);box('blind',mid.x+normal.x*.02,upper-.35,mid.z+normal.z*.02,width*.95,.3,.06,z.service,yaw);}
     }
    }
   }
   // Structural floor bands are silhouette-bearing: keep all three levels.
   if(!volume.shell){const l=atHeight(volume,bottom+(floor+1)*floorHeight),edge={...volume,levels:[{...l,y:l.y-.16,scale:l.scale*1.014},{...l,y:l.y+.13,scale:l.scale*1.014}]};add(loftGeometry(edge,segments),z.frame,'floor-edge');}
  }
  // Shell meridians are generated from the same loft samples, so every rib
  // meets the actual roof rather than floating above a differently shaped dome.
  if(volume.shell||recipe.style==='lunar'||recipe.family==='petal'){
   const count=volume.shell?12:8;
   for(let i=0;i<count;i++){
    const points=volume.levels.map(l=>{const loop=volumeLoop(volume,l,48).outer,p=loop[Math.floor(i*loop.length/count)];return new T.Vector3(p.x,p.y,p.z);}),curve=new T.CatmullRomCurve3(points);
    add(new T.TubeGeometry(curve,[24,16,10][lod],recipe.facade.rib, [6,4,3][lod],false),z.frame,'exoskeleton-rib');
   }
  }
  if(!volume.shell){const collar={...volume,levels:[{...roof,y:top,scale:roof.scale*1.035},{...roof,y:top+.65,scale:roof.scale*1.035}]};add(loftGeometry(collar,segments),recipe.roof==='shield'?z.stone:z.frame,'roof-collar');}
  if(recipe.roof==='garden'&&volume.garden&&!volume.shell){const garden={...volume,levels:[{...roof,y:top+.66,scale:roof.scale*.9},{...roof,y:top+.87,scale:roof.scale*.9}]};add(loftGeometry(garden,segments),materials.green,'garden-deck');}
  if(recipe.roof==='shield'){const shield={...volume,levels:[{...roof,y:top+.65,scale:roof.scale*1.045},{...roof,y:top+1.55,scale:roof.scale*1.01}]};add(loftGeometry(shield,segments),z.stone,'protective-roof');}
  if(recipe.roof==='crown'&&!volume.shell){for(let i=0;i<8;i++){const a=i*Math.PI/4,rx=volume.shape.rx*roof.scale*.8,rz=volume.shape.rz*roof.scale*.8;beam('crown-fin',[(volume.x||0)+Math.cos(a)*rx,top+.5,(volume.z||0)+Math.sin(a)*rz],[(volume.x||0)+Math.cos(a)*rx*.87,top+3.4,(volume.z||0)+Math.sin(a)*rz*.87],recipe.facade.rib,z.accent);}}
  if(lod<2&&!volume.shell&&['solar','sealed'].includes(recipe.roof)){
   const radius=volume.shape.rx*roof.scale;
   for(let i=0;i<3;i++){const x=(volume.x||0)+(i-1)*radius*.35,zz=volume.z||0;box(recipe.roof==='solar'?'solar-array':'roof-service',x,top+1.1,zz,radius*.28,.35,Math.max(1,volume.shape.rz*roof.scale*.52),recipe.roof==='solar'?materials.glass:z.service);}
  }
 }
 const entry=assembly.entry,yaw=Math.atan2(entry.normal[0],entry.normal[2]),nx=Math.sin(yaw),nz=Math.cos(yaw),ex=entry.x+nx*.22,ez=entry.z+nz*.22;
 box('pressure-vestibule',ex+nx*.8,entry.y+1.7,ez+nz*.8,5.2,3.4,2.8,z.frame,yaw);
 box('entry-door',ex+nx*2.24,entry.y+1.65,ez+nz*2.24,3.3,2.8,.12,materials.glass,yaw);
 box('entry-brow',ex+nx*1.1,entry.y+3.5,ez+nz*1.1,7,.35,4.2,z.ceramic,yaw);
 box('entry-beacon',ex+nx*2.5,entry.y+3.05,ez+nz*2.5,3,.15,.12,materials.glow,yaw);
 // Ground connection remains at every LOD. The ocean variant explicitly shows
 // a lift shaft; ramps/accessible interfaces remain a Streets-stage study.
 if(recipe.foundation>5)box('access-lift',ex+nx*4,recipe.foundation*.5,ez+nz*4,3,recipe.foundation,3,z.service,yaw);
 else for(let i=0;i<4;i++)box('entry-step',ex+nx*(3.1+i*.55),recipe.foundation*(4-i)/8,ez+nz*(3.1+i*.55),5.4,recipe.foundation*(4-i)/4,.65,z.stone,yaw);
 if(lod===0)for(let i=0;i<3;i++){
  const volume=assembly.volumes[0],back=volumeLoop(volume,volume.levels[0],48).outer.reduce((a,p)=>p.z<a.z?p:a);
  box('service-louver',back.x,recipe.foundation+1.3+i*.55,back.z-.18,2.2,.23,.4,z.service);
 }
 root.userData={plan,lod,assembly,recipe,modules:assembly.modules};return root;
}
