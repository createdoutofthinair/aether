import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {blueprint} from '../dist/ships/blueprint.js';
import {shipModel} from '../dist/ships/model.js';
import {batchShip} from '../dist/credits/ships.js';
import {activeFlights,flightState} from '../dist/credits/ship-flight.js';
assert.equal(activeFlights(0).length,0);assert.equal(activeFlights(9.99).length,0);
for(let time=0;time<900;time+=.17){const flights=activeFlights(time);assert.ok(flights.length===0||flights.length===3);assert.deepEqual(flights,activeFlights(time));for(const f of flights){assert.equal(f.scale,1.15);assert.ok(f.opacity>=0&&f.opacity<=1);assert.ok(f.z<=-32&&f.z>=-126);}
 if(flights.length){assert.equal(new Set(flights.map(f=>f.seed)).size,1);assert.equal(flights[0].x,0);assert.equal(flights[1].x,-flights[2].x);assert.equal(flights[1].z,flights[2].z);assert.equal(flights[1].y,flights[2].y);}}
for(let i=0;i<20;i++)for(let slot=0;slot<3;slot++){
 const a=flightState(i,10+i*46+5,slot),b=flightState(i,10+i*46+15,slot);assert.ok(a.active&&b.active);assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(b.z-a.z,-20);
 // Projected size and distance to the central vanishing point must diminish.
 assert.ok(1/-b.z<1/-a.z);assert.ok(Math.abs(b.x/-b.z)<=Math.abs(a.x/-a.z));assert.ok(b.y/-b.z<a.y/-a.z);
 assert.notEqual(a.seed,flightState(i+1,10+(i+1)*46+5,slot).seed);
}
for(let i=0;i<8;i++){const original=shipModel(blueprint('batch-'+i));original.updateMatrixWorld(true);const before=new T.Box3().setFromObject(original,true),triangles=[];original.traverse(o=>{if(o.isMesh)triangles.push(o.geometry.index.count/3);});const batch=batchShip(original),after=new T.Box3().setFromObject(batch,true);assert.ok(before.min.distanceTo(after.min)<1e-4);assert.ok(before.max.distanceTo(after.max)<1e-4);assert.ok(batch.children.length<=7);assert.equal(batch.children.reduce((n,o)=>n+o.geometry.index.count/3,0),triangles.reduce((a,b)=>a+b,0));batch.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
console.log('Credits ships: deterministic three-ship formations, parallel velocity, receding perspective, fades, and mesh batching preserve bounds/triangles at <=7 draws per ship.');
