import assert from 'node:assert/strict';
import {species,leafMesh,veins,selectLOD,widthAt} from '../dist/nature/leaf-model.js';
for(const p of Object.values(species))for(const seed of [1,481,999999]){
 for(const [rows,cols] of [[64,16],[16,8],[4,4],[2,2]]){
 const m=leafMesh(p,seed,rows,cols);assert.equal(m.indices.length/3,rows*cols*2);assert(m.positions.every(Number.isFinite));assert(m.uvs.every(v=>v>=0&&v<=1));assert(Math.max(...m.indices)<m.positions.length/3);
 // All non-degenerate triangles face +Z; tips intentionally collapse.
 for(let i=0;i<m.indices.length;i+=3){const [a,b,c]=m.indices.slice(i,i+3).map(v=>v*3);const cross=(m.positions[b]-m.positions[a])*(m.positions[c+1]-m.positions[a+1])-(m.positions[b+1]-m.positions[a+1])*(m.positions[c]-m.positions[a]);assert(cross>=-1e-10);}
 }
 assert.deepEqual(veins(p,seed),veins(p,seed));assert.equal(widthAt(0,p,seed),0);assert.equal(widthAt(1,p,seed),0);
}
assert.equal(selectLOD(1000),0);assert.equal(selectLOD(150),1);assert.equal(selectLOD(40,1),2);assert.equal(selectLOD(4,2),3);assert.equal(selectLOD(270,0),0);assert.equal(selectLOD(290,1),1);
console.log('Leaf determinism, UVs, winding, geometry budgets and LOD hysteresis passed');
let result;
globalThis.self={postMessage:data=>{result=data;}};
await import('../dist/nature/leaf-worker.js');
for(const key of Object.keys(species)){
 self.onmessage({data:{id:7,key,seed:481,age:.12,size:128}});
 assert.equal(result.id,7);assert.equal(result.color.byteLength,128*128*4);
 for(const name of ['color','normal','packed']){const a=new Uint8Array(result[name]);assert(a.some(v=>v!==a[0]));assert(a.every((v,i)=>i%4!==3||v===255));}
 const n=new Uint8Array(result.normal);for(let i=0;i<n.length;i+=4){const len=Math.hypot(n[i]/127.5-1,n[i+1]/127.5-1,n[i+2]/127.5-1);assert(Math.abs(len-1)<.025);}
 const first=new Uint8Array(result.color).slice();self.onmessage({data:{id:8,key,seed:481,age:.12,size:128}});assert.deepEqual(new Uint8Array(result.color),first);
}
delete globalThis.self;
console.log('Worker map generation, determinism, opaque channels and normal normalization passed');
