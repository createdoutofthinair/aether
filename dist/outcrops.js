import * as T from './vendor/three.module.js';
import {getReference} from './terrain-cache.js?v=terrain-9';
import {R,landing,basis,basinDirection,basinCoordinates,surfaceClimate} from './terrain.js?v=terrain-9';
import {world,environment} from './world.js?v=terrain-9';
import {patchTerrain} from './shaders.js?v=terrain-9';
const hash=(n,s)=>{let v=Math.imul(n+1,374761393)^Math.imul(s+1,668265263);v=Math.imul(v^(v>>>13),1274126177);return((v^(v>>>16))>>>0)/4294967295;};

// Three interlocking fractured slabs. Chamfered polygon footprints, stepped
// fracture faces and irregular roofs give real silhouettes instead of spheres.
export function createOutcropGeometry(variant){
 const vertices=[],tri=(a,b,c)=>vertices.push(...a,...b,...c),seed=variant*101+19;
 for(let block=0;block<3;block++){
  const centre=-.34+block*.34,width=.15+hash(block,seed)*.035,depth=.36+hash(block+3,seed)*.12;
  const outline=[[-1,-.55],[-.62,-1],[.6,-1],[1,-.57],[1,.55],[.64,1],[-.6,1],[-1,.58]];
  const top=[],mid=[],bottom=[];
  for(let i=0;i<outline.length;i++){
   const [a,b]=outline[i],jitter=.88+hash(i+block*11,seed)*.20,x=centre+a*width*jitter,z=b*depth*jitter+.04*(hash(block+5,seed)-.5),roof=.72+hash(block+7,seed)*.30+.09*a-.07*b;
   top.push([x,roof+.025*(hash(i+block*13,seed)-.5),z]);
   mid.push([centre+(x-centre)*(.94+hash(i+31,seed)*.10),.25+.13*hash(i+block*17,seed),z*(.96+hash(i+41,seed)*.10)]);
   bottom.push([centre+(x-centre)*1.08,-.8,z*1.08]);
  }
  const roofCentre=[centre,.87+hash(block+7,seed)*.25,0];
  for(let i=0;i<8;i++){const j=(i+1)%8;tri(roofCentre,top[j],top[i]);tri(top[i],top[j],mid[i]);tri(top[j],mid[j],mid[i]);tri(mid[i],mid[j],bottom[i]);tri(mid[j],bottom[j],bottom[i]);tri([centre,-.8,0],bottom[i],bottom[j]);}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}
function fadeMaterial(material,near=2600,far=3400){
  const original=material.onBeforeCompile;material.onBeforeCompile=shader=>{original?.call(material,shader);
  shader.vertexShader='attribute float formationReady;varying float outcropDistance,outcropReady;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>\noutcropReady=formationReady;outcropDistance=length((modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz);`);
  shader.fragmentShader='varying float outcropDistance,outcropReady;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('void main() {',`void main() {\nfloat cropVisibility=(1.-smoothstep(${near.toFixed(1)},${far.toFixed(1)},outcropDistance))*outcropReady;float cropThreshold=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(cropVisibility<=cropThreshold)discard;`);
 };material.customProgramCacheKey=()=>`outcrop-${material.type}-${near}-${far}`;
}
export class OutcropField{
 constructor(root,textures,terrain,controls){
  this.terrain=terrain;this.anchor=landing.clone().multiplyScalar(R);this.data=null;this.entries=[];this.cells=new Map();this.lastSignature=null;this.revision=0;this.cursor=0;
  const material=new T.MeshStandardMaterial({roughness:.9,metalness:0});patchTerrain(material,textures,{...controls,outcropAnchor:{value:this.anchor}});fadeMaterial(material);
  this.meshes=Array.from({length:8},(_,variant)=>{
   const g=createOutcropGeometry(variant);g.setAttribute('biomeData',new T.InstancedBufferAttribute(new Float32Array(128*3),3));g.setAttribute('surfaceData',new T.InstancedBufferAttribute(new Float32Array(128*3),3));g.setAttribute('formationReady',new T.InstancedBufferAttribute(new Float32Array(128),1));
   const mesh=new T.InstancedMesh(g,material,128);mesh.count=0;mesh.position.copy(this.anchor);mesh.castShadow=mesh.receiveShadow=true;
   mesh.customDepthMaterial=new T.MeshDepthMaterial({depthPacking:T.RGBADepthPacking});fadeMaterial(mesh.customDepthMaterial);root.add(mesh);return mesh;
  });terrain.contactLayers?.add(this);
 }
 reset(){this.data=null;this.entries=[];this.cells.clear();this.lastSignature=null;this.cursor=0;for(const mesh of this.meshes)mesh.count=0;this.revision++;}
 load(data){
  this.reset();this.data=data;const collapsed=new T.Matrix4().makeScale(0,0,0);for(const feature of data.outcrops){const mesh=this.meshes[feature.variant];if(mesh.count>=128)continue;const entry={feature,mesh,index:mesh.count++,direction:basinDirection(feature.x,feature.z),inverse:new T.Matrix4(),matrix:new T.Matrix4(),signature:null};mesh.setMatrixAt(entry.index,collapsed);mesh.geometry.attributes.formationReady.setX(entry.index,0);this.entries.push(entry);
   const reach=Math.max(feature.width,feature.depth)*.75+12;for(let z=Math.floor((feature.z-reach)/96);z<=Math.floor((feature.z+reach)/96);z++)for(let x=Math.floor((feature.x-reach)/96);x<=Math.floor((feature.x+reach)/96);x++){const key=x+','+z;if(!this.cells.has(key))this.cells.set(key,[]);this.cells.get(key).push(entry);}
  }
 }
 update(camera,budgetMs=4){
  const data=getReference(),enabled=environment.basin&&data?.seed===world.seed;
  const visible=enabled&&camera.distanceTo(this.anchor)<6000;for(const mesh of this.meshes)mesh.visible=visible;if(!enabled){if(this.data)this.reset();return;}
  if(this.data!==data)this.load(data);
  if(!visible)return;
  const profile=world.relief+'|'+world.temperature+'|'+world.water+'|'+world.pressure+'|'+environment.waterEnabled+'|'+environment.iceEnabled;
  const signature=(this.terrain.contactRevision?.(this.anchor,3300)||String(this.terrain.frame))+'|'+profile;
  const now=performance.now(),revealed=new Set();for(const entry of this.entries)if(entry.readyAt!==undefined){const value=Math.min(1,(now-entry.readyAt)/480);entry.mesh.geometry.attributes.formationReady.setX(entry.index,value);revealed.add(entry.mesh);if(value===1)delete entry.readyAt;}for(const mesh of revealed)mesh.geometry.attributes.formationReady.needsUpdate=true;
  if(signature===this.lastSignature)return;this.lastSignature=signature;const changed=new Set(),dummy=new T.Object3D(),started=performance.now();let deferred=false;
  const cameraDirection=camera.clone().normalize(),close=this.entries.filter(e=>e.direction.distanceToSquared(cameraDirection)<(150/R)**2),rest=this.entries.slice(this.cursor).concat(this.entries.slice(0,this.cursor)),order=close.concat(rest.filter(e=>!close.includes(e)));
  for(const entry of order){
   const f=entry.feature,probe=entry.direction.clone().multiplyScalar(R+f.baseHeight*world.relief),localSignature=this.terrain.contactRevision?.(probe,Math.max(f.width,f.depth)+24)||String(this.terrain.frame),stamp=localSignature+'|'+profile;if(stamp===entry.signature)continue;
   if(performance.now()-started>budgetMs&&!close.includes(entry)){deferred=true;this.cursor=this.entries.indexOf(entry);break;}
   entry.signature=stamp;entry.revision=this.revision+1;const hit=this.terrain.sampleGround(entry.direction);
   const {east,north}=basis(entry.direction),strike=east.clone().multiplyScalar(Math.cos(f.angle)).addScaledVector(north,Math.sin(f.angle)),across=new T.Vector3().crossVectors(strike,entry.direction).normalize();
   let foundation=0;for(const x of [-.5,0,.5])for(const z of [-.5,.5]){const probe=hit.point.clone().addScaledVector(strike,x*f.width).addScaledVector(across,z*f.depth);foundation=Math.min(foundation,this.terrain.sampleGround(probe).point.sub(hit.point).dot(entry.direction));}
   dummy.position.copy(hit.point).addScaledVector(entry.direction,foundation-f.height*.12).sub(this.anchor);dummy.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(strike,entry.direction,across));dummy.scale.set(f.width,f.height,f.depth);dummy.updateMatrix();entry.mesh.setMatrixAt(entry.index,dummy.matrix);entry.matrix.fromArray(entry.mesh.instanceMatrix.array,entry.index*16);entry.inverse.copy(entry.matrix).invert();
   const c=surfaceClimate(entry.direction,hit.point.length()-R),g=entry.mesh.geometry;g.attributes.biomeData.setXYZ(entry.index,c.ice,0,0);g.attributes.surfaceData.setXYZ(entry.index,0,1,1);entry.submerged=c.ocean;if(!entry.center)entry.readyAt=now;entry.center=hit.point.clone();changed.add(entry.mesh);
  }
  for(const mesh of changed){mesh.instanceMatrix.needsUpdate=true;mesh.geometry.attributes.biomeData.needsUpdate=true;mesh.geometry.attributes.surfaceData.needsUpdate=true;mesh.computeBoundingSphere();}if(deferred)this.lastSignature=null;if(changed.size)this.revision++;
 }
 // Exact radial triangle contacts, indexed by reference-space cells. Foundations
 // use sampleGround, preventing feedback from their own collision surface.
 sample(p,ground){
  if(!this.data||!environment.basin||this.data.seed!==world.seed)return null;const d=p.clone().normalize(),{x,z}=basinCoordinates(d),entries=this.cells.get(Math.floor(x/96)+','+Math.floor(z/96));if(!entries)return null;
  let best=null,bestRadius=ground.point.lengthSq();const ray=new T.Ray(d.clone().multiplyScalar(R+10000).sub(this.anchor),d.clone().negate()),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),hit=new T.Vector3();
  for(const entry of entries){if(entry.submerged||!entry.center)continue;const local=ray.clone().applyMatrix4(entry.inverse),g=entry.mesh.geometry;if(!local.intersectsBox(g.boundingBox))continue;const positions=g.attributes.position;
   for(let i=0;i<positions.count;i+=3){a.fromBufferAttribute(positions,i);b.fromBufferAttribute(positions,i+1);c.fromBufferAttribute(positions,i+2);if(!local.intersectTriangle(a,b,c,false,hit))continue;const point=hit.clone().applyMatrix4(entry.matrix).add(this.anchor),radius=point.lengthSq();if(radius<=bestRadius)continue;const normal=new T.Triangle(a,b,c).getNormal(new T.Vector3()).applyMatrix3(new T.Matrix3().getNormalMatrix(entry.matrix)).normalize();if(normal.dot(d)<0)normal.negate();bestRadius=radius;best={point,normal,outcrop:entry.feature.id};}
  }return best;
 }
 contactRevision(p,radius){let signature='';for(const entry of this.entries)if(entry.center&&entry.center.distanceTo(p)<radius+entry.feature.width)signature+=entry.feature.id+':'+entry.revision+';';return signature;}
 get count(){return this.entries.length;}
}
