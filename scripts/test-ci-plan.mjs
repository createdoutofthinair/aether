import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {plan,groups,testGroup} from './ci/plan.mjs';
assert.deepEqual(plan(['README.md','docs/architecture.md']).groups,[]);
for(const [path,group]of [['dist/credits/main.js','site'],['dist/hud/main.js','site'],['dist/viewer/orbit.js','site'],['dist/nature/leaf-model.js','nature'],['dist/nature-studio.html','nature'],['dist/terrain.js','engine']])assert.deepEqual(plan([path]).groups,[group]);
assert.equal(plan(['dist/nature/main.js']).shaders,false);assert.equal(plan(['dist/terrain.js']).shaders,true);
assert.deepEqual(plan(['dist/nature/main.js','dist/hud/main.js']).groups,['site','nature']);
for(const path of ['package-lock.json','.github/workflows/pages.yml','scripts/build-foundation.mjs','dist/navigation.js','dist/shell.js','src/domain/world.js','unknown.config'])assert.ok(plan([path]).groups.includes('engine'));
for(const path of ['package.json','dist/shell.js','.github/workflows/pages.yml'])assert.deepEqual(plan([path]).groups,groups);
assert.deepEqual(plan([],{full:true}).groups,groups);assert.equal(plan(['dist/rover.glb.gz']).rover,true);assert.equal(plan(['README.md']).deploy,false);
const tests=JSON.parse(readFileSync('package.json','utf8')).scripts.test.split(/\s*&&\s*/).map(s=>/^node (scripts\/[\w-]+\.mjs)$/.exec(s)?.[1]);assert.ok(tests.every(Boolean));assert.equal(new Set(tests).size,tests.length);for(const t of tests)assert.ok(groups.includes(testGroup(t)));
console.log(`CI planner: focused/shared/unknown/docs changes, full regression and all ${tests.length} test assignments passed`);

for(const paths of [['dist/ships/model.js'],['dist/spaceship-studio.html'],['dist/credits/ships.js','dist/credits/style.css'],['dist/nebula-generator.html'],['scripts/test-credit-ships.mjs']]){
 const selection=plan(paths);assert.deepEqual(selection.groups,['site']);assert.equal(selection.siteOnly,true);assert.equal(selection.shaders,false);assert.equal(selection.rover,false);
}
assert.equal(plan(['dist/ships/model.js','dist/terrain.js']).siteOnly,false);
assert.equal(plan(['package-lock.json']).siteOnly,false);
assert.equal(plan([]).siteOnly,false);
