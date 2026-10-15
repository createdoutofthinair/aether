import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createTerrainDomain} from '../src/domain/terrain.js';
import {Vector3} from '../src/domain/vector.js';
import {world,environment,configureWorld,configureEnvironment,climate,province} from '../src/domain/world.js';
import {regionAt,regionHeight,regionDirection} from '../dist/regions.js';
import {tyreSupport,wheelClearance} from '../src/domain/contact.js';
const domain=createTerrainDomain({world,environment,climate,province,regionAt,regionHeight,regionDirection,planetAt:()=>null,referenceAt:()=>null});
const cases=JSON.parse(readFileSync('scripts/fixtures/surface-baseline.json'));
for(const c of cases){configureWorld(c.settings);configureEnvironment({waterEnabled:c.settings.temperature<45,iceEnabled:true});const n=new Vector3(...c.n);assert.ok(Math.abs(domain.height(n)-c.height)<1e-9);const normal=domain.surfaceNormal(n).toArray();for(let i=0;i<3;i++)assert.ok(Math.abs(normal[i]-c.normal[i])<1e-10);}
const up={x:0,y:1,z:0},axle={x:1,y:0,z:0};
assert.equal(tyreSupport(1,.2,axle,up),1);
assert.ok(Math.abs(wheelClearance({x:0,y:1.015,z:0},up,axle,1,.2,()=>({point:{x:0,y:0,z:0},normal:up})))<1e-12);
// Source domain modules must remain free of renderer/framework/platform imports.
for(const name of ['terrain','world','contact','vector']){
 const code=readFileSync(`src/domain/${name}.js`,'utf8');assert.ok(!/\b(document|window|Worker|WebGLRenderer|ShaderMaterial)\b/.test(code));
 assert.ok(!/from\s+['"][^'"]*(three|vendor|dist)/.test(code));
 assert.equal(readFileSync(`dist/domain/${name}.js`,'utf8'),code,'Build output differs from authoritative source');
}
console.log(`Renderer-free domain: ${cases.length} captured baseline height/normal cases, plain-data contact and source integrity passed`);
