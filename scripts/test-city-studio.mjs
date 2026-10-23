import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {readFileSync,existsSync} from 'node:fs';
import * as T from 'three/webgpu';
import {windowNodes} from '../dist/city/window-nodes.js';
import {BUILDING_FAMILIES,architecturalRecipe,compileArchitecture,restoreArchitecture,volumeLoop,architectureBounds} from '../dist/city/architecture.js';
import {ARCHITECTURAL_KITS,modulesFromAssembly} from '../dist/city/design.js';
import {createStudioState,publishAsset,readAssetLibrary,removeAsset} from '../dist/city/studio-state.js';
import {buildingBlueprint,cityBlueprint,FAMILIES} from '../dist/city/blueprint.js';
import {cityMaterials,buildingModel} from '../dist/city/model.js';
import {unpackShip} from '../dist/render/ship-assets.js';
import {plan,testGroup} from './ci/plan.mjs';

for(const family of BUILDING_FAMILIES){
 const recipe=architecturalRecipe(family.id,'EDIT-PARITY',1),state=createStudioState(recipe),before=compileArchitecture(recipe);state.freeze();const frozen=state.recipe,after=compileArchitecture(frozen);
 assert.equal(before.volumes.length,after.volumes.length,'Freezing cannot delete building masses');assert.equal(before.bridges.length,after.bridges.length,'Freezing cannot delete bridges');assert.equal(before.supports.length,after.supports.length,'Freezing cannot delete supports');
 for(let i=0;i<before.volumes.length;i++){
  const a=before.volumes[i],b=after.volumes[i];assert.equal(a.levels.length,b.levels.length,'Preserve curved/twisted loft sections');
  for(let j=0;j<a.levels.length;j++){const p=volumeLoop(a,a.levels[j],48).outer,q=volumeLoop(b,b.levels[j],48).outer;for(let k=0;k<p.length;k++)for(const axis of ['x','y','z'])assert.ok(Math.abs(p[k][axis]-q[k][axis])<1e-6,family.id+' freeze changed '+axis);}
 }
 for(const type of ['bridges','supports'])for(let i=0;i<before[type].length;i++)for(const end of ['a','b'])before[type][i][end].forEach((v,j)=>assert.ok(Math.abs(v-after[type][i][end][j])<1e-6,'Connection anchor changed'));
 const id=frozen.modules[0].id;state.updateMass(id,{height:88,x:12,shape:'hexagon'});assert.equal(state.recipe.modules[0].height,88);state.undo();assert.deepEqual(state.recipe,frozen);state.redo();assert.equal(state.recipe.modules[0].shape,'hexagon');
 const duplicate=state.duplicateMass(id);assert.ok(state.recipe.modules.some(m=>m.id===duplicate));state.deleteMass(duplicate);assert.equal(state.recipe.modules.length,frozen.modules.length);
 assert.deepEqual(restoreArchitecture(JSON.parse(JSON.stringify({recipe:state.recipe}))),state.recipe,'Document round trip');
}
const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)},state=createStudioState(architecturalRecipe('citadel','LIBRARY',0,{design:{kit:'forge'},style:'garden'}));state.freeze();state.updateMass(state.recipe.modules[1].id,{width:34,x:-32});const custom=state.recipe;
publishAsset(storage,custom);publishAsset(storage,custom);assert.equal(readAssetLibrary(storage).length,1,'Publish replaces a slot rather than duplicating');
const slot=FAMILIES.indexOf('citadel'),planDoc=buildingBlueprint(slot,'CITY-SEED',{},readAssetLibrary(storage));assert.deepEqual(planDoc.architecture,custom,'City must consume the exact normalized editor recipe');
const city=cityBlueprint({assets:readAssetLibrary(storage),hubs:1});assert.deepEqual(city.prototypes[slot].architecture,custom);const bounds=architectureBounds(compileArchitecture(custom));assert.equal(planDoc.footprintRadius,bounds.radius,'Edited masses must affect placement clearance');removeAsset(storage,custom);assert.equal(readAssetLibrary(storage).length,0);
const planSeeds=new Set();for(let i=0;i<8;i++)planSeeds.add(JSON.stringify(compileArchitecture(architecturalRecipe('spire','VAR-'+i)).volumes));assert.equal(planSeeds.size,8,'Seeded variants must vary whole-building massing');
const lowRecipe=restoreArchitecture({...architecturalRecipe('spire','LOW-PODIUM'),modules:[{id:'low',shape:'chamfer',role:'podium',width:20,depth:20,height:.5,x:0,y:2.4,z:0}]}),lowMaterials=cityMaterials('LOW-PODIUM'),lowModel=buildingModel({architecture:lowRecipe},0,lowMaterials);assert.ok(lowModel.children.every(m=>m.geometry.index.count>0),'Clipped short facade panels must not upload empty GPU buffers');lowModel.traverse(m=>m.geometry?.dispose());lowMaterials.all.forEach(m=>m.dispose());lowMaterials.atlas.material.userData.textures.forEach(t=>t.dispose());
const palettes=[];for(const kit of Object.keys(ARCHITECTURAL_KITS)){const mats=cityMaterials('FINISH',.35,'garden',{kit});assert.ok(mats.palette.every(c=>/^#[0-9a-f]{6}$/.test(c)),'Baker only accepts hex colors');assert.equal(mats.atlas.tiles[0].recipe.paint,mats.palette[0],'Construction color must reach the real PBR baker');palettes.push(mats.atlas.tiles[0].color.slice(0,80).join(','));mats.all.forEach(m=>m.dispose());mats.atlas.material.userData.textures.forEach(t=>t.dispose());}assert.equal(new Set(palettes).size,5);
// Test the actual worker and part metadata used by layer isolation / selection.
const workerURL=new URL('../dist/city/studio-worker.js',import.meta.url).href,worker=new Worker(new URL('data:text/javascript,'+encodeURIComponent(`import {parentPort} from 'node:worker_threads';globalThis.self={postMessage:(d,t)=>parentPort.postMessage(d,t)};await import(${JSON.stringify(workerURL)});parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({ready:true});`)));let data;
try{await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});data=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);worker.postMessage({id:17,recipe:custom,lod:0,wear:.35});});}finally{await worker.terminate();}
assert.equal(data.error,undefined);assert.equal(data.id,17);assert.ok(data.parts.some(p=>p.kind==='structure'));assert.ok(data.parts.some(p=>p.kind==='roof'));assert.equal(data.payload.textures.length,3);assert.ok(data.stats.triangles>10000);
const restored=unpackShip(data.payload);for(const part of data.parts){assert.ok(part.count>0);assert.ok(part.start+part.count<=restored.children.length);}const ids=new Set(data.assembly.volumes.map(v=>v.id));assert.ok(data.parts.filter(p=>p.kind==='envelope').every(p=>ids.has(p.moduleId)));
// Compile actual view-dependent glazing nodes; a new node must not quietly
// exceed the WebGPU binding contract or fail only in the user's browser.
const renderer=new T.WebGPURenderer({canvas:{width:100,height:100,style:{},addEventListener(){},removeEventListener(){}}});renderer.hasFeature=()=>false;renderer.backend.device={limits:{maxUniformBufferBindingSize:65536,maxStorageBufferBindingSize:134217728}};
for(const source of restored.children.filter(m=>['Architectural glazing','Occupied rooms and wayfinding'].includes(m.material.name))){const material=windowNodes(new T.MeshStandardNodeMaterial().copy(source.material)),mesh=new T.Mesh(source.geometry,material),builder=new T.WGSLNodeBuilder(mesh,renderer);builder.scene=new T.Scene();builder.camera=new T.PerspectiveCamera();builder.context.material=material;builder.build();assert.ok(builder.fragmentShader.includes('dpdx')||builder.fragmentShader.includes('dpdy'),'Room shading derives its tangent frame without new vertex streams');material.dispose();}
const html=readFileSync('dist/architecture-lab.html','utf8'),script=readFileSync('dist/city/studio.js','utf8'),htmlIds=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(htmlIds).size,htmlIds.length);for(const [,id]of script.matchAll(/\$\('([^']+)'\)/g))assert.ok(htmlIds.includes(id),'Missing studio control '+id);
assert.ok(existsSync('dist/vendor-gpu/addons/controls/TransformControls.js'));assert.ok(readFileSync('dist/shell.js','utf8').includes("architecture: ['architecture-lab.html'"));assert.deepEqual(plan(['dist/architecture-lab.html']).groups,['city']);assert.equal(testGroup('scripts/test-city-studio.mjs'),'city');
console.log('Architecture studio: 24 lossless editable mass assemblies, live connection anchors, undo/redo, clone/delete, schema round trips, saved City parity, bounds, 5 real baked palettes, worker part metadata, room-node WGSL, control integrity and SPA/CI integration passed.');
