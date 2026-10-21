import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {createEmblem} from '../dist/viewer/emblem.js';
import {createOrbit,ORBIT} from '../dist/viewer/orbit.js';
const emblem=createEmblem(new T.MeshPhysicalMaterial({metalness:1}));emblem.updateMatrixWorld(true);
const orbit=emblem.getObjectByName('Aether orbit'),triangles=[];
emblem.traverse(mesh=>{
 if(!mesh.isMesh)return;for(let p=mesh;p;p=p.parent)if(p===orbit)return;
 const g=mesh.geometry,pos=g.attributes.position,index=g.index;
 for(let i=0;i<(index?index.count:pos.count);i+=3){const v=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,index?index.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));triangles.push(new T.Triangle(...v));}
});
const orbitSystem=createOrbit(new T.MeshPhysicalMaterial({metalness:1}));const point=new T.Vector3(),closest=new T.Vector3();let minimum=Infinity;
for(let i=0;i<1440;i++){
 orbitSystem.curve.getPoint(i/1440,point).applyMatrix4(orbit.matrixWorld);
 for(const triangle of triangles)minimum=Math.min(minimum,triangle.closestPointToPoint(point,closest).distanceTo(point));
}
assert.ok(minimum>ORBIT.atmosphereRadius+.07,`Insufficient planet clearance: ${minimum}`);
const start=orbitSystem.planet.position.clone();for(let i=0;i<ORBIT.period*60;i++)orbitSystem.update(1/60);
assert.ok(start.distanceTo(orbitSystem.planet.position)<1e-8,'Planet returns smoothly after one orbit');
assert.ok(orbitSystem.group.getObjectByName('Planet ion wake').geometry.attributes.position.array.every(Number.isFinite));
const before=orbitSystem.planet.position.clone();orbitSystem.update(0);assert.deepEqual(orbitSystem.planet.position,before);
console.log(`Emblem orbit: full-cycle planet/surface clearance ${(minimum-ORBIT.atmosphereRadius).toFixed(3)}, periodic animation, finite wake and pause passed`);
