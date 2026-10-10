import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {generateReference,referenceSample} from '../dist/terrain-data.js?v=terrain-8';
import {installReference,prepareReference,getReference} from '../dist/terrain-cache.js?v=terrain-8';
import {world,defaults,configureWorld} from '../dist/world.js?v=terrain-8';
import {R,landing,basis,height,surfaceNormal,surfaceGeology,PlanetTerrain} from '../dist/terrain.js';

const started=performance.now(),data=generateReference(6);installReference(data);
assert(data.height.every(Number.isFinite));assert(data.stats.meanChange>1,'Erosion must change the reference relief');assert(data.stats.maxFlow>100,'Drainage must collect connected catchments');
const small=generateReference(6,{size:65,droplets:2000}),same=generateReference(6,{size:65,droplets:2000}),other=generateReference(7,{size:65,droplets:2000});assert.deepEqual(small.height,same.height);assert.notDeepEqual(small.height,other.height);
const {east,north}=basis(landing),at=(x,z)=>landing.clone().multiplyScalar(R).addScaledVector(east,x).addScaledVector(north,z).normalize();
assert(surfaceNormal(landing).dot(landing)>.995,'The eroded region retains a safe touchdown');
let min=Infinity,max=-Infinity;for(let x=-2000;x<=2000;x+=80)for(let z=-2000;z<=2000;z+=80){const h=height(at(x,z));min=Math.min(min,h);max=Math.max(max,h);assert(surfaceGeology(at(x,z)).every(v=>v>=0&&v<=1));}assert(max-min>300,'Reference area contains actual large-scale relief');
for(const radius of [2700,3900,4200,6500])for(let a=0;a<6.28;a+=.3){const p=d=>at(Math.cos(a)*d,Math.sin(a)*d);assert(Math.abs(height(p(radius+.0001))-height(p(radius-.0001)))<.02,'Reference and planet seams must stay continuous');}
// Height reconstruction must not introduce bilinear normal jumps at grid lines.
for(let x=-1700;x<=1700;x+=data.step)for(const z of [-650,310]){const e=.002,h=q=>referenceSample(data,q,z).height,left=(h(x)-h(x-e))/e,right=(h(x+e)-h(x))/e;assert(Math.abs(left-right)<.02,'Reconstruction is differentiable across cell boundaries');}
const terrain=new PlanetTerrain(new T.Group(),new T.MeshStandardMaterial()),face=4,den=landing.z,div=2**12,x=Math.floor((landing.x/den+1)*.5*div),y=Math.floor((landing.y/den+1)*.5*div),node=terrain.node(face,12,x,y);terrain.build(node);terrain.active=[node];terrain.stitchEdges();
const point=new T.Vector3().fromBufferAttribute(node.mesh.geometry.attributes.position,8*17+8).add(node.anchor),contact=terrain.sample(point);assert(point.distanceTo(contact.point)<.003,'Contact follows the rendered eroded mesh');
assert.equal(await prepareReference(6),data,'Repeated visits reuse cached data');assert.equal(getReference().seed,6);
configureWorld({...defaults,seed:7});const before=height(landing);configureWorld(defaults);assert.notEqual(height(landing),before,'A cached region cannot leak into another seed');
console.log(JSON.stringify({referenceReliefMetres:Math.round(max-min),erosion:data.stats,preparationAndTestsMs:Math.round(performance.now()-started),continuity:'pass',contact:'pass',determinism:'pass'}));
