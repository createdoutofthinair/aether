import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import * as T from 'three/webgpu';
import {exteriorClipper} from '../dist/city/surface-clip.js';
import {auditGeometry} from '../dist/city/geometry-audit.js';
import {loftGeometry} from '../dist/city/architecture-model.js';
import {architecturalRecipe,BUILDING_FAMILIES} from '../dist/city/architecture.js';
import {buildingModel,cityMaterials} from '../dist/city/model.js';
import {packShip,batchShip} from '../dist/render/ship-assets.js';
import {plan} from './ci/plan.mjs';

function rectangle(){const g=new T.PlaneGeometry(4,1);return g;}
const solid=new T.BoxGeometry(2,2,2),clip=exteriorClipper([{id:'solid',geometry:solid}]),result=clip(rectangle(),'subject'),p=result.attributes.position;
let area=0;for(let i=0;i<result.index.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,result.index.getX(i+j))),center=a.clone().add(b).add(c).divideScalar(3);assert.ok(Math.abs(center.x)>=1-1e-4,'No surviving triangle inside the crossing solid');area+=b.sub(a).cross(c.sub(a)).length()/2;}
assert.ok(Math.abs(area-2)<1e-5,'Crossing polygons must be split, not discarded by centroid');
assert.equal(result.attributes.uv.count,p.count,'Clipping preserves UV streams');
const twins=exteriorClipper([{id:'first',geometry:solid},{id:'second',geometry:solid}]);
assert.ok(twins(solid.clone(),'first').index.count>0,'First coplanar owner survives');assert.equal(twins(solid.clone(),'second').index.count,0,'Second coplanar owner is removed');
const ring=loftGeometry({shape:{kind:'ring',rx:8,rz:8,court:.6},levels:[{y:0,scale:1},{y:10,scale:1}]});
const holePatch=new T.PlaneGeometry(.4,.4);holePatch.rotateX(-Math.PI/2);holePatch.translate(0,5,0);assert.ok(exteriorClipper([{id:'ring',geometry:ring}])(holePatch,'subject').index.count>0,'A courtyard remains an actual void');
const sample={attributes:{position:{itemSize:3,array:new Float32Array([0,0,0,1,0,0,0,1,0])},normal:{itemSize:3,array:new Float32Array([0,0,1,0,0,1,0,0,1])}},index:new Uint16Array([0,1,2,2,1,0])};
assert.equal(auditGeometry({meshes:[sample]}).duplicateTriangles,1,'Audit detects reversed coincident faces');
sample.index=new Uint16Array([0,0,1,0,1,9]);const malformed=auditGeometry({meshes:[sample]});assert.equal(malformed.degenerate,1);assert.equal(malformed.invalid,1);
const mats=cityMaterials('AURELIA-01');
assert.ok(mats.glass.color.r>.2&&mats.glass.color.g>.3,'Daylight glazing must not start near black');
for(const family of BUILDING_FAMILIES)for(const profile of [0,1]){
 const model=batchShip(buildingModel({architecture:architecturalRecipe(family.id,'AURELIA-01',profile)},0,mats)),audit=auditGeometry(packShip(model));
 assert.equal(audit.ok,true,`${family.id}/${profile}: ${JSON.stringify({...audit,duplicates:audit.duplicates.slice(0,3)})}`);model.children.forEach(m=>m.geometry.dispose());
}
const html=readFileSync('dist/architecture-bench.html','utf8'),source=readFileSync('dist/city/bench.js','utf8');
assert.ok(html.includes('three.module.js')&&!html.includes('navigation.js'),'Bench opens independently of the WebGPU gate');
assert.ok(source.includes("new URL('./studio-worker.js',import.meta.url)")&&source.includes('unpackShip(data.payload)'),'Inspect the production worker payload');
assert.ok(!source.includes('windowNodes('),'Do not claim WebGL shader equivalence');
assert.ok(existsSync('dist/vendor-gpu/three.module.js'),'Build includes matching r186 WebGL module');
assert.deepEqual(plan(['dist/architecture-bench.html']).groups,['city']);
mats.all.forEach(m=>m.dispose());mats.atlas.material.userData.textures.forEach(t=>t.dispose());
console.log('Geometry bench: crossing-surface clipping, deterministic coplanar ownership, courtyard voids, UV preservation, malformed-buffer diagnostics and 40 production prototypes with zero invalid/degenerate/duplicate faces passed.');
