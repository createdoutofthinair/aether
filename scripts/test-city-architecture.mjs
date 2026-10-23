import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {BUILDING_FAMILIES,PLANET_STYLES,architectureOptions,architecturalRecipe,compileArchitecture,footprint} from '../dist/city/architecture.js';
import {loftGeometry} from '../dist/city/architecture-model.js';
import {cityBlueprint,buildingBlueprint,PROTOTYPES,exportCity} from '../dist/city/blueprint.js';
import {buildingModel,cityMaterials} from '../dist/city/model.js';

assert.equal(BUILDING_FAMILIES.length,20);assert.equal(PROTOTYPES,40);
assert.deepEqual(architectureOptions({style:'__proto__',twist:Infinity,terraces:-8}),architectureOptions({twist:1,terraces:2}));
for(const shape of ['ellipse','softbox','petal','ring','crescent']){
 const polygon=footprint({kind:shape,rx:25,rz:20,curve:1},48);
 const area=loop=>loop.reduce((sum,a,i)=>{const b=loop[(i+1)%loop.length];return sum+a.x*b.z-b.x*a.z;},0)/2;
 assert.ok(area(polygon.outer)>0,shape+' outer winding');polygon.holes.forEach(h=>assert.ok(area(h)<0,shape+' hole winding'));
 const g=loftGeometry({shape:{kind:shape,rx:25,rz:20,curve:1},levels:[{y:2,scale:1},{y:12,scale:.8}]},48),p=g.attributes.position,n=g.attributes.normal;
 for(let i=0;i<p.count;i++)assert.ok(Number.isFinite(n.getX(i))&&Math.hypot(n.getX(i),n.getY(i),n.getZ(i))>.99,'Valid normals');
 // Test triangle winding directly, including triangulated holed caps.
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();
 for(let i=0;i<g.index.count;i+=3){a.fromBufferAttribute(p,g.index.getX(i));b.fromBufferAttribute(p,g.index.getX(i+1));c.fromBufferAttribute(p,g.index.getX(i+2));const cross=b.clone().sub(a).cross(c.clone().sub(a));assert.ok(cross.length()>1e-7,shape+' no zero-area architecture triangles '+i);if(a.y===b.y&&b.y===c.y)assert.ok(a.y===12?cross.y>0:cross.y<0,'Roof/floor outward winding');}
 g.dispose();
}
const snapshots=[];
for(const style of Object.keys(PLANET_STYLES)){
 const options={style},city=cityBlueprint({seed:'PLANET-PARITY',hubs:7,architecture:options}),again=cityBlueprint({seed:'PLANET-PARITY',hubs:7,architecture:options});
 assert.deepEqual(city,again);assert.deepEqual(cityBlueprint(exportCity(city).options),city);
 const mats=cityMaterials('PLANET-PARITY',.35,style),counts=[];
 for(const family of BUILDING_FAMILIES){
  const variant=BUILDING_FAMILIES.indexOf(family),plan=buildingBlueprint(variant,'PLANET-PARITY',options),recipe=architecturalRecipe(family.id,'PLANET-PARITY',0,options),assembly=compileArchitecture(recipe);
  assert.deepEqual(recipe,plan.architecture);assert.ok(assembly.volumes.length);assert.equal(new Set(assembly.volumes.map(v=>v.id)).size,assembly.volumes.length);
  assert.ok(assembly.sockets[0].position.every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...assembly.entry.normal)-1)<1e-8);
  let sizes=[];
  for(let lod=0;lod<3;lod++){
   const model=buildingModel(plan,lod,mats),box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3());let triangles=0;
   model.traverse(o=>{if(!o.isMesh)return;for(const attribute of Object.values(o.geometry.attributes))assert.ok(attribute.array.every(Number.isFinite));triangles+=o.geometry.index.count/3;if(o.name==='facade-bay')assert.ok(o.geometry.index.count>0,'No empty window patches');});
   assert.ok(triangles<60000,style+'/'+family.id+' prototype cost');sizes.push(size);counts.push(triangles);
   const windows=model.children.filter(m=>m.name==='facade-bay').length;
   if(lod===0)plan.windowCount=windows;else assert.equal(windows,plan.windowCount,'LOD must preserve window/occupancy population');
   model.traverse(o=>o.geometry?.dispose());
  }
  for(const axis of ['x','y','z'])assert.ok(Math.abs(sizes[0][axis]-sizes[2][axis])<2,style+'/'+family.id+' stable silhouette '+axis);
  if(style==='ocean')assert.equal(assembly.supports.filter(s=>s.a[1]===0).length,8,'Ocean foundations need actual supports');
 }
 const weighted=city.buildings.filter(b=>!b.landmark).map(b=>city.prototypes[b.variant].family);
 snapshots.push({style,weighted:weighted.join(','),height:city.prototypes[0].height,palette:mats.atlas.tiles[0].color.slice(0,24).join(',')});
 mats.all.forEach(m=>m.dispose());mats.atlas.material.userData.textures.forEach(t=>t.dispose());
}
assert.equal(new Set(snapshots.map(s=>s.weighted)).size,6,'Planet identity changes city morphology distribution');
assert.equal(new Set(snapshots.map(s=>s.height)).size,6,'Planet identity changes proportions');assert.equal(new Set(snapshots.map(s=>s.palette)).size,6,'Planet identity changes finishes');
const original=compileArchitecture(architecturalRecipe('spire','TEST')),overridden=compileArchitecture(architecturalRecipe('spire','TEST',0,{envelope:'petal',roof:'shield'}));
assert.notDeepEqual(original.volumes,overridden.volumes);assert.equal(overridden.recipe.roof,'shield');
assert.equal(compileArchitecture(architecturalRecipe('ring','TEST',0,{envelope:'petal'})).volumes[0].shape.kind,'ring','Envelope override must preserve courtyards');
// A broad flat pane used to cut through the opaque shell. Every sampled pane
// triangle must now sit outside its actual host skin, including curved roofs.
const mats=cityMaterials('CURVED-PANES');
for(const family of ['dome','helix','crescent','petal']){
 const plan=buildingBlueprint(BUILDING_FAMILIES.findIndex(f=>f.id===family),'CURVED-PANES'),model=buildingModel(plan,2,mats),skin=model.children.filter(m=>m.name.endsWith(':envelope'));model.updateMatrixWorld(true);
 const ray=new T.Raycaster(),a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let checked=0;
 for(const mesh of model.children.filter(m=>m.name==='facade-bay')){
  const g=mesh.geometry,p=g.attributes.position;
  for(let i=0;i<g.index.count;i+=9){if(i+2>=g.index.count)break;a.fromBufferAttribute(p,g.index.getX(i));b.fromBufferAttribute(p,g.index.getX(i+1));c.fromBufferAttribute(p,g.index.getX(i+2));const n=b.clone().sub(a).cross(c.clone().sub(a)).normalize(),center=a.clone().add(b).add(c).multiplyScalar(1/3);ray.set(center,n);ray.far=.065;assert.equal(ray.intersectObjects(skin,false).length,0,family+' window lies behind opaque envelope');checked++;}
 }
 assert.ok(checked>100);model.traverse(o=>o.geometry?.dispose());
}
mats.all.forEach(m=>m.dispose());mats.atlas.material.userData.textures.forEach(t=>t.dispose());
console.log('Architecture: 20 grammar families × 6 planet profiles × 3 LODs, deterministic recipes, module overrides, footprint holes, cap winding, finite normals, stable window population, supported ocean decks and distinct planetary composition passed.');
