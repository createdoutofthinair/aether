import * as T from 'three/webgpu';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {compileGrammar,validateGrammar,MASS_RULES,FACADE_RULES,CONSTRUCTION_WORLDS} from './grammar.js';
import {grammarBuildingModel} from './grammar-model.js';
import {cityMaterials} from './model.js';
import {citySurfaceNodes} from './surface-nodes.js';
import {facadePoint,facadeNormal} from './grammar-surfaces.js';
import {pass,vec4,mix,renderOutput,uniform} from 'three/tsl';
import {ao} from '../render/webgpu/city-GTAONode.js';
import {denoise} from '../render/webgpu/city-DenoiseNode.js';
import {fxaa} from 'three/addons/tsl/display/FXAANode.js';
import {buildingMaterialRecipe,BUILDING_FINISH_KEY} from './building-material.js';
import {mapCitySurface} from './surface-uv.js';
import {windowNodes} from './window-nodes.js';
const $=id=>document.getElementById(id),mount=$('viewport'),scene=new T.Scene(),camera=new T.PerspectiveCamera(39,1,.1,2500),renderer=new T.WebGPURenderer({antialias:true,reversedDepthBuffer:true}),
 sun=new T.DirectionalLight(0xfff0de,3.5),sky=new T.HemisphereLight(0xd9e9f0,0x6e7164,.8),controls=new OrbitControls(camera,renderer.domElement);
