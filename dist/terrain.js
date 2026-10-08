import * as T from './vendor/three.module.js';
export const R=60000;
export const landing=new T.Vector3(.27,.46,.846).normalize();
const fract=x=>x-Math.floor(x),mix=(a,b,t)=>a+(b-a)*t;
function hash(x,y,z){return fract(Math.sin(x*127.1+y*311.7+z*74.7)*43758.5453);}
export function noise(x,y,z){let a=Math.floor(x),b=Math.floor(y),c=Math.floor(z);x-=a;y-=b;z-=c;x=x*x*(3-2*x);y=y*y*(3-2*y);z=z*z*(3-2*z);return mix(mix(mix(hash(a,b,c),hash(a+1,b,c),x),mix(hash(a,b+1,c),hash(a+1,b+1,c),x),y),mix(mix(hash(a,b,c+1),hash(a+1,b,c+1),x),mix(hash(a,b+1,c+1),hash(a+1,b+1,c+1),x),y),z);}
const craters=Array.from({length:24},(_,i)=>{let z=hash(i,8,2)*2-1,a=hash(i,2,9)*Math.PI*2;return{n:new T.Vector3(Math.sqrt(1-z*z)*Math.cos(a),z,Math.sqrt(1-z*z)*Math.sin(a)),r:.018+hash(i,4,1)*.075};});
export function height(n){const localDistance=R*Math.sqrt(Math.max(0,2-2*n.dot(landing)));if(localDistance<4200){const p=basinCoordinates(n);return basinHeight(p.x,p.z);}let x=n.x,y=n.y,z=n.z;let h=0,amp=1100,f=3;for(let i=0;i<8;i++){let v=noise(x*f+17,y*f+9,z*f+31);h+=amp*(i<2?v-.44:(1-Math.abs(v*2-1))-.48);amp*=.47;f*=2.17;}for(const c of craters){const d2=2-2*n.dot(c.n);if(d2<c.r*c.r*2.8){let q=Math.sqrt(Math.max(0,d2))/c.r;h+=c.r*R*.16*(Math.exp(-Math.pow((q-.99)*7,2))*.7-Math.max(0,1-q*q)*.8);}}
 const d=R*Math.sqrt(Math.max(0,2-2*n.dot(landing)));
 if(d>6500)return h;
 const coords=basinCoordinates(n),regional=basinHeight(coords.x,coords.z);
 return mix(regional,h,T.MathUtils.smoothstep(d,4200,6500));}
const landingEast=new T.Vector3(0,1,0).cross(landing).normalize();
const landingNorth=new T.Vector3().crossVectors(landing,landingEast).normalize();
export function basinCoordinates(d){return{x:d.dot(landingEast)*R,z:d.dot(landingNorth)*R};}
function channelCenter(z){return 180*(noise(z/850+7,3,11)-.5)+65*(noise(z/230+9,8,2)-.5);}
// Sparse, fixed tributary graph; a spatial index keeps per-vertex queries local.
const drainageCells=new Map();
function addDrain(a,b,width){
 const segment={a,b,width};
 for(let x=Math.floor((Math.min(a.x,b.x)-width*3)/300);x<=Math.floor((Math.max(a.x,b.x)+width*3)/300);x++)
 for(let z=Math.floor((Math.min(a.z,b.z)-width*3)/300);z<=Math.floor((Math.max(a.z,b.z)+width*3)/300);z++){
  const key=x+','+z;if(!drainageCells.has(key))drainageCells.set(key,[]);drainageCells.get(key).push(segment);
 }
}
for(let i=-7;i<=7;i++)for(const side of [-1,1]){
 const join=i*440+hash(i,side,1)*240,origin={x:channelCenter(join),z:join};let last=origin;
 for(let j=1;j<=4;j++){
  const next={x:origin.x+side*j*(180+hash(i,side,3)*80),z:join-j*90+120*(hash(i,j,side+4)-.5)};
  addDrain(last,next,12+(5-j)*5);
  if(j>1){const tip={x:next.x+side*(120+hash(i,j,8)*130),z:next.z-170-hash(i,j,9)*170};addDrain(next,tip,10);}
  last=next;
 }
}
export function basinProfile(x,z){
 const channel=channelCenter(z),distance=Math.abs(x-channel);
 const width=45+45*noise(z/360+4,2,6),bank=T.MathUtils.smoothstep(distance,width,width+80+70*noise(x/310+4,z/270+8,1));
 const wx=x+110*(noise(x/700+4,z/580+9,3)-.5),wz=z+90*(noise(x/510+7,z/620+4,5)-.5);
 const mesa=T.MathUtils.smoothstep(noise(wx/440+11,wz/570+6,7),.46,.66);
 let drainage=0;
 for(const segment of drainageCells.get(Math.floor(x/300)+','+Math.floor(z/300))||[]){
  const {a,b,width}=segment,dx=b.x-a.x,dz=b.z-a.z,t=T.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
  const d=Math.hypot(x-a.x-dx*t,z-a.z-dz*t)/width;
  drainage=Math.max(drainage,Math.exp(-d*d)*(1-T.MathUtils.smoothstep(d,2.4,3)));
 }
 return{bank,mesa,distance,drainage,wx,wz};
}
export function basinHeight(x,z){
 const {bank,mesa,drainage,wx,wz}=basinProfile(x,z);
 const uplift=30+80*noise(wx/760+8,wz/690+4,9);
 const shoulders=bank*(uplift+mesa*105);
 // No periodic elevation steps: isolated resistant beds break up selected slopes.
 const bed=noise(wx/190+12,wz/240+8,4),resistant=T.MathUtils.smoothstep(bed,.55,.73);
 const broken=(noise(wx*.034+9,wz*.028+8,3)-.5)*4.5*bank;
 const gullies=drainage*bank*(18+mesa*38);
 const talus=(noise(x/55+3,z/68+5,7)-.5)*3.5*bank*(1-mesa);
 const floor=120+z*.008+1.4*(noise(x/95+2,z/140+3,2)-.5);
 const gravel=(noise(x*.12+7,z*.12+3,5)-.5)*.14;
 return floor+shoulders+resistant*bank*17-gullies+broken+talus+gravel;
}
export function surfaceGeology(d){
 const distance=R*Math.sqrt(Math.max(0,2-2*d.dot(landing))),regional=1-T.MathUtils.smoothstep(distance,4200,6500);
 if(regional===0)return[0,0,0];
 const {x,z}=basinCoordinates(d),p=basinProfile(x,z);
 return[Math.min(1,1-p.bank+p.drainage*p.bank*.85),p.bank*p.mesa*(1-p.drainage),regional];
}

