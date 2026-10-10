import assert from 'node:assert/strict';
import {generateReference,referenceSample} from '../dist/terrain-data.js?v=terrain-9';
import {prepareDetail,generateDetailTile,emptyDetailTile,sampleDetailTile,DETAIL_SIZE} from '../dist/terrain-detail.js?v=terrain-9';
import {installReference,referenceAt,installDetailTile,detailCacheState} from '../dist/terrain-cache.js?v=terrain-9';
import {Worker} from 'node:worker_threads';
const data=prepareDetail(generateReference());installReference(data);const start=performance.now(),tile=generateDetailTile(data,5,1),right=generateDetailTile(data,6,1),upper=generateDetailTile(data,5,2),lazy=emptyDetailTile(6,5,1),n=DETAIL_SIZE;
const tilePreparationMs=Math.round(performance.now()-start);
for(let j=0;j<n;j++)for(let k=0;k<3;k++)assert.equal(tile.values[j*n+n-3+k],right.values[j*n+k],'Tile halos share identical world lattice values');
for(let i=0;i<n;i++)for(let k=0;k<3;k++)assert.equal(tile.values[(n-3+k)*n+i],upper.values[k*n+i],'North/south halos share identical world lattice values');
let min=Infinity,max=-Infinity;for(let x=645;x<766;x+=3.3)for(let z=132;z<254;z+=5.9){const a=sampleDetailTile(data,tile,x,z),b=sampleDetailTile(data,lazy,x,z);assert.equal(a,b,'Prepared tiles cannot change fallback heights');min=Math.min(min,a);max=Math.max(max,a);}
assert(max-min>1,'The fine layer must contain metre-scale geometric structure');
for(let z=134;z<251;z+=7){const h=x=>sampleDetailTile(data,x<768?tile:right,x,z),e=.0005;assert(Math.abs(h(768-e)-h(768+e))<.003);assert(Math.abs((h(768)-h(768-e))/e-(h(768+e)-h(768))/e)<.002,'Fine normals remain continuous at tile boundaries');}
const before=referenceAt(6,705.4,220.6).height;assert(installDetailTile(tile));assert.equal(referenceAt(6,705.4,220.6).height,before,'Worker residency preserves authoritative contact height');assert(!installDetailTile({...tile,seed:7}),'Tiles cannot leak between worlds');
for(let x=-2600;x<2600;x+=128)for(let z=-2600;z<2600;z+=128)referenceAt(6,x,z);assert(detailCacheState().tiles<=192);assert(detailCacheState().bytes<=192*n*n*4,'Fine CPU cache has a fixed byte bound');
for(const r of [100,200,2450,2700]){const e=.0001;assert(Math.abs(referenceAt(6,r-e,0).height-referenceAt(6,r+e,0).height)<.02);}
assert.equal(referenceAt(6,0,0).height,referenceSample(data,0,0).height,'Touchdown remains undisturbed');
// Exercise the real worker protocol, including retained parent buffers after
// preparing a world and transferable fine tiles. The shim supplies Web Worker I/O.
const workerURL=new URL('../dist/terrain-worker.js?v=terrain-9',import.meta.url).href;
const worker=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.self={postMessage:(m,t)=>parentPort.postMessage(m,t)};import(${JSON.stringify(workerURL)}).then(()=>parentPort.on('message',data=>self.onmessage({data})));`,{eval:true});
let id=0;const request=message=>new Promise((resolve,reject)=>{worker.once('error',reject);worker.once('message',result=>{worker.removeListener('error',reject);result.error?reject(Error(result.error)):resolve(result.result);});worker.postMessage({id:++id,...message});});
try{const parent=await request({seed:6});assert.equal(parent.height.length,data.height.length);const generated=await request({type:'detail',seed:6,tx:5,tz:1});assert.deepEqual(generated.values,tile.values,'Worker and fallback fine terrain agree bit for bit');const second=await request({type:'detail',seed:6,tx:6,tz:1});assert.deepEqual(second.values,right.values,'Parent arrays remain available in the worker');}finally{await worker.terminate();}
console.log(JSON.stringify({detailStepMetres:2,localReliefMetres:+(max-min).toFixed(2),threeTilePreparationMs:tilePreparationMs,seams:'pass',workerProtocol:'pass',residentContactParity:'pass',cacheBytes:detailCacheState().bytes}));