const contactStrength=uniform(.42),finishPreview=uniform(0);let pipeline,finishWorker,finishJob=0,finishTiles,finishRecipe=buildingMaterialRecipe({resolution:1024}),bakingFinish=false,coupon=null,couponMode=false,couponZone=0;
let dirty=true,rendering=false,frame=0,roots=[],labels=[],materials,pmrem,environment,current,mode='single',massVariant=0,faceVariant=0,queued=false,building=false;
for(const [id,list]of [['mass',MASS_RULES],['facade',FACADE_RULES]])for(const r of list){const option=document.createElement('option');option.value=r.id;option.textContent=r.label;$(id).append(option);}
for(const [id,w]of Object.entries(CONSTRUCTION_WORLDS)){const option=document.createElement('option');option.value=id;option.textContent=w.label;$('world').append(option);}
$('mass').value='petal-shell';
scene.background=new T.Color(0xb7c6c8);scene.add(sun,sun.target,sky);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);sun.shadow.bias=-.00012;sun.shadow.normalBias=.012;sun.shadow.radius=2;
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;mount.append(renderer.domElement);
controls.addEventListener('change',()=>dirty=true);
const floor=new T.Mesh(new T.PlaneGeometry(1500,1500),new T.MeshStandardNodeMaterial({color:0x9da69d,roughness:.93}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;floor.receiveShadow=true;scene.add(floor);
function options(){return {seed:$('seed').value,layout:$('layout').value,coverage:Number($('coverage').value),grouping:Number($('grouping').value),taper:Number($('taper').value),twist:Number($('twist').value),massingSeed:$('seed').value+':mass:'+massVariant,facadeSeed:$('seed').value+':facade:'+faceVariant,mass:$('mass').value,facade:$('facade').value,world:$('world').value,floors:Number($('floors').value),baysX:Number($('baysX').value),baysZ:Number($('baysZ').value)};}
function release(){for(const label of labels)label.element.remove();labels=[];for(const root of roots){scene.remove(root);root.traverse(m=>m.geometry?.dispose());if(root.userData.ownsMaterials)root.children[0].material.dispose();}roots=[];}
function releaseMaterials(){if(materials){const textures=new Set();for(const m of materials.all){for(const field of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[field])textures.add(m[field]);m.dispose();}textures.forEach(t=>t.dispose());}}
function quality(){renderer.setPixelRatio($('quality').value==='inspection'?Math.min(Math.max(devicePixelRatio,1.5),2.5):Math.min(devicePixelRatio,1.5));renderer.setSize(mount.clientWidth,mount.clientHeight);dirty=true;}
function lighting(){const value=$('light').value;sun.position.set(...(value==='raking'?[100,35,65]:[-65,95,60]));sun.intensity=value==='overcast'?.65:3.1;sky.intensity=value==='overcast'?1.1:.3;scene.environmentIntensity=value==='overcast'?.7:.32;dirty=true;}
function fit(){if(!current)return;couponMode=false;document.body.dataset.materialSpecimen='building';if(coupon)coupon.visible=false;roots.forEach(r=>r.visible=true);const gallery=mode==='gallery',h=current.bounds.height,d=Math.max(current.bounds.width,current.bounds.depth),bounds=new T.Box3();for(const root of roots)bounds.union(new T.Box3().setFromObject(root));
 const sphere=bounds.getBoundingSphere(new T.Sphere());if(!Number.isFinite(sphere.radius)||sphere.radius<=0)throw Error('Invalid construction bounds');const vfov=T.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect),distance=sphere.radius/Math.sin(Math.min(vfov,hfov)/2)*1.04;
 document.body.dataset.cameraDistance=String(distance);controls.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(new T.Vector3(.85,.65,1).normalize(),distance);camera.far=2500;camera.updateProjectionMatrix();controls.update();
 const e=gallery?200:Math.max(h,d)*.8;Object.assign(sun.shadow.camera,{left:-e,right:e,top:e,bottom:-e,near:.5,far:650});sun.shadow.camera.updateProjectionMatrix();sun.target.position.set(0,0,0);dirty=true;
}
function detail(kind='facade'){if(!current)return;if(couponMode)fit();couponMode=false;document.body.dataset.materialSpecimen='building';if(coupon)coupon.visible=false;roots.forEach(r=>r.visible=true);if(mode!=='single'){mode='single';schedule(()=>detail(kind));return;}
 const f=kind==='entry'?current.facades.find(f=>f.type==='entry'):current.facades.filter(f=>f.type==='window').sort((a,b)=>b.width*b.height-a.width*a.height)[0];if(!f)return;
 const angle=current.rotation,rotate=v=>new T.Vector3(...v).applyAxisAngle(new T.Vector3(0,1,0),angle),target=rotate(facadePoint(f,0,f.height*.5,0)),n=rotate(facadeNormal(f,0,f.height*.5)),u=new T.Vector3(n.z,0,-n.x).normalize(),distance=Math.max(f.width*.85,f.height)*1.2+5;
 controls.target.copy(target);camera.position.copy(target).addScaledVector(n,distance).addScaledVector(u,distance*.35).add(new T.Vector3(0,distance*.17,0));controls.update();dirty=true;
}
function schedule(after){queued=true;$('status').textContent='Constructing wall openings and architectural modules…';
 const attempt=()=>{if(!queued)return;if(rendering||building){requestAnimationFrame(attempt);return;}queued=false;generate();after?.();};requestAnimationFrame(attempt);
}
function generate(){if(bakingFinish&&!finishTiles)return;building=true;try{
 const o=options();delete document.body.dataset.error;current=compileGrammar(o);const errors=validateGrammar(current);if(errors.length)throw Error(errors.join('; '));release();releaseMaterials();
 materials=cityMaterials('NATIVE-FINISH',finishTiles?0:.24,o.world,{kit:current.world.kit,finishRoughness:.43,panelVariation:.025,refinedSurfaces:true,surfaceResolution:1024,finishTiles,buildingWeather:finishTiles?finishRecipe.weather:undefined});
 materials.atlas.material.userData.citySurface.relief=$('relief').checked?1:0;
 const original=materials.atlas.material;materials.atlas.material=citySurfaceNodes(new T.MeshStandardNodeMaterial().copy(original),{preview:finishPreview});materials.all[0]=materials.atlas.material;original.dispose();
 const originalGlass=materials.glass;materials.glass=new T.MeshStandardNodeMaterial().copy(originalGlass);materials.glass.color.set(0x91bac3);materials.glass.emissive.set(0x2b4c52);materials.glass.emissiveIntensity=.08;materials.glass.roughness=.18;materials.glass.metalness=0;windowNodes(materials.glass);materials.all[1]=materials.glass;originalGlass.dispose();
 const gallery=mode==='gallery',clay=$('display').value==='clay',wire=$('display').value==='wire';renderer.toneMappingExposure=clay?.72:Number($('exposure').value);
 const collection=MASS_RULES.filter(r=>$('collection').value==='all'||($('collection').value==='curved'?r.curved:!r.curved));
 const irs=gallery?collection.map(r=>compileGrammar({...o,mass:r.id,floors:Math.min(o.floors,12)})):[current];
 const spacing=Math.max(current.options.baysX,current.options.baysZ)*current.options.bay*1.6+18;let tris=0,bays=0;for(let i=0;i<irs.length;i++){const ir=irs[i],root=grammarBuildingModel(ir,materials,{lod:gallery?1:0,clay});root.position.set(gallery?(i%4-1.5)*spacing:0,0,gallery?(Math.floor(i/4)-(Math.ceil(irs.length/4)-1)/2)*spacing:0);root.children.forEach(m=>{m.material.wireframe=wire;m.castShadow=!gallery;});scene.add(root);roots.push(root);if(gallery){const element=document.createElement('span');element.className='variant-label';element.textContent=MASS_RULES.find(r=>r.id===ir.mass).label;mount.append(element);const bounds=new T.Box3().setFromObject(root),position=bounds.getCenter(new T.Vector3());position.y=bounds.max.y+2;labels.push({element,position});}tris+=root.userData.triangles;bays+=ir.facades.length;}
 $('title').textContent=gallery?`${irs.length} compositions · layered construction`:MASS_RULES.find(r=>r.id===current.mass).label+' / '+FACADE_RULES.find(r=>r.id===current.facade).label;
 const sub=document.createElement('small');sub.textContent=gallery?'Connected footprints / exposed walls / independent height and facade rules':'Native geometry / actual recessed apertures / '+CONSTRUCTION_WORLDS[o.world].label;$('title').append(sub);
 $('stats').textContent=`${irs.length} building${irs.length>1?'s':''} · ${bays.toLocaleString()} exterior bays\n${tris.toLocaleString()} triangles · ${irs.length*2} draw streams`;$('stats').style.whiteSpace='pre-line';
 document.body.dataset.ready='true';document.body.dataset.build=String(Number(document.body.dataset.build||0)+1);document.body.dataset.triangles=tris;document.body.dataset.bays=bays;
 $('status').textContent='Ready · WebGPU · '+(gallery?'simplified construction details for comparison':current.trace.join(' · '));if(couponMode){roots.forEach(r=>r.visible=false);coupon.material=materials.atlas.material;}else fit();dirty=true;
 }catch(e){$('status').textContent=e.message;document.body.dataset.error=e.message;console.error(e);}finally{building=false;}}
for(const id of ['mass','facade','world','baysX','baysZ','display','layout','grouping','collection'])$(id).onchange=()=>schedule();$('floors').oninput=()=>{$('floorValue').textContent=$('floors').value;};$('floors').onchange=()=>schedule();
 for(const id of ['coverage','taper','twist']){$(id).oninput=()=>$(id+'Value').textContent=id==='coverage'?Math.round(Number($(id).value)*100)+'%':Number($(id).value).toFixed(2);$(id).onchange=()=>schedule();}
 $('seed').onchange=()=>{massVariant=faceVariant=0;schedule();};$('generate').onclick=()=>{mode='single';schedule();};$('massOnly').onclick=()=>{massVariant++;mode='single';schedule();};$('faceOnly').onclick=()=>{faceVariant++;mode='single';schedule();};$('gallery').onclick=()=>{mode=mode==='gallery'?'single':'gallery';schedule();};$('detail').onclick=()=>detail();$('entry').onclick=()=>detail('entry');$('fit').onclick=fit;$('light').onchange=lighting;$('quality').onchange=quality;$('relief').onchange=()=>schedule();$('contact').onchange=()=>{contactStrength.value=$('contact').checked?.42:0;dirty=true;};$('exposure').oninput=()=>{renderer.toneMappingExposure=Number($('exposure').value);dirty=true;};
 $('export').onclick=()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schema:current.schema,options:current.options,trace:current.trace},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='aether-native-building.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 new ResizeObserver(()=>{camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);dirty=true;}).observe(mount);
 try{await renderer.init();if(!renderer.backend.isWebGPUBackend)throw Error('WebGPU is required for this construction bench.');pmrem=new T.PMREMGenerator(renderer);const room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);room.dispose();scene.environment=environment.texture;lighting();quality();
 const scenePass=pass(scene,camera,{samples:0}),depth=scenePass.getTextureNode('depth'),contact=ao(depth,null,camera);contact.resolutionScale=.5;contact.samples.value=12;contact.radius.value=.85;contact.thickness.value=.6;contact.scale.value=1;
 const softened=denoise(contact.getTextureNode(),depth,null,camera);softened.radius.value=4;softened.depthPhi.value=2;softened.normalPhi.value=10;
 pipeline=new T.RenderPipeline(renderer);pipeline.outputColorTransform=false;const color=scenePass.getTextureNode('output');pipeline.outputNode=fxaa(renderOutput(vec4(color.rgb.mul(mix(1,softened.r,contactStrength)),color.a)));
 let stored;try{const raw=JSON.parse(localStorage.getItem(BUILDING_FINISH_KEY)||'null');if(raw)stored=buildingMaterialRecipe(raw);}catch{}setBuildingFinish(stored||finishRecipe);
 renderer.backend.device.addEventListener('uncapturederror',e=>{document.body.dataset.error=e.error.message;$('status').textContent=e.error.message;});renderer.setAnimationLoop(async()=>{if(!dirty||rendering)return;for(const label of labels){const p=label.position.clone().project(camera);label.element.style.left=(p.x*.5+.5)*mount.clientWidth+'px';label.element.style.top=(-p.y*.5+.5)*mount.clientHeight+'px';label.element.hidden=couponMode||p.z<0||p.z>1;}dirty=false;rendering=true;const version=document.body.dataset.build;try{await pipeline.renderAsync();await renderer.backend.device.queue.onSubmittedWorkDone();document.body.dataset.frame=String(++frame);document.body.dataset.renderedBuild=version||'0';}catch(e){document.body.dataset.error=e.message;console.error(e);}finally{rendering=false;}});
 }catch(e){$('status').textContent=e.message;}
 window.addEventListener('pagehide',()=>{finishWorker?.terminate();queued=false;renderer.setAnimationLoop(null);release();releaseMaterials();coupon?.geometry.dispose();floor.geometry.dispose();floor.material.dispose();controls.dispose();environment?.dispose();pmrem?.dispose();pipeline?.dispose();renderer.dispose();},{once:true});