export function surface(p){return R+height(p.clone().normalize());}
export function basis(up){let east=new T.Vector3(0,1,0).cross(up);if(east.lengthSq()<.001)east.set(1,0,0);east.normalize();let north=new T.Vector3().crossVectors(up,east).normalize();return{east,north};}
// Sample the continuous height field, independent of patch boundaries or LOD.
export function surfaceNormal(d){const {east,north}=basis(d),eps=.75,at=R+height(d);
 const dhE=(height(d.clone().addScaledVector(east,eps/R).normalize())-height(d.clone().addScaledVector(east,-eps/R).normalize()))/(2*eps);
 const dhN=(height(d.clone().addScaledVector(north,eps/R).normalize())-height(d.clone().addScaledVector(north,-eps/R).normalize()))/(2*eps);
 return d.clone().addScaledVector(east,-dhE*R/at).addScaledVector(north,-dhN*R/at).normalize();}
export const faces=[[[1,0,0],[0,0,-1],[0,1,0]],[[-1,0,0],[0,0,1],[0,1,0]],[[0,1,0],[1,0,0],[0,0,-1]],[[0,-1,0],[1,0,0],[0,0,1]],[[0,0,1],[1,0,0],[0,1,0]],[[0,0,-1],[-1,0,0],[0,1,0]]].map(f=>f.map(v=>new T.Vector3(...v)));
export function direction(face,u,v){return faces[face][0].clone().addScaledVector(faces[face][1],u).addScaledVector(faces[face][2],v).normalize();}
const N=16;
export class PlanetTerrain{
 constructor(root,material){this.root=root;this.material=material;this.cache=new Map();this.queue=[];this.active=[];this.frame=0;this.quality='high';this.roots=faces.map((_,f)=>this.node(f,0,0,0));for(const n of this.roots)this.build(n);}
 node(f,l,x,y){const key=[f,l,x,y].join('/');if(this.cache.has(key))return this.cache.get(key);let size=2/2**l,u=-1+x*size,v=-1+y*size,n={key,f,l,x,y,size,u,v,center:direction(f,u+size/2,v+size/2),mesh:null,children:null,stamp:0};this.cache.set(key,n);return n;}
 build(n){const positions=[],normals=[],coords=[],geology=[],indices=[];n.anchor=n.center.clone().multiplyScalar(R);const pts=[];
 for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){let d=direction(n.f,n.u+n.size*i/N,n.v+n.size*j/N),p=d.clone().multiplyScalar(R+height(d));pts.push(p);geology.push(...surfaceGeology(d));positions.push(p.x-n.anchor.x,p.y-n.anchor.y,p.z-n.anchor.z);coords.push(p.x,p.y,p.z);const sn=surfaceNormal(d);normals.push(sn.x,sn.y,sn.z);}
 for(let j=0;j<N;j++)for(let i=0;i<N;i++){let a=j*(N+1)+i,b=a+N+1;indices.push(a,a+1,b,a+1,b+1,b);}
 // Radial skirts close unequal-LOD edges and cube-face boundaries.
 let edge=[];for(let i=0;i<=N;i++)edge.push(i);for(let j=1;j<=N;j++)edge.push(j*(N+1)+N);for(let i=N-1;i>=0;i--)edge.push(N*(N+1)+i);for(let j=N-1;j>0;j--)edge.push(j*(N+1));
 // Skirts have separate vertices; their side faces never influence surface normals.
 n.edge=edge;n.skirt=Math.max(.4,n.size*R*.015);n.surfaceCount=positions.length/3;
 for(let k=0;k<edge.length;k++){const ix=edge[k],p=pts[ix],d=p.clone().normalize(),q=p.clone().addScaledVector(d,-n.skirt);
  for(const v of [p,q]){geology.push(...geology.slice(ix*3,ix*3+3));positions.push(v.x-n.anchor.x,v.y-n.anchor.y,v.z-n.anchor.z);coords.push(v.x,v.y,v.z);normals.push(...normals.slice(ix*3,ix*3+3));}
  const a=n.surfaceCount+k*2,b=n.surfaceCount+((k+1)%edge.length)*2;indices.push(a,a+1,b,b,a+1,b+1);
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('surfaceData',new T.Float32BufferAttribute(geology,3));g.setAttribute('planetPosition',new T.Float32BufferAttribute(coords,3));g.setAttribute('normal',new T.Float32BufferAttribute(normals,3));g.setIndex(indices);g.computeBoundingSphere();
 n.originalPositions=g.attributes.position.array.slice();n.originalNormals=g.attributes.normal.array.slice();n.originalGeology=g.attributes.surfaceData.array.slice();
 let mesh=new T.Mesh(g,this.material);mesh.position.copy(n.anchor);mesh.frustumCulled=true;mesh.visible=false;mesh.receiveShadow=true;n.mesh=mesh;this.root.add(mesh);
 }
 update(cam){this.frame++;this.queue=[];this.active=[];const altitude=Math.max(1,cam.length()-R),camDir=cam.clone().normalize(),maxLevel=this.quality==='high'?13:12;
 const visit=n=>{n.stamp=this.frame;const dist=cam.distanceTo(n.center.clone().multiplyScalar(R+height(n.center)));const horizon=camDir.dot(n.center);if(altitude<40000&&horizon<Math.min(.94,R/cam.length())-n.size*1.7-.04)return;
 const split=n.l<2||(n.l<maxLevel&&dist<n.size*R*(this.quality==='high'?2.4:1.8));
 if(split){if(!n.children)n.children=[this.node(n.f,n.l+1,n.x*2,n.y*2),this.node(n.f,n.l+1,n.x*2+1,n.y*2),this.node(n.f,n.l+1,n.x*2,n.y*2+1),this.node(n.f,n.l+1,n.x*2+1,n.y*2+1)];const ready=n.children.every(c=>c.mesh);if(ready){n.children.forEach(visit);return;}for(const c of n.children)if(!c.mesh)this.queue.push({n:c,dist});}
 if(n.mesh)this.active.push(n);
 };
 for(const n of this.cache.values())if(n.mesh)n.mesh.visible=false;this.roots.forEach(visit);this.active.forEach(n=>n.mesh.visible=true);this.stitchEdges();this.queue.sort((a,b)=>a.dist-b.dist);
 // Keep coarse ancestors; evict unused detail under a fixed memory budget.
 if(this.cache.size>1500)for(const [k,n]of this.cache){if(n.l>3&&n.stamp<this.frame-12&&n.mesh){this.root.remove(n.mesh);n.mesh.geometry.dispose();n.mesh=null;}}
 }
 stitchEdges(){
  const visible=new Map(this.active.map(n=>[n.key,n]));this.visibleNodes=visible;
  for(const n of this.active){const g=n.mesh.geometry,pa=g.attributes.position,na=g.attributes.normal,wa=g.attributes.planetPosition,ga=g.attributes.surfaceData;
   for(let k=0;k<n.edge.length;k++){const ix=n.edge[k],i=ix%(N+1),j=Math.floor(ix/(N+1)),u=n.u+n.size*i/N,v=n.v+n.size*j/N;
    // Probe across this edge, including cube-face transitions.
    const e=n.size*1e-5,probe=direction(n.f,u+(i===0?-e:i===N?e:0),v+(j===0?-e:j===N?e:0));
    let face=0,den=-Infinity;for(let f=0;f<6;f++){const z=probe.dot(faces[f][0]);if(z>den){den=z;face=f;}}
    const pu=probe.dot(faces[face][1])/den,pv=probe.dot(faces[face][2])/den;let neighbor=null;
    for(let l=n.l;l>=0;l--){const div=2**l,x=Math.min(div-1,Math.max(0,Math.floor((pu+1)*.5*div))),y=Math.min(div-1,Math.max(0,Math.floor((pv+1)*.5*div)));const found=visible.get([face,l,x,y].join('/'));if(found){neighbor=found;break;}}
    let p=new T.Vector3().fromArray(n.originalPositions,ix*3).add(n.anchor),normal=new T.Vector3().fromArray(n.originalNormals,ix*3),geo=new T.Vector3().fromArray(n.originalGeology,ix*3);
    if(neighbor&&neighbor!==n&&neighbor.l<n.l){const d=direction(n.f,u,v),f=neighbor.f,den=d.dot(faces[f][0]);
     const gx=T.MathUtils.clamp((d.dot(faces[f][1])/den-neighbor.u)/neighbor.size*N,0,N),gy=T.MathUtils.clamp((d.dot(faces[f][2])/den-neighbor.v)/neighbor.size*N,0,N),x=Math.min(N-1,Math.floor(gx)),y=Math.min(N-1,Math.floor(gy)),fx=gx-x,fy=gy-y;
     const ids=fx+fy<=1?[y*(N+1)+x,y*(N+1)+x+1,(y+1)*(N+1)+x]:[(y+1)*(N+1)+x+1,(y+1)*(N+1)+x,y*(N+1)+x+1];
     const weights=fx+fy<=1?[1-fx-fy,fx,fy]:[fx+fy-1,1-fx,1-fy];p.set(0,0,0);normal.set(0,0,0);geo.set(0,0,0);
     for(let q=0;q<3;q++){geo.addScaledVector(new T.Vector3().fromArray(neighbor.originalGeology,ids[q]*3),weights[q]);p.addScaledVector(new T.Vector3().fromArray(neighbor.originalPositions,ids[q]*3).add(neighbor.anchor),weights[q]);normal.addScaledVector(new T.Vector3().fromArray(neighbor.originalNormals,ids[q]*3),weights[q]);}normal.normalize();
    }
    const local=p.clone().sub(n.anchor),bottom=p.clone().addScaledVector(p.clone().normalize(),-n.skirt).sub(n.anchor);
    for(const [idx,vv]of [[ix,local],[n.surfaceCount+k*2,local],[n.surfaceCount+k*2+1,bottom]]){ga.setXYZ(idx,geo.x,geo.y,geo.z);pa.setXYZ(idx,vv.x,vv.y,vv.z);na.setXYZ(idx,normal.x,normal.y,normal.z);wa.setXYZ(idx,vv.x+n.anchor.x,vv.y+n.anchor.y,vv.z+n.anchor.z);}
   }
   ga.needsUpdate=true;pa.needsUpdate=true;na.needsUpdate=true;wa.needsUpdate=true;
  }
 }

