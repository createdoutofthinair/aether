import * as T from 'three/webgpu';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {compileGrammar,validateGrammar,MASS_RULES,FACADE_RULES,CONSTRUCTION_WORLDS} from './grammar.js';
import {grammarBuildingModel} from './grammar-model.js';
import {cityMaterials} from './model.js';
import {citySurfaceNodes} from './surface-nodes.js';
import {windowNodes} from './window-nodes.js';
const $=id=>document.getElementById(id),mount=$('viewport'),scene=new T.Scene(),camera=new T.PerspectiveCamera(39,1,.1,2500),renderer=new T.WebGPURenderer({antialias:true}),
 sun=new T.DirectionalLight(0xfff0de,3.5),sky=new T.HemisphereLight(0xd9e9f0,0x6e7164,.8),controls=new OrbitControls(camera,renderer.domElement);
let dirty=true,rendering=false,frame=0,roots=[],materials,pmrem,environment,current,mode='single',massVariant=0,faceVariant=0,queued=false,building=false;
for(const [id,list]of [['mass',MASS_RULES],['facade',FACADE_RULES]])for(const r of list){const option=document.createElement('option');option.value=r.id;option.textContent=r.label;$(id).append(option);}
for(const [id,w]of Object.entries(CONSTRUCTION_WORLDS)){const option=document.createElement('option');option.value=id;option.textContent=w.label;$('world').append(option);}
scene.background=new T.Color(0xb7c6c8);scene.add(sun,sun.target,sky);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.bias=-.00012;sun.shadow.normalBias=.03;
renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;mount.append(renderer.domElement);
controls.addEventListener('change',()=>dirty=true);
const floor=new T.Mesh(new T.PlaneGeometry(1500,1500),new T.MeshStandardNodeMaterial({color:0x9da69d,roughness:.93}));floor.rotation.x=-Math.PI/2;floor.position.y=-.03;floor.receiveShadow=true;scene.add(floor);
function options(){return {seed:$('seed').value,massingSeed:$('seed').value+':mass:'+massVariant,facadeSeed:$('seed').value+':facade:'+faceVariant,mass:$('mass').value,facade:$('facade').value,world:$('world').value,floors:Number($('floors').value),baysX:Number($('baysX').value),baysZ:Number($('baysZ').value)};}
function release(){for(const root of roots){scene.remove(root);root.traverse(m=>m.geometry?.dispose());if(root.userData.ownsMaterials)root.children[0].material.dispose();}roots=[];}
function releaseMaterials(){if(materials){const textures=new Set();for(const m of materials.all){for(const field of ['map','normalMap','roughnessMap','metalnessMap','aoMap'])if(m[field])textures.add(m[field]);m.dispose();}textures.forEach(t=>t.dispose());}}
function lighting(){const value=$('light').value;sun.position.set(...(value==='raking'?[100,35,65]:[65,100,45]));sun.intensity=value==='overcast'?.7:3.5;sky.intensity=value==='overcast'?2:.8;scene.environmentIntensity=value==='overcast'?.95:.6;dirty=true;}
function fit(){const gallery=mode==='gallery',h=current.bounds.height,d=Math.max(current.bounds.width,current.bounds.depth),bounds=new T.Box3();for(const root of roots)bounds.union(new T.Box3().setFromObject(root));
 const sphere=bounds.getBoundingSphere(new T.Sphere()),vfov=T.MathUtils.degToRad(camera.fov),hfov=2*Math.atan(Math.tan(vfov/2)*camera.aspect),distance=sphere.radius/Math.sin(Math.min(vfov,hfov)/2)*1.04;
 controls.target.copy(sphere.center);camera.position.copy(sphere.center).addScaledVector(new T.Vector3(.85,.65,1).normalize(),distance);camera.far=2500;camera.updateProjectionMatrix();controls.update();
 const e=gallery?200:Math.max(h,d)*.8;Object.assign(sun.shadow.camera,{left:-e,right:e,top:e,bottom:-e,near:.5,far:650});sun.shadow.camera.updateProjectionMatrix();sun.target.position.set(0,0,0);dirty=true;
}
function detail(){if(mode!=='single'){mode='single';schedule(()=>detail());return;}const f=current.facades.find(f=>f.type==='entry')||current.facades[0],a=current.world.floor,angle=current.rotation,rotate=v=>new T.Vector3(...v).applyAxisAngle(new T.Vector3(0,1,0),angle),target=rotate([f.position[0],f.position[1]+a*.75,f.position[2]]),n=rotate(f.n),u=rotate(f.u);
 controls.target.copy(target);camera.position.copy(target).addScaledVector(n,12).addScaledVector(u,7).add(new T.Vector3(0,3,0));controls.update();dirty=true;}
