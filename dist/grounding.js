import * as T from './vendor/three.module.js';
import {R,faces,direction} from './terrain.js';
const hash=(a,b,c)=>{const v=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return v-Math.floor(v);};
// IDs and positions depend only on planet cells, not camera position or travel history.
export function rockCandidates(p,radius=330){
 const result=[],up=p.clone().normalize(),div=2048,step=2/div;
 for(let f=0;f<6;f++){
  const den=up.dot(faces[f][0]);if(den<.45)continue;
  const u=up.dot(faces[f][1])/den,v=up.dot(faces[f][2])/den,pad=radius*3/R;
  const x0=Math.max(0,Math.floor((u-pad+1)/step)),x1=Math.min(div-1,Math.floor((u+pad+1)/step));
  const y0=Math.max(0,Math.floor((v-pad+1)/step)),y1=Math.min(div-1,Math.floor((v+pad+1)/step));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)for(let k=0;k<2;k++){
   const seed=f*2+k,d=direction(f,-1+(x+hash(x,y,seed+1))*step,-1+(y+hash(x,y,seed+17))*step);
   if(d.distanceTo(up)*R>radius)continue;
   result.push({id:`${f}/${x}/${y}/${k}`,direction:d,size:.15+hash(x,y,seed+31)**3*2.7,angle:hash(x,y,seed+57)*Math.PI*2});
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
 constructor(root,textures,terrain){
  this.terrain=terrain;this.center=new T.Vector3(1e9,0,0);this.revision=-1;this.items=[];
  const fade=shader=>{
   shader.vertexShader='varying float rockDistance;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
    rockDistance=length((modelMatrix*instanceMatrix*vec4(0.0,0.0,0.0,1.0)).xyz);`);
   shader.fragmentShader='varying float rockDistance;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('void main() {',`void main() {
    float visibility=1.0-smoothstep(220.0,300.0,rockDistance);
    float threshold=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(0.06711056,0.00583715))));
    if(visibility<=threshold)discard;`);
  };
  const material=new T.MeshStandardMaterial({map:textures.rock,normalMap:textures.rn,roughnessMap:textures.rr,color:0xb3a393,roughness:.9});material.onBeforeCompile=fade;
  this.mesh=new T.InstancedMesh(new T.IcosahedronGeometry(1,2),material,4096);this.mesh.count=0;this.mesh.castShadow=true;this.mesh.receiveShadow=true;
  this.mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});this.mesh.customDepthMaterial.onBeforeCompile=fade;
  root.add(this.mesh);
 }
 update(p){
  const surface=this.terrain.sample(p).point;
  // All instances have already faded out before this cutoff.
  this.mesh.visible=p.distanceTo(surface)<340;if(!this.mesh.visible)return;
  const moved=surface.distanceTo(this.center)>20;
  if(moved){this.center.copy(surface);this.items=rockCandidates(surface);}
  if(!moved&&this.revision===this.terrain.frame)return;
  this.revision=this.terrain.frame;
  const dummy=new T.Object3D(),up=new T.Vector3(0,1,0);this.mesh.position.copy(this.center);
  this.mesh.count=Math.min(this.items.length,this.mesh.instanceMatrix.count);
  for(let i=0;i<this.mesh.count;i++){
   const r=this.items[i],hit=this.terrain.sample(r.direction);
   dummy.position.copy(hit.point).addScaledVector(hit.normal,-r.size*.15).sub(this.center);
   dummy.quaternion.setFromUnitVectors(up,hit.normal);dummy.rotateY(r.angle);dummy.scale.set(r.size*1.2,r.size*.65,r.size);dummy.updateMatrix();this.mesh.setMatrixAt(i,dummy.matrix);
  }
  this.mesh.instanceMatrix.needsUpdate=true;this.mesh.computeBoundingSphere();
 }
}
