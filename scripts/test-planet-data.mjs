import assert from 'node:assert/strict';
import {generatePlanetData,samplePlanetData,planetDataKey} from '../dist/planet-data.js?v=terrain-12';
import {installPlanetData,planetAt,planetCacheState} from '../dist/planet-cache.js?v=terrain-12';
import {defaults,environment,configureWorld,world} from '../dist/world.js?v=terrain-12';
import * as T from '../dist/vendor/three.module.js';
import {height,authoredHeight,landing,referenceGeology,PlanetTerrain} from '../dist/terrain.js?v=terrain-12';
const sample=n=>500*n.x+180*n.z+70*Math.sin(n.y*13),options={width:64,height:33,passes:4};
const data=generatePlanetData(defaults,environment,sample,options),same=generatePlanetData(defaults,environment,sample,options);
assert.deepEqual(data.residual,same.residual);assert(data.residual.every(Number.isFinite));assert(data.stats.maximumFlow>50);assert(data.stats.maximumCorrection>0);
for(const lat of [-1.55,-.9,0,.9,1.55]){const n=lon=>({x:Math.cos(lat)*Math.sin(lon),y:Math.sin(lat),z:Math.cos(lat)*Math.cos(lon)});const a=samplePlanetData(data,n(-Math.PI+1e-8)),b=samplePlanetData(data,n(Math.PI-1e-8));assert(Math.abs(a.height-b.height)<1e-5);assert(Math.abs(a.flow-b.flow)<1e-5);}
for(const y of [-1,1])for(let lon=0;lon<6;lon+=.2){const p=samplePlanetData(data,{x:Math.sin(lon)*1e-12,y,z:Math.cos(lon)*1e-12});assert(Math.abs(p.height-samplePlanetData(data,{x:0,y,z:1e-12}).height)<1e-7);}
const airless=generatePlanetData({...defaults,pressure:0},{...environment,waterEnabled:false},sample,options);assert(airless.residual.every(Number.isFinite));assert(airless.stats.maximumCorrection<data.stats.maximumCorrection);
installPlanetData(data);assert(planetAt(defaults,environment,landing));assert.equal(planetAt({...defaults,seed:99},environment,landing),null);assert.equal(height(landing),authoredHeight(landing),'Global erosion must preserve the reference landing region');
assert.equal(referenceGeology(landing.clone().negate()),null,'Reference masks must not leak to the antipode');
const root=new T.Group(),terrain=new PlanetTerrain(root,new T.MeshStandardMaterial());for(const node of terrain.roots){assert.equal(node.mesh.geometry.attributes.hydraulicData.count,node.mesh.geometry.attributes.position.count);assert([...node.mesh.geometry.attributes.hydraulicData.array].every(Number.isFinite));}
for(let seed=1;seed<=4;seed++){const config={...defaults,seed};installPlanetData({...data,config,key:planetDataKey(config,environment)});}assert.equal(planetCacheState().resident,3);
configureWorld(defaults);console.log('Planetary drainage: deterministic, longitude/pole seams, airless routing, reference preservation, cache identity/bounds and vertex data pass');