// Shared native renderer: the material designer edits the exact building finish.
export function getBuildingFinish(){return buildingMaterialRecipe(finishRecipe);}
export function previewBuildingFinish(channel=0){finishPreview.value=Number(channel)||0;dirty=true;}
export function setBuildingFinish(input){
 const recipe=buildingMaterialRecipe(input),id=++finishJob;finishRecipe=recipe;finishWorker?.terminate();bakingFinish=true;document.body.dataset.baking='true';$('status').textContent='Synthesizing building materials…';
 finishWorker=new Worker(new URL('./building-material-worker.js',import.meta.url),{type:'module'});
 const fail=message=>{bakingFinish=false;document.body.dataset.baking='false';document.body.dataset.error=message;$('status').textContent=message;window.dispatchEvent(new CustomEvent('aether:finish-error',{detail:message}));};
 finishWorker.onerror=e=>fail(e.message);finishWorker.onmessage=({data})=>{if(data.id!==finishJob)return;if(data.error){fail(data.error);return;}if(data.tiles){const preserve=!!current,position=camera.position.clone(),target=controls.target.clone();finishTiles=data.tiles;finishRecipe=data.recipe;bakingFinish=false;document.body.dataset.baking='false';delete document.body.dataset.error;schedule(()=>{if(preserve){camera.position.copy(position);controls.target.copy(target);controls.update();dirty=true;}document.body.dataset.finishVersion=String(id);window.dispatchEvent(new CustomEvent('aether:finish-baked',{detail:{recipe:finishRecipe,tiles:finishTiles}}));});}else{$('status').textContent='Synthesizing building materials · '+Math.round(data.progress*100)+'%';window.dispatchEvent(new CustomEvent('aether:finish-progress',{detail:data.progress}));}};
 finishWorker.postMessage({id,recipe});
}

