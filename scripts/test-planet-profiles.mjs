import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {defaults,configureWorld,configureEnvironment} from '../dist/world.js?v=terrain-19';
import {geologicalProfile} from '../dist/planet-profiles.js?v=terrain-19';
import {generateReference} from '../dist/terrain-data.js?v=terrain-19';
import {prepareDetail,generateDetailTile,emptyDetailTile,sampleDetailTile,DETAIL_SIZE} from '../dist/terrain-detail.js?v=terrain-19';
import {installReference,referenceAt,installDetailTile} from '../dist/terrain-cache.js?v=terrain-19';
import {PlanetTerrain,landing,R,height,basis,surfaceNormal} from '../dist/terrain.js?v=terrain-19';
const profiles={temperate:[{},{}],dry:[{temperature:55,pressure:.3},{waterEnabled:false}],volcanic:[{temperature:30,activity:.9},{}],glacial:[{temperature:-70,pressure:.02},{}],airless:[{temperature:40,pressure:0},{waterEnabled:false,iceEnabled:false}]};
const signatures=new Set(),keys=new Set();let oldTile;
for(const [name,[config,env]] of Object.entries(profiles)){
 const c={...defaults,...config},e={waterEnabled:true,iceEnabled:true,basin:true,...env};configureWorld(c);configureEnvironment(e);assert.equal(geologicalProfile(c,e),name);
 const data=prepareDetail(generateReference(6,{size:129,droplets:5000,config:c,environment:e}));installReference(data);assert.equal(data.profile,name);keys.add(data.key);assert(data.height.every(Number.isFinite));signatures.add(Array.from(data.height.subarray(800,850)).join(','));
 if(name==='airless'){assert.equal(data.stats.droplets,0);assert.equal(data.detailChannels.length,0);}
 assert(surfaceNormal(landing).dot(landing)>.99,'All profiles preserve safe touchdown');
 const tile=generateDetailTile(data,5,1),right=generateDetailTile(data,6,1),fallback=emptyDetailTile(6,5,1),n=DETAIL_SIZE;
 for(let y=0;y<n;y++)for(let k=0;k<3;k++)assert.equal(tile.values[y*n+n-3+k],right.values[y*n+k],name+' shared fine halos');
 for(let x=646;x<760;x+=13.1)for(let z=133;z<252;z+=21.7)assert.equal(sampleDetailTile(data,tile,x,z),sampleDetailTile(data,fallback,x,z),name+' resident/fallback parity');
 if(oldTile)assert.equal(installDetailTile(oldTile),false,'Same-seed detail cannot leak between profiles');oldTile=tile;
 const {east,north}=basis(landing),at=r=>landing.clone().multiplyScalar(R).addScaledVector(east,r).addScaledVector(north,230).normalize();for(const r of [2700,3900,4200,6500])assert(Math.abs(height(at(r-.0001))-height(at(r+.0001)))<.025,name+' profile boundary');
 const terrain=new PlanetTerrain(new T.Group(),new T.MeshStandardMaterial()),div=2**12,node=terrain.node(4,12,Math.floor((landing.x/landing.z+1)*.5*div),Math.floor((landing.y/landing.z+1)*.5*div));terrain.build(node);terrain.active=[node];terrain.stitchEdges();const p=new T.Vector3().fromBufferAttribute(node.mesh.geometry.attributes.position,8*17+8).add(node.anchor);assert(p.distanceTo(terrain.sample(p).point)<.003,name+' rendered contact');
 configureWorld({...c,temperature:c.temperature+1});assert.equal(referenceAt(6,600,200),null,'Climate edits invalidate the active profile');
}
assert.equal(signatures.size,5);assert.equal(keys.size,5);configureWorld(defaults);configureEnvironment();
console.log('Five detailed profiles: distinct geometry, dry/airless rules, shared halos, fallback parity, cache isolation, touchdown and rendered contacts pass');
