import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {blueprint} from '../dist/ships/blueprint.js';
import {shipModel} from '../dist/ships/model.js';
import {batchShip} from '../dist/credits/ships.js';
import {activeFlights,flightState} from '../dist/credits/ship-flight.js';
assert.equal(activeFlights(0).length,0);assert.equal(activeFlights(9.99).length,0);
for(let time=0;time<900;time+=.17){const flights=activeFlights(time);assert.ok(flights.length<=2);assert.deepEqual(flights,activeFlights(time));for(const f of flights){assert.ok(f.opacity>=0&&f.opacity<=1);assert.ok(Math.abs(f.y)>.5);assert.ok(f.z<=-55&&f.z>=-195);}}
for(let i=0;i<20;i++){const f=flightState(i,10+i*18+10);assert.ok(f.active);assert.notEqual(f.seed,flightState(i+1,10+(i+1)*18+10).seed);}
for(let i=0;i<8;i++){const original=shipModel(blueprint('batch-'+i));original.updateMatrixWorld(true);const before=new T.Box3().setFromObject(original,true),triangles=[];original.traverse(o=>{if(o.isMesh)triangles.push(o.geometry.index.count/3);});const batch=batchShip(original),after=new T.Box3().setFromObject(batch,true);assert.ok(before.min.distanceTo(after.min)<1e-4);assert.ok(before.max.distanceTo(after.max)<1e-4);assert.ok(batch.children.length<=7);assert.equal(batch.children.reduce((n,o)=>n+o.geometry.index.count/3,0),triangles.reduce((a,b)=>a+b,0));batch.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
console.log('Credits ships: deterministic bounded flight schedule, edge lanes, fades, and mesh batching preserve bounds/triangles at <=7 draws per ship.');
