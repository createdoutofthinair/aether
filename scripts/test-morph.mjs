import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {PlanetTerrain,R,direction} from '../dist/terrain.js';
const t=new PlanetTerrain(new T.Group(),new T.MeshStandardMaterial());
const parent=t.node(4,6,40,42);t.build(parent);t.roots=[parent];t.active=[parent];t.stitchEdges();
const camera=parent.center.clone().multiplyScalar(R+10);
const probes=Array.from({length:15},(_,i)=>direction(parent.f,parent.u+parent.size*(.1+i*.05),parent.v+parent.size*.37));
const old=probes.map(p=>t.sample(p).point);
parent.children=[t.node(4,7,80,84),t.node(4,7,81,84),t.node(4,7,80,85),t.node(4,7,81,85)];for(const c of parent.children)t.build(c);
t.update(camera);assert.equal(t.active.length,4);assert(t.active.every(n=>n.morph===0));
for(let i=0;i<probes.length;i++)assert(t.sample(probes[i]).point.distanceTo(old[i])<.02,'Refinement begins on the old rendered triangles');
for(let i=0;i<15;i++)t.advance(1/60);assert(t.active.every(n=>n.morph>0&&n.morph<1),'Refinement interpolates over multiple frames');
const n=t.active[0],index=5*17+7,g=n.mesh.geometry,position=new T.Vector3().fromBufferAttribute(g.attributes.position,index);
assert(position.distanceTo(new T.Vector3().fromArray(n.originalPositions,index*3))>.00001);
for(let i=0;i<30;i++)t.advance(1/60);assert(t.active.every(n=>n.morph===1));
assert(new T.Vector3().fromBufferAttribute(g.attributes.position,index).distanceTo(new T.Vector3().fromArray(n.originalPositions,index*3))<.001);
// Both refinement and coarsening keep all four children until the endpoints agree.
const far=parent.center.clone().multiplyScalar(R+200000);t.update(far);assert.equal(t.active.length,4);assert(t.active.every(n=>n.morphTarget===0));
for(let i=0;i<30;i++)t.advance(1/60);const before=probes.map(p=>t.sample(p).point);t.update(far);assert.deepEqual(t.active,[parent]);
for(let i=0;i<probes.length;i++)assert(t.sample(probes[i]).point.distanceTo(before[i])<.02,'Coarsening must not pop at the handoff');
// Adjacent patches at different transition progress share a single visible edge.
const left=parent.children[0],right=parent.children[1];t.prepareMorph(left,parent);t.prepareMorph(right,parent);left.morph=.2;right.morph=.8;t.applyMorph(left);t.applyMorph(right);t.active=[right,left];t.stitchEdges();
for(let j=1;j<16;j++){const a=new T.Vector3().fromBufferAttribute(left.mesh.geometry.attributes.position,j*17+16).add(left.anchor),b=new T.Vector3().fromBufferAttribute(right.mesh.geometry.attributes.position,j*17).add(right.anchor);assert(a.distanceTo(b)<.01,'Shared edge stays joined during asynchronous morphing');}
console.log('LOD morph: continuous split/merge handoffs, intermediate geometry, shared edges and rendered-surface contact pass');
// Remote morphs must neither upload unchanged nearby buffers nor invalidate scatter.
const farParent=t.node(1,6,25,25),farChild=t.node(1,7,50,50);t.build(farParent);t.build(farChild);t.prepareMorph(farChild,farParent);
left.morph=1;left.morphTarget=1;t.applyMorph(left);t.active=[left,farChild];t.stitchEdges();
const localPoint=left.center.clone().multiplyScalar(R),signature=t.contactRevision(localPoint,50),version=left.mesh.geometry.attributes.position.version;
t.advance(1/60);assert.equal(t.contactRevision(localPoint,50),signature,'Distant morph does not invalidate local contact');assert.equal(left.mesh.geometry.attributes.position.version,version,'Steady patch is not uploaded for a distant morph');
const beforeVersion=farChild.mesh.geometry.attributes.position.version;t.stitchEdges();assert.equal(farChild.mesh.geometry.attributes.position.version,beforeVersion,'Unchanged topology does not upload terrain again');
const {RockField}=await import('../dist/grounding.js');let revision=0,calls=0;
const ground={frame:0,contactRevision:()=>revision,sample:p=>{calls++;return{point:p.clone().normalize().multiplyScalar(R),normal:p.clone().normalize()};}};
const rocks=new RockField(new T.Group(),{rock:null,rn:null,rr:null},ground,true),cameraPos=localPoint.clone().setLength(R+5);rocks.update(cameraPos);calls=0;ground.frame++;rocks.update(cameraPos);assert.equal(calls,1,'Unrelated terrain update does not rebuild rock foundations');
revision++;calls=0;rocks.update(cameraPos);assert(calls>1,'Local terrain change still updates rock foundations');
console.log('Selective buffer uploads and local scatter invalidation: pass');