 // Contact is evaluated against the actual stitched triangles, never skirts.
 sample(p){
  const d=p.clone().normalize();let f=0,den=-Infinity;
  for(let i=0;i<6;i++){const dot=d.dot(faces[i][0]);if(dot>den){den=dot;f=i;}}
  const u=d.dot(faces[f][1])/den,v=d.dot(faces[f][2])/den;
  let n;
  for(let l=13;l>=0;l--){const div=2**l,x=T.MathUtils.clamp(Math.floor((u+1)*.5*div),0,div-1),y=T.MathUtils.clamp(Math.floor((v+1)*.5*div),0,div-1);n=this.visibleNodes?.get([f,l,x,y].join('/'));if(n)break;}
  if(n){
   const x=T.MathUtils.clamp(Math.floor((u-n.u)/n.size*N),0,N-1),y=T.MathUtils.clamp(Math.floor((v-n.v)/n.size*N),0,N-1);
   const ray=new T.Ray(d.clone().multiplyScalar(R+10000).sub(n.anchor),d.clone().negate()),pa=n.mesh.geometry.attributes.position;
   for(const dy of [0,-1,1])for(const dx of [0,-1,1]){
    const xx=x+dx,yy=y+dy;if(xx<0||xx>=N||yy<0||yy>=N)continue;const a=yy*(N+1)+xx,b=a+N+1;
   for(const ids of [[a,a+1,b],[a+1,b+1,b]]){
    const vs=ids.map(i=>new T.Vector3().fromBufferAttribute(pa,i)),hit=ray.intersectTriangle(...vs,false,new T.Vector3());
    if(hit){const normal=new T.Triangle(...vs).getNormal(new T.Vector3());if(normal.dot(d)<0)normal.negate();return{point:hit.add(n.anchor),normal};}
   }
   }
  }
  return{point:d.clone().multiplyScalar(R+height(d)),normal:surfaceNormal(d)};
 }

 generate(){let t=performance.now(),count=0;while(this.queue.length&&count<4&&performance.now()-t<7){let {n}=this.queue.shift();if(!n.mesh){this.build(n);count++;}}return count;}
 get count(){return this.active.length;}
}
