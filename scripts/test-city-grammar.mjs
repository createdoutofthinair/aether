import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {compileGrammar,validateGrammar,MASS_RULES,FACADE_RULES,CONSTRUCTION_WORLDS} from '../dist/city/grammar.js';
import {grammarBuildingModel} from '../dist/city/grammar-model.js';

// Test semantic outcomes, not a guessed combinatorial count. Different colors,
// glazing occupancy and dimensions do NOT count as different column topology.
const signatures=new Set();
for(let seed=0;seed<1000;seed++){
 const ir=compileGrammar({seed:'SURVEY-'+seed});assert.deepEqual(validateGrammar(ir),[]);
 signatures.add(JSON.stringify(ir.heights));
 const counts=ir.heights.reduce((sum,h,i)=>{const x=i%ir.options.baysX,z=Math.floor(i/ir.options.baysX),at=(x,z)=>x<0||z<0||x>=ir.options.baysX||z>=ir.options.baysZ?0:ir.heights[z*ir.options.baysX+x];return sum+[[1,0],[-1,0],[0,1],[0,-1]].reduce((n,[dx,dz])=>n+Math.max(0,h-at(x+dx,z+dz)),0);},0);
 assert.equal(ir.facades.length,counts,'Every exposed cell wall is emitted exactly once');
}
assert.ok(signatures.size>=200,`Only ${signatures.size} distinct height fields in 1,000 seeds`);
const ir=compileGrammar({seed:'INDEPENDENT'});assert.deepEqual(compileGrammar({seed:'INDEPENDENT'}),ir);
const faceChange=compileGrammar({...ir.options,facadeSeed:'CHANGED'});assert.deepEqual(faceChange.heights,ir.heights);assert.equal(faceChange.rotation,ir.rotation);
const massChange=compileGrammar({...ir.options,massingSeed:'CHANGED'});assert.equal(massChange.facade,ir.facade);
const materials={atlas:{material:new T.MeshStandardMaterial()},glass:new T.MeshStandardMaterial()};
let tested=0,maxTriangles=0;
for(const {id:mass}of MASS_RULES)for(const world of Object.keys(CONSTRUCTION_WORLDS)){
 const ir=compileGrammar({seed:'GEOMETRY-'+mass,mass,world,facade:FACADE_RULES[tested%FACADE_RULES.length].id});assert.deepEqual(validateGrammar(ir),[]);
 const near=grammarBuildingModel(ir,materials),far=grammarBuildingModel(ir,materials,{lod:1});
 assert.deepEqual(near.userData.apertures,far.userData.apertures,'LOD preserves actual openings');assert.ok(far.userData.triangles<near.userData.triangles);
 maxTriangles=Math.max(maxTriangles,near.userData.triangles);
 for(const root of [near,far]){
  assert.equal(root.children.length,2);assert.ok(root.userData.triangles<160000,'Bounded default-size construction');
  for(const mesh of root.children){const g=mesh.geometry,p=g.attributes.position,n=g.attributes.normal;assert.equal(p.count%3,0);assert.ok(p.array.every(Number.isFinite));
   for(let i=0;i<n.count;i++)assert.ok(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)<1e-5);
   for(let i=0;i<p.count;i+=3){const a=new T.Vector3().fromBufferAttribute(p,i),b=new T.Vector3().fromBufferAttribute(p,i+1),c=new T.Vector3().fromBufferAttribute(p,i+2),normal=b.sub(a).cross(c.sub(a));assert.ok(normal.lengthSq()>1e-12,'No degenerate faces');assert.ok(normal.dot(new T.Vector3().fromBufferAttribute(n,i))>0,'Winding agrees with outward normal');}
  }
 }
 // Ray through the middle of each constructed opening: no opaque host wall
 // is allowed in front of the inset glass. Louvers/entries may own hardware.
 near.updateMatrixWorld(true);const ray=new T.Raycaster(),wall=near.children[0],glass=near.children[1];
 for(const aperture of near.userData.apertures.filter(a=>ir.facades.find(f=>f.id===a.id).type==='window').slice(0,10)){
  const n=new T.Vector3(...aperture.normal).transformDirection(near.matrixWorld),center=new T.Vector3(...aperture.center).add(new T.Vector3(aperture.normal[2]*.23,0,-aperture.normal[0]*.23)).applyMatrix4(near.matrixWorld);
  ray.set(center.clone().addScaledVector(n,1),n.clone().negate());const glassHit=ray.intersectObject(glass,false)[0];assert.ok(glassHit,'Glazing visible through real opening');
  const opaqueHit=ray.intersectObject(wall,false)[0];assert.ok(!opaqueHit||opaqueHit.distance>glassHit.distance-.001,'No opaque wall behind window card');
 }
 for(const root of [near,far])root.children.forEach(m=>m.geometry.dispose());tested++;
}
for(const m of [materials.atlas.material,materials.glass])m.dispose();
assert.deepEqual(validateGrammar(compileGrammar({floors:Infinity,baysX:-100,world:'invalid',mass:'invalid'})),[]);
console.log(`Native grammar: ${signatures.size} distinct column topologies / 1,000 fixed-size seeds; ${tested} family/climate geometry cases; open-aperture ray tests; stable independent seeds and LOD; unit normals/winding; max ${maxTriangles} triangles passed.`);
