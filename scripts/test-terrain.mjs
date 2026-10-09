import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {PlanetTerrain,R,landing,surfaceNormal} from '../dist/terrain.js';
const t=new PlanetTerrain(new T.Group(),new T.MeshStandardMaterial());
const make=(...args)=>{let n=t.node(...args);if(!n.mesh)t.build(n);return n;};
const normalAt=(n,i)=>new T.Vector3().fromBufferAttribute(n.mesh.geometry.attributes.normal,i);
const pointAt=(n,i)=>new T.Vector3().fromBufferAttribute(n.mesh.geometry.attributes.position,i).add(n.anchor);
const a=make(4,7,80,90),b=make(4,7,81,90);let maxNormalDelta=0,maxPositionDelta=0;
for(let j=0;j<=16;j++){maxNormalDelta=Math.max(maxNormalDelta,normalAt(a,j*17+16).distanceTo(normalAt(b,j*17)));maxPositionDelta=Math.max(maxPositionDelta,pointAt(a,j*17+16).distanceTo(pointAt(b,j*17)));}
assert(maxNormalDelta<1e-6,'Adjacent patches must share normals');assert(maxPositionDelta<.01,'Adjacent patches must meet');
for(const [fineArgs,coarseArgs,fineColumn,coarseColumn]of [[[4,2,2,2],[4,1,0,1],0,16],[[4,2,3,2],[0,1,0,1],16,0]]){
 const fine=make(...fineArgs),coarse=make(...coarseArgs);t.active=[fine,coarse];t.stitchEdges();
 for(let j=1;j<16;j++){const k=Math.floor(j/2),expected=pointAt(coarse,k*17+coarseColumn).lerp(pointAt(coarse,(k+1)*17+coarseColumn),(j%2)*.5);assert(pointAt(fine,j*17+fineColumn).distanceTo(expected)<.01,'Fine edge must lie on coarse edge, including cube-face transitions');}
}
const landNormal=surfaceNormal(landing);assert(landNormal.dot(landing)>.99,'Landing area must not inherit skirt normals');
for(const n of [a,b]){const g=n.mesh.geometry;for(const index of g.index.array.slice(16*16*6))assert(index>=n.surfaceCount,'Skirt triangles must not share top-surface vertices');for(const v of g.attributes.normal.array)assert(Number.isFinite(v));}
console.log(JSON.stringify({sameLevelNormalError:maxNormalDelta,sameLevelPositionErrorMetres:maxPositionDelta,coarseFineEdges:'pass',cubeFaceEdges:'pass',isolatedSkirts:'pass'}));
// The finest level must participate in rendered-surface contact, not fall back
// to the continuous height field while the rover rides the triangle mesh.
const finest=make(4,14,9000,11000);t.active=[finest];t.stitchEdges();
const centre=pointAt(finest,8*17+8),contact=t.sample(centre);
assert(contact.point.distanceTo(centre)<.003,'Level 14 contact follows the rendered surface');
assert(Number.isFinite(finest.geometricError)&&finest.geometricError>=0,'LOD error estimate is finite');
