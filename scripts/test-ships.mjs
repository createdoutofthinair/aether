import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {blueprint,INSERTION} from '../dist/ships/blueprint.js';
import {shipModel} from '../dist/ships/model.js';
const values={family:new Set(),shape:new Set(),engine:new Set(),module:new Set(),role:new Set(),count:new Set(),radius:new Set(),finish:new Set(),attachment:new Set()};
function dispose(scene){const g=new Set(),m=new Set();scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());}
for(let i=0;i<1000;i++){
 const seed='fit-check-'+i,a=blueprint(seed);assert.deepEqual(a,blueprint(seed));assert.notDeepEqual(a,blueprint(seed+'x'));
 values.family.add(a.family);for(const p of a.parts){values.shape.add(p.shape);values.engine.add(p.engineStyle);values.module.add(p.type);}values.role.add(a.role);values.count.add(a.count);values.radius.add(a.radius);values.finish.add(a.appearance.finish);
 const axial=a.parts.filter(p=>['cockpit','habitat','cargo','reactor','engine','tank','truss','hangar','ring-drive'].includes(p.type)&&!p.side);
 for(let j=1;j<axial.length;j++)assert.ok(Math.abs((axial[j-1].z+axial[j-1].length/2)-(axial[j].z-axial[j].length/2)-INSERTION)<1e-10,'Socket insertion must be exact');
 for(const p of a.parts.filter(p=>p.side)){assert.ok(a.parts.some(q=>q.type===p.type&&q.side===-p.side&&q.z===p.z&&q.length===p.length));if(['wing','solar','delta'].includes(p.type))values.attachment.add(p.type);}
 if(i<50){const scene=shipModel(a);scene.rotation.set(0,0,0);scene.updateMatrixWorld(true);const bounds=new Map(scene.children.map(p=>[p.userData.part.id,new T.Box3().setFromObject(p)]));
 for(const p of a.parts.filter(p=>p.parent!==undefined)){const own=bounds.get(p.id),parent=bounds.get(p.parent);assert.ok(own.intersectsBox(parent),`${seed}: ${p.type} ${p.id} disconnected from parent ${p.parent}`);}
 // Check the actual axial structural jacket, not just a decorative ring's bounds.
 for(const p of scene.children.filter(p=>['engine','habitat','cargo','reactor','tank','truss','hangar','ring-drive'].includes(p.userData.part.type))){const part=p.userData.part,b=new T.Box3().setFromObject(p.children[0]);assert.ok(Math.abs(b.min.z-(part.z-part.length/2))<1e-5);assert.ok(Math.abs(b.max.z-(part.z+part.length/2))<1e-5);}
 scene.traverse(o=>{if(o.isMesh)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});dispose(scene);
 for(const type of ['engine','solar']){const isolated=shipModel(a,{single:type});isolated.rotation.set(0,0,0);isolated.updateMatrixWorld(true);for(let j=1;j<isolated.children.length;j++){const left=new T.Box3().setFromObject(isolated.children[j-1]),right=new T.Box3().setFromObject(isolated.children[j]);assert.ok(right.min.x-left.max.x>.59,'Catalog spacing must use actual bounds');}dispose(isolated);}}
}
assert.equal(values.role.size,3);assert.equal(values.count.size,7);assert.equal(values.finish.size,2);assert.equal(values.attachment.size,3);assert.equal(values.radius.size,1000);
assert.equal(values.family.size,6);assert.equal(values.shape.size,3);assert.equal(values.engine.size,3);for(const type of ['tank','truss','hangar','delta','ring-drive'])assert.ok(values.module.has(type));
console.log('1000 seeded blueprints: six silhouette families, three hull profiles, three engine styles, new module coverage, full-design variation, determinism, socket fit and symmetry passed. 50 mesh assemblies: parent bounds, structural socket extents, finite vertices and catalog spacing passed.');
// Rear-view rays through exhaust centers must hit recessed cavity faces, not
// stacked jacket/plate caps. This catches the coplanar cluster regression.
for(const engineStyle of ['cluster','bell']){
 const plan=blueprint('engine-face-regression');plan.parts=[{id:0,type:'engine',engineStyle,length:2.8,radius:1,x:0,y:0,z:0,variant:0,detailSeed:1}];
 const model=shipModel(plan);model.rotation.set(0,0,0);model.updateMatrixWorld(true);
 assert.equal(model.children[0].children[0].geometry.parameters.openEnded,true);
 for(const [x,y]of engineStyle==='cluster'?[[-.4,-.4],[.4,-.4],[-.4,.4],[.4,.4]]:[[0,0]]){
 const ray=new T.Raycaster(new T.Vector3(x,y,3),new T.Vector3(0,0,-1));const hits=ray.intersectObject(model,true);assert.ok(hits.length);assert.equal(hits[0].object.userData.engineFace,'recess');assert.ok(hits[0].point.z<1.4-.15);
 }dispose(model);
}
console.log('Engine rear faces: open jackets, perforated cluster plates and recessed exhaust ray tests passed.');
