import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {world,defaults,configureWorld,climate,mapDirection,mapUV} from '../dist/world.js?v=water-1';
import {height,R,landing,PlanetTerrain} from '../dist/terrain.js';
for(let u=.03;u<1;u+=.07)for(let v=.03;v<1;v+=.07){const n=mapDirection(u,v),uv=mapUV(n);assert(Math.abs(uv.u-u)<1e-12&&Math.abs(uv.v-v)<1e-12);}
assert(climate({x:1,y:0,z:0},0).temperature>climate({x:0,y:1,z:0},0).temperature);
assert(climate(landing,100).temperature>climate(landing,1000).temperature);
const point=new T.Vector3(-.8,.2,-.5).normalize(),first=height(point);
configureWorld({...defaults,seed:93});const second=height(point);assert(Math.abs(first-second)>1);assert.equal(second,height(point));
configureWorld(defaults);assert.equal(first,height(point));
const biomes=new Set();for(let u=.005;u<1;u+=.02)for(let v=.005;v<1;v+=.02){const n=new T.Vector3().copy(mapDirection(u,v)),e=height(n),c=climate(n,e);biomes.add(c.biome);for(const k of ['ice','dunes','volcanic','moisture'])assert(c[k]>=0&&c[k]<=1);assert(Number.isFinite(e));}
for(const biome of ['Ocean','Polar ice','Volcanic uplands','Dune desert','Rocky highlands','Sediment plains'])assert(biomes.has(biome),biome+' exists');
configureWorld({...defaults,water:1000});assert(climate(landing,height(landing)).ocean);
configureWorld({relief:Infinity,pressure:-1,seed:1.8});assert.equal(world.relief,1);assert.equal(world.pressure,0);assert.equal(world.seed,2);
configureWorld(defaults);
const root=new T.Group(),material=new T.MeshStandardMaterial(),terrain=new PlanetTerrain(root,material);let disposed=0;
for(const n of terrain.roots)n.mesh.geometry.addEventListener('dispose',()=>disposed++);
terrain.update(landing.clone().multiplyScalar(R+100));terrain.reset();assert.equal(disposed,6);assert.equal(root.children.length,6);assert.equal(terrain.queue.length,0);assert.equal(terrain.active.length,0);
for(const n of terrain.roots){const a=n.mesh.geometry.attributes.biomeData;assert.equal(a.count,n.mesh.geometry.attributes.position.count);assert([...a.array].every(Number.isFinite));}
console.log('World seeds, climate, all six regions, map coordinates, sea level and terrain regeneration: pass');
