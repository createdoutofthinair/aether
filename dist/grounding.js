import * as T from './vendor/three.module.js';
import {R,faces,direction,noise,landing,basinCoordinates,basinProfile} from './terrain.js';
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
   result.push({outcrop,id:`${f}/${x}/${y}/${k}`,direction:d,size:outcrop?3+hash(x,y,seed+31)*5:.15+hash(x,y,seed+31)**3*2.7,angle:hash(x,y,seed+57)*Math.PI*2});
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
  const material=new T.MeshStandardMaterial({map:textures.rock,normalMap:textures.rn,roughnessMap:textures.rr,color:0xb3a393,roughness:.9});material.onBeforeCompile=fade;material.customProgramCacheKey=()=>`rock-fade-${this.near}-${this.far}`;
  const geometry=new T.IcosahedronGeometry(1,3),positions=geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const v=new T.Vector3().fromBufferAttribute(positions,i),shape=.85+.28*noise(v.x*3+4,v.y*3+7,v.z*3+9);
   v.multiplyScalar(shape);v.y=Math.tanh(v.y*1.8)*.78;positions.setXYZ(i,v.x,v.y,v.z);
  }
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  this.mesh=new T.InstancedMesh(geometry,material,4096);this.mesh.count=0;this.mesh.castShadow=true;this.mesh.receiveShadow=true;
  this.mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});this.mesh.customDepthMaterial.onBeforeCompile=fade;this.mesh.customDepthMaterial.customProgramCacheKey=()=>`rock-depth-fade-${this.near}-${this.far}`;
  root.add(this.mesh);
 }
 update(p){
  const surface=this.terrain.sample(p).point;
  // All instances have already faded out before this cutoff.
  this.mesh.visible=p.distanceTo(surface)<this.radius+10;if(!this.mesh.visible)return;
  const moved=surface.distanceTo(this.center)>20;
  if(moved){this.center.copy(surface);this.items=rockCandidates(surface,this.radius,this.small?8192:2048);}
  if(!moved&&this.revision===this.terrain.frame)return;
  this.revision=this.terrain.frame;
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0);this.mesh.position.copy(this.center);
  this.mesh.count=Math.min(this.items.length,this.mesh.instanceMatrix.count);
  for(let i=0;i<this.mesh.count;i++){
   const r=this.items[i],hit=this.terrain.sample(r.direction),size=r.size*(this.small?.14:1);
   dummy.position.copy(hit.point).addScaledVector(hit.normal,-size*(r.outcrop?.32:.18)).sub(this.center);
   dummy.quaternion.setFromUnitVectors(up,hit.normal);dummy.rotateY(r.angle);dummy.scale.set(size*(1.05+.3*Math.sin(r.angle)),size*(r.outcrop?.5:.65),size);dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);
  }
  this.mesh.instanceMatrix.needsUpdate=true;this.mesh.computeBoundingSphere();
 }
}
