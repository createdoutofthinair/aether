import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {PlanetTerrain,R,landing,direction} from '../dist/terrain.js';
import {rockCandidates,wheelLift,tyreSupport,RockField,createRockGeometry} from '../dist/grounding.js';
const terrain=new PlanetTerrain(new T.Group(),new T.MeshStandardMaterial());
// Independent triangle raycast must agree with the contact query at coarse and fine LODs.
for(const level of [5,10,13]){
 const div=2**level,u=landing.x/landing.z,v=landing.y/landing.z;
 const n=terrain.node(4,level,Math.floor((u+1)*.5*div),Math.floor((v+1)*.5*div));if(!n.mesh)terrain.build(n);
 terrain.active=[n];terrain.stitchEdges();n.mesh.updateMatrixWorld(true);
 for(let i=0;i<25;i++){
  const d=direction(4,n.u+n.size*(.1+.8*(i%5)/4),n.v+n.size*(.1+.8*Math.floor(i/5)/4));
  const ray=new T.Raycaster(d.clone().multiplyScalar(R+10000),d.clone().negate());
  const hits=ray.intersectObject(n.mesh);assert(hits.length);
  assert(terrain.sample(d).point.distanceTo(hits[0].point)<.001,`Contact must match visible triangles level=${level} i=${i} delta=${terrain.sample(d).point.distanceTo(hits[0].point)}`);
  const up=d,center=terrain.sample(d).point.clone().addScaledVector(up,.4),axle=new T.Vector3().crossVectors(up,new T.Vector3(0,1,0)).normalize();
  for(let k=0;k<2;k++)center.addScaledVector(up,wheelLift(center,up,axle,1.073,.515,terrain));
  const hit=terrain.sample(center),clearance=center.clone().sub(hit.point).dot(hit.normal)-tyreSupport(1.073,.515,axle,hit.normal);
  assert(clearance>=-.001&&clearance<.025,`Tyre clearance ${clearance}`);
 }
}
// Crossing streaming thresholds and cube-face edges must preserve each rock's identity.
for(const d of [landing,new T.Vector3(1,.2,1).normalize(),new T.Vector3(1,1,1).normalize()]){
 const p=d.clone().multiplyScalar(R),a=rockCandidates(p),b=rockCandidates(p.clone().add(new T.Vector3(27,0,-19))),byId=new Map(b.map(r=>[r.id,r]));let shared=0;
 assert(a.length>0&&a.length<4096);assert.equal(new Set(a.map(r=>r.id)).size,a.length);
 for(const r of a){const other=byId.get(r.id);if(!other)continue;shared++;assert.equal(r.direction.distanceTo(other.direction),0);assert.equal(r.size,other.size);assert.equal(r.angle,other.angle);assert.equal(r.variant,other.variant);assert.equal(r.tint,other.tint);}
 assert(shared>a.length*.65,'Nearby views must retain their rock field');
}
// Both visible rocks and their shadows receive the same distance-fade shader.
const field=new RockField(new T.Group(),{rock:null,rn:null,rr:null},terrain);
for(const [material,shader]of [[field.mesh.material,T.ShaderLib.standard],[field.mesh.customDepthMaterial,T.ShaderLib.depth]]){
 const copy={vertexShader:shader.vertexShader,fragmentShader:shader.fragmentShader};material.onBeforeCompile(copy);
 assert(copy.vertexShader.includes('rockDistance=length'));assert(copy.fragmentShader.includes('if(visibility<=threshold)discard'));
}
const pebbles=new RockField(new T.Group(),{rock:null,rn:null,rr:null},terrain,true);
assert.notEqual(field.mesh.material.customProgramCacheKey(),pebbles.mesh.material.customProgramCacheKey(),'Different fade distances need separate shader programs');
console.log('Ground contact, tyre clearance, persistent rock cells and shadow fading: pass');

const silhouettes=new Set();
for(let variant=0;variant<8;variant++){
 const geometry=createRockGeometry(variant),size=geometry.boundingBox.getSize(new T.Vector3());
 silhouettes.add(size.toArray().map(v=>v.toFixed(3)).join(','));
 for(const name of ['position','normal'])for(const value of geometry.attributes[name].array)assert(Number.isFinite(value),'Rock geometry must stay finite');
 assert(size.x>0&&size.y>0&&size.z>0);geometry.dispose();
}
assert.equal(silhouettes.size,8,'All eight rock families must have distinct silhouettes');
const retained=rockCandidates(landing.clone().multiplyScalar(R));
assert(retained.every(r=>Number.isInteger(r.variant)&&r.variant>=0&&r.variant<8));
console.log('Eight distinct rock silhouettes and stable variant assignment: pass');
