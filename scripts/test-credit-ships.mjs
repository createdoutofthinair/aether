import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {blueprint} from '../dist/ships/blueprint.js';
import {shipModel} from '../dist/ships/model.js';
import {batchShip} from '../dist/credits/ships.js';
import {activeFlights,flightState} from '../dist/credits/ship-flight.js';
assert.equal(activeFlights(0).length,0);assert.equal(activeFlights(9.99).length,0);
for(let time=0;time<900;time+=.37){const flights=activeFlights(time);assert.equal(flights.length,Math.max(0,Math.floor((time-10)/140)+1)*3);assert.deepEqual(flights,activeFlights(time));for(const f of flights){assert.equal(f.scale,1.15);assert.equal('opacity' in f,false);}
 for(let i=0;i<flights.length;i+=3){assert.equal(new Set(flights.slice(i,i+3).map(f=>f.seed)).size,3);assert.equal(flights[i].x,0);assert.equal(flights[i+1].x,-flights[i+2].x);assert.equal(flights[i+1].z,flights[i+2].z);}}
for(let i=0;i<20;i++)for(let slot=0;slot<3;slot++){
 const start=10+i*140,a=flightState(i,start+20,slot),b=flightState(i,start+30,slot);assert.ok(a.active&&b.active);assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(b.z-a.z,-80);
 assert.ok(flightState(i,start,slot).z>0,'Enter from behind the camera');assert.ok(flightState(i,start+10000,slot).active,'No timed disappearance');
 assert.ok(1/-b.z<1/-a.z);assert.ok(Math.abs(b.x/-b.z)<=Math.abs(a.x/-a.z));assert.ok(Math.abs(b.y/-b.z)<Math.abs(a.y/-a.z));
}
for(let i=0;i<8;i++){const original=shipModel(blueprint('batch-'+i));original.updateMatrixWorld(true);const before=new T.Box3().setFromObject(original,true),triangles=[];original.traverse(o=>{if(o.isMesh)triangles.push((o.geometry.index?.count??o.geometry.attributes.position.count)/3);});const batch=batchShip(original),after=new T.Box3().setFromObject(batch,true);assert.ok(before.min.distanceTo(after.min)<1e-4);assert.ok(before.max.distanceTo(after.max)<1e-4);assert.ok(batch.children.length<=7);batch.traverse(o=>{if(o.material){assert.equal(o.material.transparent,false);assert.equal(o.material.opacity,1);assert.equal(o.material.depthWrite,true);}});assert.equal(batch.children.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0),triangles.reduce((a,b)=>a+b,0));batch.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
console.log('Credits ships: deterministic three-ship formations, parallel velocity, receding perspective, opaque depth-tested hulls, and mesh batching preserve bounds/triangles at <=7 draws per ship.');
