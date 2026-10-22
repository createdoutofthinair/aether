import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {blueprint} from '../dist/ships/blueprint.js';
import {shipModel} from '../dist/ships/model.js';
import {batchShip,setFlightOpacity} from '../dist/credits/ships.js';
import {activeFlights,flightState,FLIGHT_INTERVAL,FLIGHT_LIFETIME} from '../dist/credits/ship-flight.js';
assert.equal(activeFlights(0).length,0);assert.equal(activeFlights(9.99).length,0);
for(let time=0;time<3600;time+=.37){const flights=activeFlights(time);assert.ok(flights.length<=6);if(time>=10)assert.ok(flights.length>=3,'A new wave must overlap the receding formation');assert.deepEqual(flights,activeFlights(time));for(const f of flights){assert.equal(f.scale,1.15);assert.ok(f.opacity>0&&f.opacity<=1);if(f.z>=-200)assert.equal(f.opacity,1,'Close ships stay solid');}}
assert.ok(FLIGHT_INTERVAL<FLIGHT_LIFETIME);assert.ok(FLIGHT_LIFETIME<FLIGHT_INTERVAL*2);
assert.equal(new Set(activeFlights(40).map(f=>f.formation)).size,2);
for(let i=0;i<20;i++)for(let slot=0;slot<3;slot++){
 const start=10+i*FLIGHT_INTERVAL,a=flightState(i,start+20,slot),b=flightState(i,start+30,slot);assert.ok(a.active&&b.active);assert.equal(a.x,b.x);assert.equal(a.y,b.y);assert.equal(b.z-a.z,-80);
 assert.ok(flightState(i,start,slot).z>0);assert.equal(flightState(i,start+FLIGHT_LIFETIME,slot).active,false);
 let previous=1;for(let age=0;age<=FLIGHT_LIFETIME;age+=.1){const f=flightState(i,start+age,slot);assert.ok(f.opacity<=previous+1e-12);previous=f.opacity;}assert.equal(flightState(i,start+FLIGHT_LIFETIME,slot).opacity,0);
 assert.ok(1/-b.z<1/-a.z);
}
const sample=new T.Group(),mesh=new T.Mesh(new T.BoxGeometry(),new T.MeshStandardMaterial());sample.add(mesh);mesh.material.transparent=true;const version=mesh.material.version;setFlightOpacity(sample,.5);assert.equal(mesh.material.opacity,.5);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.depthWrite,true);setFlightOpacity(sample,1);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.version,version);assert.equal(mesh.material.depthWrite,true);mesh.geometry.dispose();mesh.material.dispose();
for(let i=0;i<8;i++){const original=shipModel(blueprint('batch-'+i));original.updateMatrixWorld(true);const before=new T.Box3().setFromObject(original,true),triangles=[];original.traverse(o=>{if(o.isMesh)triangles.push((o.geometry.index?.count??o.geometry.attributes.position.count)/3);});const batch=batchShip(original),after=new T.Box3().setFromObject(batch,true);assert.ok(before.min.distanceTo(after.min)<1e-4);assert.ok(before.max.distanceTo(after.max)<1e-4);assert.ok(batch.children.length<=7);batch.traverse(o=>{if(o.material){assert.equal(o.material.transparent,false);assert.equal(o.material.opacity,1);assert.equal(o.material.depthWrite,true);}});assert.equal(batch.children.reduce((n,o)=>n+(o.geometry.index?.count??o.geometry.attributes.position.count)/3,0),triangles.reduce((a,b)=>a+b,0));batch.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}
console.log('Credits ships: deterministic three-ship formations, 24-second overlapping waves, bounded fleet, distant-only smooth fades, parallel velocity, opaque close hulls, and mesh batching preserve bounds/triangles at <=7 draws per ship.');
