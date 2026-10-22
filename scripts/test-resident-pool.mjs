import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {readFileSync,existsSync} from 'node:fs';
import {ResidentPool} from '../src/render/resident-pool.js';
import {unpackShip,disposeShip} from '../src/render/ship-assets.js';
import {activeFlights,FLEET_VARIANTS,fleetSeed} from '../dist/credits/ship-flight.js';
let built=0,warmed=0,destroyed=0;
const pool=new ResidentPool({create:async key=>{built++;return{visible:false,key};},warm:async()=>{warmed++;},destroy:()=>{destroyed++;}});
assert.equal(pool.acquire(0,0),null);await pool.prepare(Array.from({length:FLEET_VARIANTS},(_,i)=>i));assert.equal(built,FLEET_VARIANTS);assert.equal(warmed,FLEET_VARIANTS);const active=new Map();
for(let time=0;time<36000;time+=.5){const flights=activeFlights(time),ids=new Set(flights.map(f=>f.index));for(const [id]of active)if(!ids.has(id)){pool.release(id);active.delete(id);}for(const f of flights){if(active.has(f.index))continue;const ship=pool.acquire(f.index%FLEET_VARIANTS,f.index);assert.ok(ship,'Every scheduled spawn must already be resident and available');assert.equal(f.seed,fleetSeed(f.index%FLEET_VARIANTS));active.set(f.index,ship);}assert.ok(active.size<=6);}
assert.equal(built,FLEET_VARIANTS,'Ten hours of playback must allocate no new assets');assert.equal(warmed,FLEET_VARIANTS);assert.equal(destroyed,0);pool.reset();assert.ok(pool.entries.every(e=>e.owner===null&&!e.object.visible));assert.ok(pool.acquire(0,'a'));assert.equal(pool.acquire(0,'b'),null);pool.dispose();pool.dispose();assert.equal(destroyed,FLEET_VARIANTS);
let release,lateDestroyed=0;const late=new ResidentPool({create:()=>new Promise(r=>{release=r;}),destroy:()=>{lateDestroyed++;}}),preparing=late.prepare([0]);late.dispose();release({visible:false});await preparing;assert.equal(lateDestroyed,1);assert.equal(late.ready,false);
let cleanup=0;const failure=new ResidentPool({create:async()=>({}),warm:async()=>{throw Error('GPU failure');},destroy:()=>cleanup++});await assert.rejects(failure.prepare([0]),/GPU failure/);assert.equal(cleanup,1);assert.equal(failure.ready,false);
// Execute the exact browser worker graph in a real worker, with self adapted to
// Node's message transport. This catches missing import-map URLs and buffer loss.
const url=new URL('../dist/render/ship-worker.js',import.meta.url).href;
const worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(`import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:(data,transfer)=>parentPort.postMessage(data,transfer)};await import(${JSON.stringify(url)});parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({ready:true});`)));
try{await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
 const result=new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});worker.postMessage({id:0,seed:fleetSeed(0)});const reply=await result;assert.equal(reply.error,undefined);assert.equal(reply.id,0);assert.ok(reply.payload.meshes.length<=7);assert.ok(reply.payload.textures.length>0);
 const ship=unpackShip(reply.payload);assert.equal(ship.visible,false);assert.ok(ship.userData.projectedExtent>0);for(const mesh of ship.children){assert.ok(mesh.geometry.attributes.position.array.length>0);assert.equal(mesh.material.transparent,true);assert.equal(mesh.material.depthWrite,true);}disposeShip(ship);
}finally{await worker.terminate();}
// Walk worker URLs without assuming the document import map is inherited.
const seen=new Set();function visit(url){if(seen.has(url.href))return;seen.add(url.href);assert.ok(existsSync(url));const code=readFileSync(url,'utf8');for(const m of code.matchAll(/(?:^|\n)\s*import\s+(?:[^;]*?\s+from\s*)?(['"])([^'"\n]+)\1/g)){assert.ok(m[2].startsWith('.'),'Worker import must use explicit relative URL: '+m[2]);visit(new URL(m[2],url));}}
visit(new URL('../dist/render/ship-worker.js',import.meta.url));
const source=readFileSync('dist/credits/ships.js','utf8'),tick=source.slice(source.indexOf('tick(dt=0)'),source.indexOf('},restart()'));for(const forbidden of ['shipModel(','batchShip(','unpackShip(','disposeShip(','compileAsync(','new T.','needsUpdate'])assert.ok(!tick.includes(forbidden),'Expensive operation in playback tick: '+forbidden);
console.log('Resident pool: ten hours / bounded fleet, zero spawn builds/uploads, readiness, reuse, collisions, restart, failure/disposal races, real ship worker transfers and explicit deployed worker URLs passed. GPU frame-time profiling remains a browser check.');
