import assert from 'node:assert/strict';
import * as T from 'three/webgpu';
import {bakeCityFinish,CITY_TILE_METRES} from '../dist/city/surface.js';
import {mapCitySurface} from '../dist/city/surface-uv.js';
import {loftGeometry} from '../dist/city/architecture-model.js';
import {buildingBlueprint} from '../dist/city/blueprint.js';
import {cityMaterials,buildingModel} from '../dist/city/model.js';
import {citySurfaceNodes} from '../dist/city/surface-nodes.js';
import {streetMaterials} from '../dist/city/street-materials.js';
import {packShip,unpackShip} from '../dist/render/ship-assets.js';
const a=bakeCityFinish({seed:'FINISH',wear:.6},128),b=bakeCityFinish({seed:'FINISH',wear:.6},128),other=bakeCityFinish({seed:'OTHER',wear:.6},128);assert.deepEqual(a,b);assert.notDeepEqual(a.color,other.color);
// Guard samples must be periodic, including packed data and normals. No clamp
// edge or neighbouring material colour may leak into the repeating interior.
for(const key of ['color','normal','surface','masks'])for(let y=0;y<128;y++)for(let x=0;x<16;x++)for(let c=0;c<4;c++)assert.equal(a[key][(y*128+x)*4+c],a[key][(y*128+x+96)*4+c]);
for(let i=0;i<a.normal.length;i+=4){const length=Math.hypot(a.normal[i]/127.5-1,a.normal[i+1]/127.5-1,a.normal[i+2]/127.5-1);assert.ok(Math.abs(length-1)<.013);if(a.masks[i+1]===0)assert.equal(a.surface[i+2],0,'Intact paint is dielectric, not metallic');}
// A 120 m tower still has 120 metres of vertical UV, not one stretched tile.
for(const h of [12,120]){const g=loftGeometry({shape:{kind:'softbox',rx:8,rz:6,curve:.2},levels:[{y:0,scale:1,twist:0},{y:h,scale:1,twist:0}]});mapCitySurface(g,{index:3});const uv=g.attributes.uv;assert.ok(Math.max(...Array.from({length:uv.count},(_,i)=>uv.getY(i)))>=h-.001);assert.ok(g.attributes.uv1.array.every((v,i)=>i%4?v>=0&&v<=1:v===3));g.dispose();}
const mats=cityMaterials('TRANSFER',.8,'arid');assert.equal(mats.atlas.size,512);assert.equal(mats.atlas.material.map.image.width,2048);assert.equal(mats.atlas.material.userData.citySurface.tileMeters,CITY_TILE_METRES);
const plan=buildingBlueprint(0,'COATING-PARITY');plan.architecture.design.finishRoughness=.8;plan.architecture.design.panelVariation=.1;
const model=buildingModel(plan,2,mats),coated=model.children.find(m=>m.material===mats.atlas.material&&m.geometry.attributes.uv1.getX(0)===0);assert.ok(coated);assert.ok(Math.abs(coated.geometry.attributes.uv1.getZ(0)-.33)<1e-5,'Custom coating survives shared city material');assert.ok(Math.abs(coated.geometry.attributes.uv1.getW(0)-.1)<1e-5);model.children.forEach(m=>m.geometry.dispose());
const root=new T.Group(),g=new T.BoxGeometry(3,4,5);mapCitySurface(g,{index:6});root.add(new T.Mesh(g,mats.atlas.material));const payload=packShip(root);assert.equal(payload.textures.length,3);const restored=unpackShip(payload),source=restored.children[0].material;assert.deepEqual(source.userData.citySurface,mats.atlas.material.userData.citySurface);
const renderer=new T.WebGPURenderer({canvas:{width:100,height:100,style:{},addEventListener(){},removeEventListener(){}}});renderer.hasFeature=()=>false;renderer.backend.device={limits:{maxUniformBufferBindingSize:65536,maxStorageBufferBindingSize:134217728}};
const roads=streetMaterials('STREET');for(const material of [citySurfaceNodes(new T.MeshStandardNodeMaterial().copy(source)),roads.road,roads.stone]){const geometry=g.clone();geometry.setAttribute('streetSize',new T.Float32BufferAttribute(Array.from({length:geometry.attributes.position.count},()=>[12,32]).flat(),2));const mesh=new T.Mesh(geometry,material),builder=new T.WGSLNodeBuilder(mesh,renderer);builder.scene=new T.Scene();builder.camera=new T.PerspectiveCamera();builder.context.material=material;builder.build();assert.ok(builder.fragmentShader.includes('textureSampleGrad'),'Explicit pre-wrap derivatives prevent seam mip blur');assert.ok(!builder.fragmentShader.includes('NaN'));geometry.dispose();material.dispose();}
roads.dispose();g.dispose();mats.all.forEach(m=>m.dispose());console.log('City surfaces: deterministic finishes, periodic atlas guards, unit normals, dielectric paint, metre UVs on 12/120 m lofts, descriptor worker round trip, three shared maps and building/road/paving WGSL passed.');
