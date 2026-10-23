import {CITY_LIGHTING,cityLighting,SHADOW_QUALITY} from './lighting.js';
import {CSMShadowNode} from 'three/addons/csm/CSMShadowNode.js';
import {ao} from '../render/webgpu/city-GTAONode.js';
import {denoise} from '../render/webgpu/city-DenoiseNode.js';
import {fxaa} from 'three/addons/tsl/display/FXAANode.js';
import * as T from 'three/webgpu';
import {uniform,mix,vec3,positionWorldDirection,pass,vec4,renderOutput} from 'three/tsl';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {ARCHITECTURAL_KITS,designOptions} from './design.js';
import {readAssetLibrary} from './studio-state.js';
import {BUILDING_FAMILIES,PLANET_STYLES,architectureOptions} from './architecture.js';
import {compactReadback} from '../render/readback.js';
import {restoreLibrary} from './assets.js';
import {infrastructure} from './infrastructure.js';
import {CELL_SIZE,FAMILIES,PROTOTYPES,CITY_LAYOUTS,projectedPixels,selectBuildingLOD,exportCity} from './blueprint.js';
import {instanceBucket,uploadBucket} from '../forest/assets.js';
import {bakeImpostor,impostorMaterial} from '../forest/impostor.js';
const $=id=>document.getElementById(id),status=value=>{$('status').textContent=value;},debug=uniform(0),sunDirection=uniform(new T.Vector3(.6,.45,.2).normalize()),ambient=uniform(.42),diffuse=uniform(.8),emission=uniform(0),sky=uniform(new T.Color(0x487b92)),horizon=uniform(new T.Color(0xb5b9aa));
const scene=new T.Scene(),camera=new T.PerspectiveCamera(50,1,.3,65000),sun=new T.DirectionalLight(0xffd3a4,3.7),hemisphere=new T.HemisphereLight(0xb3d4e1,0x3c4540,1.1);
scene.backgroundNode=mix(vec3(horizon),vec3(sky),positionWorldDirection.y.max(0).pow(.45));scene.fog=new T.FogExp2(0xb5b9aa,.000065);scene.add(sun,sun.target,hemisphere);
sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.layers.set(1);Object.assign(sun.shadow.camera,{left:-180,right:180,top:180,bottom:-180,near:1,far:1400});sun.shadow.normalBias=.12;sun.shadow.bias=-.00015;
let renderer,controls,observer,worker,pmrem,environment,ground,library,layout,streets,groups=[],shadows=[],cells=[],disposed=false,gpuFailed=false,baking=false,generating=false,mode='city',streetMode=false,walkYaw=0,walkPitch=0,drag=null,workerID=0,waiting=new Map(),last=0,lastUpdate=-1,lastPods=0,frames=0,frameTime=0,lastFPS=0,metrics={};
const dummy=new T.Object3D(),frustum=new T.Frustum(),projection=new T.Matrix4(),testSphere=new T.Sphere(),keys=new Set(),cuts=[260,90,22],budget=[16,96,512];
let renderCounts=[0,0,0,0],logicalVisible=0,localShadowCount=0;
let pendingExterior=null,exteriorKey='',csm=null,shadowQuality='',pipeline=null,scenePass=null,occlusion=null,aoDenoise=null;const aoStrength=uniform(.6);
function ask(data){return new Promise((resolve,reject)=>{const id=++workerID;waiting.set(id,{resolve,reject});worker.postMessage({...data,id});});}
function clearGroups(){
 for(const group of groups)for(const bucket of group)for(const mesh of bucket){scene.remove(mesh);mesh.dispose();mesh.geometry.dispose();}
 for(const group of shadows)for(const mesh of group){scene.remove(mesh);mesh.dispose();mesh.geometry.dispose();mesh.material.dispose();}
 groups=[];shadows=[];
}
function clearLibrary(){clearGroups();if(library){for(const v of library.variants){v.atlas?.color.dispose();v.atlas?.normal.dispose();v.impostor?.dispose();}library.dispose();library=null;}}
function populate(){
 clearGroups();const counts=Array(library.variants.length).fill(1);layout.buildings.forEach(b=>counts[b.variant]++);
 for(let vi=0;vi<library.variants.length;vi++){
  const variant=library.variants[vi],buckets=[];
  for(let lod=0;lod<3;lod++){const bucket=variant.lods[lod].map(source=>{const mesh=instanceBucket(source.geometry,source.material,counts[vi]);mesh.receiveShadow=true;mesh.castShadow=lod===0;if(mesh.castShadow)mesh.layers.enable(1);scene.add(mesh);return mesh;});buckets.push(bucket);}
  // A ready atlas replaces this conservative mesh fallback in the same slot.
  const plane=new T.PlaneGeometry(variant.atlas?.span??variant.radius*2,variant.atlas?.span??variant.radius*2),material=variant.impostor??variant.lods[2][0].material,imp=instanceBucket(plane,material,counts[vi]);plane.dispose();scene.add(imp);buckets.push([imp]);groups.push(buckets);
  const shadowBucket=variant.shadow.map(source=>{const material=new T.MeshBasicNodeMaterial();const mesh=instanceBucket(source.geometry,material,counts[vi]);mesh.layers.set(1);mesh.castShadow=true;scene.add(mesh);return mesh;});shadows.push(shadowBucket);
 }
 const grid=new Map();
 for(const b of layout.buildings){b.lod=-1;const v=library.variants[b.variant],sx=b.scale*b.width,sy=b.scale*(b.heightScale??1);b.cx=b.x+v.center.x*sx;b.cy=v.center.y*sy;b.cz=b.z+v.center.z*sx;b.bound=v.radius*Math.max(sx,sy);const x=Math.floor(b.x/CELL_SIZE),z=Math.floor(b.z/CELL_SIZE),key=x+','+z;if(!grid.has(key))grid.set(key,{buildings:[],sphere:new T.Sphere(new T.Vector3(x*CELL_SIZE+CELL_SIZE/2,120,z*CELL_SIZE+CELL_SIZE/2),Math.hypot(CELL_SIZE/2,CELL_SIZE/2,200)+80)});grid.get(key).buildings.push(b);}
 cells=[...grid.values()];lastUpdate=-1;
 $('cityTitle').textContent=CITY_LAYOUTS[layout.options.layout].label.split(' · ')[0];$('cityTagline').textContent=CITY_LAYOUTS[layout.options.layout].description;
 $('population').textContent=layout.buildings.length.toLocaleString()+' BUILDINGS';$('network').textContent=layout.hubs.length+' CONNECTED HUBS / '+((layout.bounds.radius*2)/1000).toFixed(1)+' KM';
}
function options(){const architecture=Object.fromEntries(['style','variation','curvature','taper','twist','terraces','bayWidth','glazing','shade','envelope','roof','height','aspect'].map(id=>[id,$(id).value]));architecture.design={kit:$('cityKit').value};return{layout:$('layout').value,architecture:architectureOptions(architecture),assets:$('useLibrary').checked?readAssetLibrary(localStorage):[],seed:$('seed').value||'FRESCO-01',hubs:Number($('hubs').value),rings:Number($('rings').value),density:Number($('density').value)};}

