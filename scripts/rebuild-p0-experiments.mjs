// Discriminating CPU fixtures for the audit, not visual/performance acceptance.
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {R,landing,basinDirection,PlanetTerrain} from '../dist/terrain.js?v=terrain-19';
import {installReference} from '../dist/terrain-cache.js?v=terrain-19';
import {generateReference} from '../dist/terrain-data.js?v=terrain-19';
import {RenderMetrics} from '../dist/render-metrics.js?v=terrain-19';

const root=new T.Group(),material=new T.MeshStandardMaterial(),terrain=new PlanetTerrain(root,material);
const victim=terrain.node(0,4,0,0);terrain.build(victim);
for(let f=0;f<6;f++)for(let y=0;y<16;y++)for(let x=0;x<16;x++)terrain.node(f,4,x,y);
const payload=()=>['originalPositions','originalNormals','originalGeology','originalBiomes','renderPositions','renderNormals','renderGeology','renderBiomes'].reduce((s,k)=>s+(victim[k]?.byteLength||0),0);
const beforeBytes=payload();terrain.frame=20;terrain.update(landing.clone().multiplyScalar(R+75000));
assert.equal(victim.mesh,null,'Fixture must reach actual geometry eviction');
assert.equal(terrain.cache.get(victim.key),victim);
const eviction={id:'E-P0-CACHE',observed:'Eviction removes the mesh but retains its original/render typed arrays and node entry.',cacheNodes:terrain.cache.size,evictedMesh:true,payloadBytesBefore:beforeBytes,payloadBytesAfter:payload(),limitation:'One eviction fixture; this is not a long traversal memory trace.'};
terrain.reset();

installReference(generateReference());
const contacts=[];
for(const [x,z]of [[0,0],[700,250],[1100,800]]){
 const d=basinDirection(x,z),samples=[];
 for(const level of [5,10,13]){
  const div=2**level,u=d.x/d.z,v=d.y/d.z,n=terrain.node(4,level,Math.floor((u+1)*.5*div),Math.floor((v+1)*.5*div));
  if(!n.mesh)terrain.build(n);terrain.active=[n];terrain.stitchEdges();
  const hit=terrain.sampleGround(d);samples.push({level,heightMetres:hit.point.length()-R});
 }
 const range=Math.max(...samples.map(s=>s.heightMetres))-Math.min(...samples.map(s=>s.heightMetres));
 assert(Number.isFinite(range));contacts.push({referenceMetres:[x,z],samples,rangeMetres:range});
}
const contact={id:'E-P0-CONTACT',observed:'The same body direction is sampled on the selected LOD triangles.',locations:contacts,limitation:'Selected static patches; no vehicle drive, camera, or GPU was observed. Differences do not diagnose the reported sinking-wheel symptom.'};
terrain.reset();material.dispose();

let queryId=0,available=false;
const extension={TIME_ELAPSED_EXT:1,GPU_DISJOINT_EXT:2};
const gl={getExtension:name=>name==='EXT_disjoint_timer_query_webgl2'?extension:null,createQuery:()=>({id:++queryId}),beginQuery(){},endQuery(){},getParameter:()=>false,QUERY_RESULT_AVAILABLE:3,QUERY_RESULT:4,getQueryParameter:(query,param)=>param===3?available:query.id===1?23000000:7000000,deleteQuery(){}};
const metrics=new RenderMetrics({getContext:()=>gl});metrics.begin(0);metrics.end();assert.equal(metrics.pending.length,1);metrics.reset();
const pendingAfterReset=metrics.pending.length;available=true;metrics.begin(16);metrics.end();
assert.deepEqual(metrics.gpu.slice().sort((a,b)=>a-b),[7,23]);
const metricReset={id:'E-P0-METRICS',observed:'A query created before reset can enter the GPU sample buffer after reset.',pendingAfterReset,gpuSamplesAfterReset:metrics.gpu,limitation:'Fake WebGL query fixture for bookkeeping only; values are synthetic, not GPU timings.'};
console.log(JSON.stringify({schemaVersion:1,capturedAt:new Date().toISOString(),kind:'CPU-only audit experiments',experiments:[eviction,contact,metricReset],functionalStatus:'pass',visualStatus:'blocked',performanceStatus:'blocked'},null,2));
