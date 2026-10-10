import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {generateReference} from '../dist/terrain-data.js?v=terrain-9';
import {installReference} from '../dist/terrain-cache.js?v=terrain-9';
import {R,landing,basinDirection,PlanetTerrain} from '../dist/terrain.js?v=terrain-9';
import {world,configureEnvironment} from '../dist/world.js?v=terrain-9';
import {OutcropField,createOutcropGeometry} from '../dist/outcrops.js?v=terrain-9';
import {wheelLift,tyreSupport} from '../dist/grounding.js?v=terrain-9';
const data=installReference(generateReference()),root=new T.Group(),terrain=new PlanetTerrain(root,new T.MeshStandardMaterial()),field=new OutcropField(root,{},terrain,{sediment:{value:.65}}),camera=basinDirection(700,250).multiplyScalar(R+650),started=performance.now();field.update(camera,Infinity);root.updateMatrixWorld(true);
assert(field.count>50&&field.count<1024);assert.equal(field.count,data.outcrops.length);
let contacts=0;for(const entry of field.entries.filter(e=>Math.hypot(e.feature.x-700,e.feature.z-250)<650).slice(0,12)){
 for(const u of [-.31,0,.31]){
  const target=new T.Vector3(u,.9,0).applyMatrix4(entry.matrix).add(field.anchor),d=target.clone().normalize(),ray=new T.Raycaster(d.clone().multiplyScalar(R+10000),d.clone().negate()),hits=ray.intersectObjects(field.meshes);
  if(!hits.length)continue;const ground=terrain.sampleGround(d);if(hits[0].point.length()<=ground.point.length()+.005)continue;
  const contact=terrain.sample(d);assert(contact.outcrop,'Outcrop tops participate in rover contact');assert(contact.point.distanceTo(hits[0].point)<.003,'Independent mesh raycast matches outcrop contact');contacts++;
  const up=d,axle=new T.Vector3(1,0,0).cross(up).normalize(),centre=contact.point.clone().addScaledVector(up,.8);for(let i=0;i<2;i++)centre.addScaledVector(up,wheelLift(centre,up,axle,1.073,.515,terrain));const h=terrain.sample(centre),clearance=centre.clone().sub(h.point).dot(h.normal)-tyreSupport(1.073,.515,axle,h.normal);assert(clearance>=-.002&&clearance<.03,'Tyres clear actual rock triangles');
 }
}
assert(contacts>10,'Check exposed surfaces from several formations');
// Moving the render origin must not move the physical collision surface.
root.position.copy(camera).negate();root.updateMatrixWorld(true);let relativeContacts=0;
for(const entry of field.entries.slice(0,80)){const target=new T.Vector3(0,.9,0).applyMatrix4(entry.matrix).add(field.anchor),d=target.clone().normalize(),ray=new T.Raycaster(d.clone().multiplyScalar(R+10000).sub(camera),d.clone().negate()),hits=ray.intersectObjects(field.meshes);if(!hits.length)continue;const hit=hits[0].point.clone().add(camera),ground=terrain.sampleGround(d);if(hit.length()<=ground.point.length()+.005)continue;assert(terrain.sample(d).point.distanceTo(hit)<.003,'Floating-origin rendering agrees with world-space contact');relativeContacts++;if(relativeContacts>=3)break;}assert(relativeContacts>=3);
root.position.set(0,0,0);root.updateMatrixWorld(true);
const revision=field.revision;field.update(camera);assert.equal(field.revision,revision,'Unchanged terrain does not upload outcrops again');
for(const entry of field.entries){const g=entry.mesh.geometry,bottom=new T.Vector3(0,g.boundingBox.min.y,0).applyMatrix4(entry.matrix).add(field.anchor);assert(bottom.length()<terrain.sampleGround(bottom).point.length()+.02,'Formation foundations intersect terrain');}
const shapes=new Set();for(let i=0;i<8;i++){const g=createOutcropGeometry(i);assert(g.attributes.position.array.every(Number.isFinite));assert(g.attributes.normal.array.every(Number.isFinite));shapes.add(g.attributes.position.array.join(','));g.dispose();}assert.equal(shapes.size,8);
configureEnvironment({basin:false});field.update(camera);assert.equal(field.count,0);assert(field.meshes.every(m=>m.count===0&&!m.visible),'Other planets do not inherit Nacre formations');configureEnvironment();
console.log(JSON.stringify({formations:data.outcrops.length,independentRaycastContacts:contacts,contactAndTyres:'pass',embeddedFoundations:'pass',initialPlacementCpuMs:Math.round(performance.now()-started)}));