export function selectMaterialCouponZone(zone){couponZone=Math.max(0,Math.min(7,Number(zone)||0));if(coupon){const data=coupon.geometry.attributes.uv1;for(let i=0;i<data.count;i++)data.setX(i,couponZone);data.needsUpdate=true;dirty=true;}}
export function showMaterialCoupon(zone=0){
 if(!materials)return;selectMaterialCouponZone(zone);
 if(!coupon){const shape=new T.Shape();shape.moveTo(-1,-1);shape.lineTo(1,-1);shape.lineTo(1,1);shape.lineTo(-1,1);shape.closePath();const geometry=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:3,steps:1});mapCitySurface(geometry,{index:couponZone},{variation:0});coupon=new T.Mesh(geometry,materials.atlas.material);coupon.position.y=1.3;coupon.castShadow=coupon.receiveShadow=true;scene.add(coupon);}
 coupon.material=materials.atlas.material;coupon.visible=true;couponMode=true;document.body.dataset.materialSpecimen='panel';roots.forEach(r=>r.visible=false);controls.target.set(0,1.3,0);camera.position.set(1.25,1.7,3.5);controls.update();Object.assign(sun.shadow.camera,{left:-4,right:4,top:4,bottom:-4});sun.shadow.camera.updateProjectionMatrix();dirty=true;
}
