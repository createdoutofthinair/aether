import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {blueprint,INSERTION} from '../dist/ships/blueprint.js';
import {shipModel} from '../dist/ships/model.js';
const values={role:new Set(),count:new Set(),radius:new Set(),finish:new Set(),attachment:new Set()};
function dispose(scene){const g=new Set(),m=new Set();scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)m.add(o.material);});g.forEach(x=>x.dispose());m.forEach(x=>x.dispose());}
for(let i=0;i<1000;i++){
 const seed='fit-check-'+i,a=blueprint(seed);assert.deepEqual(a,blueprint(seed));assert.notDeepEqual(a,blueprint(seed+'x'));
 values.role.add(a.role);values.count.add(a.count);values.radius.add(a.radius);values.finish.add(a.appearance.finish);
 const axial=a.parts.filter(p=>['cockpit','habitat','cargo','reactor','engine'].includes(p.type)&&!p.side);
 for(let j=1;j<axial.length;j++)assert.ok(Math.abs((axial[j-1].z+axial[j-1].length/2)-(axial[j].z-axial[j].length/2)-INSERTION)<1e-10,'Socket insertion must be exact');
 for(const p of a.parts.filter(p=>p.side)){assert.ok(a.parts.some(q=>q.type===p.type&&q.side===-p.side&&q.z===p.z&&q.length===p.length));if(['wing','solar'].includes(p.type))values.attachment.add(p.type);}
 if(i<50){const scene=shipModel(a);scene.rotation.set(0,0,0);scene.updateMatrixWorld(true);const bounds=new Map(scene.children.map(p=>[p.userData.part.id,new T.Box3().setFromObject(p)]));
 for(const p of a.parts.filter(p=>p.parent!==undefined)){const own=bounds.get(p.id),parent=bounds.get(p.parent);assert.ok(own.intersectsBox(parent),`${seed}: ${p.type} ${p.id} disconnected from parent ${p.parent}`);}
 // Check the actual axial structural jacket, not just a decorative ring's bounds.
 for(const p of scene.children.filter(p=>['engine','habitat','cargo','reactor'].includes(p.userData.part.type))){const part=p.userData.part,b=new T.Box3().setFromObject(p.children[0]);assert.ok(Math.abs(b.min.z-(part.z-part.length/2))<1e-5);assert.ok(Math.abs(b.max.z-(part.z+part.length/2))<1e-5);}
 scene.traverse(o=>{if(o.isMesh)for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));});dispose(scene);
 for(const type of ['engine','solar']){const isolated=shipModel(a,{single:type});isolated.rotation.set(0,0,0);isolated.updateMatrixWorld(true);for(let j=1;j<isolated.children.length;j++){const left=new T.Box3().setFromObject(isolated.children[j-1]),right=new T.Box3().setFromObject(isolated.children[j]);assert.ok(right.min.x-left.max.x>.59,'Catalog spacing must use actual bounds');}dispose(isolated);}}
}
assert.equal(values.role.size,3);assert.equal(values.count.size,7);assert.equal(values.finish.size,2);assert.equal(values.attachment.size,2);assert.equal(values.radius.size,1000);
console.log('1000 seeded blueprints: full-design variation, determinism, socket fit and symmetry passed. 50 mesh assemblies: parent bounds, structural socket extents, finite vertices and catalog spacing passed.');
