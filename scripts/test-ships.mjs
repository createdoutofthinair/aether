import assert from 'node:assert/strict';
import {blueprint} from '../dist/ships/blueprint.js';
import {shipModel} from '../dist/ships/model.js';
for(const role of ['explorer','freighter','scout'])for(const count of [2,4,8]){
 const a=blueprint('test-42',role,count);assert.deepEqual(a,blueprint('test-42',role,count));assert.notDeepEqual(a,blueprint('test-43',role,count));
 assert.equal(a.parts.filter(p=>['cargo','reactor','habitat'].includes(p.type)).length,count);
 for(const p of a.parts.filter(p=>p.side))assert.ok(a.parts.some(q=>q.type===p.type&&q.side===-p.side&&q.z===p.z));
 const scene=shipModel(a);scene.updateMatrixWorld(true);let meshes=0;scene.traverse(o=>{if(o.isMesh){meshes++;for(const n of o.geometry.attributes.position.array)assert.ok(Number.isFinite(n));}});assert.ok(meshes>50);
 const geometries=new Set(),materials=new Set();scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
}
console.log('Ship blueprints: repeatable seeds, distinct seeds, module counts, mirrored attachments and finite geometry passed.');
