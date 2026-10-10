import assert from 'node:assert/strict';
import {routePose,VALIDATION_PROFILES,VALIDATION_ROUTES} from '../dist/validation.js';
import {geologicalProfile} from '../dist/planet-profiles.js';
for(const [name,p]of Object.entries(VALIDATION_PROFILES))assert.equal(geologicalProfile(p,p),name);
assert.equal(routePose('ground-orbit',0).altitude,2);
assert.ok(Math.abs(routePose('ground-orbit',6).altitude-75000)<1e-6);
assert.ok(Math.abs(routePose('ground-orbit',12).altitude-2)<1e-6);
for(const route of VALIDATION_ROUTES)for(let t=0;t<=12;t+=.1){const p=routePose(route,t);assert.ok(Object.values(p).every(Number.isFinite));assert.ok(p.altitude>=2);}
assert.throws(()=>routePose('unknown',0));
console.log('Validation profile coverage and continuous routes passed');
