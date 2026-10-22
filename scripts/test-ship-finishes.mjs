import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {blueprint} from '../dist/ships/blueprint.js';
import {shipModel} from '../dist/ships/model.js';
import {shipSurfaceAtlas,mapShipSurface,SHIP_ZONES} from '../dist/ships/surfaces.js';
import {batchShip,packShip,unpackShip,disposeShip} from '../src/render/ship-assets.js';
import {applyShipLighting} from '../dist/credits/ship-lighting.js';
const plan=blueprint('REALISM-2'),a=shipSurfaceAtlas(plan,{size:64}),b=shipSurfaceAtlas(plan,{size:64});
assert.deepEqual(a.levels,b.levels,'The full material atlas must be reconstructible from the blueprint');
assert.equal(a.material.map.image.width,256);assert.equal(a.material.map.image.height,128);assert.equal(a.material.vertexColors,true);
assert.equal(a.levels.at(-1).width,32);assert.equal(a.levels.at(-1).height,16);
assert.equal(new Set(a.tiles.map(t=>Buffer.from(t.color).toString('base64'))).size,8,'Each functional material needs a distinct finish');
for(const level of a.levels)for(const k of ['color','normal','surface','masks'])assert.equal(level[k].length,level.width*level.height*4);
for(const zone of SHIP_ZONES){const g=mapShipSurface(new T.BoxGeometry(),a.zones[zone]);const uv=g.attributes.uv,slot=SHIP_ZONES.indexOf(zone),x=slot%4,y=Math.floor(slot/4);for(let i=0;i<uv.count;i++){assert.ok(uv.getX(i)>x/4&&uv.getX(i)<(x+1)/4);assert.ok(uv.getY(i)>y/2&&uv.getY(i)<(y+1)/2);}assert.deepEqual(g.attributes.uv1.array,g.attributes.uv.array);assert.ok(g.attributes.color.array.every(v=>v===1));g.dispose();}
const fresh=shipSurfaceAtlas(plan,{size:64,wear:0}),used=shipSurfaceAtlas(plan,{size:64,wear:1});assert.notDeepEqual(fresh.levels[0].surface,used.levels[0].surface);assert.notDeepEqual(fresh.levels[0].color,used.levels[0].color);
// Structural symmetry is retained; service equipment and repairs carry history.
for(const seed of ['AETHER-001','REALISM-2','fit-check-5']){
 const p=blueprint(seed),model=shipModel(p),zones=new Set(),features=new Set();let beveled=0,triangles=0,registry;
 model.traverse(o=>{if(!o.isMesh)return;zones.add(o.userData.surfaceZone);features.add(o.userData.feature);if(o.userData.feature==='registry')registry=o;if(o.geometry.userData.beveled)beveled++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});
 assert.ok(features.has('airlock')&&features.has('registry'),'Every complete spacecraft has a crew hatch and identity');assert.equal(Math.sign(registry.position.x),p.service.accessSide);assert.ok(beveled>0,'Flyby assets must retain manufactured edge highlights');assert.ok(zones.has('alloy')&&zones.has('engine')&&zones.has('marking'));assert.ok(triangles<150000,'Resident flyby geometry must remain bounded');
 const batch=batchShip(model);assert.ok(batch.children.length<=7);const payload=packShip(batch),restored=unpackShip(payload);assert.ok(restored.children.some(m=>m.material.vertexColors),'Worker transfer must preserve module finish variation');
 const textures=restored.children.flatMap(m=>[m.material.map,m.material.normalMap,m.material.roughnessMap]).filter(Boolean);assert.ok(textures.some(t=>t.image.width===512&&t.image.height===256),'Credits must receive the full functional atlas');
 applyShipLighting(restored);for(const mesh of restored.children)assert.ok(mesh.material.envNode);disposeShip(restored);disposeShip(batch);
}
// Studio conversion shares materials, keeps texture ownership, and handles nested parts.
const model=shipModel(plan),before=new Set();model.traverse(o=>{if(o.isMesh)before.add(o.material);});const map=model.children.flatMap(p=>p.children).find(m=>m.isMesh&&m.material.map)?.material.map;let prematureDisposals=0;map.addEventListener('dispose',()=>prematureDisposals++);applyShipLighting(model);const after=new Set();model.traverse(o=>{if(o.isMesh)after.add(o.material);});assert.equal(after.size,before.size);assert.equal(prematureDisposals,0);disposeShip(model);
for(const atlas of [a,b,fresh,used])atlas.material.dispose();
console.log('Ship finishes: eight deterministic PBR zones, isolated atlas mips/UV guards, wear history, crew scale cues, flyby bevels, bounded geometry/draws, worker round-trip and shared lighting ownership passed.');
