// Read-only P0 inventory. This does not launch a renderer or measure a GPU.
import {execFileSync} from 'node:child_process';
import {readFileSync, statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';

const root=fileURLToPath(new URL('../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const paths=git('ls-files','dist').split('\n').sort();
const binaries=paths.filter(p=>/\.(jpg|png|ktx2|bin|wasm|gz)$/.test(p));
const assets=binaries.map(path=>{
 const data=readFileSync(resolve(root,path)),entry={path,bytes:data.length,sha256:sha(data)};
 if(path.endsWith('.ktx2')){
  assert.equal(data.subarray(0,12).toString('hex'),'ab4b5458203230bb0d0a1a0a',path);
  Object.assign(entry,{width:data.readUInt32LE(20),height:data.readUInt32LE(24),mipLevels:data.readUInt32LE(40)});
 }
 if(path.endsWith('.png'))Object.assign(entry,{width:data.readUInt32BE(16),height:data.readUInt32BE(20)});
 return entry;
});
// Include runtime JSON manifests/metadata and all assets, not only modules.
const sources=paths.map(path=>({path,sha256:sha(readFileSync(resolve(root,path)))}));
const glb=gunzipSync(readFileSync(resolve(root,'dist/rover.glb.gz')));
assert.equal(glb.toString('ascii',0,4),'glTF');assert.equal(glb.readUInt32LE(4),2);assert.equal(glb.readUInt32LE(8),glb.length);
const rover=JSON.parse(glb.toString('utf8',20,20+glb.readUInt32LE(12)).trim());
const controls=[];
for(const path of ['dist/index.html','dist/material-editor.html']){
 const html=readFileSync(resolve(root,path),'utf8');
 for(const match of html.matchAll(/<(input|select)\b([^>]*)>/g)){
  const attributes={};for(const a of match[2].matchAll(/([\w-]+)="([^"]*)"/g))attributes[a[1]]=a[2];
  if(!attributes.id)continue;
  const entry={page:path,tag:match[1],...attributes};
  if(entry.tag==='select'){
   const end=html.indexOf('</select>',match.index),body=html.slice(match.index,end);
   entry.options=[...body.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/g)].map(m=>({value:m[1].match(/value="([^"]*)"/)?.[1]??m[2],label:m[2],selected:/\bselected\b/.test(m[1])}));
  }
  if(/\bchecked\b/.test(match[2]))entry.checked=true;
  controls.push(entry);
 }
}
const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));
const testScripts=[...pkg.scripts.test.matchAll(/node (scripts\/test-[\w-]+\.mjs)/g)].map(m=>m[1]);
const syntaxModules=[...pkg.scripts.check.matchAll(/node --check (\S+)/g)].map(m=>m[1]);
const treeStatus=git('status','--porcelain').split('\n').filter(Boolean);
const threeRevision=readFileSync(resolve(root,'dist/vendor/three.core.js'),'utf8').match(/const REVISION = '(\d+)'/)?.[1];
console.log(JSON.stringify({
 schemaVersion:1,capturedAt:new Date().toISOString(),purpose:'P0 source and asset inventory; no rendered evidence',
 source:{repository:'https://github.com/createdoutofthinair/aether',commit:git('rev-parse','HEAD'),branch:git('branch','--show-current'),workingTreeDirty:treeStatus.length>0,runtimeWorkingTreeDirty:!!git('status','--porcelain','--','dist'),runtimeManifestHash:sha(JSON.stringify(sources))},
 executionEnvironment:{kind:'agent container, not the target computer',platform:process.platform,architecture:process.arch,node:process.version},
 targetMachine:{gpu:null,vramGiB:null,cpu:null,ramGiB:null,os:null,driver:null,outputResolution:null},
 dependencies:{threeRevision,vite:pkg.devDependencies.vite,lockfileTracked:!!git('ls-files','package-lock.json','npm-shrinkwrap.json')},
 assets:{count:assets.length,totalDownloadBytes:assets.reduce((s,a)=>s+a.bytes,0),manifestHash:sha(JSON.stringify(assets)),files:assets},
 rover:{gzipBytes:statSync(resolve(root,'dist/rover.glb.gz')).size,glbBytes:glb.length,asset:rover.asset,nodes:rover.nodes.length,meshes:rover.meshes.length,materials:rover.materials.length,images:rover.images?.length,wheelNodes:rover.nodes.filter(n=>/^Wheel_[LR][0-2]$/.test(n.name||'')).map(n=>({name:n.name,translation:n.translation,rotation:n.rotation,scale:n.scale}))},
 controls,validationInventory:{testScripts,syntaxModules},
 validation:{functional:'inventory only',visual:'blocked',performance:'blocked',acceptance:'open'}
},null,2));
