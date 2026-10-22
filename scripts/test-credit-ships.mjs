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

import {sampleNebulaLighting,NEBULA_TRAVEL_SPEED} from '../dist/credits/nebula-lighting.js';
import {applyShipLighting} from './dist/credits/ship-lighting.js';
const energy=s=>s.reduce((v,l)=>v+l.color.reduce((a,b)=>a+b,0),0);
const evaluate=s=>s.reduce((c,l)=>c.map((v,i)=>v+l.color[i]*Math.exp((l.direction[0]-1)*3)),[0,0,0]);
for(let clock=0;clock<600;clock+=.113){
 const s=sampleNebulaLighting(clock,{x:2,y:3,z:-35});assert.equal(s.length,4);
 for(const l of s){assert.ok(Math.abs(Math.hypot(...l.direction)-1)<1e-12);for(const c of l.color)assert.ok(Number.isFinite(c)&&c>=0&&c<=1.4);}
}
// Slot reassignment must not flash when the travelling cloud grid rolls over.
for(let id=-4;id<10;id++){
 const time=(40+id*64+35)/NEBULA_TRAVEL_SPEED;
 const a=evaluate(sampleNebulaLighting(time-1e-5,{x:0,y:0,z:35})),b=evaluate(sampleNebulaLighting(time+1e-5,{x:0,y:0,z:35}));
 assert.ok(Math.max(...a.map((v,i)=>Math.abs(v-b[i])))<1e-5);
}
assert.ok(energy(sampleNebulaLighting(40/.85,{x:0,y:-.65,z:0}))>energy(sampleNebulaLighting(8/.85,{x:0,y:-.65,z:0})));
const litShip=new T.Group(),texture=new T.Texture();
for(const C of [T.MeshStandardMaterial,T.MeshPhysicalMaterial]){const m=new C({color:0x789abc,metalness:.7,roughness:.4,map:texture});m.normalScale.set(.6,.8);m.transparent=true;m.opacity=.8;litShip.add(new T.Mesh(new T.BoxGeometry(),m));}
const lighting=applyShipLighting(litShip),versions=litShip.children.map(m=>m.material.version);
for(const mesh of litShip.children){assert.ok(mesh.material.isNodeMaterial);assert.equal(mesh.material.map,texture);assert.equal(mesh.material.metalness,.7);assert.equal(mesh.material.roughness,.4);assert.equal(mesh.material.color.getHex(),0x789abc);assert.equal(mesh.material.opacity,.8);assert.deepEqual(mesh.material.normalScale.toArray(),[.6,.8]);}
for(let i=0;i<100;i++)lighting.update(i,new T.Vector3(2,3,-10));assert.deepEqual(litShip.children.map(m=>m.material.version),versions);
console.log('Nebula lighting: bounded radiance, smooth grid transitions, distance falloff, original PBR properties and uniform-only animation passed.');
