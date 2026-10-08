import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {R,landing,basis,height,basinHeight,surfaceNormal,surfaceGeology} from '../dist/terrain.js';
import {rockCandidates} from '../dist/grounding.js';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const {east,north}=basis(landing),at=(x,z)=>landing.clone().multiplyScalar(R).addScaledVector(east,x).addScaledVector(north,z).normalize();
let low=Infinity,high=-Infinity;
for(let x=-1200;x<=1200;x+=40)for(let z=-1200;z<=1200;z+=40){const h=height(at(x,z));assert(Number.isFinite(h));assert.equal(h,height(at(x,z)));low=Math.min(low,h);high=Math.max(high,h);}
assert(high-low>80,'Landing region needs actual landform relief');
assert(surfaceNormal(landing).dot(landing)>.995,'Touchdown remains gently sloping');
for(const distance of [4200,6500])for(let angle=0;angle<6.28;angle+=.2){
 const tangent=east.clone().multiplyScalar(Math.cos(angle)).addScaledVector(north,Math.sin(angle));
 const d=m=>landing.clone().multiplyScalar(Math.cos(m/R)).addScaledVector(tangent,Math.sin(m/R));
 assert(Math.abs(height(d(distance+.001))-height(d(distance-.001)))<.05,'Regional geology must blend continuously into the planet');
}
const a=rockCandidates(at(0,0).multiplyScalar(R),105,8192),b=rockCandidates(at(10,0).multiplyScalar(R),105,8192),ids=new Map(b.map(r=>[r.id,r]));
for(const r of a)if(ids.has(r.id))assert.equal(r.direction.distanceTo(ids.get(r.id).direction),0,'Pebbles retain positions');
const assetManifest=JSON.parse(readFileSync(new URL('./material-assets.json',import.meta.url),'utf8'));
for(const asset of assetManifest){
 const bytes=readFileSync(new URL('../dist/'+asset.file,import.meta.url));
 assert.equal(bytes.length,asset.bytes,asset.file+' must not be truncated');
 assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.file+' must match the verified source scan');
}

console.log(`Regional relief ${(high-low).toFixed(1)} m; smooth planet transition, safe touchdown, persistent pebbles and PBR assets: pass`);

for(let x=-1000;x<=1000;x+=50)for(let z=-1000;z<=1000;z+=50){
 const data=surfaceGeology(at(x,z));assert(data.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
}
// Crossing a drainage spatial-index cell must not create a discontinuity.
for(let x=-900;x<=900;x+=300)for(let z=-900;z<=900;z+=37){
 assert(Math.abs(basinHeight(x-.0001,z)-basinHeight(x+.0001,z))<.01);
 assert(Math.abs(basinHeight(z,x-.0001)-basinHeight(z,x+.0001))<.01);
}
console.log('Geological material masks and tributary continuity: pass');
