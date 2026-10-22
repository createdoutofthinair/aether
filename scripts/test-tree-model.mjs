import assert from 'node:assert/strict';
import {generateTree} from '../dist/nature/tree-model.js';
import {buildBranchMesh} from '../dist/nature/branch-mesh.js';
import {length,sub,sample,radiusAt,dot} from '../dist/nature/growth-math.js';
const signatures=new Set(),counts=new Set();
for(const species of ['birch','oak','willow']){
 const options={species,seed:481},tree=generateTree(options);assert.deepEqual(tree,generateTree(options));assert.notDeepEqual(tree,generateTree({...options,seed:482}));
 assert(tree.branches.length>15&&tree.branches.length<=420);assert(tree.attachments.length>100&&tree.attachments.length<=6000);signatures.add(JSON.stringify(tree.branches.map(b=>b.children.length)));counts.add(tree.attachments.length);
 assert(Math.abs(Math.max(...tree.branches.flatMap(b=>b.points.map(p=>p[1])))-3.8)<1e-8,'Height is total height');
 for(const b of tree.branches){assert(b.points.flat().every(Number.isFinite));assert(b.radii.every(r=>r>0&&Number.isFinite(r)));assert(b.radii.at(-1)<b.radii[0]);if(b.parent>=0)assert(length(sub(b.points[0],sample(tree.branches[b.parent],b.attachT)))<1e-8,'Attachment uses actual local parent position');}
 for(const a of tree.attachments){assert(Math.abs(length(sub(a.anchor,a.center))-radiusAt(tree.branches[a.branch],a.t))<1e-8,'Petiole emerges from skin, not spine');assert(Math.abs(length(a.direction)-1)<1e-8);assert(a.variant>=0&&a.variant<4);}
 assert.equal(generateTree({...options,density:0}).attachments.length,0);
 assert(generateTree({...options,levels:4,density:4}).attachments.length<=6000);
 const lods=[0,1,2].map(detail=>buildBranchMesh(tree,{detail}));assert(lods[0].indices.length>lods[2].indices.length);
 for(const mesh of lods){assert(mesh.positions.every(Number.isFinite));assert(mesh.normals.every(Number.isFinite));assert(mesh.uvs.every(Number.isFinite));assert.equal(mesh.ages.length,mesh.positions.length/3);assert(mesh.indices.every(i=>i<mesh.positions.length/3));assert.equal(mesh.junctions,tree.branches.length-1,'Every non-root branch has a skin junction');for(let i=0;i<mesh.normals.length;i+=3)assert(Math.abs(Math.hypot(...mesh.normals.slice(i,i+3))-1)<1e-4);}
 const stem=buildBranchMesh(tree,{trunkOnly:true}),root=tree.branches[0];let outward=0,tested=0;for(let i=0;i<stem.positions.length;i+=3){const p=Array.from(stem.positions.slice(i,i+3)),t=Math.max(0,Math.min(1,p[1]/3.8));if(t<.1||t>.85)continue;const n=Array.from(stem.normals.slice(i,i+3)),radial=sub(p,sample(root,t));if(dot(n,radial)>0)outward++;tested++;}assert(outward/tested>.85,'Stem normals face outward');
}
assert.equal(signatures.size,3,'Species do not share one fixed branching topology');assert.equal(counts.size,3,'Foliage density follows species architecture');
const open=generateTree({habit:'open'}),forest=generateTree({habit:'woodland'});assert.notDeepEqual(open.branches,forest.branches);
console.log('Trees: deterministic growth, species topology, total height, skin attachments, taper, outward normals and connected LOD junctions passed');
// Weld by geometric position because UV seams intentionally duplicate vertices.
// Every edge of a closed, consistently oriented skin must occur twice, reversed.
for(const detail of [0,1,2]){
 const mesh=buildBranchMesh(generateTree({seed:82,species:'oak'}),{detail}),positions=new Map(),ids=[];
 for(let i=0;i<mesh.positions.length;i+=3){const key=Array.from(mesh.positions.slice(i,i+3),v=>Math.round(v*1e7)).join(',');if(!positions.has(key))positions.set(key,positions.size);ids.push(positions.get(key));}
 const edges=new Map();for(let i=0;i<mesh.indices.length;i+=3){const triangle=Array.from(mesh.indices.slice(i,i+3),index=>ids[index]);assert.equal(new Set(triangle).size,3);for(let k=0;k<3;k++){const a=triangle[k],b=triangle[(k+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(','),edge=edges.get(key)||{count:0,direction:0};edge.count++;edge.direction+=a<b?1:-1;edges.set(key,edge);}}
 for(const edge of edges.values()){assert.equal(edge.count,2,'No open edges or non-manifold fork joins');assert.equal(edge.direction,0,'Adjacent faces have consistent winding');}
}
console.log('Branch skins: watertight geometric seams and oriented manifold forks at all three LODs passed');
// Exercise the actual worker transfer payload and its bounded skeleton cache.
let result;globalThis.self={postMessage:data=>{result=data;}};await import('../dist/nature/tree-worker.js');
self.onmessage({data:{id:31,options:{species:'birch',seed:52,height:2,levels:2},tileSize:.5,trunkOnly:false}});assert.equal(result.id,31);assert(!result.error);assert.equal(result.meshes.length,3);assert(result.meshes.every(m=>m.positions.length===m.normals.length&&m.scars.length===m.ages.length));delete globalThis.self;
console.log('Tree worker: generation, skin LOD payload and transferable data contract passed');
