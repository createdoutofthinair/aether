import {cityAOCompatibility} from './city-ao-compat.mjs';
import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const manifest=JSON.parse(await readFile('scripts/vendor-manifest.json','utf8'));
for(const [path,expected]of Object.entries(manifest.files)){
 const actual=createHash('sha256').update(await readFile(path)).digest('hex');
 if(actual!==expected)throw Error(`Vendored dependency integrity mismatch: ${path}`);
}
await mkdir('dist/domain',{recursive:true});
for(const name of ['vector','world','terrain','contact','render-contracts','regional-lod','adaptive-regional-lod'])await copyFile(`src/domain/${name}.js`,`dist/domain/${name}.js`);
await writeFile('dist/foundation-manifest.json',JSON.stringify({schema:1,threeRevision:manifest.threeRevision,backend:'webgl',domainSource:'src/domain',vendorManifest:manifest.files},null,2)+'\n');
console.log('Foundation source synchronized; pinned vendor integrity passed');

const packageInfo=JSON.parse(await readFile('node_modules/three/package.json','utf8'));
if(packageInfo.version!=='0.186.0')throw Error('Unexpected WebGPU Three.js version');
await mkdir('dist/vendor-gpu',{recursive:true});
const gpuFiles={};
for(const name of ['three.core.js','three.webgpu.js','three.tsl.js']){
 const source=`node_modules/three/build/${name}`;await copyFile(source,`dist/vendor-gpu/${name}`);
 gpuFiles[name]=createHash('sha256').update(await readFile(source)).digest('hex');
}
await copyFile('node_modules/three/LICENSE','dist/vendor-gpu/LICENSE');
// Isolated diagnostics only. Production imports remain three.webgpu.js.
// Both renderers share the exact pinned core and worker buffer format.
await copyFile('node_modules/three/build/three.module.js','dist/vendor-gpu/three.module.js');
await writeFile('dist/vendor-gpu/manifest.json',JSON.stringify({version:packageInfo.version,files:gpuFiles},null,2)+'\n');
await mkdir('dist/render/webgpu',{recursive:true});
await copyFile('src/render/backend-session.js','dist/render/backend-session.js');
for(const name of ['bootstrap','preview-backend','terrain-preview'])await copyFile(`src/render/webgpu/${name}.js`,`dist/render/webgpu/${name}.js`);
console.log('Pinned WebGPU modules and opt-in preview synchronized');
// Reusable WebGPU object studio: self-host matching official addons.
for(const relative of ['geometries/RoundedBoxGeometry.js','controls/OrbitControls.js','controls/TransformControls.js','environments/RoomEnvironment.js','loaders/GLTFLoader.js','utils/BufferGeometryUtils.js','utils/SkeletonUtils.js','tsl/display/BloomNode.js','csm/CSMShadowNode.js','csm/CSMFrustum.js','tsl/display/GTAONode.js','tsl/display/FXAANode.js','math/SimplexNoise.js']){
 const target=`dist/vendor-gpu/addons/${relative}`;
 await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});
 await copyFile(`node_modules/three/examples/jsm/${relative}`,target);
}
// Worker modules cannot use a document's import map. Copy the small runtime
// graph with explicit URLs to the same pinned Three.js build (no second engine).
await mkdir('dist/render/worker-kit',{recursive:true});
for(const name of ['resident-pool','ship-assets','ship-worker'])await copyFile(`src/render/${name}.js`,`dist/render/${name}.js`);
const workerSources={
 'surface-atlas.js':'dist/render/surface-atlas.js',
 'model.js':'dist/ships/model.js',
 'surfaces.js':'dist/ships/surfaces.js',
 'material.js':'dist/hull/material.js',
 'ship-assets.js':'src/render/ship-assets.js',
 'BufferGeometryUtils.js':'node_modules/three/examples/jsm/utils/BufferGeometryUtils.js',
 'RoundedBoxGeometry.js':'node_modules/three/examples/jsm/geometries/RoundedBoxGeometry.js'
};
for(const [name,source]of Object.entries(workerSources)){
 let code=await readFile(source,'utf8');
 code=code.replaceAll("'three/webgpu'","'../../vendor-gpu/three.webgpu.js'").replaceAll("'three'","'../../vendor-gpu/three.webgpu.js'")
 .replaceAll("'three/addons/utils/BufferGeometryUtils.js'","'./BufferGeometryUtils.js'").replaceAll("'three/addons/geometries/RoundedBoxGeometry.js'","'./RoundedBoxGeometry.js'")
 .replaceAll("'../render/surface-atlas.js'","'./surface-atlas.js'").replaceAll("'./blueprint.js'","'../../ships/blueprint.js'").replaceAll("'../hull/surface.js'","'../../hull/surface.js'").replaceAll("'../hull/material.js'","'./material.js'").replaceAll("'./surface.js'","'../../hull/surface.js'");
 await writeFile(`dist/render/worker-kit/${name}`,code);
}
console.log('Resident asset pool and import-map-free ship worker synchronized');

for(const [name,kind]of [['GTAONode','gtao'],['DenoiseNode','denoise']]){const source=await readFile(`node_modules/three/examples/jsm/tsl/display/${name}.js`,'utf8');await writeFile(`dist/render/webgpu/city-${name}.js`,cityAOCompatibility(source,kind));}
// Pre-generation happens in the producer/build environment, never the client.
await (await import('./build-material-catalog.mjs')).buildMaterialCatalog();
await (await import('./build-material-studio.mjs')).buildMaterialStudio();