function schedule(after){if(building)return;queued=true;$('status').textContent='Constructing wall openings and architectural modules…';requestAnimationFrame(()=>setTimeout(()=>{if(!queued)return;queued=false;generate();after?.();},0));}
function generate(){building=true;try{
 const o=options();current=compileGrammar(o);const errors=validateGrammar(current);if(errors.length)throw Error(errors.join('; '));release();releaseMaterials();
 materials=cityMaterials('NATIVE-FINISH',.24,o.world,{kit:current.world.kit,finishRoughness:.48,panelVariation:.025});
 const original=materials.atlas.material;materials.atlas.material=citySurfaceNodes(new T.MeshStandardNodeMaterial().copy(original));materials.all[0]=materials.atlas.material;original.dispose();
 const originalGlass=materials.glass;materials.glass=new T.MeshStandardNodeMaterial().copy(originalGlass);materials.glass.color.set(0x91bac3);materials.glass.emissive.set(0x2b4c52);materials.glass.emissiveIntensity=.08;materials.glass.roughness=.18;materials.glass.metalness=.42;windowNodes(materials.glass);materials.all[1]=materials.glass;originalGlass.dispose();
 const gallery=mode==='gallery',clay=$('display').value==='clay',wire=$('display').value==='wire';
 const irs=gallery?MASS_RULES.map(r=>compileGrammar({...o,mass:r.id,floors:Math.min(o.floors,12)})):[current];
 let tris=0,bays=0;for(let i=0;i<irs.length;i++){const ir=irs[i],root=grammarBuildingModel(ir,materials,{lod:gallery?1:0,clay});root.position.set(gallery?(i%4-1.5)*78:0,0,gallery?(Math.floor(i/4)-1)*83:0);root.children.forEach(m=>{m.material.wireframe=wire;m.castShadow=!gallery;});scene.add(root);roots.push(root);tris+=root.userData.triangles;bays+=ir.facades.length;}
 $('title').textContent=gallery?'Twelve compositions · one construction language':MASS_RULES.find(r=>r.id===current.mass).label+' / '+FACADE_RULES.find(r=>r.id===current.facade).label;
 const sub=document.createElement('small');sub.textContent=gallery?'Connected footprints / exposed walls / independent height and facade rules':'Native geometry / actual recessed apertures / '+CONSTRUCTION_WORLDS[o.world].label;$('title').append(sub);
 $('stats').textContent=`${irs.length} building${irs.length>1?'s':''} · ${bays.toLocaleString()} exterior bays\n${tris.toLocaleString()} triangles · ${irs.length*2} draw streams`;$('stats').style.whiteSpace='pre-line';
 document.body.dataset.ready='true';document.body.dataset.build=String(Number(document.body.dataset.build||0)+1);document.body.dataset.triangles=tris;document.body.dataset.bays=bays;
 $('status').textContent='Ready · WebGPU · '+(gallery?'simplified construction details for comparison':current.trace.join(' · '));fit();dirty=true;
 }catch(e){$('status').textContent=e.message;document.body.dataset.error=e.message;console.error(e);}finally{building=false;}}
for(const id of ['mass','facade','world','baysX','baysZ','display'])$(id).onchange=()=>schedule();$('floors').oninput=()=>{$('floorValue').textContent=$('floors').value;};$('floors').onchange=()=>schedule();
 $('seed').onchange=()=>{massVariant=faceVariant=0;schedule();};$('generate').onclick=()=>{mode='single';schedule();};$('massOnly').onclick=()=>{massVariant++;mode='single';schedule();};$('faceOnly').onclick=()=>{faceVariant++;mode='single';schedule();};$('gallery').onclick=()=>{mode=mode==='gallery'?'single':'gallery';schedule();};$('detail').onclick=detail;$('fit').onclick=fit;$('light').onchange=lighting;
 $('export').onclick=()=>{if(!current)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schema:current.schema,options:current.options,trace:current.trace},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='aether-native-building.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 new ResizeObserver(()=>{camera.aspect=mount.clientWidth/mount.clientHeight;camera.updateProjectionMatrix();renderer.setSize(mount.clientWidth,mount.clientHeight);dirty=true;}).observe(mount);
 try{await renderer.init();if(!renderer.backend.isWebGPUBackend)throw Error('WebGPU is required for this construction bench.');pmrem=new T.PMREMGenerator(renderer);const room=new RoomEnvironment();environment=pmrem.fromScene(room,.04);room.dispose();scene.environment=environment.texture;lighting();schedule();
 renderer.backend.device.addEventListener('uncapturederror',e=>{document.body.dataset.error=e.error.message;$('status').textContent=e.error.message;});renderer.setAnimationLoop(async()=>{if(!dirty||rendering)return;dirty=false;rendering=true;try{await renderer.renderAsync(scene,camera);await renderer.backend.device.queue.onSubmittedWorkDone();document.body.dataset.frame=String(++frame);}catch(e){document.body.dataset.error=e.message;console.error(e);}finally{rendering=false;}});
 }catch(e){$('status').textContent=e.message;}
 window.addEventListener('pagehide',()=>{queued=false;renderer.setAnimationLoop(null);release();releaseMaterials();floor.geometry.dispose();floor.material.dispose();controls.dispose();environment?.dispose();pmrem?.dispose();renderer.dispose();},{once:true});
