import assert from 'node:assert/strict';
import {AdaptiveRegionalLod,balanceTargets} from '../src/domain/adaptive-regional-lod.js';
let samples=0;const sample=(x,z)=>{samples++;const h=60*Math.sin(x/160)*Math.cos(z/240),dx=60/160*Math.cos(x/160)*Math.cos(z/240),dz=-60/240*Math.sin(x/160)*Math.sin(z/240),l=Math.hypot(dx,1,dz);return{position:[x,h,-z],normal:[-dx/l,1/l,dz/l]};};
const lod=new AdaptiveRegionalLod(sample);let mixed=false;
function coverage(stream=lod){const tiles=stream.display(),buffers=tiles.map(t=>stream.blend(t));assert.equal(tiles.length,16);assert.ok(tiles.every(t=>t.ready));
 for(let id=0;id<16;id++)for(const other of [id%4<3?id+1:null,id<12?id+4:null].filter(x=>x!==null)){
 const a=tiles[id],b=tiles[other],horizontal=other===id+1;assert.ok(Math.max(a.cells,b.cells)<=2*Math.min(a.cells,b.cells),'Displayed topology stays 2:1');
 mixed ||= a.cells!==b.cells;
 for(const field of ['positions','normals']){const edge=(tile,t)=>{const array=buffers[tile.id][field],cells=tile.cells,x=Math.min(cells-1,Math.floor(t*cells)),f=t*cells-x,at=n=>horizontal?(tile===a?n*(cells+1)+cells:n*(cells+1)):(tile===a?cells*(cells+1)+n:n);return[0,1,2].map(k=>array[at(x)*3+k]*(1-f)+array[at(x+1)*3+k]*f);};
 for(let j=0;j<=Math.max(a.cells,b.cells);j++){const x=edge(a,j/Math.max(a.cells,b.cells)),y=edge(b,j/Math.max(a.cells,b.cells));for(let k=0;k<3;k++)assert.ok(Math.abs(x[k]-y[k])<.0002,`${field}: edge ${id}/${other} mismatch ${x[k]-y[k]}`);}}
 }}
for(const camera of [[-1100,180,1100],[1100,180,-1100],[0,12000,0],[-900,300,-900]]){let settled=false;for(let frame=0;frame<900;frame++){const before=samples,state=lod.update(camera,1/60,800);assert.ok(samples-before<=512);assert.ok(state.resident<=32);assert.ok(state.cpuBytes<12*1024*1024);coverage();if(!state.transition&&!state.queued&&state.patchLevels.every((n,i)=>n===state.targets[i])){settled=true;break;}}assert.ok(settled,'Adaptive terrain converges without dependency deadlock');}
assert.ok(mixed,'The camera produces mixed resolutions');assert.throws(()=>lod.update([NaN,0,0],.01));
const balanced=balanceTargets([64,...Array(15).fill(8)]);assert.equal(balanced[0],64);assert.equal(balanced[1],32);assert.equal(balanced[4],32);assert.equal(balanced[15],8);
for(const camera of [[0,200,0],[2000,400,2000],[0,14000,0],[0,150,0]]){lod.update(camera,.01,1000);coverage();assert.ok(lod.state().resident<=32);}
console.log('Adaptive LOD: projected-error selection, mixed 2:1 topology, transition/T-junction borders, normals, cancellation, generation limits and convergence passed');

const {previewSurface}=await import('../src/render/webgpu/terrain-preview.js');
const actual=new AdaptiveRegionalLod(previewSurface().sample);
for(const camera of [[-1000,220,800],[1000,200,-800],[0,10000,0]]){
 let settled=false;
 for(let frame=0;frame<600;frame++){const state=actual.update(camera,1/60,700);coverage(actual);assert.ok(state.resident<=32);if(!state.transition&&!state.queued&&state.patchLevels.every((n,i)=>n===state.targets[i])){settled=true;break;}}
 assert.ok(settled,'Actual terrain converges');
}
console.log('Actual shared terrain: mixed-resolution position/normal borders and convergence passed');

let seed=19;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
for(let frame=0;frame<80;frame++){actual.update([(random()-.5)*3200,150+random()*1300,(random()-.5)*3200],1/60,400+random()*800);coverage(actual);assert.ok(actual.state().resident<=32);}
let drained=false;for(let frame=0;frame<600;frame++){const state=actual.update([0,24000,0],1/60,700);coverage(actual);if(!state.transition&&!state.queued&&state.patchLevels.every((n,i)=>n===state.targets[i]&&n<=16)){drained=true;break;}}
assert.ok(drained,'Rapid view changes settle to distant requested detail without pending work');assert.throws(()=>actual.update([0,0,0],NaN));
console.log('Adaptive LOD view-change stress: seams, bounded residency and recovery after cancelled work passed');