async function generate(){
 if(generating||!worker)return;generating=true;$('generate').disabled=true;
 const config=options(),wear=Number($('wear').value),architectureKey=JSON.stringify([config.architecture,config.assets]),previousMode=mode,rebuild=!library||library.seed!==config.seed||library.wear!==wear||library.architectureKey!==architectureKey;
 try{
  status('Planning civic cores, protected corridors and building plots…');const result=await ask({type:'layout',options:config});if(disposed)return;layout=result.layout;
  if(rebuild){
   status('Manufacturing shared building library in worker…');const data=await ask({type:'library',seed:config.seed,wear,architecture:config.architecture,assets:config.assets});if(disposed)return;clearLibrary();library=restoreLibrary(data,{debug});library.seed=config.seed;library.wear=wear;library.architectureKey=architectureKey;
  }
  streets?.dispose();if(streets)scene.remove(streets.root);streets=infrastructure(layout);scene.add(streets.root);streets.transit.visible=$('transit').checked;streets.gardens.visible=$('parks').checked;
  if(ground){scene.remove(ground);ground.geometry.dispose();ground.material.dispose();}
  ground=new T.Mesh(new T.PlaneGeometry(Math.max(200000,layout.bounds.radius*6),Math.max(200000,layout.bounds.radius*6)),new T.MeshStandardNodeMaterial({color:config.architecture.style==='garden'?0x7a8170:PLANET_STYLES[config.architecture.style].palette[3],roughness:.95}));ground.rotation.x=-Math.PI/2;ground.position.y=-.25;ground.receiveShadow=true;scene.add(ground);
  $('atlasCount').textContent=library.variants.filter(v=>v.atlas?.coverage).length+' / '+PROTOTYPES+' ATLASES READY';populate();lighting();setMode(previousMode);view('skyline');$('appliedStyle').textContent=PLANET_STYLES[config.architecture.style].label;document.body.dataset.style=config.architecture.style;document.body.dataset.ready='true';
  if($('detail').value!=='mesh'&&library.variants.some(v=>!v.atlas?.coverage)){
   // The city is visible immediately using all three valid mesh levels. Bake
   // one prototype at a time, yielding frames between captures. A failed
   // capture can never erase a building: admission requires all 25 views.
   for(let i=0;i<library.variants.length;i++){
    if(disposed)return;if($('detail').value==='mesh')break;const v=library.variants[i];if(v.atlas?.coverage)continue;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    baking=true;
    try{
     v.atlas=await bakeImpostor(renderer,v.capture,{tile:96,encodeEmission:true,cancelled:()=>disposed,onView:n=>status(`Capturing ${v.plan.family} ${i+1}/${PROTOTYPES} · view ${n}/25. Mesh fallbacks remain active.`)});
     if(disposed){v.atlas.color.dispose();v.atlas.normal.dispose();v.atlas=null;return;}
     v.impostor=impostorMaterial(v.atlas,{sun:sunDirection,debug,ambient,diffuse,emission});
     const imp=groups[i][3][0];imp.geometry.dispose();const temporary=new T.PlaneGeometry(v.atlas.span,v.atlas.span),fresh=instanceBucket(temporary,v.impostor,imp.instanceMatrix.count);temporary.dispose();scene.remove(imp);imp.dispose();groups[i][3][0]=fresh;scene.add(fresh);lastUpdate=-1;
    }catch(e){if(!disposed){v.error=e.message;status(`${v.plan.family}: mesh fallback retained (${e.message}).`);}}
    finally{baking=false;last=0;frames=0;frameTime=0;if(disposed)releaseResources();else if(pendingExterior){const p=pendingExterior;pendingExterior=null;updateExterior(p);}}
    if(disposed)return;$('atlasCount').textContent=library.variants.filter(v=>v.atlas?.coverage).length+' / '+PROTOTYPES+' ATLASES READY';
   }
  }
  const ready=library.variants.filter(v=>v.atlas?.coverage).length;
  status(`${layout.buildings.length.toLocaleString()} buildings · ${layout.links.length} intercity links · ${ready}/${PROTOTYPES} validated impostors${ready<PROTOTYPES?' · remaining prototypes use mesh fallbacks':''}.`);
 }catch(e){if(!disposed)status('City generation failed: '+e.message);}
 finally{generating=false;baking=false;if(!disposed)$('generate').disabled=false;}
}
function put(building,lod,fade=1,outgoing=0,shadow=false){
 const variant=library.variants[building.variant],bucket=shadow?shadows[building.variant]:groups[building.variant][lod],index=bucket[0].count,sx=building.scale*building.width,sy=building.scale*(building.heightScale??1),yaw=building.yaw;
 dummy.position.set(building.x,building.y,building.z);dummy.rotation.set(0,yaw,0);dummy.scale.set(sx,sy,sx);
 if(lod===3){const center=variant.atlas.center;dummy.position.x+=(center.x*Math.cos(yaw)+center.z*Math.sin(yaw))*sx;dummy.position.z+=(center.z*Math.cos(yaw)-center.x*Math.sin(yaw))*sx;dummy.position.y+=center.y*sy;dummy.scale.set(sx,sy,1);}
 dummy.updateMatrix();
 for(const mesh of bucket){if(index>=mesh.instanceMatrix.count)throw Error('City instance capacity exceeded');mesh.setMatrixAt(index,dummy.matrix);const a=mesh.geometry.attributes;a.forestCenter.setXYZ(index,dummy.position.x,dummy.position.y,dummy.position.z);for(const [key,value]of [['forestScale',sy],['forestWidth',sx/sy],['forestYaw',yaw],['forestTint',building.tint],['forestFade',fade],['forestLevel',lod],['forestOutgoing',outgoing]])a[key].setX(index,value);mesh.count++;}
 if(!shadow)renderCounts[lod]++;
}
function selectedBuilding(){const variant=Number($('family').value)+Number($('profile').value)*FAMILIES.length;return{id:'specimen',variant,x:0,y:0,z:0,yaw:0,scale:1,width:1,heightScale:1,tint:1,lod:0};}
function updateCity(){
 const started=performance.now();renderCounts=[0,0,0,0];for(const group of groups)for(const bucket of group)for(const mesh of bucket)mesh.count=0;
 camera.updateMatrixWorld();projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(projection,T.WebGPUCoordinateSystem,camera.reversedDepth);
 const visible=[];
 if(mode==='building')visible.push(selectedBuilding());
 else if(mode==='catalogue')for(let i=0;i<FAMILIES.length;i++)visible.push({variant:i+Number($('profile').value)*FAMILIES.length,x:(i%4)*125,z:Math.floor(i/4)*145,y:0,yaw:0,scale:1,width:1,heightScale:1,tint:1,distance:0,lod:0});
 else for(const cell of cells){if(!frustum.intersectsSphere(cell.sphere))continue;for(const b of cell.buildings){if(!frustum.intersectsSphere((testSphere.center.set(b.cx,b.cy,b.cz),testSphere.radius=b.bound,testSphere)))continue;b.distance=Math.hypot(camera.position.x-b.cx,camera.position.y-b.cy,camera.position.z-b.cz);visible.push(b);}}
 visible.sort((a,b)=>(a.distance??0)-(b.distance??0));logicalVisible=visible.length;const used=[0,0,0];
 for(const b of visible){
  const v=library.variants[b.variant],ready=!!v.atlas?.coverage,pixels=projectedPixels(v.height*b.scale*(b.heightScale??1),b.distance??1,renderer.domElement.clientHeight,camera.fov),policy=$('detail').value;
  let desired=mode!=='city'?0:selectBuildingLOD(pixels,b.lod,ready,policy);
  if(mode==='city'&&policy!=='mesh')while(desired<2&&used[desired]>=budget[desired])desired++;
  b.lod=desired;if(desired<3)used[desired]++;
  // Coverage depends on projected size, not a timed geometry morph. Adjacent
  // representations own complementary pixels across a narrow spatial band.
  let blended=false;
  if(mode==='city'&&policy==='auto')for(let boundary=0;boundary<3;boundary++){
   if(boundary===2&&!ready)continue;const lo=cuts[boundary]*.92,hi=cuts[boundary]*1.08;
   if(pixels>lo&&pixels<hi&&desired<=boundary+1&&(boundary===2||used[boundary]<budget[boundary])){
    const amount=(pixels-lo)/(hi-lo);put(b,boundary,amount);put(b,boundary+1,1-amount,1);if(desired!==boundary&&boundary<3)used[boundary]++;blended=true;break;
   }
  }
  if(!blended)put(b,desired);
 }
 for(const group of groups)for(const bucket of group)for(const mesh of bucket){mesh.visible=mesh.count>0;if(mesh.count)uploadBucket(mesh);}
 for(const group of shadows)for(const mesh of group)mesh.count=0;
 const anchor=mode==='building'?new T.Vector3(0,0,0):controls.target.clone().setY(0),quality=SHADOW_QUALITY[$('shadowQuality').value],reach=mode==='city'?Math.min(6500,Math.max(500,camera.position.distanceTo(anchor)*1.1+layout.radius)):800,candidates=[];
 if(mode==='city'&&$('shadows').checked)for(const cell of cells){if(cell.sphere.center.distanceTo(anchor)>cell.sphere.radius+reach)continue;for(const b of cell.buildings)if(Math.hypot(b.x-anchor.x,b.z-anchor.z)<reach)candidates.push(b);}
 if(mode==='catalogue')for(let i=0;i<FAMILIES.length;i++)candidates.push({variant:i+Number($('profile').value)*FAMILIES.length,x:(i%4)*125,z:Math.floor(i/4)*145,y:0,yaw:0,scale:1,width:1,heightScale:1,tint:1});
 const near=mode==='building'?[selectedBuilding()]:candidates.sort((a,b)=>Math.hypot(a.x-anchor.x,a.z-anchor.z)-Math.hypot(b.x-anchor.x,b.z-anchor.z)).slice(0,quality.casters);
 localShadowCount=$('shadows').checked?near.length:0;if($('shadows').checked)near.forEach(b=>put(b,2,1,0,true));
 for(const group of shadows)for(const mesh of group){mesh.visible=mesh.count>0;if(mesh.count)uploadBucket(mesh);}
 sun.target.position.copy(anchor);sun.position.copy(anchor).add(sunDirection.value.clone().multiplyScalar(1200));sun.target.updateMatrixWorld();
 if(csm){const far=Math.min(10000,Math.max(1000,camera.position.distanceTo(anchor)+Math.min(layout.radius,3000)*1.7));if(Math.abs(csm.maxFar-far)>csm.maxFar*.1){csm.maxFar=far;if(csm.camera)csm.updateFrustums();}}
 metrics={...metrics,backend:renderer.backend.isWebGPUBackend?'WebGPU':'unsupported',buildings:layout.buildings.length,visible:logicalVisible,representationCounts:[...renderCounts],shadowCasters:localShadowCount,shadowCascades:SHADOW_QUALITY[$('shadowQuality').value].cascades,shadowMap:SHADOW_QUALITY[$('shadowQuality').value].mapSize,occlusion:$('occlusion').checked,cellCount:cells.length,cullMilliseconds:performance.now()-started,atlasReady:library.variants.filter(v=>v.atlas?.coverage).length};
 $('counts').textContent=`Near ${renderCounts[0]} · Mid ${renderCounts[1]} · Low ${renderCounts[2]} · Impostor ${renderCounts[3]}`;
}
function updateExterior(p){
 if(!pmrem)return;
 const style=layout?.options.architecture.style??'garden',key=[p.sky,p.horizon,style].join(':');if(key===exteriorKey)return;if(baking){pendingExterior=p;return;}
 const exterior=new T.Scene(),g=new T.SphereGeometry(500,32,16),colors=[],top=new T.Color(p.sky),middle=new T.Color(p.horizon),bottom=new T.Color(style==='garden'?0x36443f:PLANET_STYLES[style].palette[3]);
 for(let i=0;i<g.attributes.position.count;i++){const y=g.attributes.position.getY(i)/500,c=y>0?middle.clone().lerp(top,Math.pow(y,.45)):middle.clone().lerp(bottom,Math.min(1,-y*4));colors.push(c.r,c.g,c.b);}
 g.setAttribute('color',new T.Float32BufferAttribute(colors,3));const m=new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide});exterior.add(new T.Mesh(g,m));
 const next=pmrem.fromScene(exterior,.04);scene.environment=next.texture;environment?.dispose();environment=next;exteriorKey=key;g.dispose();m.dispose();
}
function shadowSettings(){
 const id=$('shadowQuality').value;if(shadowQuality===id)return;shadowQuality=id;const q=SHADOW_QUALITY[id];
 csm?.dispose();sun.shadow.mapSize.set(q.mapSize,q.mapSize);sun.shadow.normalBias=.075;sun.shadow.bias=-.000025;sun.shadow.camera.layers.set(1);
 csm=new CSMShadowNode(sun,{cascades:q.cascades,maxFar:4500,mode:'practical',lightMargin:700});csm.fade=true;sun.shadowNode=csm;
 if(library)for(const m of library.materials)m.needsUpdate=true;
}
function lighting(){
 const p=cityLighting($('lighting').value),exposure=Number($('exposure').value);sun.color.set(p.sun);sun.intensity=p.intensity;hemisphere.intensity=p.ambient;hemisphere.color.set(p.horizon);hemisphere.groundColor.set(p.ground);sky.value.set(p.sky);horizon.value.set(p.horizon);scene.fog.color.set(p.horizon);scene.fog.density=p.fog*Number($('haze').value);sunDirection.value.fromArray(p.direction).normalize();[ambient.value,diffuse.value,emission.value]=p.imp;
 if(renderer){renderer.toneMappingExposure=p.exposure*exposure;scene.environmentIntensity=p.environment;}
 $('exposureValue').textContent=exposure.toFixed(2);aoStrength.value=$('occlusion').checked?p.ao:0;shadowSettings();updateExterior(p);
 if(library)for(const m of library.materials)if(m.name==='Occupied rooms and wayfinding')m.emissiveIntensity=p.rooms;
 sun.castShadow=$('shadows').checked;lastUpdate=-1;
}

