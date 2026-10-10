import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {featuredRegions,regionAt,regionDirection} from '../dist/regions.js?v=terrain-9';
import {world,defaults,configureWorld} from '../dist/world.js?v=terrain-9';
import {height,R,regionLanding,surfaceClimate,surfaceNormal} from '../dist/terrain.js';
import {rockCandidates} from '../dist/grounding.js';
import {measure,sites} from './region-metrics.mjs';
const metrics=Object.fromEntries(sites.map(s=>[s.id,measure(s)]));
assert(metrics.badlands.relief>900&&metrics.volcanic.relief>1200);
assert(metrics.dunes.relief<200&&metrics.dunes.relief>70,'Dunes have a different vertical scale from cliffs');
assert(metrics.badlands.meanSlope>metrics.dunes.meanSlope*1.7,'Badlands have substantially stronger large-scale relief');
const locations=[];
for(const region of featuredRegions()){
 const site=regionLanding(region);assert(site,'Each default region has a landing site');assert(surfaceNormal(site).dot(site)>.96);const c=surfaceClimate(site,height(site));assert(!c.ocean);assert.equal(c.biome,region.name);locations.push(site);
 for(const boundary of [.6,1])for(let angle=0;angle<Math.PI*2;angle+=.35){
  const at=delta=>{const chord=region.radius*boundary+delta,arc=2*Math.asin(chord/(2*R));return new T.Vector3().copy(region.center).multiplyScalar(Math.cos(arc)).addScaledVector(new T.Vector3().copy(region.east),Math.cos(angle)*Math.sin(arc)).addScaledVector(new T.Vector3().copy(region.north),Math.sin(angle)*Math.sin(arc));};
  assert(Math.abs(height(at(.001))-height(at(-.001)))<.05,'Region boundary remains continuous');
 }
}
const duneRocks=rockCandidates(locations[2].clone().multiplyScalar(R)),badlandRocks=rockCandidates(locations[0].clone().multiplyScalar(R));assert(duneRocks.length<badlandRocks.length*.3,'Dune fields stay mostly clear of boulders');
const initial=height(locations[1]);configureWorld({...defaults,seed:24});assert.notEqual(height(locations[1]),initial);configureWorld(defaults);assert.equal(height(locations[1]),initial);
assert.equal(regionAt(new T.Vector3().copy(regionDirection(featuredRegions()[0],0,0))).id,'badlands');
console.log('Distinct regional geometry, safe sites, boundary continuity, seed repeatability and sparse dune scatter: pass');
console.log(JSON.stringify(metrics));
