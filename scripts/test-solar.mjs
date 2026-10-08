import assert from 'node:assert/strict';
import {generateSystem,stars,periodDays,equilibriumTemperature,orbitalPosition,surfaceProfile} from '../dist/solar.js';
import {configureWorld,configureEnvironment,environment,world,climate,defaults} from '../dist/world.js?v=system-1';
import {height,landing,surfaceGeology} from '../dist/terrain.js';
assert.equal(periodDays(1,1),365.25);
assert(Math.abs(equilibriumTemperature(1,1,.3)-254.57)<.2);
assert.deepEqual(generateSystem(6,'G'),generateSystem(6,'G'));
assert.notDeepEqual(generateSystem(6,'G'),generateSystem(7,'G'));
for(const star of Object.keys(stars))for(const seed of [0,6,19,404,999999]){
 const system=generateSystem(seed,star);assert.equal(system.planets.length,7);
 assert(Math.abs(system.star.luminosity/system.habitable.inner**2-1.1)<1e-10);
 let previousApocenter=0;
 for(const p of system.planets){
  assert(p.axis*(1-p.eccentricity)>previousApocenter,'Neighboring orbits do not intersect');previousApocenter=p.axis*(1+p.eccentricity);
  const a=orbitalPosition(p,0),b=orbitalPosition(p,p.period);assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-10,'Orbits close after one year');
  for(const day of [-10000,0,500,10000]){const v=orbitalPosition(p,day);assert(v.distance>=p.axis*(1-p.eccentricity)-1e-10&&v.distance<=p.axis*(1+p.eccentricity)+1e-10);}
  if(!p.landable){assert.throws(()=>surfaceProfile(p));continue;}
  const profile=surfaceProfile(p);configureWorld(profile.config);configureEnvironment(profile.environment);
  assert.equal(world.temperature,profile.config.temperature,'Surface temperature not silently clamped to temperate range');
  assert.equal(environment.waterEnabled,p.environment.waterEnabled);
  assert(Number.isFinite(height(landing)));assert.equal(climate(landing,-10000).ocean,p.environment.waterEnabled);
  if(!p.environment.basin)assert.deepEqual(surfaceGeology(landing),[0,0,0]);
 }
}
configureWorld(defaults);configureEnvironment();
console.log('Solar systems: deterministic generation, Kepler periods, closed/nonintersecting orbits, world profiles, climate limits and giant landing guards pass');
