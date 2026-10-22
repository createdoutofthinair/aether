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
await writeFile('dist/vendor-gpu/manifest.json',JSON.stringify({version:packageInfo.version,files:gpuFiles},null,2)+'\n');
await mkdir('dist/render/webgpu',{recursive:true});
await copyFile('src/render/backend-session.js','dist/render/backend-session.js');
for(const name of ['bootstrap','preview-backend','terrain-preview'])await copyFile(`src/render/webgpu/${name}.js`,`dist/render/webgpu/${name}.js`);
console.log('Pinned WebGPU modules and opt-in preview synchronized');
// Reusable WebGPU object studio: self-host matching official addons.
for(const relative of ['geometries/RoundedBoxGeometry.js','controls/OrbitControls.js','environments/RoomEnvironment.js','loaders/GLTFLoader.js','utils/BufferGeometryUtils.js','utils/SkeletonUtils.js','tsl/display/BloomNode.js']){
 const target=`dist/vendor-gpu/addons/${relative}`;
 await mkdir(target.slice(0,target.lastIndexOf('/')),{recursive:true});
 await copyFile(`node_modules/three/examples/jsm/${relative}`,target);
}
