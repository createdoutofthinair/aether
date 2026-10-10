import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {createGrowthMaterial} from '../dist/procedural-materials.js';
import {proceduralMask,defaultMask,stackWeights} from '../dist/material-masks.js';
for(const type of ['noise','upward','height','cavity']){
 const low={...defaultMask(),type,coverage:0},high={...low,coverage:1};assert.equal(proceduralMask(low,[.2,.3,.4]),0);assert.equal(proceduralMask(high,[.2,.3,.4]),1);
 for(let i=0;i<100;i++){const p=[i*.029,Math.sin(i)*.4,Math.cos(i)*.4],a={...low,coverage:.3},b={...low,coverage:.7};const va=proceduralMask(a,p),vb=proceduralMask(b,p);assert(va<=vb+1e-8,'More coverage cannot remove mask area');assert(Math.abs(va+proceduralMask({...a,invert:true},p)-1)<1e-8);assert.equal(va,proceduralMask(a,p));}
}
const up={...defaultMask(),type:'upward',coverage:.6};for(let i=0;i<30;i++)assert(proceduralMask(up,[i/10,0,0],1)>=proceduralMask(up,[i/10,0,0],-1));
assert.deepEqual(stackWeights([100,50,50],[1,1,1],[.5,.5,.5],0),[.25,.25,.5]);
assert.deepEqual(stackWeights([100,100,100],[1,0,0],[.5,.5,.5],1),[1,0,0]);
assert.deepEqual(stackWeights([100,100,100],[1,1,1],[.5,.5,.5],0),[0,0,1]);
for(let i=0;i<100;i++){const w=stackWeights([100,i,100-i],[1,i/100,.7],[.8,.2,.6],i/100);assert(w.every(x=>x>=0&&x<=1));assert(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-8);}
for(const kind of ['moss','lichen']){const a=createGrowthMaterial(T,kind,17,64),b=createGrowthMaterial(T,kind,17,64),c=createGrowthMaterial(T,kind,18,64);assert.deepEqual(a.color.image.data,b.color.image.data);assert.notDeepEqual(a.color.image.data,c.color.image.data);assert(a.color.image.data.every(Number.isFinite));assert.equal(a.color.image.data.length,64*64*4);for(let i=0;i<a.normal.image.data.length;i+=4){const n=Array.from(a.normal.image.data.slice(i,i+3),x=>x/255*2-1);assert(Math.abs(Math.hypot(...n)-1)<.015,'Normals must be unit length after byte encoding');}}
console.log('Mask endpoints, monotonic coverage, inversion, slope placement, ordered opacity conservation, seeded procedural maps and normals: pass');
