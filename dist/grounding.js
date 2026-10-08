import {world,climate} from './world.js?v=world-1';
import * as T from './vendor/three.module.js';
import {R,faces,direction,noise,landing,basinCoordinates,basinProfile} from './terrain.js?v=world-1';
const hash=(a,b,c)=>{const v=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return v-Math.floor(v);};
// IDs and positions depend only on planet cells, not camera position or travel history.
export function rockCandidates(p,radius=330,div=2048){
 const result=[],up=p.clone().normalize(),step=2/div;
 for(let f=0;f<6;f++){
  const den=up.dot(faces[f][0]);if(den<.45)continue;
  const u=up.dot(faces[f][1])/den,v=up.dot(faces[f][2])/den,pad=radius*3/R;
  const x0=Math.max(0,Math.floor((u-pad+1)/step)),x1=Math.min(div-1,Math.floor((u+pad+1)/step));
  const y0=Math.max(0,Math.floor((v-pad+1)/step)),y1=Math.min(div-1,Math.floor((v+pad+1)/step));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)for(let k=0;k<2;k++){
   const seed=f*2+k,d=direction(f,-1+(x+hash(x,y,seed+1))*step,-1+(y+hash(x,y,seed+17))*step);
   if(d.distanceTo(up)*R>radius)continue;
   const local=basinCoordinates(d),nearBasin=d.distanceTo(landing)*R<4200,bank=nearBasin?basinProfile(local.x,local.z).bank:.5;
   if(hash(x,y,seed+71)>.25+.7*bank)continue;
   const outcrop=div===2048&&bank>.6&&hash(x,y,seed+81)>.86;
   result.push({variant:Math.floor(hash(x,y,seed+101)*8),tint:.80+hash(x,y,seed+111)*.28,outcrop,id:`${f}/${x}/${y}/${k}`,direction:d,size:outcrop?3+hash(x,y,seed+31)*5:.15+hash(x,y,seed+31)**3*2.7,angle:hash(x,y,seed+57)*Math.PI*2});
  }
 }
 return result;
}
// Conservative support of a tyre cylinder against the local contact plane.
export function tyreSupport(radius,halfWidth,axle,normal){
 const axial=Math.min(1,Math.abs(axle.dot(normal)));
 return radius*Math.sqrt(Math.max(0,1-axial*axial))+halfWidth*axial;
}
export function wheelLift(center,up,axle,radius,halfWidth,terrain){
 const {point,normal}=terrain.sample(center);
 return (tyreSupport(radius,halfWidth,axle,normal)+.015-center.clone().sub(point).dot(normal))/Math.max(.2,up.dot(normal));
}
// Eight stable silhouettes, rather than rotations of one rounded boulder.
export function createRockGeometry(variant,detail=3){
 const geometry=new T.IcosahedronGeometry(1,detail),positions=geometry.attributes.position,seed=variant*17;
 for(let i=0;i<positions.count;i++){
  const v=new T.Vector3().fromBufferAttribute(positions,i),n=noise(v.x*3+4+seed,v.y*3+7,v.z*3+9);
  v.multiplyScalar(.78+n*.38);
  if(variant===1||variant===6){v.set(Math.sign(v.x)*Math.pow(Math.abs(v.x),.65),Math.sign(v.y)*Math.pow(Math.abs(v.y),.75),Math.sign(v.z)*Math.pow(Math.abs(v.z),.65));}
  if(variant===2){v.y*=.38;v.x*=1.35;}
  if(variant===3){v.x*=.55;v.z*=.7;v.y*=1.4;v.x+=v.y*.25;}
  if(variant===4){v.y=Math.min(v.y,.48+v.x*.18);v.x*=1.25;}
  if(variant===5){v.y-=.5*Math.exp(-v.x*v.x*35)*Math.max(0,v.y);v.z*=.7;}
  if(variant===6){v.y*=.65;v.x+=v.z*.3;}
  if(variant===7){v.x*=1.5;v.y*=.55;v.z*=.65;}
  positions.setXYZ(i,v.x,v.y,v.z);
 }
 geometry.computeVertexNormals();
 // Average coincident vertices across UV seams without destroying UV mapping.
 const normals=geometry.attributes.normal,sums=new Map(),keys=[];
 for(let i=0;i<positions.count;i++){
  const key=[positions.getX(i),positions.getY(i),positions.getZ(i)].map(v=>Math.round(v*1e5)).join(',');keys.push(key);
  if(!sums.has(key))sums.set(key,new T.Vector3());sums.get(key).add(new T.Vector3().fromBufferAttribute(normals,i));
 }
 for(const n of sums.values())n.normalize();
 for(let i=0;i<normals.count;i++){const n=sums.get(keys[i]);normals.setXYZ(i,n.x,n.y,n.z);}
 geometry.computeBoundingSphere();geometry.computeBoundingBox();return geometry;
}
export class RockField{
 constructor(root,textures,terrain,small=false){
  this.small=small;this.far=small?75:300;this.near=small?45:220;this.radius=this.far+30;
  this.terrain=terrain;this.center=new T.Vector3(1e9,0,0);this.revision=-1;this.items=[];
  const fade=shader=>{
   shader.vertexShader='varying float rockDistance;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    rockDistance=length((modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz);`);
   shader.fragmentShader='varying float rockDistance;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('void main() {',`void main() {
    float visibility=1.0-smoothstep(${this.near.toFixed(1)},${this.far.toFixed(1)},rockDistance);
    float threshold=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));
    if(visibility<=threshold)discard;`);
  };
  const material=new T.MeshStandardMaterial({map:textures.rock,normalMap:textures.rn,roughnessMap:textures.rr,color:0xffffff,roughness:.9});material.onBeforeCompile=fade;material.customProgramCacheKey=()=>`rock-fade-${this.near}-${this.far}`;
  this.meshes=Array.from({length:8},(_,variant)=>{
   const mesh=new T.InstancedMesh(createRockGeometry(variant,small?2:3),material,1024);mesh.count=0;mesh.castShadow=true;mesh.receiveShadow=true;
   mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});mesh.customDepthMaterial.onBeforeCompile=fade;mesh.customDepthMaterial.customProgramCacheKey=()=>`rock-depth-fade-${this.near}-${this.far}`;
   root.add(mesh);return mesh;
  });
  this.mesh=this.meshes[0];

 }
 update(p){
  const surface=this.terrain.sample(p).point;
  // All instances have already faded out before this cutoff.
  const visible=p.distanceTo(surface)<this.radius+10;for(const mesh of this.meshes)mesh.visible=visible;if(!visible)return;
  const moved=surface.distanceTo(this.center)>20;
  if(moved){this.center.copy(surface);this.items=rockCandidates(surface,this.radius,this.small?8192:2048);}
  if(!moved&&this.revision===this.terrain.frame)return;
  this.revision=this.terrain.frame;
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0),color=new T.Color();
  for(const mesh of this.meshes){mesh.position.copy(this.center);mesh.count=0;}
  for(const r of this.items){
   const mesh=this.meshes[r.variant];if(mesh.count>=mesh.instanceMatrix.count)continue;
   const hit=this.terrain.sample(r.direction),size=r.size*(this.small?.14:1);
   const region=climate(r.direction,hit.point.length()-R);if(region.ocean)continue;
   dummy.quaternion.setFromUnitVectors(up,hit.normal);dummy.rotateY(r.angle);
   let foundation=0;
   if(size>2){
    for(const axis of [new T.Vector3(1,0,0),new T.Vector3(0,0,1)])for(const side of [-1,1]){
     const probe=hit.point.clone().addScaledVector(axis.clone().applyQuaternion(dummy.quaternion),size*.55*side);
     foundation=Math.min(foundation,this.terrain.sample(probe).point.sub(hit.point).dot(hit.normal));
    }
   }
   dummy.position.copy(hit.point).addScaledVector(hit.normal,foundation-size*(r.outcrop?.28:.16)).sub(this.center);
   dummy.scale.set(size*(1.05+.3*Math.sin(r.angle)),size*(r.outcrop?.65:.75),size);dummy.updateMatrix();
   mesh.setMatrixAt(mesh.count,dummy.matrix);const shade=1-region.volcanic*.5;color.setRGB(r.tint*shade,r.tint*.97*shade,r.tint*.92*shade);color.lerp(new T.Color(.72,.80,.84),region.ice*.8);mesh.setColorAt(mesh.count,color);mesh.count++;
  }
  for(const mesh of this.meshes){mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
 }
}
