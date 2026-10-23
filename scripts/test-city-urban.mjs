import assert from 'node:assert/strict';
import {cityBlueprint,exportCity,CITY_LAYOUTS} from '../dist/city/blueprint.js';
import {segmentDistance} from '../dist/city/layouts.js';
import {architecturalRecipe,compileArchitecture,restoreArchitecture} from '../dist/city/architecture.js';
import {CONSTRUCTION_BLOCKS,attachConstructionBlock} from '../dist/city/construction-kit.js';
import {CITY_LIGHTING,SHADOW_QUALITY} from '../dist/city/lighting.js';
import {infrastructure} from '../dist/city/infrastructure.js';
import {buildingShadowModel} from '../dist/city/shadow-model.js';
import {cityMaterials} from '../dist/city/model.js';
const fingerprints=[];
for(const kind of Object.keys(CITY_LAYOUTS)){
 const city=cityBlueprint({layout:kind,hubs:7,rings:4,density:1,seed:'URBAN-CONTRACT'});assert.deepEqual(cityBlueprint(exportCity(city).options),city);
 const connected=new Set([0]);for(let i=0;i<7;i++)for(const l of city.links)if(connected.has(l.from)||connected.has(l.to)){connected.add(l.from);connected.add(l.to);}assert.equal(connected.size,7);
 const cells=new Map();for(const b of city.buildings){
  const radius=city.prototypes[b.variant].footprintRadius*b.scale*b.width,kx=Math.floor(b.x/120),kz=Math.floor(b.z/120);
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(const n of cells.get(`${kx+dx}:${kz+dz}`)||[])assert.ok(Math.hypot(b.x-n.x,b.z-n.z)>radius+n.radius-1e-5,kind+' overlapping parcels');
  const key=`${kx}:${kz}`;if(!cells.has(key))cells.set(key,[]);cells.get(key).push({...b,radius});
  if(kind==='circular')continue;assert.ok(radius<=b.clearance+1e-5,'Custom module bounds fit the reserved parcel');
  for(const r of city.routes.filter(r=>r.hub===b.hub))assert.ok(segmentDistance(b.x,b.z,r)>=radius+(r.width??16)/2+(r.sidewalk??4)-.01,kind+' road/sidewalk clearance '+b.id);
 }
 const infra=infrastructure(city);let receivers=0;infra.root.traverse(m=>{if(m.isMesh&&m.receiveShadow)receivers++;});assert.ok(receivers>5,'Roads, sidewalks, parks and structures receive shadows');infra.animate(3);infra.dispose();fingerprints.push(city.buildings.map(b=>[Math.round(b.x),Math.round(b.z)]).join(';'));
}
assert.equal(new Set(fingerprints).size,4);
const base=architecturalRecipe('utility','SOCKET-TEST');base.modules=[{id:'host',label:'Host',shape:'chamfer',role:'tower',width:24,depth:30,height:25.2,x:0,y:2.4,z:0,yaw:37,taper:0}];const recipe=restoreArchitecture(base),assembly=compileArchitecture(recipe);
for(const [type,block]of Object.entries(CONSTRUCTION_BLOCKS))for(const side of ['top','east','west','north','south']){
 const next=attachConstructionBlock(recipe,assembly,'host',type,side),m=next.recipe.modules.find(v=>v.id===next.id),host=next.recipe.modules[0];assert.equal(m.shape,block.shape);assert.deepEqual(restoreArchitecture(next.recipe),next.recipe);
 if(side==='top')assert.equal(m.y,host.y+host.height);else{const a=host.yaw*Math.PI/180,dx=m.x-host.x,dz=m.z-host.z,x=dx*Math.cos(a)+dz*Math.sin(a),z=-dx*Math.sin(a)+dz*Math.cos(a);if(['east','west'].includes(side))assert.ok(Math.abs(Math.abs(x)-(host.width+m.width)/2)<1e-6&&Math.abs(z)<1e-6);else assert.ok(Math.abs(Math.abs(z)-(host.depth+m.depth)/2)<1e-6&&Math.abs(x)<1e-6);}
}
assert.ok(Object.values(CITY_LIGHTING).every(p=>p.ambient<1&&p.environment<.6&&p.imp[0]<.6),'Fill must leave directional contrast');assert.equal(Object.keys(CITY_LIGHTING).length,6);assert.ok(CITY_LIGHTING.raking.direction[1]<CITY_LIGHTING.day.direction[1]);assert.ok(SHADOW_QUALITY.high.casters>SHADOW_QUALITY.fast.casters);
const mats=cityMaterials(),proxy=buildingShadowModel({architecture:architecturalRecipe('citadel','SHADOW-TEST')},mats),triangles=proxy.children.reduce((s,m)=>s+m.geometry.index.count/3,0);assert.ok(triangles<1800,'Silhouette casters omit facade detail');proxy.children.forEach(m=>m.geometry.dispose());mats.all.forEach(m=>m.dispose());mats.atlas.material.userData.textures.forEach(t=>t.dispose());
console.log('Urban systems: four deterministic connected layouts, safe road/sidewalk parcels, shadow receivers, 35 rotated block attachments, six bounded lighting presets and inexpensive silhouette casters passed.');
