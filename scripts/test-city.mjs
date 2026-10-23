import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {readFileSync,existsSync} from 'node:fs';
import * as T from 'three/webgpu';
import {uniform} from 'three/tsl';
import {cityBlueprint,buildingBlueprint,cityOptions,PROTOTYPES,CELL_SIZE,ROAD_CLEARANCE,selectBuildingLOD,routePoint,exportCity} from '../dist/city/blueprint.js';
import {cityMaterials,buildingModel} from '../dist/city/model.js';
import {restoreLibrary} from '../dist/city/assets.js';
import {instanceBucket} from '../dist/forest/assets.js';
import {compactReadback} from '../dist/render/readback.js';
import {plan,testGroup} from './ci/plan.mjs';
for(const width of [96,480,640,1440]){const height=5,row=width*4,stride=Math.ceil(row/256)*256,padded=new Uint8Array((height-1)*stride+row);for(let y=0;y<height;y++)padded.fill(y+1,y*stride,y*stride+row);const compact=compactReadback(padded,width,height);assert.equal(compact.length,row*height);for(let y=0;y<height;y++)assert.ok(compact.subarray(y*row,(y+1)*row).every(v=>v===y+1));}
const a=cityBlueprint({hubs:7,rings:6}),b=cityBlueprint({hubs:7,rings:6});assert.deepEqual(a,b);assert.notDeepEqual(a,cityBlueprint({seed:'different'}));
assert.equal(a.hubs.length,7);assert.ok(a.links.length>=6);assert.equal(new Set(a.buildings.map(b=>b.id)).size,a.buildings.length);assert.equal(new Set(a.buildings.map(b=>b.variant)).size,PROTOTYPES);
assert.equal(a.routes.filter(r=>r.type==='ring').length,7*7);assert.equal(a.routes.filter(r=>r.type==='radial').length,7*8);
const visited=new Set([0]);for(let i=0;i<7;i++)for(const link of a.links)if(visited.has(link.from)||visited.has(link.to)){visited.add(link.from);visited.add(link.to);}assert.equal(visited.size,7,'Every hub must connect to the transport graph');
const grid=new Map();for(const b of a.buildings){
 const p=a.prototypes[b.variant],radius=p.footprintRadius*b.scale*b.width,x=Math.floor(b.x/100),z=Math.floor(b.z/100),hub=a.hubs[b.hub];
 for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(const n of grid.get(`${x+dx},${z+dz}`)||[])assert.ok(Math.hypot(b.x-n.b.x,b.z-n.b.z)>radius+n.radius,`Overlapping plots ${b.id} / ${n.b.id}`);
 const key=x+','+z;if(!grid.has(key))grid.set(key,[]);grid.get(key).push({b,radius});
 if(b.landmark)continue;
 const rr=Math.hypot(b.x-hub.x,b.z-hub.z),angle=Math.atan2(b.x-hub.x,b.z-hub.z),spokeDistance=Math.abs(Math.sin(angle-Math.round(angle/(Math.PI/4))*Math.PI/4))*rr;
 assert.ok(spokeDistance>=ROAD_CLEARANCE-1e-6);assert.ok(radius<50);
 for(let i=0;i<a.options.rings;i++)assert.ok(Math.abs(rr-(111+i*128))>radius+12,'Building footprint must not cross a circular road');
 assert.ok(rr+radius<hub.radius);
}
const max=cityBlueprint({hubs:61,rings:9,density:1});assert.ok(max.buildings.length>15000);assert.equal(max.hubs.length,61);assert.ok(max.bounds.radius>10000);
assert.equal(cityOptions({rings:Infinity,density:'bad'}).rings,6);assert.equal(cityOptions({rings:-4,density:9}).rings,3);assert.equal(cityOptions({density:9}).density,1);
const manifest=exportCity(a);assert.equal(manifest.units,'metres');assert.equal(manifest.buildings.length,a.buildings.length);assert.deepEqual(cityBlueprint(manifest.options),a);
for(const route of a.routes){const x=routePoint(route,0),y=routePoint(route,1);assert.ok(Math.hypot(x.x-y.x,x.z-y.z)<1e-6);assert.ok(Object.values(x).every(Number.isFinite));}
assert.equal(selectBuildingLOD(1000),0);assert.equal(selectBuildingLOD(150),1);assert.equal(selectBuildingLOD(35),2);assert.equal(selectBuildingLOD(5),3);assert.equal(selectBuildingLOD(5,-1,false),2);assert.equal(selectBuildingLOD(5,-1,true,'mesh'),2);assert.equal(selectBuildingLOD(5,-1,false,'impostor'),2);assert.equal(selectBuildingLOD(25,3),3);assert.equal(selectBuildingLOD(20,2),2);
const mats=cityMaterials('validation'),triangleCounts=[];
for(let variant=0;variant<PROTOTYPES;variant++){
 const p=buildingBlueprint(variant,'validation'),levels=[];
 for(let lod=0;lod<3;lod++){
  const model=buildingModel(p,lod,mats),box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());let triangles=0;
  model.traverse(o=>{if(!o.isMesh)return;const g=o.geometry;triangles+=(g.index?.count??g.attributes.position.count)/3;for(const attr of Object.values(g.attributes))assert.ok(attr.array.every(Number.isFinite));assert.ok(g.index.array.every(i=>i<g.attributes.position.count));});
  levels.push({box,size,triangles});model.traverse(o=>o.geometry?.dispose());
 }
 assert.ok(levels[0].triangles>levels[1].triangles&&levels[1].triangles>levels[2].triangles,`${p.family} LOD costs must decrease`);
 assert.ok(levels[0].triangles<85000,'High detail prototype budget');
 for(let lod=1;lod<3;lod++)for(const axis of ['x','y','z'])assert.ok(Math.abs(levels[lod].size[axis]-levels[0].size[axis])<2,`${p.family} changed primary silhouette across LODs (${axis})`);
 triangleCounts.push(levels.map(l=>l.triangles));
}
mats.all.forEach(m=>m.dispose());
// Verify real worker imports, transfer ownership and material restoration.
const workerURL=new URL('../dist/city/worker.js',import.meta.url).href,worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(`import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:(d,t)=>parentPort.postMessage(d,t)};await import(${JSON.stringify(workerURL)});parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({ready:true});`)));
let data;
try{await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});data=await new Promise((resolve,reject)=>{worker.on('message',d=>{if(!d.progress)resolve(d);});worker.once('error',reject);worker.postMessage({id:1,type:'library',seed:'validation',wear:.35});});}finally{await worker.terminate();}
assert.equal(data.error,undefined);assert.equal(data.entries.length,PROTOTYPES);assert.equal(data.payload.textures.length,3,'A whole city library shares three bound PBR texture maps');
for(const entry of data.entries)for(const lod of entry.lods)assert.ok(lod.count<=4);
const library=restoreLibrary(data,{debug:uniform(0)});assert.ok(library.materials.length>=3&&library.materials.length<=4);assert.equal(library.maps.length,3);assert.equal(library.variants.length,PROTOTYPES);
const v=library.variants[0],mesh=instanceBucket(v.lods[0][0].geometry,v.lods[0][0].material,8),renderer=new T.WebGPURenderer({canvas:{width:100,height:100,style:{},addEventListener(){},removeEventListener(){}}});renderer.hasFeature=()=>false;renderer.backend.device={limits:{maxUniformBufferBindingSize:65536,maxStorageBufferBindingSize:134217728}};
const builder=new T.WGSLNodeBuilder(mesh,renderer);builder.scene=new T.Scene();builder.camera=new T.PerspectiveCamera();builder.context.material=mesh.material;builder.build();
const attrs=builder.attributes.map(a=>a.node?.attribute||mesh.geometry.getAttribute(a.name)).filter(Boolean),buffers=renderer.backend.attributeUtils.createShaderVertexBuffers({getAttributes:()=>attrs});assert.ok(buffers.length<=8,`Architectural PBR needs ${buffers.length} buffers; WebGPU guarantees 8`);assert.ok(builder.fragmentShader.includes('textureSample'));
mesh.geometry.dispose();mesh.dispose();library.dispose();
const seen=new Set();function visit(url){if(seen.has(url.href))return;seen.add(url.href);assert.ok(existsSync(url),url.href);const code=readFileSync(url,'utf8');for(const m of code.matchAll(/(?:^|\n)\s*import\s+(?:[^;]*?\s+from\s*)?(['"])([^'"\n]+)\1/g)){assert.ok(m[2].startsWith('.'),'City workers cannot inherit document import maps');visit(new URL(m[2],url));}}visit(new URL('../dist/city/worker.js',import.meta.url));
assert.ok(readFileSync('dist/shell.js','utf8').includes("city: ['city-lab.html'"));assert.ok(readFileSync('dist/index.html','utf8').includes('data-route="city"'));
assert.deepEqual(plan(['dist/city/main.js']).groups,['city']);assert.equal(plan(['dist/city/main.js']).shaders,false);assert.equal(testGroup('scripts/test-city.mjs'),'city');assert.deepEqual(plan(['dist/render/surface-atlas.js']).groups,['site','city']);assert.deepEqual(plan(['dist/forest/impostor.js']).groups,['nature','city']);
console.log('City: deterministic transit-connected non-overlapping districts, protected roads,',max.buildings.length,'megaregion buildings, twenty families × two compositions × three bounded LODs, shared atlas + worker transfer,',buffers.length,'WebGPU vertex bindings, shader generation, safe fallback policy, export and focused CI passed. Triangles:',JSON.stringify(triangleCounts));
