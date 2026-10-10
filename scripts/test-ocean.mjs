import assert from 'node:assert/strict';
import {intersectSea} from '../dist/water.js';
import {findCoast} from '../dist/inspection.js';
import {world,defaults,configureWorld,configureEnvironment} from '../dist/world.js?v=terrain-10';
import {height} from '../dist/terrain.js?v=terrain-10';

for(const radius of [59000,60000,61000])for(const altitude of [.15,1,18,1000,75000]){
 const origin=[0,radius+altitude,0];
 assert(Math.abs(intersectSea(origin,[0,-1,0],radius)-altitude)<1e-8,'Near-surface intersection must retain centimetre-scale precision');
 assert.equal(intersectSea(origin,[0,1,0],radius),-1,'Outward rays miss the sea');
 for(const tangent of [0,.2,.7,.98]){
  const ray=[tangent,-Math.sqrt(1-tangent*tangent),0],hit=intersectSea(origin,ray,radius);
  if(hit>0){const point=origin.map((x,i)=>x+ray[i]*hit);assert(Math.abs(Math.hypot(...point)-radius)<1e-6,'Oblique water hit must lie on the exact sphere');}
 }
}
assert.equal(intersectSea([0,59990,0],[0,1,0],60000),10,'Camera inside the sea uses the positive exit intersection');
configureWorld(defaults);configureEnvironment();
const coast=findCoast();assert(coast,'Default world has an inspectable coastline');
assert(Math.abs(height(coast.shore)-world.water)<.05,'Inspection finds the actual sea-level crossing');
assert(height(coast.site)>world.water+1,'Inspection camera starts on the dry side');
configureEnvironment({waterEnabled:false});assert.equal(findCoast(),null,'Airless or dry worlds do not inherit the coastal scene');
configureEnvironment();
console.log('Planet-scale water intersection precision, grazing rays, underwater exit, and actual coastline inspection: pass');