function setMode(value){mode=value;streetMode=false;controls.enabled=true;$('cityTab').setAttribute('aria-pressed',String(value==='city'));$('buildingTab').setAttribute('aria-pressed',String(value==='building'));$('catalogueTab').setAttribute('aria-pressed',String(value==='catalogue'));if(streets)streets.root.visible=value==='city';$('tour').checked=false;lastUpdate=-1;}
function view(type){
 if(!layout)return;streetMode=false;controls.enabled=true;$('tour').checked=false;
 if(mode==='building'){
  const v=library.variants[selectedBuilding().variant],height=v.height;controls.target.copy(v.center);camera.position.set(height*.9,height*.7,height*1.6);controls.maxDistance=layout.bounds.radius*3;
 }else if(mode==='catalogue'){controls.target.set(187,35,215);camera.position.set(650,420,900);}
 else if(type==='aerial'){const span=layout.bounds.radius;controls.target.set(0,0,0);camera.position.set(span*.25,span*1.65,span*.35);}
 else if(type==='street'){
  const b=layout.buildings.find(b=>b.hub===0&&b.variant%FAMILIES.length===0&&!b.landmark)??layout.buildings[1];
  const dir=new T.Vector3(-Math.sin(b.yaw),0,-Math.cos(b.yaw));camera.position.set(b.x+dir.x*61,2.2,b.z+dir.z*61);controls.target.set(b.x,15,b.z);walkYaw=Math.atan2(camera.position.x-b.x,camera.position.z-b.z);walkPitch=.08;streetMode=true;controls.enabled=false;look();
 }else{const r=layout.radius;controls.target.set(0,45,0);camera.position.set(r*.87,r*.5,r*1.18);}
 camera.updateProjectionMatrix();if(!streetMode)controls.update();lastUpdate=-1;
}
function inspect(){if(!library||!layout)return;setMode('building');view('building');const p=library.variants[selectedBuilding().variant].plan;status(`${p.family} / ${p.profile+1} · ${p.width.toFixed(0)} × ${p.depth.toFixed(0)} m · ${p.floors} floors · ${p.architecture.style} · ${p.architecture.roof} roof · ${p.architecture.facade.bayWidth.toFixed(1)} m facade bays.`);}
function look(){camera.rotation.order='YXZ';camera.rotation.set(walkPitch,walkYaw,0);camera.updateMatrixWorld();}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
let released=false;
function releaseResources(){if(released)return;released=true;clearLibrary();streets?.dispose();ground?.geometry.dispose();ground?.material.dispose();environment?.dispose();pmrem?.dispose();csm?.dispose();scenePass?.dispose();occlusion?.dispose();aoDenoise?.dispose();pipeline?.dispose();renderer?.dispose();}
function cleanup(){
 if(disposed)return;disposed=true;renderer?.setAnimationLoop(null);worker?.terminate();for(const job of waiting.values())job.reject(Error('City Lab closed'));waiting.clear();observer?.disconnect();controls?.dispose();
 if(!baking){const queue=renderer?.backend.device.queue;if(queue)queue.onSubmittedWorkDone().then(releaseResources,releaseResources);else releaseResources();}
}
$('layout').replaceChildren(...Object.entries(CITY_LAYOUTS).map(([id,p])=>new Option(p.label,id)));$('layout').value='grid';$('layoutDescription').textContent=CITY_LAYOUTS.grid.description;$('layout').onchange=()=>$('layoutDescription').textContent=CITY_LAYOUTS[$('layout').value].description;
$('lighting').replaceChildren(...Object.entries(CITY_LIGHTING).map(([id,p])=>new Option(p.label,id)));$('shadowQuality').replaceChildren(...Object.entries(SHADOW_QUALITY).map(([id,p])=>new Option(p.label,id)));$('shadowQuality').value='balanced';
$('cityKit').replaceChildren(...Object.entries(ARCHITECTURAL_KITS).map(([id,k])=>new Option(k.name,id)));
$('cityKit').value=designOptions().kit;
$('family').replaceChildren(...BUILDING_FAMILIES.map((f,i)=>new Option(f.label,String(i))));
$('style').replaceChildren(...Object.entries(PLANET_STYLES).map(([id,p])=>new Option(p.label,id)));
$('styleDescription').textContent=PLANET_STYLES.garden.description;
window.addEventListener('pagehide',cleanup);
try{
 if(!navigator.gpu||!await navigator.gpu.requestAdapter())throw Error('City Buildings Lab requires WebGPU.');
 renderer=new T.WebGPURenderer({antialias:true,reversedDepthBuffer:true});await renderer.init();if(!renderer.backend.isWebGPUBackend)throw Error('City Lab requires the WebGPU backend');renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.info.autoReset=false;$('viewport').append(renderer.domElement);
 renderer.backend.device.addEventListener('uncapturederror',e=>{gpuFailed=true;renderer.setAnimationLoop(null);document.body.dataset.gpuError=e.error.message;status('City GPU drawing failed: '+e.error.message);});renderer.backend.device.lost.then(info=>{if(!disposed){gpuFailed=true;renderer.setAnimationLoop(null);status('WebGPU device lost: '+info.message+' Reload to reconnect.');document.body.dataset.gpuError=info.message;}});
 pmrem=new T.PMREMGenerator(renderer);scene.environmentIntensity=.55;
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.495;controls.minDistance=2;controls.maxDistance=50000;
 scenePass=pass(scene,camera,{samples:0});occlusion=ao(scenePass.getTextureNode('depth'),null,camera);occlusion.resolutionScale=.5;occlusion.samples.value=8;occlusion.radius.value=3;occlusion.thickness.value=2;occlusion.scale.value=1;aoDenoise=denoise(occlusion.getTextureNode(),scenePass.getTextureNode('depth'),null,camera);aoDenoise.radius.value=4;aoDenoise.depthPhi.value=2;aoDenoise.normalPhi.value=10;pipeline=new T.RenderPipeline(renderer);pipeline.outputColorTransform=false;const colorPass=scenePass.getTextureNode('output');pipeline.outputNode=fxaa(renderOutput(vec4(colorPass.rgb.mul(mix(1,aoDenoise.r,aoStrength)),colorPass.a)));
 observer=new ResizeObserver(()=>{const r=$('viewport').getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(csm?.camera)csm.updateFrustums();lastUpdate=-1;});observer.observe($('viewport'));
 worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const job=waiting.get(data.id);if(!job)return;if(data.progress){status(`Manufacturing ${data.progress}/${data.total} building prototypes · three LODs / shared PBR library…`);return;}waiting.delete(data.id);data.error?job.reject(Error(data.error)):job.resolve(data);};worker.onerror=e=>{for(const job of waiting.values())job.reject(Error(e.message));waiting.clear();};
 lighting();let rendering=false;
 renderer.setAnimationLoop(now=>{
  if(disposed||gpuFailed||document.hidden||baking||rendering||!layout||!groups.length)return;
  const seconds=now/1000,elapsed=last?seconds-last:0,dt=Math.min(.05,elapsed);last=seconds;
  if(streetMode){const f=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0),s=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0),speed=keys.has('ShiftLeft')?85:18;camera.position.x+=(-Math.sin(walkYaw)*f+Math.cos(walkYaw)*s)*dt*speed;camera.position.z+=(-Math.cos(walkYaw)*f-Math.sin(walkYaw)*s)*dt*speed;camera.position.y=2.2;controls.target.copy(camera.position).add(new T.Vector3(-Math.sin(walkYaw)*100,0,-Math.cos(walkYaw)*100));look();}
  else if($('tour').checked&&mode==='city'){const a=seconds*.025,r=layout.radius*.9;camera.position.set(Math.sin(a)*r,layout.radius*.4,Math.cos(a)*r);camera.lookAt(0,45,0);}else controls.update();
  if(seconds-lastUpdate>.12||lastUpdate<0){updateCity();lastUpdate=seconds;}
  if(streets&&seconds-lastPods>.033){streets.animate(seconds);lastPods=seconds;}
  renderer.info.reset();if($('occlusion').checked)pipeline.render();else renderer.render(scene,camera);rendering=true;renderer.backend.device.queue.onSubmittedWorkDone().then(()=>{rendering=false;document.body.dataset.frame=String((Number(document.body.dataset.frame)||0)+1);},e=>{if(!disposed){gpuFailed=true;renderer.setAnimationLoop(null);status(e.message);}});frames++;frameTime+=elapsed;
  if(frameTime>1){lastFPS=Math.round(frames/frameTime);metrics={...metrics,fps:lastFPS,drawCalls:renderer.info.render.drawCalls,triangles:renderer.info.render.triangles};$('metrics').textContent=`${lastFPS} fps · ${metrics.drawCalls} draws · ${Math.round(metrics.triangles/1000)}k triangles · ${logicalVisible.toLocaleString()} visible`;frames=0;frameTime=0;}
 });
 generate();
}catch(e){if(!disposed)status('City preparation failed: '+e.message);}
$('generate').onclick=generate;$('cityTab').onclick=()=>{if(layout){setMode('city');view('skyline');}};$('buildingTab').onclick=inspect;$('catalogueTab').onclick=()=>{if(layout){setMode('catalogue');view('catalogue');status(FAMILIES.length+' procedural families · shared planet profile · two seeded compositions per family.');}};$('inspect').onclick=inspect;
$('family').onchange=()=>{if(mode==='building')inspect();};$('profile').onchange=()=>{if(mode==='building')inspect();else lastUpdate=-1;};
$('style').onchange=()=>{$('styleDescription').textContent=PLANET_STYLES[$('style').value].description;};
for(const name of ['aerial','skyline','street'])$(name).onclick=()=>{if(layout){setMode('city');view(name);}};
for(const id of ['lighting','shadows','shadowQuality','occlusion'])$(id).onchange=lighting;for(const id of ['exposure','haze'])$(id).oninput=lighting;$('detail').onchange=()=>{lastUpdate=-1;if($('detail').value!=='mesh'&&library?.variants.some(v=>!v.atlas?.coverage))generate();};$('debug').onchange=()=>debug.value=$('debug').checked?1:0;
$('transit').onchange=()=>{if(streets)streets.transit.visible=$('transit').checked;};$('parks').onchange=()=>{if(streets)streets.gardens.visible=$('parks').checked;};
$('density').oninput=()=>$('densityValue').textContent=Math.round(Number($('density').value)*100)+'%';$('wear').oninput=()=>$('wearValue').textContent=Math.round(Number($('wear').value)*100)+'%';
$('export').onclick=()=>{if(layout&&library)download('aether-city-recipe.json',{...exportCity(layout),surfaceRecipe:{seed:library.seed,wear:library.wear}});};
$('exportBuilding').onclick=()=>{if(library)download('aether-building-recipe.json',library.variants[selectedBuilding().variant].plan);};
$('report').onclick=()=>download('aether-city-measurements.json',{timestamp:new Date().toISOString(),...metrics,viewport:{width:renderer?.domElement.width,height:renderer?.domElement.height},camera:camera.position.toArray(),options:layout?.options,lighting:$('lighting').value,detail:$('detail').value,adapter:renderer?.backend.device.adapterInfo?.description??'unreported',note:'Manual snapshot; FPS varies by hardware, viewport and camera. Resident layout with spatial cell culling; no infinite-world streaming or occlusion culling.'});
$('atlasButton').onclick=async()=>{
 const v=library?.variants[selectedBuilding().variant];if(!v?.atlas){status('This prototype is using its mesh fallback until all directional captures are validated.');return;}if(baking){status('Atlas readback is available after the current capture batch completes.');return;}
 try{const target=v.atlas.color,pixels=await renderer.readRenderTargetPixelsAsync(target,0,0,target.width,target.height),canvas=document.createElement('canvas');canvas.width=target.width;canvas.height=target.height;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(compactReadback(pixels,canvas.width,canvas.height)),canvas.width,canvas.height),0,0);$('atlas').src=canvas.toDataURL();$('atlasTitle').textContent=v.plan.family+' / 25 validated directions';$('atlasPanel').hidden=false;}catch(e){status('Atlas preview failed: '+e.message);}
};$('closeAtlas').onclick=()=>$('atlasPanel').hidden=true;
window.addEventListener('keydown',e=>{if(e.target.closest('input,select,button'))return;keys.add(e.code);if(streetMode&&e.code.startsWith('Arrow'))e.preventDefault();});window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>keys.clear());
$('viewport').addEventListener('pointerdown',e=>{if(streetMode){drag={x:e.clientX,y:e.clientY};renderer.domElement.setPointerCapture(e.pointerId);}});$('viewport').addEventListener('pointermove',e=>{if(!drag)return;walkYaw-=(e.clientX-drag.x)*.004;walkPitch=T.MathUtils.clamp(walkPitch-(e.clientY-drag.y)*.004,-1.2,1.2);drag={x:e.clientX,y:e.clientY};});for(const event of ['pointerup','pointercancel','lostpointercapture'])$('viewport').addEventListener(event,()=>drag=null);
