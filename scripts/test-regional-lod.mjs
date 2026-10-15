import assert from 'node:assert/strict';
import {RegionalLod,desiredResolution,interpolateGrid} from '../src/domain/regional-lod.js';
let samples=0;const sample=(x,z)=>{samples++;const dx=.08*Math.cos(x/100),dz=-.06*Math.sin(z/100),length=Math.hypot(dx,1,dz);return{position:[x,8*Math.sin(x/100)+6*Math.cos(z/100),-z],normal:[-dx/length,1/length,dz/length]};};
const lod=new RegionalLod(sample,{samplesPerFrame:512});
function seams(){const tiles=lod.display(),buffers=tiles.map(t=>lod.blend(t));assert.equal(tiles.length,16);const cells=tiles[0].cells;assert.ok(tiles.every(t=>t.ready&&t.cells===cells));
 for(let id=0;id<16;id++)for(const kind of ['positions','normals']){const array=buffers[id][kind];if(id%4<3){const next=buffers[id+1][kind];for(let y=0;y<=cells;y++)for(let k=0;k<3;k++)assert.ok(array[(y*(cells+1)+cells)*3+k]===next[y*(cells+1)*3+k]);}if(id<12){const next=buffers[id+4][kind];for(let x=0;x<=cells;x++)for(let k=0;k<3;k++)assert.ok(array[(cells*(cells+1)+x)*3+k]===next[x*3+k]);}}
}
seams();let transitions=0;
for(const distance of [1100,12000,3000,6000,1100]){for(let i=0;i<400;i++){const before=samples,state=lod.update(distance,1/60);assert.ok(samples-before<=512);assert.ok(state.resident<=32);assert.ok(state.cpuBytes<9*1024*1024);if(state.transition){transitions++;seams();}if(!state.queued&&!state.transition&&state.current===desiredResolution(distance,state.current))break;if(i===399)assert.fail('LOD did not converge');}seams();}
assert.ok(transitions>0);assert.equal(desiredResolution(2300,64),64,'Refinement threshold hysteresis');assert.equal(desiredResolution(2600,64),32);assert.equal(desiredResolution(8500,8),8);
const grid=new Float32Array([0,0,0,1,0,0,0,0,1,1,0,1]);assert.deepEqual(interpolateGrid(grid,1,.5,.5),[.5,0,.5]);assert.deepEqual(interpolateGrid(grid,1,1,1),[1,0,1]);
// Dropping an incomplete target must not accumulate cancelled level buffers.
for(const distance of [5000,1000,12000,3000,12000]){lod.update(distance,.01);assert.ok(lod.state().resident<=32);seams();}
console.log('Regional LOD: coverage, generation budget, hysteresis, cancelled work, residency and exact position/normal borders through refine/coarsen passed');
