import {planetAt} from './planet-cache.js?v=foundation-1';
import {referenceAt} from './terrain-cache.js?v=foundation-1';
import {regionAt,regionHeight,regionDirection} from './regions.js?v=foundation-1';
import * as T from './vendor/three.module.js';
import {world,environment,climate,province} from './world.js?v=foundation-1';
import {createTerrainDomain} from './domain/terrain.js';
import {numericVector} from './domain/vector.js';
const domain=createTerrainDomain({world,environment,climate,province,planetAt,referenceAt,regionAt,regionHeight,regionDirection});
const renderVector=v=>v?new T.Vector3(v.x,v.y,v.z):null;
export const R=domain.R,landing=renderVector(domain.landing),faces=domain.faces.map(f=>f.map(renderVector));
export const noise=domain.noise;
export const basinProfile=domain.basinProfile;
export const basinHeight=domain.basinHeight;
export const authoredHeight=(v,...args)=>domain.authoredHeight(numericVector(v),...args);
export const height=(v,...args)=>domain.height(numericVector(v),...args);
export const surfaceHydrology=(v,...args)=>domain.surfaceHydrology(numericVector(v),...args);
export const basinCoordinates=(v,...args)=>domain.basinCoordinates(numericVector(v),...args);
export const referenceGeology=(v,...args)=>domain.referenceGeology(numericVector(v),...args);
export const surfaceGeology=(v,...args)=>domain.surfaceGeology(numericVector(v),...args);
export const surfaceClimate=(v,...args)=>domain.surfaceClimate(numericVector(v),...args);
export const surface=(v,...args)=>domain.surface(numericVector(v),...args);
export const basinDirection=(...args)=>renderVector(domain.basinDirection(...args));
export const regionLanding=(...args)=>renderVector(domain.regionLanding(...args));
export const surfaceNormal=(v,...args)=>renderVector(domain.surfaceNormal(numericVector(v),...args));
export const direction=(...args)=>renderVector(domain.direction(...args));
export function basis(v){const b=domain.basis(numericVector(v));return{east:renderVector(b.east),north:renderVector(b.north)};}
const N=16;
export class PlanetTerrain{
 constructor(root,material){this.root=root;this.material=material;this.cache=new Map();this.contactLayers=new Set();this.queue=[];this.active=[];this.frame=0;this.quality='high';this.roots=faces.map((_,f)=>this.node(f,0,0,0));for(const n of this.roots)this.build(n);}
 node(f,l,x,y){const key=[f,l,x,y].join('/');if(this.cache.has(key))return this.cache.get(key);let size=2/2**l,u=-1+x*size,v=-1+y*size,n={key,f,l,x,y,size,u,v,center:direction(f,u+size/2,v+size/2),mesh:null,children:null,stamp:0};this.cache.set(key,n);return n;}
 build(n){const positions=[],normals=[],coords=[],geology=[],hydrology=[],biomes=[],indices=[];n.anchor=n.center.clone().multiplyScalar(R);const pts=[];
 for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){let d=direction(n.f,n.u+n.size*i/N,n.v+n.size*j/N),p=d.clone().multiplyScalar(R+height(d));pts.push(p);const climateData=surfaceClimate(d,p.length()-R);biomes.push(climateData.ice,climateData.volcanic,climateData.dunes);geology.push(...surfaceGeology(d));hydrology.push(...surfaceHydrology(d));positions.push(p.x-n.anchor.x,p.y-n.anchor.y,p.z-n.anchor.z);coords.push(p.x,p.y,p.z);const sn=surfaceNormal(d,Math.max(.75,n.size*R/N*.65));normals.push(sn.x,sn.y,sn.z);}
 // Measure omitted geometry at cell centres, including spherical curvature.
 // This catches narrow crater rims and coastlines that proximity alone misses.
 n.geometricError=R*(n.size/N)**2*.25;
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){
  const d=direction(n.f,n.u+n.size*(i+.5)/N,n.v+n.size*(j+.5)/N),actual=d.multiplyScalar(R+height(d));
  const interpolated=pts[j*(N+1)+i+1].clone().lerp(pts[(j+1)*(N+1)+i],.5);
  n.geometricError=Math.max(n.geometricError,actual.distanceTo(interpolated));
 }
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){let a=j*(N+1)+i,b=a+N+1;indices.push(a,a+1,b,a+1,b+1,b);}
 // Radial skirts close unequal-LOD edges and cube-face boundaries.
 let edge=[];for(let i=0;i<=N;i++)edge.push(i);for(let j=1;j<=N;j++)edge.push(j*(N+1)+N);for(let i=N-1;i>=0;i--)edge.push(N*(N+1)+i);for(let j=N-1;j>0;j--)edge.push(j*(N+1));
 // Skirts have separate vertices; their side faces never influence surface normals.
 n.edge=edge;n.skirt=Math.max(.4,n.size*R*.015);n.surfaceCount=positions.length/3;
 for(let k=0;k<edge.length;k++){const ix=edge[k],p=pts[ix],d=p.clone().normalize(),q=p.clone().addScaledVector(d,-n.skirt);
  for(const v of [p,q]){biomes.push(...biomes.slice(ix*3,ix*3+3));geology.push(...geology.slice(ix*3,ix*3+3));hydrology.push(...hydrology.slice(ix*3,ix*3+3));positions.push(v.x-n.anchor.x,v.y-n.anchor.y,v.z-n.anchor.z);coords.push(v.x,v.y,v.z);normals.push(...normals.slice(ix*3,ix*3+3));}
  const a=n.surfaceCount+k*2,b=n.surfaceCount+((k+1)%edge.length)*2;indices.push(a,a+1,b,b,a+1,b+1);
 }
 const g=new T.BufferGeometry();g.setAttribute('hydraulicData',new T.Float32BufferAttribute(hydrology,3));g.setAttribute('biomeData',new T.Float32BufferAttribute(biomes,3));g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('surfaceData',new T.Float32BufferAttribute(geology,3));g.setAttribute('planetPosition',new T.Float32BufferAttribute(coords,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(indices);g.computeBoundingSphere();
 n.originalPositions=g.attributes.position.array.slice();n.originalNormals=g.attributes.normal.array.slice();n.originalGeology=g.attributes.surfaceData.array.slice();n.originalBiomes=g.attributes.biomeData.array.slice();
 n.renderPositions=n.originalPositions.slice();n.renderNormals=n.originalNormals.slice();n.renderGeology=n.originalGeology.slice();n.renderBiomes=n.originalBiomes.slice();n.morph=1;n.morphTarget=1;n.open=false;n.revision=0;
 let mesh=new T.Mesh(g,this.material);mesh.position.copy(n.anchor);mesh.frustumCulled=true;mesh.visible=false;mesh.receiveShadow=true;n.mesh=mesh;this.root.add(mesh);
 }
 // New child geometry starts on the parent's existing triangles, including its lighting.
 prepareMorph(n,parent){
  const keys=['position','normal','surfaceData','biomeData'];n.morphFrom={};
  for(const key of keys)n.morphFrom[key]=n.mesh.geometry.attributes[key].array.slice();
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){
   const gx=((n.u+n.size*i/N)-parent.u)/parent.size*N,gy=((n.v+n.size*j/N)-parent.v)/parent.size*N;
   const x=Math.min(N-1,Math.floor(gx)),y=Math.min(N-1,Math.floor(gy)),fx=gx-x,fy=gy-y;
   const ids=fx+fy<=1?[y*(N+1)+x,y*(N+1)+x+1,(y+1)*(N+1)+x]:[(y+1)*(N+1)+x+1,(y+1)*(N+1)+x,y*(N+1)+x+1];
   const weights=fx+fy<=1?[1-fx-fy,fx,fy]:[fx+fy-1,1-fx,1-fy],index=(j*(N+1)+i)*3;
   for(const key of keys){const src=parent.mesh.geometry.attributes[key].array,out=n.morphFrom[key];for(let c=0;c<3;c++){out[index+c]=ids.reduce((sum,id,q)=>sum+src[id*3+c]*weights[q],0);if(key==='position')out[index+c]+=parent.anchor.getComponent(c)-n.anchor.getComponent(c);}}
  }
  n.open=false;n.morph=0;n.morphTarget=1;this.applyMorph(n);
 }
 applyMorph(n){
  const g=n.mesh.geometry,t=n.morph*n.morph*(3-2*n.morph),keys=['position','normal','surfaceData','biomeData'];
  const targets=[n.originalPositions,n.originalNormals,n.originalGeology,n.originalBiomes],renders=[n.renderPositions,n.renderNormals,n.renderGeology,n.renderBiomes];
  for(let k=0;k<keys.length;k++){
   const out=renders[k],target=targets[k],from=n.morphFrom?.[keys[k]]||target;
   for(let i=0;i<n.surfaceCount*3;i++)out[i]=from[i]+(target[i]-from[i])*t;
   if(k===1)for(let i=0;i<n.surfaceCount*3;i+=3){const length=Math.hypot(out[i],out[i+1],out[i+2]);for(let c=0;c<3;c++)out[i+c]/=length||1;}
   g.attributes[keys[k]].array.set(out);g.attributes[keys[k]].needsUpdate=true;
  }
  const pos=g.attributes.position.array,coords=g.attributes.planetPosition.array;for(let i=0;i<n.surfaceCount*3;i++)coords[i]=pos[i]+n.anchor.getComponent(i%3);g.attributes.planetPosition.needsUpdate=true;
  g.computeBoundingSphere();
 }
 advance(dt){const changed=new Set();
  for(const n of this.active){if(n.morph===n.morphTarget)continue;const step=Math.max(0,Math.min(dt,.05))/.48;n.morph+=T.MathUtils.clamp(n.morphTarget-n.morph,-step,step);if(Math.abs(n.morphTarget-n.morph)<1e-7)n.morph=n.morphTarget;this.applyMorph(n);changed.add(n);}
  if(changed.size)this.stitchEdges(changed);return changed.size>0;
 }
 update(cam){this.frame++;this.queue=[];this.active=[];const altitude=Math.max(1,cam.length()-R),camDir=cam.clone().normalize(),maxLevel=this.quality==='high'?14:12;
 const visit=(n,collapse=false)=>{n.stamp=this.frame;const dist=cam.distanceTo(n.center.clone().multiplyScalar(R+height(n.center))),horizon=camDir.dot(n.center);
 if(!collapse&&altitude<40000&&horizon<Math.min(.94,R/cam.length())-n.size*1.7-.04)return;
 const threshold=n.size*R*(this.quality==='high'?2.7:2.1);
 const projectedError=(n.geometricError||0)*(this.focalPixels||700)/Math.max(dist-n.size*R*.45,n.size*R*.2,1);
 const errorLimit=(this.quality==='high'?1.15:3)*(n.wasSplit?.82:1);
 const split=!collapse&&(n.l<2||(n.l<maxLevel&&(dist<threshold*(n.wasSplit?1.18:1)||projectedError>errorLimit)));n.wasSplit=split;
 if(n.open&&!n.children.every(c=>c.mesh))n.open=false;
 if(n.open){
  const start=this.active.length;n.children.forEach(c=>visit(c,!split));
  if(!split&&n.children.every(c=>!c.open&&c.morph===0)){this.active.length=start;n.open=false;n.morphTarget=collapse?0:1;this.active.push(n);}
  return;
 }
 n.morphTarget=collapse?0:1;
 if(split&&n.morph===1){
  if(!n.children)n.children=[this.node(n.f,n.l+1,n.x*2,n.y*2),this.node(n.f,n.l+1,n.x*2+1,n.y*2),this.node(n.f,n.l+1,n.x*2,n.y*2+1),this.node(n.f,n.l+1,n.x*2+1,n.y*2+1)];
  if(n.children.every(c=>c.mesh)){n.open=true;for(const c of n.children){this.prepareMorph(c,n);c.stamp=this.frame;this.active.push(c);}return;}
  for(const c of n.children)if(!c.mesh)this.queue.push({n:c,dist});
 }
 if(n.mesh)this.active.push(n);
 };
 for(const n of this.cache.values())if(n.mesh)n.mesh.visible=false;this.roots.forEach(n=>visit(n));this.active.forEach(n=>n.mesh.visible=true);this.stitchEdges();this.queue.sort((a,b)=>a.dist-b.dist);
 if(this.cache.size>1500)for(const n of this.cache.values()){if(n.l>3&&n.stamp<this.frame-12&&n.mesh){this.root.remove(n.mesh);n.mesh.geometry.dispose();n.mesh=null;n.morphFrom=null;}}
 }
 stitchEdges(dirty=null){
  // Topology changes only on quadtree updates; reuse edge interpolation during animation.
  let rebuild=false;
  if(this.stitchActive!==this.active){const key=this.active.map(n=>n.key).sort().join('|');rebuild=key!==this.stitchKey;this.stitchKey=key;this.stitchActive=this.active;}
  if(!rebuild&&!dirty)return;
  if(rebuild){const visible=new Map(this.active.map(n=>[n.key,n]));this.visibleNodes=visible;this.edgePlans=[];
   for(const n of this.active){
    const plans=[];for(let k=0;k<n.edge.length;k++){
     const ix=n.edge[k],i=ix%(N+1),j=Math.floor(ix/(N+1)),u=n.u+n.size*i/N,v=n.v+n.size*j/N,e=n.size*1e-5;
     const probe=direction(n.f,u+(i===0?-e:i===N?e:0),v+(j===0?-e:j===N?e:0));let face=0,den=-Infinity;
     for(let f=0;f<6;f++){const z=probe.dot(faces[f][0]);if(z>den){den=z;face=f;}}
     const pu=probe.dot(faces[face][1])/den,pv=probe.dot(faces[face][2])/den;let neighbor=null;
     for(let l=n.l;l>=0;l--){const div=2**l,x=Math.min(div-1,Math.max(0,Math.floor((pu+1)*.5*div))),y=Math.min(div-1,Math.max(0,Math.floor((pv+1)*.5*div))),found=visible.get([face,l,x,y].join('/'));if(found){neighbor=found;break;}}
     let source=n,ids=[ix],weights=[1];
     if(neighbor&&neighbor!==n&&(neighbor.l<n.l||(neighbor.l===n.l&&neighbor.key.localeCompare(n.key)<0))){
      source=neighbor;const d=direction(n.f,u,v),f=source.f,den=d.dot(faces[f][0]);
      const gx=T.MathUtils.clamp((d.dot(faces[f][1])/den-source.u)/source.size*N,0,N),gy=T.MathUtils.clamp((d.dot(faces[f][2])/den-source.v)/source.size*N,0,N),x=Math.min(N-1,Math.floor(gx)),y=Math.min(N-1,Math.floor(gy)),fx=gx-x,fy=gy-y;
      ids=fx+fy<=1?[y*(N+1)+x,y*(N+1)+x+1,(y+1)*(N+1)+x]:[(y+1)*(N+1)+x+1,(y+1)*(N+1)+x,y*(N+1)+x+1];weights=fx+fy<=1?[1-fx-fy,fx,fy]:[fx+fy-1,1-fx,1-fy];
     }
     plans.push({ix,k,source,ids,weights,arrays:[source.renderPositions,source.renderNormals,source.renderGeology,source.renderBiomes]});
    }this.edgePlans.push({n,plans});
   }
  }
  const values=new Float64Array(12);
  for(const {n,plans}of this.edgePlans){if(!rebuild&&!dirty.has(n)&&!plans.some(p=>dirty.has(p.source)))continue;n.revision++;const g=n.mesh.geometry,attrs=[g.attributes.position,g.attributes.normal,g.attributes.surfaceData,g.attributes.biomeData],wa=g.attributes.planetPosition.array;
   for(const plan of plans){const {ix,k,source,ids,weights,arrays}=plan;values.fill(0);
    for(let channel=0;channel<4;channel++)for(let q=0;q<ids.length;q++)for(let c=0;c<3;c++)values[channel*3+c]+=arrays[channel][ids[q]*3+c]*weights[q];
    for(let c=0;c<3;c++)values[c]+=source.anchor.getComponent(c)-n.anchor.getComponent(c);
    const norm=Math.hypot(values[3],values[4],values[5]);for(let c=3;c<6;c++)values[c]/=norm||1;
    const px=values[0]+n.anchor.x,py=values[1]+n.anchor.y,pz=values[2]+n.anchor.z,radial=Math.hypot(px,py,pz);
    for(let slot=0;slot<3;slot++){const index=(slot===0?ix:n.surfaceCount+k*2+slot-1)*3;
     for(let channel=0;channel<4;channel++)for(let c=0;c<3;c++)attrs[channel].array[index+c]=values[channel*3+c];
     if(slot===2){attrs[0].array[index]-=px/radial*n.skirt;attrs[0].array[index+1]-=py/radial*n.skirt;attrs[0].array[index+2]-=pz/radial*n.skirt;}
     for(let c=0;c<3;c++)wa[index+c]=attrs[0].array[index+c]+n.anchor.getComponent(c);
    }
   }for(const attr of attrs)attr.needsUpdate=true;g.attributes.planetPosition.needsUpdate=true;
  }
 }

 // Contact is evaluated against the actual stitched triangles, never skirts.
 sample(p){let ground=this.sampleGround(p);for(const layer of this.contactLayers){const hit=layer.sample(p,ground);if(hit&&hit.point.lengthSq()>ground.point.lengthSq())ground=hit;}return ground;}
 sampleGround(p){
  const d=p.clone().normalize();let f=0,den=-Infinity;
  for(let i=0;i<6;i++){const dot=d.dot(faces[i][0]);if(dot>den){den=dot;f=i;}}
  const u=d.dot(faces[f][1])/den,v=d.dot(faces[f][2])/den;
  let n;
  for(let l=14;l>=0;l--){const div=2**l,x=T.MathUtils.clamp(Math.floor((u+1)*.5*div),0,div-1),y=T.MathUtils.clamp(Math.floor((v+1)*.5*div),0,div-1);n=this.visibleNodes?.get([f,l,x,y].join('/'));if(n)break;}
  if(n){
   const x=T.MathUtils.clamp(Math.floor((u-n.u)/n.size*N),0,N-1),y=T.MathUtils.clamp(Math.floor((v-n.v)/n.size*N),0,N-1);
   const ray=new T.Ray(d.clone().multiplyScalar(R+10000).sub(n.anchor),d.clone().negate()),pa=n.mesh.geometry.attributes.position;
   for(const dy of [0,-1,1])for(const dx of [0,-1,1]){
    const xx=x+dx,yy=y+dy;if(xx<0||xx>=N||yy<0||yy>=N)continue;const a=yy*(N+1)+xx,b=a+N+1;
   for(const ids of [[a,a+1,b],[a+1,b+1,b]]){
    const vs=ids.map(i=>new T.Vector3().fromBufferAttribute(pa,i));let hit=ray.intersectTriangle(...vs,false,new T.Vector3());
    // Float32 edges can leave sub-millimetre ray misses at exact patch boundaries.
    if(!hit){const tri=new T.Triangle(...vs),candidate=ray.intersectPlane(tri.getPlane(new T.Plane()),new T.Vector3());if(candidate){const bary=tri.getBarycoord(candidate,new T.Vector3()),tolerance=.002/Math.max(vs[0].distanceTo(vs[1]),vs[1].distanceTo(vs[2]),vs[2].distanceTo(vs[0]),.001);if(bary&&Math.min(bary.x,bary.y,bary.z)>=-tolerance)hit=candidate;}}
    if(hit){const normal=new T.Triangle(...vs).getNormal(new T.Vector3());if(normal.dot(d)<0)normal.negate();return{point:hit.add(n.anchor),normal};}
   }
   }
  }
  return{point:d.clone().multiplyScalar(R+height(d)),normal:surfaceNormal(d)};
 }

 generate(){let t=performance.now(),count=0;while(this.queue.length&&count<4&&performance.now()-t<7){let {n}=this.queue.shift();if(!n.mesh){this.build(n);count++;}}return count;}
 contactRevision(p,radius,includeLayers=false){
  // Only patches intersecting the scatter footprint can move its foundations.
  let signature='';for(const n of this.active){const b=n.mesh.geometry.boundingSphere,dx=n.anchor.x+b.center.x-p.x,dy=n.anchor.y+b.center.y-p.y,dz=n.anchor.z+b.center.z-p.z,reach=b.radius+radius;if(dx*dx+dy*dy+dz*dz<=reach*reach)signature+=n.key+':'+n.revision+';';}if(includeLayers)for(const layer of this.contactLayers)signature+=layer.contactRevision?.(p,radius)||'';return signature;
 }
 reset(){this.stitchKey=null;this.stitchActive=null;for(const n of this.cache.values())if(n.mesh){this.root.remove(n.mesh);n.mesh.geometry.dispose();}this.cache.clear();this.queue=[];this.active=[];this.visibleNodes=new Map();this.frame++;this.roots=faces.map((_,f)=>this.node(f,0,0,0));for(const n of this.roots)this.build(n);}
 get count(){return this.active.length;}
}
